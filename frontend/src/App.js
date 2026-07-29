import { useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import PatientSearch        from "./pages/PatientSearch";
import PatientAccount       from "./pages/PatientAccount";
import FacilityDashboard    from "./pages/FacilityDashboard";
import FacilityRegistration from "./pages/FacilityRegistration";
import AdminPanel           from "./pages/AdminPanel";
import Login                from "./pages/Login";
import Register             from "./pages/Register";

function Router() {
  const { user, role, logout } = useAuth();
  const [page, setPage] = useState("search");
  if (role === "staff") return <FacilityDashboard onLogout={logout} />;
  if (role === "admin") return <AdminPanel onLogout={logout} />;
  if (page === "login" && !role)    return <Login onSwitchToRegister={() => setPage("register")} onSwitchToFacility={() => setPage("register-facility")} />;
  if (page === "register")          return <Register onSwitchToLogin={() => setPage("login")} />;
  if (page === "register-facility") return <FacilityRegistration onSwitchToLogin={() => setPage("login")} />;
  if (page === "account" && role === "patient") return <PatientAccount onBack={() => setPage("search")} onLogout={() => { logout(); setPage("search"); }} />;
  return <PatientSearch user={user} onLoginClick={() => setPage("login")} onAccountClick={() => setPage("account")} onLogout={() => { logout(); setPage("search"); }} />;
}

export default function App() {
  return <AuthProvider><Router /></AuthProvider>;
}
