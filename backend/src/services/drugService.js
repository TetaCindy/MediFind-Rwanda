const pool = require("../config/db");

// ─────────────────────────────────────────────────────────────────────────────
//  Search drugs by name (autocomplete)
//  Supports both English and Kinyarwanda names
// ─────────────────────────────────────────────────────────────────────────────
const searchDrugsByName = async (query) => {
  if (!query || query.trim().length < 2) return [];

  const result = await pool.query(
    `SELECT id, name_en, name_kin, category, unit
     FROM drugs
     WHERE is_active = TRUE
       AND (
         name_en  ILIKE $1
         OR name_kin ILIKE $1
       )
     ORDER BY
       CASE WHEN name_en ILIKE $2 THEN 0 ELSE 1 END,
       name_en ASC
     LIMIT 10`,
    [`%${query}%`, `${query}%`]
  );

  return result.rows;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Get all drugs (for master list / dropdown)
// ─────────────────────────────────────────────────────────────────────────────
const getAllDrugs = async () => {
  const result = await pool.query(
    `SELECT id, name_en, name_kin, category, unit
     FROM drugs
     WHERE is_active = TRUE
     ORDER BY category ASC, name_en ASC`
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Find facilities that have a drug in stock, ranked by proximity
//
//  Parameters:
//    drugId    — UUID of the drug being searched
//    lat/lng   — patient's current GPS coordinates
//    radiusKm  — search radius (default 10km)
//    typeFilter — optional: 'Pharmacy' | 'Health Center' | 'Hospital'
//    sortBy    — 'distance' (default) | 'updated'
// ─────────────────────────────────────────────────────────────────────────────
const findFacilitiesWithDrug = async ({
  drugId,
  lat,
  lng,
  radiusKm = 10,
  typeFilter = null,
  sortBy = "distance",
}) => {
  // Build optional type filter
  const typeCondition = typeFilter ? "AND f.type = $5" : "";
  const params = typeFilter
    ? [drugId, lng, lat, radiusKm * 1000, typeFilter]
    : [drugId, lng, lat, radiusKm * 1000];

  const orderClause =
    sortBy === "updated"
      ? "i.updated_at DESC"
      : "distance_m ASC";

  const result = await pool.query(
    `SELECT
       f.id,
       f.name,
       f.type,
       f.address,
       f.phone,
       f.operating_hours,
       f.district,
       i.quantity,
       i.status,
       i.updated_at           AS last_updated,
       d.name_en              AS drug_name_en,
       d.name_kin             AS drug_name_kin,
       d.unit,
       -- Distance in metres using PostGIS
       ST_Distance(
         f.location,
         ST_GeogFromText('SRID=4326;POINT(' || $2 || ' ' || $3 || ')')
       ) AS distance_m
     FROM inventory i
     JOIN facilities f ON f.id = i.facility_id
     JOIN drugs     d ON d.id = i.drug_id
     WHERE
       i.drug_id     = $1
       AND i.status  IN ('in_stock', 'low_stock')
       AND f.status  = 'active'
       AND ST_Distance(
             f.location,
             ST_GeogFromText('SRID=4326;POINT(' || $2 || ' ' || $3 || ')')
           ) <= $4
       ${typeCondition}
     ORDER BY ${orderClause}`,
    params
  );

  // Format distance nicely
  return result.rows.map((row) => ({
    ...row,
    distance_km: parseFloat((row.distance_m / 1000).toFixed(1)),
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
//  Get a single drug's availability summary (used on drug detail page)
// ─────────────────────────────────────────────────────────────────────────────
const getDrugAvailabilitySummary = async (drugId) => {
  const drug = await pool.query(
    "SELECT * FROM drugs WHERE id = $1 AND is_active = TRUE",
    [drugId]
  );
  if (drug.rows.length === 0) return null;

  const counts = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE i.status = 'in_stock')    AS in_stock_count,
       COUNT(*) FILTER (WHERE i.status = 'low_stock')   AS low_stock_count,
       COUNT(*) FILTER (WHERE i.status = 'out_of_stock') AS out_stock_count
     FROM inventory i
     JOIN facilities f ON f.id = i.facility_id
     WHERE i.drug_id = $1 AND f.status = 'active'`,
    [drugId]
  );

  return {
    drug: drug.rows[0],
    availability: counts.rows[0],
  };
};

module.exports = {
  searchDrugsByName,
  getAllDrugs,
  findFacilitiesWithDrug,
  getDrugAvailabilitySummary,
};
