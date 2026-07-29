const express = require("express");
const router = express.Router();
const drugService = require("../services/drugService");
const { authenticate } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/drugs
//  Public — get the full master drug list (for autocomplete dropdowns)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const drugs = await drugService.getAllDrugs();
    return res.status(200).json({ drugs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/drugs/search?q=amox
//  Public — autocomplete drug name search (bilingual EN + KIN)
//
//  Query params:
//    q  — search term (min 2 chars)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: "Search query must be at least 2 characters." });
  }

  try {
    const drugs = await drugService.searchDrugsByName(q.trim());
    return res.status(200).json({ drugs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/drugs/:drugId/facilities
//  Public — find facilities that have this drug in stock, ranked by proximity
//
//  Query params:
//    lat        — patient latitude  (required)
//    lng        — patient longitude (required)
//    radius     — search radius in km (default: 10)
//    type       — facility type filter: Pharmacy | Health Center | Hospital
//    sort       — distance (default) | updated
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:drugId/facilities", async (req, res) => {
  const { drugId } = req.params;
  const { lat, lng, radius, type, sort } = req.query;

  // lat and lng are required for proximity search
  if (!lat || !lng) {
    return res.status(400).json({
      error: "Patient location required. Provide lat and lng query parameters.",
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  // Basic coordinate validation for Rwanda
  if (
    isNaN(parsedLat) || isNaN(parsedLng) ||
    parsedLat < -3.0 || parsedLat > -1.0 ||
    parsedLng < 28.8 || parsedLng > 30.9
  ) {
    return res.status(400).json({ error: "Coordinates appear to be outside Rwanda." });
  }

  try {
    const facilities = await drugService.findFacilitiesWithDrug({
      drugId,
      lat: parsedLat,
      lng: parsedLng,
      radiusKm: radius ? Math.min(Number(radius), 50) : 10,
      typeFilter: type || null,
      sortBy: sort || "distance",
    });

    return res.status(200).json({
      drug_id: drugId,
      count: facilities.length,
      facilities,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/drugs/:drugId/summary
//  Public — get availability summary for a drug across all active facilities
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:drugId/summary", async (req, res) => {
  try {
    const summary = await drugService.getDrugAvailabilitySummary(req.params.drugId);
    if (!summary) return res.status(404).json({ error: "Drug not found." });
    return res.status(200).json(summary);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
