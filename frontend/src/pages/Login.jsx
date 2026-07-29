import { useState } from "react";
import { authAPI } from "../api";
import { useAuth } from "../AuthContext";
const C = { teal:{50:"#E1F5EE",100:"#9FE1CB",400:"#1D9E75",600:"#0F6E56",800:"#085041"}, red:{50:"#FCEBEB",400:"#E24B4A"}, gray:{50:"#F1EFE8",100:"#D3D1C7",400:"#888780",600:"#5F5E5A",900:"#2C2C2A"} };
const inp = () => ({ width:"100%",height:44,padding:"0 14px",fontSize:14,border:`1.5px solid #D3D1C7`,borderRadius:10,outline:"none",color:"#2C2C2A",fontFamily:"Georgia,serif",boxSizing:"border-box" });
const otpInp = () => ({ width:"100%",height:52,padding:"0 14px",fontSize:22,letterSpacing:"0.4em",textAlign:"center",border:"1.5px solid #D3D1C7",borderRadius:10,outline:"none",color:"#2C2C2A",fontFamily:"Georgia,serif",boxSizing:"border-box" });

export default function Login({ onSwitchToRegister, onSwitchToFacility }) {
  const { login } = useAuth();
  const [mode,setMode]=useState("login"); // "login" | "forgot-phone" | "forgot-otp"
  const [tab,setTab]=useState("patient");
  const [phone,setPhone]=useState("");
  const [password,setPassword]=useState("");
  const [code,setCode]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  const [loading,setLoading]=useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); if (!phone||!password){setError("Phone and password required.");return;} setLoading(true);setError("");
    try {
      let data;
      if(tab==="patient"){data=await authAPI.loginPatient({phone,password});login(data.user,data.token,"patient");}
      else if(tab==="staff"){data=await authAPI.loginStaff({phone,password});login(data.staff,data.token,"staff");}
      else{data=await authAPI.loginAdmin({phone,password});login(data.user,data.token,"admin");}
    } catch(err){setError(err.message);} finally{setLoading(false);}
  };

  const handleSendResetOTP = async (e) => {
    e.preventDefault(); setError("");
    if(!phone){setError("Enter your phone number.");return;}
    setLoading(true);
    try{
      await authAPI.sendOTP({ phone, purpose: "password_reset" });
      setInfo(`We sent a 6-digit code to the email on file for this account.`);
      setMode("forgot-otp");
    }catch(err){ setError(err.message); }
    finally{ setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError("");
    if(!code||code.length<6){setError("Enter the 6-digit code.");return;}
    if(!newPassword||newPassword.length<8){setError("New password must be at least 8 characters.");return;}
    setLoading(true);
    try{
      await authAPI.verifyOTP({ phone, code, purpose: "password_reset" });
      await authAPI.resetPassword({ phone, newPassword });
      setInfo("Password updated! Please sign in with your new password.");
      setMode("login"); setPassword(""); setCode(""); setNewPassword("");
    }catch(err){ setError(err.message); }
    finally{ setLoading(false); }
  };

  return (
    <div style={{fontFamily:"Georgia,serif",background:"#F4F7F4",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:28}}><span style={{background:C.teal[400],color:"#fff",borderRadius:10,padding:"6px 16px",fontWeight:700,fontSize:20}}>Medi<span style={{color:C.teal[50]}}>Find</span></span><p style={{color:C.gray[400],fontSize:13,marginTop:10}}>Real-Time Medication Stock Tracker</p></div>
        <div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:18,padding:"28px 28px 24px"}}>

          {mode==="login" && (
            <>
              <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:C.gray[900],textAlign:"center"}}>Sign In</h2>
              <div style={{display:"flex",background:C.gray[50],border:`1px solid ${C.gray[100]}`,borderRadius:10,overflow:"hidden",marginBottom:24}}>
                {[["patient","Patient"],["staff","Facility Staff"],["admin","Admin"]].map(([v,l])=>(
                  <button key={v} onClick={()=>{setTab(v);setError("");}} style={{flex:1,padding:"8px 4px",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:tab===v?C.teal[400]:"transparent",color:tab===v?"#fff":C.gray[600]}}>{l}</button>
                ))}
              </div>
              <form onSubmit={handleLogin}>
                {error&&<div style={{background:C.red[50],border:`1px solid ${C.red[400]}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.red[400]}}>⚠ {error}</div>}
                {info&&<div style={{background:C.teal[50],border:`1px solid ${C.teal[100]}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.teal[800]}}>✓ {info}</div>}
                <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray[600],marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Phone Number</label><input style={inp()} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+250 788 000 000" /></div>
                <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray[600],marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Password</label><input style={inp()} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" /></div>
                {tab==="patient"&&<p style={{textAlign:"right",margin:"0 0 16px"}}><span onClick={()=>{setMode("forgot-phone");setError("");setInfo("");}} style={{fontSize:12,color:C.teal[600],fontWeight:600,cursor:"pointer"}}>Forgot password?</span></p>}
                <button type="submit" disabled={loading} style={{width:"100%",height:46,background:loading?C.gray[100]:C.teal[400],color:loading?C.gray[400]:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>{loading?"Signing in…":"Sign In"}</button>
              </form>
              {tab==="patient"&&<p style={{textAlign:"center",marginTop:16,fontSize:13,color:C.gray[400]}}>No account? <span onClick={onSwitchToRegister} style={{color:C.teal[600],fontWeight:600,cursor:"pointer"}}>Create one free</span></p>}
              {tab==="staff"&&<p style={{textAlign:"center",marginTop:16,fontSize:13,color:C.gray[400]}}>New facility? <span onClick={onSwitchToFacility} style={{color:C.teal[600],fontWeight:600,cursor:"pointer"}}>Register your facility</span></p>}
            </>
          )}

          {mode==="forgot-phone" && (
            <>
              <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:C.gray[900],textAlign:"center"}}>Reset Password</h2>
              <p style={{textAlign:"center",fontSize:13,color:C.gray[600],margin:"0 0 20px"}}>Enter your phone number and we'll email a code to the address on file.</p>
              <form onSubmit={handleSendResetOTP}>
                {error&&<div style={{background:C.red[50],border:`1px solid ${C.red[400]}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.red[400]}}>⚠ {error}</div>}
                <div style={{marginBottom:20}}><label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray[600],marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Phone Number</label><input style={inp()} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+250 788 000 000" autoFocus /></div>
                <button type="submit" disabled={loading} style={{width:"100%",height:46,background:loading?C.gray[100]:C.teal[400],color:loading?C.gray[400]:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>{loading?"Sending code…":"Send Code"}</button>
              </form>
              <p style={{textAlign:"center",marginTop:16,fontSize:13,color:C.gray[400]}}><span onClick={()=>{setMode("login");setError("");}} style={{color:C.gray[600],fontWeight:600,cursor:"pointer"}}>← Back to Sign In</span></p>
            </>
          )}

          {mode==="forgot-otp" && (
            <>
              <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:C.gray[900],textAlign:"center"}}>Enter Code & New Password</h2>
              <p style={{textAlign:"center",fontSize:13,color:C.gray[600],margin:"0 0 20px"}}>{info}</p>
              <form onSubmit={handleResetPassword}>
                {error&&<div style={{background:C.red[50],border:`1px solid ${C.red[400]}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.red[400]}}>⚠ {error}</div>}
                <div style={{marginBottom:18}}>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray[600],marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>6-digit code</label>
                  <input style={otpInp()} type="text" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} placeholder="000000" autoFocus />
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray[600],marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>New Password</label>
                  <input style={inp()} type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
                </div>
                <button type="submit" disabled={loading} style={{width:"100%",height:46,background:loading?C.gray[100]:C.teal[400],color:loading?C.gray[400]:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>{loading?"Updating…":"Reset Password"}</button>
              </form>
              <p style={{textAlign:"center",marginTop:16,fontSize:13,color:C.gray[400]}}>
                Didn't get a code? <span onClick={handleSendResetOTP} style={{color:C.teal[600],fontWeight:600,cursor:"pointer"}}>Resend</span>
                {" · "}
                <span onClick={()=>{setMode("login");setError("");setInfo("");}} style={{color:C.gray[600],fontWeight:600,cursor:"pointer"}}>Cancel</span>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
