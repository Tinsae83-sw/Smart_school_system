const express = require("express");
const { users, sessions, createToken } = require("../data/mockData");

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password_hash !== password) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  if ((user.role === "PARENT" && user.requires_otp && !user.otp_verified) || (user.role === "STUDENT" && user.requires_otp && !user.otp_verified)) {
    return res.json({ requiresOtp: true, message: "OTP verification required for first login.", role: user.role });
  }

  const token = createToken(user.user_id);

  return res.json({
    token,
    user: {
      id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      profile_picture_url: user.profile_picture_url,
      preferred_language: user.preferred_language || "",
      relationship: user.relationship || "",
    },
  });
});

router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP code are required." });
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || (user.role !== "PARENT" && user.role !== "STUDENT")) {
    return res.status(404).json({ error: "Account not found or OTP not supported for this role." });
  }

  if (!user.requires_otp) {
    return res.status(400).json({ error: "OTP verification is not required for this account." });
  }

  if (user.otp_code !== otp) {
    return res.status(401).json({ error: "Invalid OTP code." });
  }

  user.otp_verified = true;
  const token = createToken(user.user_id);

  return res.json({
    token,
    user: {
      id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      profile_picture_url: user.profile_picture_url,
      preferred_language: user.preferred_language || "",
      relationship: user.relationship || "",
    },
  });
});

router.post("/logout", (req, res) => {
  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.replace("Bearer ", "");
    delete sessions[token];
  }
  return res.json({ success: true });
});

module.exports = router;
