const express = require("express");
const router = express.Router();
const notifService = require("../services/notificationService");
const { authenticate, requirePatient, requireStaff } = require("../middleware/auth");

router.post("/watch", authenticate, requirePatient, async (req, res) => {
  const { drugId, radiusKm, userLat, userLng } = req.body;
  if (!drugId) return res.status(400).json({ error: "drugId is required." });
  try {
    const result = await notifService.watchDrug({ userId:req.user.id, drugId, radiusKm:radiusKm?Number(radiusKm):5, userLat:userLat?Number(userLat):null, userLng:userLng?Number(userLng):null });
    return res.status(201).json({ message: `Now watching ${result.drug.name_en}.`, ...result });
  } catch (err) { return res.status(400).json({ error: err.message }); }
});

router.delete("/watch/:drugId", authenticate, requirePatient, async (req, res) => {
  try {
    const result = await notifService.unwatchDrug({ userId:req.user.id, drugId:req.params.drugId });
    return res.status(200).json(result);
  } catch (err) { return res.status(400).json({ error: err.message }); }
});

router.get("/watch", authenticate, requirePatient, async (req, res) => {
  try {
    const watchList = await notifService.getWatchList({ userId: req.user.id });
    return res.status(200).json({ watch_list: watchList });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.get("/", authenticate, requirePatient, async (req, res) => {
  try {
    const notifications = await notifService.getPatientNotifications({ userId:req.user.id, limit:req.query.limit?Number(req.query.limit):20 });
    return res.status(200).json({ notifications });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.get("/facility", authenticate, requireStaff, async (req, res) => {
  try {
    const notifications = await notifService.getFacilityNotifications({ facilityId:req.user.facilityId, limit:req.query.limit?Number(req.query.limit):30 });
    return res.status(200).json({ notifications });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

module.exports = router;
