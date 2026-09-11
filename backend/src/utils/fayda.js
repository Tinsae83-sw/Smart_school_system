/**
 * Config-driven Fayda eSignet (OpenID Connect) client.
 *
 * Fayda (Ethiopian National ID Program) exposes "Sign in with Fayda" through
 * the eSignet OIDC endpoints. Verification ALWAYS works with consent: the
 * resident authenticates on the Fayda side (OTP / biometrics) and authorizes
 * us to receive their verified demographic claims.
 *
 * Live integration requires a partner account from https://id.et/api:
 *   FAYDA_CLIENT_ID              - OIDC client id issued to your organization
 *   FAYDA_PRIVATE_KEY            - base64-encoded JWK RSA private key for the
 *                                  OIDC client (used for client assertions)
 *   FAYDA_REDIRECT_URI           - exact callback URL registered with Fayda
 *   FAYDA_AUTHORIZE_URL          - defaults to https://esignet.ida.fayda.et/authorize
 *   FAYDA_TOKEN_URL              - defaults to https://esignet.ida.fayda.et/v1/esignet/oauth/v2/token
 *   FAYDA_USERINFO_URL           - defaults to https://esignet.ida.fayda.et/v1/esignet/oidc/userinfo
 *
 * When not configured, isConfigured() is false and callers should degrade to
 * offline format validation only.
 */
const crypto = require("crypto");

const FAYDA_CLIENT_ID = process.env.FAYDA_CLIENT_ID || "";
const FAYDA_PRIVATE_KEY_B64 = process.env.FAYDA_PRIVATE_KEY || "";
const FAYDA_REDIRECT_URI = process.env.FAYDA_REDIRECT_URI || "";
const FAYDA_AUTHORIZE_URL = process.env.FAYDA_AUTHORIZE_URL || "https://esignet.ida.fayda.et/authorize";
const FAYDA_TOKEN_URL = process.env.FAYDA_TOKEN_URL || "https://esignet.ida.fayda.et/v1/esignet/oauth/v2/token";
const FAYDA_USERINFO_URL = process.env.FAYDA_USERINFO_URL || "https://esignet.ida.fayda.et/v1/esignet/oidc/userinfo";

function isConfigured() {
  return Boolean(FAYDA_CLIENT_ID && FAYDA_PRIVATE_KEY_B64 && FAYDA_REDIRECT_URI);
}

/**
 * Test/demo mode: lets developers run the whole verification pipeline without
 * a live Fayda partner account. The authorize button opens a simulated Fayda
 * page (OTP displayed on screen) and the callback fabricates claims from the
 * number/phone the user entered.
 *
 * Enabled automatically in non-production when Fayda is not configured, and
 * can be forced off with FAYDA_MOCK=false (or forced on with FAYDA_MOCK=true).
 */
function isMockEnabled() {
  if (isConfigured()) return false;
  if (process.env.FAYDA_MOCK === "false") return false;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

function hasPrivateKey() {
  return Boolean(FAYDA_PRIVATE_KEY_B64);
}

function privateKeyObject() {
  const jwk = JSON.parse(Buffer.from(FAYDA_PRIVATE_KEY_B64, "base64").toString("utf8"));
  return crypto.createPrivateKey({
    key: {
      kty: jwk.kty || "RSA",
      n: jwk.n,
      e: jwk.e,
      d: jwk.d,
      p: jwk.p,
      q: jwk.q,
      dp: jwk.dp,
      dq: jwk.dq,
      qi: jwk.qi,
    },
  });
}

function base64urlEncode(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
}

function makeClientAssertion() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: headerKid() };
  const payload = {
    iss: FAYDA_CLIENT_ID,
    sub: FAYDA_CLIENT_ID,
    aud: FAYDA_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64urlEncode(header)}.${base64urlEncode(payload)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(privateKeyObject()).toString("base64url");
  return `${signingInput}.${signature}`;
}

function headerKid() {
  try {
    const jwk = JSON.parse(Buffer.from(FAYDA_PRIVATE_KEY_B64, "base64").toString("utf8"));
    return jwk.kid;
  } catch {
    return undefined;
  }
}

function createCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function createCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Start an authorization session.
 *
 * Returns the state (for CSRF), a PKCE code_verifier that must be stored next
 * to the state and sent back during the token exchange, and the authorize URL.
 *
 * PKCE + OTP details follow the VeriFayda 2.0 (eSignet) relying-party spec:
 *   - code_challenge/code_challenge_method=S256 (PKCE)
 *   - acr_values=mosip:idp:acr:generated-code -> OTP-only auth (the resident
 *     receives an OTP on the phone number registered with their Fayda ID)
 *   - claims -> essential demographic fields / consent screen
 *   - claims_locales=en am -> English + Amharic KYC values
 */
function initAuthorize() {
  if (!isConfigured()) {
    const error = new Error("Fayda integration is not configured.");
    error.status = 503;
    throw error;
  }
  const state = crypto.randomUUID();
  const codeVerifier = createCodeVerifier();

  const claims = {
    userinfo: {
      name: { essential: true },
      phone_number: { essential: true },
      gender: { essential: true },
      birthdate: { essential: true },
    },
    id_token: {},
  };

  const params = new URLSearchParams({
    response_type: "code",
    response_mode: "query",
    client_id: FAYDA_CLIENT_ID,
    redirect_uri: FAYDA_REDIRECT_URI,
    scope: "openid profile email",
    state,
    nonce: crypto.randomUUID(),
    code_challenge: createCodeChallenge(codeVerifier),
    code_challenge_method: "S256",
    acr_values: "mosip:idp:acr:generated-code",
    claims_locales: "en am",
    claims: JSON.stringify(claims),
  });

  return {
    state,
    codeVerifier,
    authorizeUrl: `${FAYDA_AUTHORIZE_URL}?${params.toString()}`,
  };
}

async function exchangeCode(code, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: FAYDA_REDIRECT_URI,
    client_id: FAYDA_CLIENT_ID,
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: makeClientAssertion(),
    code_verifier: codeVerifier,
  });

  const res = await fetch(FAYDA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const error = new Error(data.error_description || data.error || "Fayda token exchange failed.");
    error.status = res.status;
    throw error;
  }
  return data.access_token;
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Pick a KYC claim that supports the `#lang` suffixed keys used when two or
 * more claims_locales are requested (e.g. `name#en`, `name#am`).
 */
function pickClaim(claims, key) {
  if (claims[key]) return claims[key];
  return claims[`${key}#en`] || claims[`${key}#am`] || null;
}

async function getUserInfo(accessToken) {
  const res = await fetch(FAYDA_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json, application/jwt",
    },
    signal: AbortSignal.timeout(20000),
  });

  const text = await res.text();
  if (!res.ok) {
    const error = new Error(`Fayda userinfo failed (${res.status}).`);
    error.status = res.status;
    throw error;
  }

  let claims;
  try {
    claims = JSON.parse(text);
  } catch {
    claims = decodeJwtPayload(text);
  }
  if (!claims) throw new Error("Unable to parse Fayda userinfo response.");

  const addressRaw = pickClaim(claims, "address");
  const address =
    (addressRaw && typeof addressRaw === "object" &&
      [addressRaw.region, addressRaw.zone, addressRaw.woreda, addressRaw.kebele]
        .filter(Boolean)
        .join(", ")) ||
    addressRaw ||
    null;

  return {
    sub: claims.sub || null,
    name: pickClaim(claims, "name") || pickClaim(claims, "given_name") || null,
    given_name: pickClaim(claims, "given_name") || null,
    family_name: pickClaim(claims, "family_name") || null,
    birthdate: pickClaim(claims, "birthdate") || null,
    gender: pickClaim(claims, "gender") || null,
    phone: pickClaim(claims, "phone") || pickClaim(claims, "phone_number") || null,
    email: pickClaim(claims, "email") || null,
    picture: pickClaim(claims, "picture") || null,
    address,
  };
}

module.exports = {
  isConfigured,
  isMockEnabled,
  hasPrivateKey,
  initAuthorize,
  exchangeCode,
  getUserInfo,
  decodeJwtPayload,
  createCodeVerifier,
  createCodeChallenge,
  FAYDA_AUTHORIZE_URL,
  FAYDA_TOKEN_URL,
  FAYDA_USERINFO_URL,
};