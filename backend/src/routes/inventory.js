const express = require("express");
const router = express.Router();
const inventoryService = require("../services/inventoryService");
const { authenticate, requireStaff } = require("../middleware/auth");

// All inventory routes require a logged-in staff member
router.use(authenticate, requireStaff);

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/inventory
//  Staff — get full inventory list for their facility
//
//  Query params:
//    category  — filter by drug category
//    status    — filter by: in_stock | low_stock | out_of_stock
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { category, status } = req.query;

  // Validate status filter if provided
  const validStatuses = ["in_stock", "low_stock", "out_of_stock"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(", ")}` });
  }

  try {
    const inventory = await inventoryService.getFacilityInventory({
      facilityId: req.user.facilityId,
      category: category || null,
      status: status || null,
    });
    return res.status(200).json({ inventory });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/inventory
//  Staff — add a new drug to their facility's inventory
//
//  Body: { drugId, quantity, lowThreshold }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { drugId, quantity, lowThreshold } = req.body;

  if (!drugId || quantity === undefined) {
    return res.status(400).json({ error: "drugId and quantity are required." });
  }
  if (quantity < 0) {
    return res.status(400).json({ error: "Quantity cannot be negative." });
  }

  try {
    const item = await inventoryService.addDrugToInventory({
      facilityId: req.user.facilityId,
      drugId,
      quantity: Number(quantity),
      lowThreshold: lowThreshold ? Number(lowThreshold) : 10,
      staffId: req.user.id,
    });
    return res.status(201).json({ message: "Drug added to inventory.", item });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PATCH /api/inventory/:inventoryId
//  Staff — update stock quantity and/or threshold for one drug
//  This is the primary daily action (NFR 10: done in ≤3 taps)
//
//  Body: { quantity?, lowThreshold?, note? }
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:inventoryId", async (req, res) => {
  const { inventoryId } = req.params;
  const { quantity, lowThreshold, note } = req.body;

  if (quantity === undefined && lowThreshold === undefined) {
    return res.status(400).json({ error: "Provide at least quantity or lowThreshold to update." });
  }
  if (quantity !== undefined && quantity < 0) {
    return res.status(400).json({ error: "Quantity cannot be negative." });
  }

  try {
    const updated = await inventoryService.updateStock({
      facilityId: req.user.facilityId,
      inventoryId,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      lowThreshold: lowThreshold !== undefined ? Number(lowThreshold) : undefined,
      note: note || null,
      staffId: req.user.id,
    });
    return res.status(200).json({ message: "Stock updated.", item: updated });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PATCH /api/inventory/:inventoryId/out-of-stock
//  Staff — mark a drug as out of stock in one action (FR 2.3)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:inventoryId/out-of-stock", async (req, res) => {
  const { inventoryId } = req.params;

  try {
    const updated = await inventoryService.markOutOfStock({
      facilityId: req.user.facilityId,
      inventoryId,
      staffId: req.user.id,
    });
    return res.status(200).json({ message: "Drug marked as out of stock.", item: updated });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/inventory/audit
//  Staff — view the stock change history for their facility (NFR 15)
//
//  Query params:
//    drugId  — optional, filter by specific drug
//    limit   — number of records (default 50)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/audit", async (req, res) => {
  const { drugId, limit } = req.query;

  try {
    const log = await inventoryService.getAuditLog({
      facilityId: req.user.facilityId,
      drugId: drugId || null,
      limit: limit ? Math.min(Number(limit), 200) : 50,
    });
    return res.status(200).json({ audit_log: log });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
