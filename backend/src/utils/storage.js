// Storage abstraction for file uploads.
//
// When S3-compatible credentials are configured (S3_BUCKET etc.) files are
// stored in object storage — the right long-term choice for a hosted app
// (R2, AWS S3, MinIO, GCS S3-endpoints...). When they are not configured the
// files are kept on the local disk under `backend/uploads` and served through
// Express's static middleware. Picking between the two is automatic at runtime
// so the same code path works in both dev and production.
//
// Original filenames and MIME types are preserved so downloads behave like
// normal file downloads.
const path = require("path");
const fs = require("fs");
const fsp = require("fs").promises;
const { randomUUID } = require("crypto");

const LOCAL_UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const s3Enabled = () => !!(process.env.S3_BUCKET && process.env.S3_REGION);
const s3Endpoint = () => process.env.S3_ENDPOINT || null;
const s3Bucket = () => process.env.S3_BUCKET;

/**
 * Store an uploaded file.
 * @param {Buffer|string} data  File contents (Buffer) or local path (string) when using disk backend.
 * @param {{originalname?:string, mimetype?:string}} opts
 * @returns {Promise<{ key:string, url:string, storage:"s3"|"local" }>}
 */
async function save(data, { originalname = "file", mimetype = "application/octet-stream" } = {}) {
  const ext = path.extname(originalname) || "";
  const key = `${Date.now()}-${randomUUID()}${ext}`;

  if (s3Enabled()) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const clientConfig = {
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    };
    if (s3Endpoint()) clientConfig.endpoint = s3Endpoint();
    if (process.env.S3_FORCE_PATH_STYLE === "true") clientConfig.forcePathStyle = true;

    const client = new S3Client(clientConfig);
    await client.send(
      new PutObjectCommand({
        Bucket: s3Bucket(),
        Key: key,
        Body: data,
        ContentType: mimetype,
      })
    );
    return {
      key,
      url: urlFor(key),
      storage: "s3",
    };
  }

  await fsp.mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
  const dest = path.join(LOCAL_UPLOADS_DIR, key);
  if (Buffer.isBuffer(data)) {
    await fsp.writeFile(dest, data);
  } else {
    await fsp.copyFile(data, dest);
  }
  return { key, url: `/uploads/${key}`, storage: "local" };
}

/**
 * Build a public URL for a stored key.
 */
function urlFor(key) {
  if (s3Enabled()) {
    if (s3Endpoint()) {
      // Custom/self-hosted endpoint (MinIO, R2, etc.) — public bucket URL.
      return `${s3Endpoint().replace(/\/$/, "")}/${s3Bucket()}/${key}`;
    }
    return `https://${s3Bucket()}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  }
  return `/uploads/${key}`;
}

/**
 * Read a stored file back (only supported on the local backend; S3 clients
 * should rely on the returned URL instead).
 */
async function read(key) {
  if (s3Enabled()) {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const clientConfig = {
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    };
    if (s3Endpoint()) clientConfig.endpoint = s3Endpoint();
    const res = await new S3Client(clientConfig).send(
      new GetObjectCommand({ Bucket: s3Bucket(), Key: key })
    );
    return res.Body;
  }
  const dest = path.join(LOCAL_UPLOADS_DIR, path.basename(key));
  return fs.createReadStream(dest);
}

module.exports = { save, read, urlFor, LOCAL_UPLOADS_DIR, s3Enabled };