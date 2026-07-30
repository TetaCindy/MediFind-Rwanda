const jwt = require("jsonwebtoken");

// Verify any valid JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, facilityId (if staff) }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// Role guards
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
};

const requireStaff = (req, res, next) => {
  if (!["staff", "facility_admin", "admin"].includes(req.user?.role)) {
    return res.status(403).json({ error: "Facility staff access required." });
  }
  next();
};

const requirePatient = (req, res, next) => {
  if (req.user?.role !== "patient") {
    return res.status(403).json({ error: "Patient account required." });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireStaff, requirePatient };
