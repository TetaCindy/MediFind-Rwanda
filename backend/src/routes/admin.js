const express = require("express");
const router = express.Router();
const adminService = require("../services/adminService");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.use(authenticate, requireAdmin);

router.get("/facilities", async (req, res) => {
  try { const f = await adminService.getAllFacilities({ status:req.query.status||null }); return res.status(200).json({ facilities:f }); }
  catch (err) { return res.status(500).json({ error: err.message }); }
});
router.patch("/facilities/:id/approve", async (req, res) => {
  try { const f = await adminService.approveFacility({ facilityId:req.params.id, adminId:req.user.id }); return res.status(200).json({ message:`${f.name} approved.`, facility:f }); }
  catch (err) { return res.status(400).json({ error: err.message }); }
});
router.patch("/facilities/:id/reject", async (req, res) => {
  try { const f = await adminService.rejectFacility({ facilityId:req.params.id, adminId:req.user.id }); return res.status(200).json({ message:`${f.name} rejected.`, facility:f }); }
  catch (err) { return res.status(400).json({ error: err.message }); }
});
router.patch("/facilities/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!["active","inactive"].includes(status)) return res.status(400).json({ error:"Status must be active or inactive." });
  try { const f = await adminService.toggleFacilityStatus({ facilityId:req.params.id, newStatus:status }); return res.status(200).json({ message:`Facility is now ${status}.`, facility:f }); }
  catch (err) { return res.status(400).json({ error: err.message }); }
});
router.post("/facilities/:id/staff", async (req, res) => {
  const { phone, email, password, fullName, role } = req.body;
  if (!phone||!password||!fullName) return res.status(400).json({ error:"phone, password and fullName are required." });
  try { const s = await adminService.createFacilityStaff({ facilityId:req.params.id, phone, email, password, fullName, role }); return res.status(201).json({ message:"Staff account created.", staff:s }); }
  catch (err) { return res.status(400).json({ error: err.message }); }
});
router.post("/drugs", async (req, res) => {
  try { const d = await adminService.addDrug(req.body); return res.status(201).json({ message:"Drug added.", drug:d }); }
  catch (err) { return res.status(400).json({ error: err.message }); }
});
router.patch("/drugs/:id", async (req, res) => {
  try { const d = await adminService.updateDrug({ drugId:req.params.id, ...req.body }); return res.status(200).json({ message:"Drug updated.", drug:d }); }
  catch (err) { return res.status(400).json({ error: err.message }); }
});
router.patch("/drugs/:id/status", async (req, res) => {
  if (typeof req.body.isActive !== "boolean") return res.status(400).json({ error:"isActive must be true or false." });
  try { const d = await adminService.toggleDrugStatus({ drugId:req.params.id, isActive:req.body.isActive }); return res.status(200).json({ message:`Drug is now ${req.body.isActive?"active":"inactive"}.`, drug:d }); }
  catch (err) { return res.status(400).json({ error: err.message }); }
});
router.get("/analytics", async (req, res) => {
  try { const a = await adminService.getSystemAnalytics(); return res.status(200).json(a); }
  catch (err) { return res.status(500).json({ error: err.message }); }
});
router.patch("/users/:id/status", async (req, res) => {
  if (typeof req.body.isActive !== "boolean") return res.status(400).json({ error:"isActive must be true or false." });
  try { const u = await adminService.toggleUserStatus({ userId:req.params.id, isActive:req.body.isActive }); return res.status(200).json({ message:`User is now ${req.body.isActive?"active":"inactive"}.`, user:u }); }
  catch (err) { return res.status(400).json({ error: err.message }); }
});

module.exports = router;
