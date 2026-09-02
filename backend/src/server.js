const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./config/db");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const parentRoutes = require("./routes/parentRoutes");
const principalRoutes = require("./routes/principal");
const vpAcademicRoutes = require("./routes/vpAcademic");
const vpAdministrationRoutes = require("./routes/vpAdministration");
const departmentHeadRoutes = require("./routes/departmentHead");
const ptsaRoutes = require("./routes/ptsa");
const sicRoutes = require("./routes/sic");
const chatRoutes = require("./routes/chat");
const storageUtils = require("./utils/storage");

const app = express();
const port = process.env.PORT || 5000;

const origins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim());

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: origins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve locally-stored study-material files (S3-backed files are served from their object URL).
app.use("/uploads", express.static(storageUtils.LOCAL_UPLOADS_DIR));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: "Too many requests. Please try again shortly." });
  },
});
app.use("/api", apiLimiter);

// Route mounts. The teacher app consumes a short legacy prefix (`/n`).
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/principal", principalRoutes);
app.use("/api/vp-academic", vpAcademicRoutes);
app.use("/api/vp-administration", vpAdministrationRoutes);
app.use("/api/department-head", departmentHeadRoutes);
app.use("/api/ptsa", ptsaRoutes);
app.use("/api/sic", sicRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/n", teacherRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Smart School Connect backend is running." });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

async function start() {
  try {
    await pool.ping();
    app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
    });
  } catch (error) {
    console.error("Database unreachable. Start it with: docker compose up -d db");
    console.error(error.message);
    process.exit(1);
  }
}

start();