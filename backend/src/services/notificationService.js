const pool = require("../config/db");

const watchDrug = async ({ userId, drugId, radiusKm, userLat, userLng }) => {
  const drug = await pool.query("SELECT id, name_en FROM drugs WHERE id = $1 AND is_active = TRUE", [drugId]);
  if (drug.rows.length === 0) throw new Error("Drug not found.");
  const result = await pool.query(
    `INSERT INTO watch_list (user_id, drug_id, radius_km, user_lat, user_lng, is_active) VALUES ($1,$2,$3,$4,$5,TRUE)
     ON CONFLICT (user_id, drug_id) DO UPDATE SET radius_km=EXCLUDED.radius_km, user_lat=EXCLUDED.user_lat, user_lng=EXCLUDED.user_lng, is_active=TRUE RETURNING *`,
    [userId, drugId, radiusKm||5, userLat||null, userLng||null]
  );
  return { watch: result.rows[0], drug: drug.rows[0] };
};

const unwatchDrug = async ({ userId, drugId }) => {
  const result = await pool.query("UPDATE watch_list SET is_active=FALSE WHERE user_id=$1 AND drug_id=$2 RETURNING id", [userId, drugId]);
  if (result.rows.length === 0) throw new Error("Watch entry not found.");
  return { message: "Removed from watch list." };
};

const getWatchList = async ({ userId }) => {
  const result = await pool.query(
    `SELECT wl.id, wl.radius_km, wl.is_active, wl.created_at, d.id AS drug_id, d.name_en AS drug_name_en, d.name_kin AS drug_name_kin, d.category,
      (SELECT COUNT(*) FROM inventory i JOIN facilities f ON f.id=i.facility_id WHERE i.drug_id=wl.drug_id AND i.status IN ('in_stock','low_stock') AND f.status='active'
       AND wl.user_lat IS NOT NULL AND ST_Distance(f.location, ST_GeogFromText('SRID=4326;POINT(' || wl.user_lng || ' ' || wl.user_lat || ')')) <= wl.radius_km*1000) AS available_nearby
     FROM watch_list wl JOIN drugs d ON d.id=wl.drug_id WHERE wl.user_id=$1 AND wl.is_active=TRUE ORDER BY wl.created_at DESC`,
    [userId]
  );
  return result.rows;
};

const getPatientNotifications = async ({ userId, limit=20 }) => {
  const result = await pool.query(
    `SELECT n.id, n.type, n.channel, n.message, n.status, n.sent_at, n.created_at, d.name_en AS drug_name, f.name AS facility_name
     FROM notifications n LEFT JOIN drugs d ON d.id=n.drug_id LEFT JOIN facilities f ON f.id=n.facility_id
     WHERE n.recipient_id=$1 AND n.recipient_type='patient' ORDER BY n.created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

const getFacilityNotifications = async ({ facilityId, limit=30 }) => {
  const result = await pool.query(
    `SELECT n.id, n.type, n.channel, n.message, n.status, n.sent_at, n.created_at, d.name_en AS drug_name
     FROM notifications n LEFT JOIN drugs d ON d.id=n.drug_id
     WHERE n.recipient_id=$1 AND n.recipient_type='facility' ORDER BY n.created_at DESC LIMIT $2`,
    [facilityId, limit]
  );
  return result.rows;
};

module.exports = { watchDrug, unwatchDrug, getWatchList, getPatientNotifications, getFacilityNotifications };
