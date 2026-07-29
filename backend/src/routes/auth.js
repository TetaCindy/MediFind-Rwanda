const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const { authenticate } = require("../middleware/auth");

// ── Input validation helper ───────────────────────────────────────────────────
const validate = (fields, body) => {
  const missing = fields.filter((f) => !body[f]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/patient/register
//  Public — register a new patient account
// ─────────────────────────────────────────────────────────────────────────────
router.post("/patient/register", async (req, res) => {
  const error = validate(["phone", "password", "fullName"], req.body);
  if (error) return res.status(400).json({ error });

  const { phone, email, password, fullName } = req.body;

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    const result = await authService.registerPatient({ phone, email, password, fullName });
    return res.status(201).json({
      message: "Patient account created successfully.",
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/patient/login
//  Public — patient login
// ─────────────────────────────────────────────────────────────────────────────
router.post("/patient/login", async (req, res) => {
  const error = validate(["phone", "password"], req.body);
  if (error) return res.status(400).json({ error });

  try {
    const result = await authService.loginPatient(req.body);
    return res.status(200).json({
      message: "Login successful.",
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/staff/login
//  Public — facility staff login
// ─────────────────────────────────────────────────────────────────────────────
router.post("/staff/login", async (req, res) => {
  const error = validate(["phone", "password"], req.body);
  if (error) return res.status(400).json({ error });

  try {
    const result = await authService.loginStaff(req.body);
    return res.status(200).json({
      message: "Staff login successful.",
      staff: result.staff,
      token: result.token,
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/admin/login
//  Public — admin login
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/login", async (req, res) => {
  const error = validate(["phone", "password"], req.body);
  if (error) return res.status(400).json({ error });

  try {
    const result = await authService.loginAdmin(req.body);
    return res.status(200).json({
      message: "Admin login successful.",
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/otp/send
//  Public — send OTP to phone for verification or password reset
// ─────────────────────────────────────────────────────────────────────────────
router.post("/otp/send", async (req, res) => {
  const error = validate(["phone", "purpose"], req.body);
  if (error) return res.status(400).json({ error });

  const { phone, purpose } = req.body;
  if (!["registration", "password_reset"].includes(purpose)) {
    return res.status(400).json({ error: "Invalid purpose. Use 'registration' or 'password_reset'." });
  }

  try {
    const result = await authService.sendOTP({ phone, purpose });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/otp/verify
//  Public — verify an OTP code
// ─────────────────────────────────────────────────────────────────────────────
router.post("/otp/verify", async (req, res) => {
  const error = validate(["phone", "code", "purpose"], req.body);
  if (error) return res.status(400).json({ error });

  try {
    const result = await authService.verifyOTP(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/password/reset
//  Public — reset password after OTP verified
// ─────────────────────────────────────────────────────────────────────────────
router.post("/password/reset", async (req, res) => {
  const error = validate(["phone", "newPassword"], req.body);
  if (error) return res.status(400).json({ error });

  if (req.body.newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    const result = await authService.resetPassword(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/me
//  Protected — get the currently logged-in user's profile
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const profile = await authService.getProfile({
      userId: req.user.id,
      role: req.user.role,
    });
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    return res.status(200).json({ profile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
