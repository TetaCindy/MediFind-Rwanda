const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { sendSMS, messages } = require("./smsService");

const getAllFacilities = async ({ status }) => {
  const params = [];
  const where  = status ? "WHERE f.status = $1" : "";
  if (status) params.push(status);
  const result = await pool.query(
    `SELECT f.id, f.name, f.type, f.license_number, f.district, f.address, f.phone, f.status, f.created_at, f.approved_at, u.full_name AS approved_by_name, COUNT(i.id) AS drug_count, MAX(i.updated_at) AS last_inventory_update
     FROM facilities f LEFT JOIN users u ON u.id=f.approved_by LEFT JOIN inventory i ON i.facility_id=f.id ${where}
     GROUP BY f.id, u.full_name ORDER BY f.created_at DESC`, params
  );
  return result.rows;
};

// Approve facility — sends SMS to the facility admin (FR 5.1)
const approveFacility = async ({ facilityId, adminId }) => {
  const result = await pool.query(
    `UPDATE facilities SET status='active', approved_by=$2, approved_at=NOW() WHERE id=$1 AND status='pending' RETURNING id, name, phone, status`,
    [facilityId, adminId]
  );
  if (result.rows.length === 0) throw new Error("Facility not found or is not pending approval.");
  const facility = result.rows[0];

  // Get the facility's admin staff phone
  const staff = await pool.query("SELECT phone FROM facility_staff WHERE facility_id = $1 AND role = 'admin' LIMIT 1", [facilityId]);
  if (staff.rows.length > 0) {
    await sendSMS(staff.rows[0].phone, messages.facilityApproved(facility.name));
  }

  return facility;
};

// Reject facility — sends SMS to the facility admin
const rejectFacility = async ({ facilityId, adminId }) => {
  const result = await pool.query(
    `UPDATE facilities SET status='rejected', approved_by=$2, approved_at=NOW() WHERE id=$1 AND status='pending' RETURNING id, name, status`,
    [facilityId, adminId]
  );
  if (result.rows.length === 0) throw new Error("Facility not found or not pending.");
  const facility = result.rows[0];

  const staff = await pool.query("SELECT phone FROM facility_staff WHERE facility_id = $1 AND role = 'admin' LIMIT 1", [facilityId]);
  if (staff.rows.length > 0) {
    await sendSMS(staff.rows[0].phone, messages.facilityRejected(facility.name));
  }

  return facility;
};

const toggleFacilityStatus = async ({ facilityId, newStatus }) => {
  const result = await pool.query("UPDATE facilities SET status=$1 WHERE id=$2 RETURNING id, name, status", [newStatus, facilityId]);
  if (result.rows.length === 0) throw new Error("Facility not found.");
  return result.rows[0];
};

const createFacilityStaff = async ({ facilityId, phone, email, password, fullName, role }) => {
  const existing = await pool.query("SELECT id FROM facility_staff WHERE phone = $1", [phone]);
  if (existing.rows.length > 0) throw new Error("Phone number already in use.");
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO facility_staff (facility_id, phone, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, phone, full_name, role, facility_id`,
    [facilityId, phone, email || null, passwordHash, fullName, role || "staff"]
  );
  return result.rows[0];
};

const addDrug = async ({ nameEn, nameKin, category, unit, description }) => {
  if (!nameEn || !category || !unit) throw new Error("nameEn, category, and unit are required.");
  const result = await pool.query(
    `INSERT INTO drugs (name_en, name_kin, category, unit, description) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [nameEn, nameKin || null, category, unit, description || null]
  );
  return result.rows[0];
};

const updateDrug = async ({ drugId, nameEn, nameKin, category, unit, description }) => {
  const result = await pool.query(
    `UPDATE drugs SET name_en=COALESCE($2,name_en), name_kin=COALESCE($3,name_kin), category=COALESCE($4,category), unit=COALESCE($5,unit), description=COALESCE($6,description) WHERE id=$1 RETURNING *`,
    [drugId, nameEn, nameKin, category, unit, description]
  );
  if (result.rows.length === 0) throw new Error("Drug not found.");
  return result.rows[0];
};

const toggleDrugStatus = async ({ drugId, isActive }) => {
  const result = await pool.query("UPDATE drugs SET is_active=$1 WHERE id=$2 RETURNING id, name_en, is_active", [isActive, drugId]);
  if (result.rows.length === 0) throw new Error("Drug not found.");
  return result.rows[0];
};

const getSystemAnalytics = async () => {
  const [facilities, topDrugs, stale, users] = await Promise.all([
    pool.query("SELECT status, COUNT(*) AS count FROM facilities GROUP BY status"),
    pool.query(`SELECT d.name_en, COUNT(wl.id) AS watch_count FROM watch_list wl JOIN drugs d ON d.id=wl.drug_id WHERE wl.is_active=TRUE GROUP BY d.name_en ORDER BY watch_count DESC LIMIT 10`),
    pool.query(`SELECT f.id, f.name, f.phone, MAX(i.updated_at) AS last_update FROM facilities f LEFT JOIN inventory i ON i.facility_id=f.id WHERE f.status='active' GROUP BY f.id,f.name,f.phone HAVING MAX(i.updated_at) < NOW() - INTERVAL '48 hours' OR MAX(i.updated_at) IS NULL ORDER BY last_update ASC NULLS FIRST`),
    pool.query("SELECT COUNT(*) AS total FROM users WHERE role='patient' AND is_active=TRUE"),
  ]);
  const facilityStats = {};
  facilities.rows.forEach(r => { facilityStats[r.status] = Number(r.count); });
  return { facilities: facilityStats, total_patients: Number(users.rows[0].total), top_drugs: topDrugs.rows, stale_facilities: stale.rows };
};

const toggleUserStatus = async ({ userId, isActive }) => {
  const result = await pool.query("UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, full_name, phone, role, is_active", [isActive, userId]);
  if (result.rows.length === 0) throw new Error("User not found.");
  return result.rows[0];
};

module.exports = { getAllFacilities, approveFacility, rejectFacility, toggleFacilityStatus, createFacilityStaff, addDrug, updateDrug, toggleDrugStatus, getSystemAnalytics, toggleUserStatus };
