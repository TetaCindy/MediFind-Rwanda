const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/db");

// ── Helpers ───────────────────────────────────────────────────────────────────

// Generate a random 6-digit OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// Sign a JWT for a patient or admin
const signPatientToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_PATIENT || "7d" }
  );

// Sign a JWT for facility staff (includes facilityId)
const signStaffToken = (staff) =>
  jwt.sign(
    { id: staff.id, role: staff.role, facilityId: staff.facility_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_FACILITY || "24h" }
  );

// ── Patient Registration ──────────────────────────────────────────────────────
const registerPatient = async ({ phone, email, password, fullName }) => {
  // Check phone not already used
  const existing = await pool.query(
    "SELECT id FROM users WHERE phone = $1",
    [phone]
  );
  if (existing.rows.length > 0) {
    throw new Error("A patient account with this phone number already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (phone, email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4, 'patient')
     RETURNING id, phone, email, full_name, role, created_at`,
    [phone, email || null, passwordHash, fullName]
  );

  const user = result.rows[0];
  const token = signPatientToken(user);
  return { user, token };
};

// ── Patient Login ─────────────────────────────────────────────────────────────
const loginPatient = async ({ phone, password }) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE phone = $1 AND role = 'patient'",
    [phone]
  );
  const user = result.rows[0];

  if (!user) throw new Error("No patient account found with this phone number.");
  if (!user.is_active) throw new Error("This account has been deactivated.");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error("Incorrect password.");

  const token = signPatientToken(user);
  return {
    user: { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name, role: user.role },
    token,
  };
};

// ── Facility Staff Login ──────────────────────────────────────────────────────
const loginStaff = async ({ phone, password }) => {
  const result = await pool.query(
    `SELECT fs.*, f.name AS facility_name, f.status AS facility_status
     FROM facility_staff fs
     JOIN facilities f ON f.id = fs.facility_id
     WHERE fs.phone = $1`,
    [phone]
  );
  const staff = result.rows[0];

  if (!staff) throw new Error("No staff account found with this phone number.");
  if (!staff.is_active) throw new Error("This staff account has been deactivated.");
  if (staff.facility_status !== "active") {
    throw new Error("Your facility is not yet active. Please contact the MediFind Rwanda team.");
  }

  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) throw new Error("Incorrect password.");

  const token = signStaffToken(staff);
  return {
    staff: {
      id: staff.id, phone: staff.phone, full_name: staff.full_name,
      role: staff.role, facilityId: staff.facility_id, facilityName: staff.facility_name,
    },
    token,
  };
};

// ── Admin Login ───────────────────────────────────────────────────────────────
const loginAdmin = async ({ phone, password }) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE phone = $1 AND role = 'admin'",
    [phone]
  );
  const admin = result.rows[0];

  if (!admin) throw new Error("No admin account found.");
  if (!admin.is_active) throw new Error("This account has been deactivated.");

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) throw new Error("Incorrect password.");

  const token = signPatientToken(admin); // same structure, role = 'admin'
  return {
    user: { id: admin.id, phone: admin.phone, full_name: admin.full_name, role: admin.role },
    token,
  };
};

// ── Send OTP ──────────────────────────────────────────────────────────────────
const sendOTP = async ({ phone, purpose }) => {
  // Expire any existing unused OTPs for this phone
  await pool.query(
    "UPDATE otp_codes SET is_used = TRUE WHERE phone = $1 AND purpose = $2 AND is_used = FALSE",
    [phone, purpose]
  );

  const code = generateOTP();

  await pool.query(
    `INSERT INTO otp_codes (phone, code, purpose)
     VALUES ($1, $2, $3)`,
    [phone, code, purpose]
  );

  // In production: call SMS gateway here
  // await smsService.send(phone, `Your MediFind Rwanda code is: ${code}. Valid for 10 minutes.`);

  console.log(`📱 OTP for ${phone} [${purpose}]: ${code}`); // dev only
  return { message: `OTP sent to ${phone}.` };
};

// ── Verify OTP ────────────────────────────────────────────────────────────────
const verifyOTP = async ({ phone, code, purpose }) => {
  const result = await pool.query(
    `SELECT * FROM otp_codes
     WHERE phone = $1 AND code = $2 AND purpose = $3
       AND is_used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [phone, code, purpose]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired OTP code.");
  }

  // Mark as used
  await pool.query(
    "UPDATE otp_codes SET is_used = TRUE WHERE id = $1",
    [result.rows[0].id]
  );

  return { verified: true };
};

// ── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = async ({ phone, newPassword }) => {
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Try users table first, then facility_staff
  const userResult = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE phone = $2 RETURNING id",
    [passwordHash, phone]
  );

  if (userResult.rows.length === 0) {
    const staffResult = await pool.query(
      "UPDATE facility_staff SET password_hash = $1 WHERE phone = $2 RETURNING id",
      [passwordHash, phone]
    );
    if (staffResult.rows.length === 0) {
      throw new Error("No account found with this phone number.");
    }
  }

  return { message: "Password updated successfully." };
};

// ── Get Current User Profile ──────────────────────────────────────────────────
const getProfile = async ({ userId, role }) => {
  if (role === "patient" || role === "admin") {
    const result = await pool.query(
      "SELECT id, phone, email, full_name, role, language, created_at FROM users WHERE id = $1",
      [userId]
    );
    return result.rows[0] || null;
  }

  // Facility staff
  const result = await pool.query(
    `SELECT fs.id, fs.phone, fs.email, fs.full_name, fs.role,
            f.id AS facility_id, f.name AS facility_name, f.type AS facility_type
     FROM facility_staff fs
     JOIN facilities f ON f.id = fs.facility_id
     WHERE fs.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

module.exports = {
  registerPatient,
  loginPatient,
  loginStaff,
  loginAdmin,
  sendOTP,
  verifyOTP,
  resetPassword,
  getProfile,
};
