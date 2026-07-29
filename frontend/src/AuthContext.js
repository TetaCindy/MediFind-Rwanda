import { createContext, useContext, useState, useEffect } from "react";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user,setUser]=useState(null); const [token,setToken]=useState(null); const [role,setRole]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const t=localStorage.getItem("mf_token"); const u=localStorage.getItem("mf_user"); const r=localStorage.getItem("mf_role");
    if(t&&u){setToken(t);setUser(JSON.parse(u));setRole(r);}
    setLoading(false);
  },[]);
  const login=(userData,userToken,userRole)=>{setUser(userData);setToken(userToken);setRole(userRole);localStorage.setItem("mf_token",userToken);localStorage.setItem("mf_user",JSON.stringify(userData));localStorage.setItem("mf_role",userRole);};
  const logout=()=>{setUser(null);setToken(null);setRole(null);localStorage.removeItem("mf_token");localStorage.removeItem("mf_user");localStorage.removeItem("mf_role");};
  return <AuthContext.Provider value={{user,token,role,loading,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
