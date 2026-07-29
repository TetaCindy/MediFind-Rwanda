const pool = require("../config/db");
const { sendSMS, messages } = require("./smsService");

const getFacilityInventory = async ({ facilityId, category, status }) => {
  const conditions = ["i.facility_id = $1", "f.status = 'active'"];
  const params = [facilityId];
  if (category) { params.push(category); conditions.push(`d.category = $${params.length}`); }
  if (status)   { params.push(status);   conditions.push(`i.status = $${params.length}`); }
  const result = await pool.query(
    `SELECT i.id, i.quantity, i.low_threshold, i.status, i.updated_at, d.id AS drug_id, d.name_en AS drug_name_en, d.name_kin AS drug_name_kin, d.category, d.unit, fs.full_name AS last_updated_by
     FROM inventory i JOIN drugs d ON d.id=i.drug_id JOIN facilities f ON f.id=i.facility_id LEFT JOIN facility_staff fs ON fs.id=i.last_updated_by
     WHERE ${conditions.join(" AND ")} ORDER BY d.category ASC, d.name_en ASC`, params
  );
  return result.rows;
};

const addDrugToInventory = async ({ facilityId, drugId, quantity, lowThreshold, staffId }) => {
  const drug = await pool.query("SELECT id, name_en FROM drugs WHERE id = $1 AND is_active = TRUE", [drugId]);
  if (drug.rows.length === 0) throw new Error("Drug not found or inactive.");
  const existing = await pool.query("SELECT id FROM inventory WHERE facility_id = $1 AND drug_id = $2", [facilityId, drugId]);
  if (existing.rows.length > 0) throw new Error("This drug is already in your inventory. Use the update endpoint instead.");
  const result = await pool.query(
    `INSERT INTO inventory (facility_id, drug_id, quantity, low_threshold, last_updated_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [facilityId, drugId, quantity, lowThreshold || 10, staffId]
  );
  const inv = result.rows[0];
  await writeAuditLog({ inventoryId:inv.id, facilityId, drugId, staffId, prevQty:0, newQty:quantity, prevStatus:"out_of_stock", newStatus:inv.status, note:"Drug added to inventory" });
  return inv;
};

const updateStock = async ({ facilityId, inventoryId, quantity, lowThreshold, note, staffId }) => {
  const current = await pool.query(
    `SELECT i.*, d.name_en AS drug_name, d.unit, d.id AS drug_id FROM inventory i JOIN drugs d ON d.id=i.drug_id WHERE i.id=$1 AND i.facility_id=$2`,
    [inventoryId, facilityId]
  );
  if (current.rows.length === 0) throw new Error("Inventory item not found for this facility.");
  const prev = current.rows[0];

  const updates = ["last_updated_by = $3"];
  const params  = [inventoryId, facilityId, staffId];
  if (quantity      !== undefined) { params.push(quantity);      updates.push(`quantity = $${params.length}`); }
  if (lowThreshold  !== undefined) { params.push(lowThreshold);  updates.push(`low_threshold = $${params.length}`); }

  const result = await pool.query(
    `UPDATE inventory SET ${updates.join(", ")} WHERE id=$1 AND facility_id=$2 RETURNING *`, params
  );
  const updated = result.rows[0];

  await writeAuditLog({ inventoryId, facilityId, drugId:prev.drug_id, staffId, prevQty:prev.quantity, newQty:updated.quantity, prevStatus:prev.status, newStatus:updated.status, note:note||null });

  // Get facility phone for SMS alerts
  const facility = await pool.query("SELECT phone, name FROM facilities WHERE id = $1", [facilityId]);
  const fac = facility.rows[0];

  // Low-stock SMS alert to facility (FR 4.1)
  if (updated.status === "low_stock" && prev.status === "in_stock") {
    await sendSMS(fac.phone, messages.lowStock(prev.drug_name, updated.quantity, prev.unit));
    await pool.query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, channel, message, drug_id, facility_id, status) VALUES ('facility',$1,'low_stock','sms',$2,$3,$1,'sent')`,
      [facilityId, messages.lowStock(prev.drug_name, updated.quantity, prev.unit), prev.drug_id]
    );
  }

  // Out of stock alert to facility
  if (updated.status === "out_of_stock" && prev.status !== "out_of_stock") {
    await sendSMS(fac.phone, messages.outOfStock(prev.drug_name));
  }

  // Notify watching patients when drug comes back in stock (FR 4.2)
  if (updated.status === "in_stock" && prev.status === "out_of_stock") {
    await notifyWatchingPatients({ facilityId, facilityName:fac.name, drugId:prev.drug_id });
  }

  return updated;
};

const markOutOfStock = async ({ facilityId, inventoryId, staffId }) =>
  updateStock({ facilityId, inventoryId, quantity:0, note:"Marked as out of stock", staffId });

const getAuditLog = async ({ facilityId, drugId, limit=50 }) => {
  const conditions = ["al.facility_id = $1"];
  const params = [facilityId];
  if (drugId) { params.push(drugId); conditions.push(`al.drug_id = $${params.length}`); }
  params.push(limit);
  const result = await pool.query(
    `SELECT al.id, al.prev_quantity, al.new_quantity, al.prev_status, al.new_status, al.note, al.changed_at, d.name_en AS drug_name, fs.full_name AS changed_by
     FROM inventory_audit_log al JOIN drugs d ON d.id=al.drug_id LEFT JOIN facility_staff fs ON fs.id=al.staff_id
     WHERE ${conditions.join(" AND ")} ORDER BY al.changed_at DESC LIMIT $${params.length}`, params
  );
  return result.rows;
};

const writeAuditLog = async ({ inventoryId, facilityId, drugId, staffId, prevQty, newQty, prevStatus, newStatus, note }) => {
  await pool.query(
    `INSERT INTO inventory_audit_log (inventory_id, facility_id, drug_id, staff_id, prev_quantity, new_quantity, prev_status, new_status, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [inventoryId, facilityId, drugId, staffId, prevQty, newQty, prevStatus, newStatus, note]
  );
};

const notifyWatchingPatients = async ({ facilityId, facilityName, drugId }) => {
  const watchers = await pool.query(
    `SELECT wl.user_id, wl.radius_km, wl.user_lat, wl.user_lng, u.phone,
            ST_Distance(f.location, ST_GeogFromText('SRID=4326;POINT(' || wl.user_lng || ' ' || wl.user_lat || ')')) AS distance_m
     FROM watch_list wl JOIN users u ON u.id=wl.user_id JOIN facilities f ON f.id=$1
     WHERE wl.drug_id=$2 AND wl.is_active=TRUE AND u.is_active=TRUE AND wl.user_lat IS NOT NULL`,
    [facilityId, drugId]
  );
  const drug = await pool.query("SELECT name_en FROM drugs WHERE id = $1", [drugId]);
  const drugName = drug.rows[0]?.name_en || "A medicine you are watching";

  for (const watcher of watchers.rows) {
    const distKm = parseFloat((watcher.distance_m / 1000).toFixed(1));
    if (watcher.distance_m > watcher.radius_km * 1000) continue;
    const msg = messages.drugAvailable(drugName, facilityName, distKm);
    await sendSMS(watcher.phone, msg);
    await pool.query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, channel, message, drug_id, facility_id, status, sent_at) VALUES ('patient',$1,'available','sms',$2,$3,$4,'sent',NOW())`,
      [watcher.user_id, msg, drugId, facilityId]
    );
  }
};

module.exports = { getFacilityInventory, addDrugToInventory, updateStock, markOutOfStock, getAuditLog };
