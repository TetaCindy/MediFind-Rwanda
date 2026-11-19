const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const pool     = require("../config/db");
const { sendSMS, messages } = require("./smsService");
const { sendEmail, templates } = require("./emailService");

const generateOTP    = () => String(Math.floor(100000 + Math.random() * 900000));
const signPatientToken = (user)  => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_PATIENT  || "7d"  });
const signStaffToken   = (staff) => jwt.sign({ id: staff.id, role: staff.role, facilityId: staff.facility_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_FACILITY || "24h" });

const registerPatient = async ({ phone, email, password, fullName }) => {
  const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
  if (existing.rows.length > 0) throw new Error("A patient account with this phone number already exists.");
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (phone, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, 'patient') RETURNING id, phone, email, full_name, role`,
    [phone, email || null, passwordHash, fullName]
  );
  const user = result.rows[0];
  // Send welcome SMS
  await sendSMS(phone, messages.welcomePatient(fullName));
  return { user, token: signPatientToken(user) };
};

const loginPatient = async ({ phone, password }) => {
  const result = await pool.query("SELECT * FROM users WHERE phone = $1 AND role = 'patient'", [phone]);
  const user = result.rows[0];
  if (!user)           throw new Error("No patient account found with this phone number.");
  if (!user.is_active) throw new Error("This account has been deactivated.");
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error("Incorrect password.");
  return { user: { id: user.id, phone: user.phone, email: user.email, full_name: user.full_name, role: user.role }, token: signPatientToken(user) };
};

const loginStaff = async ({ phone, password }) => {
  const result = await pool.query(
    `SELECT fs.*, f.name AS facility_name, f.status AS facility_status FROM facility_staff fs JOIN facilities f ON f.id = fs.facility_id WHERE fs.phone = $1`,
    [phone]
  );
  const staff = result.rows[0];
  if (!staff)            throw new Error("No staff account found with this phone number.");
  if (!staff.is_active)  throw new Error("This staff account has been deactivated.");
  if (staff.facility_status !== "active") throw new Error("Your facility is not yet active. Please contact MediFind Rwanda.");
  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) throw new Error("Incorrect password.");
  return { staff: { id: staff.id, phone: staff.phone, full_name: staff.full_name, role: staff.role, facilityId: staff.facility_id, facilityName: staff.facility_name }, token: signStaffToken(staff) };
};

const loginAdmin = async ({ phone, password }) => {
  const result = await pool.query("SELECT * FROM users WHERE phone = $1 AND role = 'admin'", [phone]);
  const admin = result.rows[0];
  if (!admin)            throw new Error("No admin account found.");
  if (!admin.is_active)  throw new Error("This account has been deactivated.");
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) throw new Error("Incorrect password.");
  return { user: { id: admin.id, phone: admin.phone, full_name: admin.full_name, role: admin.role }, token: signPatientToken(admin) };
};

// OTP — sends a real email instead of SMS (see backend/README for why)
const sendOTP = async ({ phone, email, purpose }) => {
  // For registration, the email comes straight from the signup form.
  // For a password reset, we only have the phone number, so look up the
  // email already on file for that account.
  let targetEmail = email;
  if (!targetEmail) {
    const userResult = await pool.query("SELECT email FROM users WHERE phone = $1", [phone]);
    if (userResult.rows.length === 0 || !userResult.rows[0].email) {
      throw new Error("No email on file for this phone number. Please contact support.");
    }
    targetEmail = userResult.rows[0].email;
  }

  await pool.query("UPDATE otp_codes SET is_used = TRUE WHERE phone = $1 AND purpose = $2 AND is_used = FALSE", [phone, purpose]);
  const code = generateOTP();
  await pool.query("INSERT INTO otp_codes (phone, code, purpose) VALUES ($1, $2, $3)", [phone, code, purpose]);
  const { subject, html } = templates.otp(code);
  const result = await sendEmail(targetEmail, subject, html);
  if (result.status === "failed") {
    throw new Error(`We couldn't send the verification email. Please try again in a moment, or contact support.`);
  }
  return { message: `OTP sent to ${targetEmail}.` };
};

const verifyOTP = async ({ phone, code, purpose }) => {
  const result = await pool.query(
    `SELECT * FROM otp_codes WHERE phone = $1 AND code = $2 AND purpose = $3 AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [phone, code, purpose]
  );
  if (result.rows.length === 0) throw new Error("Invalid or expired OTP code.");
  await pool.query("UPDATE otp_codes SET is_used = TRUE WHERE id = $1", [result.rows[0].id]);
  return { verified: true };
};

const resetPassword = async ({ phone, newPassword }) => {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const userResult = await pool.query("UPDATE users SET password_hash = $1 WHERE phone = $2 RETURNING id", [passwordHash, phone]);
  if (userResult.rows.length === 0) {
    const staffResult = await pool.query("UPDATE facility_staff SET password_hash = $1 WHERE phone = $2 RETURNING id", [passwordHash, phone]);
    if (staffResult.rows.length === 0) throw new Error("No account found with this phone number.");
  }
  return { message: "Password updated successfully." };
};

const getProfile = async ({ userId, role }) => {
  if (role === "patient" || role === "admin") {
    const result = await pool.query("SELECT id, phone, email, full_name, role, language, created_at FROM users WHERE id = $1", [userId]);
    return result.rows[0] || null;
  }
  const result = await pool.query(
    `SELECT fs.id, fs.phone, fs.email, fs.full_name, fs.role, f.id AS facility_id, f.name AS facility_name, f.type AS facility_type FROM facility_staff fs JOIN facilities f ON f.id = fs.facility_id WHERE fs.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

const registerFacility = async ({ facilityName, facilityType, licenseNumber, operatingHours, district, address, phone, latitude, longitude, adminName, adminEmail, adminPhone, password }) => {
  const existing = await pool.query("SELECT id FROM facilities WHERE license_number = $1", [licenseNumber]);
  if (existing.rows.length > 0) throw new Error("A facility with this license number is already registered.");
  const existingStaff = await pool.query("SELECT id FROM facility_staff WHERE phone = $1", [adminPhone]);
  if (existingStaff.rows.length > 0) throw new Error("A staff account with this phone number already exists.");
  if (adminEmail) {
    const existingEmail = await pool.query("SELECT id FROM facility_staff WHERE email = $1", [adminEmail]);
    if (existingEmail.rows.length > 0) throw new Error("A staff account with this email already exists.");
  }

  // Both inserts must succeed together — otherwise we'd end up with a
  // "ghost" facility that has no login account tied to it (a facility row
  // created, but no matching facility_staff row if the second insert failed).
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let facilityResult;
    if (latitude && longitude) {
      facilityResult = await client.query(
        `INSERT INTO facilities (name, type, license_number, district, address, phone, operating_hours, location, status) VALUES ($1,$2,$3,$4,$5,$6,$7,ST_GeogFromText('SRID=4326;POINT(' || $8 || ' ' || $9 || ')'),'pending') RETURNING id, name, status`,
        [facilityName, facilityType, licenseNumber, district, address, phone, operatingHours, longitude, latitude]
      );
    } else {
      facilityResult = await client.query(
        `INSERT INTO facilities (name, type, license_number, district, address, phone, operating_hours, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING id, name, status`,
        [facilityName, facilityType, licenseNumber, district, address, phone, operatingHours]
      );
    }
    const facility = facilityResult.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO facility_staff (facility_id, phone, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5,'admin')`,
      [facility.id, adminPhone, adminEmail || null, passwordHash, adminName]
    );

    await client.query("COMMIT");
    return {
      message: "Registration submitted! You will receive an email once your facility is approved.",
      facility: { id: facility.id, name: facility.name, status: facility.status },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    // Give a clearer message for the most common real cause (duplicate email slipping past the pre-check in a race)
    if (err.code === "23505") throw new Error("An account with this phone number or email already exists.");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { registerPatient, loginPatient, loginStaff, loginAdmin, sendOTP, verifyOTP, resetPassword, getProfile, registerFacility };