const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const { authenticate } = require("../middleware/auth");

const validate = (fields, body) => {
  const missing = fields.filter((f) => !body[f]);
  return missing.length > 0 ? `Missing required fields: ${missing.join(", ")}` : null;
};

// Patient register
router.post("/patient/register", async (req, res) => {
  const error = validate(["phone", "password", "fullName"], req.body);
  if (error) return res.status(400).json({ error });
  if (req.body.password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  try {
    const result = await authService.registerPatient(req.body);
    return res.status(201).json({ message: "Account created.", user: result.user, token: result.token });
  } catch (err) { return res.status(400).json({ error: err.message }); }
});

// Patient login
router.post("/patient/login", async (req, res) => {
  const error = validate(["phone", "password"], req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await authService.loginPatient(req.body);
    return res.status(200).json({ message: "Login successful.", user: result.user, token: result.token });
  } catch (err) { return res.status(401).json({ error: err.message }); }
});

// Staff login
router.post("/staff/login", async (req, res) => {
  const error = validate(["phone", "password"], req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await authService.loginStaff(req.body);
    return res.status(200).json({ message: "Staff login successful.", staff: result.staff, token: result.token });
  } catch (err) { return res.status(401).json({ error: err.message }); }
});

// Admin login
router.post("/admin/login", async (req, res) => {
  const error = validate(["phone", "password"], req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await authService.loginAdmin(req.body);
    return res.status(200).json({ message: "Admin login successful.", user: result.user, token: result.token });
  } catch (err) { return res.status(401).json({ error: err.message }); }
});

// ── FACILITY REGISTRATION ─────────────────────────────────────────────────────
router.post("/facility/register", async (req, res) => {
  const required = ["facilityName","facilityType","licenseNumber","operatingHours","district","address","phone","adminName","adminPhone","password"];
  const error = validate(required, req.body);
  if (error) return res.status(400).json({ error });
  if (req.body.password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  try {
    const result = await authService.registerFacility(req.body);
    return res.status(201).json(result);
  } catch (err) { return res.status(400).json({ error: err.message }); }
});

// OTP send
router.post("/otp/send", async (req, res) => {
  const error = validate(["phone", "purpose"], req.body);
  if (error) return res.status(400).json({ error });
  if (!["registration","password_reset"].includes(req.body.purpose)) return res.status(400).json({ error: "Invalid purpose." });
  try {
    const result = await authService.sendOTP(req.body);
    return res.status(200).json(result);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// OTP verify
router.post("/otp/verify", async (req, res) => {
  const error = validate(["phone", "code", "purpose"], req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await authService.verifyOTP(req.body);
    return res.status(200).json(result);
  } catch (err) { return res.status(400).json({ error: err.message }); }
});

// Password reset
router.post("/password/reset", async (req, res) => {
  const error = validate(["phone", "newPassword"], req.body);
  if (error) return res.status(400).json({ error });
  if (req.body.newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  try {
    const result = await authService.resetPassword(req.body);
    return res.status(200).json(result);
  } catch (err) { return res.status(400).json({ error: err.message }); }
});

// Get current user profile
router.get("/me", authenticate, async (req, res) => {
  try {
    const profile = await authService.getProfile({ userId: req.user.id, role: req.user.role });
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    return res.status(200).json({ profile });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

module.exports = router;
