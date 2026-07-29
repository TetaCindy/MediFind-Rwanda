const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const request = async (method, path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
};
export const api = {
  get:    (path, token)       => request("GET",    path, null, token),
  post:   (path, body, token) => request("POST",   path, body, token),
  patch:  (path, body, token) => request("PATCH",  path, body, token),
  delete: (path, token)       => request("DELETE", path, null, token),
};
export const authAPI = {
  loginPatient:     (body)  => api.post("/auth/patient/login",     body),
  loginStaff:       (body)  => api.post("/auth/staff/login",       body),
  loginAdmin:       (body)  => api.post("/auth/admin/login",       body),
  register:         (body)  => api.post("/auth/patient/register",  body),
  registerFacility: (body)  => api.post("/auth/facility/register", body),
  sendOTP:          (body)  => api.post("/auth/otp/send",          body),
  verifyOTP:        (body)  => api.post("/auth/otp/verify",        body),
  resetPassword:    (body)  => api.post("/auth/password/reset",    body),
  me:               (token) => api.get("/auth/me",                 token),
};
export const drugsAPI = {
  search:     (q)             => api.get(`/drugs/search?q=${encodeURIComponent(q)}`),
  all:        ()              => api.get("/drugs"),
  facilities: (id, lat, lng, p) => api.get(`/drugs/${id}/facilities?lat=${lat}&lng=${lng}&${p}`),
};
export const inventoryAPI = {
  get:     (token, params)    => api.get(`/inventory?${params||""}`, token),
  add:     (body, token)      => api.post("/inventory",              body, token),
  update:  (id, body, token)  => api.patch(`/inventory/${id}`,       body, token),
  markOut: (id, token)        => api.patch(`/inventory/${id}/out-of-stock`, {}, token),
  auditLog:(token)            => api.get("/inventory/audit",         token),
};
export const notifAPI = {
  watch:          (body, token)   => api.post("/notifications/watch",      body, token),
  unwatch:        (drugId, token) => api.delete(`/notifications/watch/${drugId}`, token),
  watchList:      (token)         => api.get("/notifications/watch",       token),
  myNotifs:       (token)         => api.get("/notifications",             token),
  facilityNotifs: (token)         => api.get("/notifications/facility",    token),
};
export const adminAPI = {
  facilities:     (status, token)       => api.get(`/admin/facilities${status?"?status="+status:""}`, token),
  approve:        (id, token)           => api.patch(`/admin/facilities/${id}/approve`, {}, token),
  reject:         (id, token)           => api.patch(`/admin/facilities/${id}/reject`,  {}, token),
  toggleFacility: (id, status, token)   => api.patch(`/admin/facilities/${id}/status`,  {status}, token),
  analytics:      (token)               => api.get("/admin/analytics",       token),
  addDrug:        (body, token)         => api.post("/admin/drugs",           body, token),
  updateDrug:     (id, body, token)     => api.patch(`/admin/drugs/${id}`,    body, token),
  toggleDrug:     (id, isActive, token) => api.patch(`/admin/drugs/${id}/status`, {isActive}, token),
  toggleUser:     (id, isActive, token) => api.patch(`/admin/users/${id}/status`, {isActive}, token),
};
