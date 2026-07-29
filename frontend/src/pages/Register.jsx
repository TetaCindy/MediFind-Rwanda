import { useState } from "react";
import { authAPI } from "../api";
import { useAuth } from "../AuthContext";
const C = { teal:{50:"#E1F5EE",100:"#9FE1CB",400:"#1D9E75",600:"#0F6E56"}, red:{50:"#FCEBEB",400:"#E24B4A"}, gray:{100:"#D3D1C7",400:"#888780",600:"#5F5E5A",900:"#2C2C2A"} };
const inp = () => ({ width:"100%",height:44,padding:"0 14px",fontSize:14,border:"1.5px solid #D3D1C7",borderRadius:10,outline:"none",color:"#2C2C2A",fontFamily:"Georgia,serif",boxSizing:"border-box" });
const otpInp = () => ({ width:"100%",height:52,padding:"0 14px",fontSize:22,letterSpacing:"0.4em",textAlign:"center",border:"1.5px solid #D3D1C7",borderRadius:10,outline:"none",color:"#2C2C2A",fontFamily:"Georgia,serif",boxSizing:"border-box" });

export default function Register({ onSwitchToLogin }) {
  const { login } = useAuth();
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [form,setForm]=useState({fullName:"",phone:"",email:"",password:"",confirm:""});
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  const [loading,setLoading]=useState(false);
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));

  // Step 1: validate form, then send OTP to the phone number
  const handleSendOTP = async (e) => {
    e.preventDefault(); setError("");
    if(!form.fullName||!form.phone||!form.email||!form.password){setError("Name, phone, email and password are required.");return;}
    if(!/^\S+@\S+\.\S+$/.test(form.email)){setError("Enter a valid email address — this is where your verification code will be sent.");return;}
    if(form.password.length<8){setError("Password must be at least 8 characters.");return;}
    if(form.password!==form.confirm){setError("Passwords do not match.");return;}
    setLoading(true);
    try{
      await authAPI.sendOTP({ phone: form.phone, email: form.email, purpose: "registration" });
      setInfo(`We sent a 6-digit code to ${form.email}.`);
      setStep("otp");
    }catch(err){ setError(err.message); }
    finally{ setLoading(false); }
  };

  // Step 2: verify the code, then actually create the account
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault(); setError("");
    if(!code||code.length<6){setError("Enter the 6-digit code.");return;}
    setLoading(true);
    try{
      await authAPI.verifyOTP({ phone: form.phone, code, purpose: "registration" });
      const data = await authAPI.register({fullName:form.fullName,phone:form.phone,email:form.email,password:form.password});
      login(data.user,data.token,"patient");
    }catch(err){ setError(err.message); }
    finally{ setLoading(false); }
  };

  const handleResend = async () => {
    setError(""); setInfo(""); setLoading(true);
    try{
      await authAPI.sendOTP({ phone: form.phone, email: form.email, purpose: "registration" });
      setInfo(`New code sent to ${form.email}.`);
    }catch(err){ setError(err.message); }
    finally{ setLoading(false); }
  };

  return (
    <div style={{fontFamily:"Georgia,serif",background:"#F4F7F4",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:28}}><span style={{background:C.teal[400],color:"#fff",borderRadius:10,padding:"6px 16px",fontWeight:700,fontSize:20}}>Medi<span style={{color:C.teal[50]}}>Find</span></span></div>
        <div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:18,padding:"28px 28px 24px"}}>

          {step === "form" ? (
            <>
              <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:C.gray[900],textAlign:"center"}}>Create Patient Account</h2>
              <form onSubmit={handleSendOTP}>
                {error&&<div style={{background:C.red[50],border:`1px solid ${C.red[400]}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.red[400]}}>⚠ {error}</div>}
                {[["Full Name","fullName","text","e.g. Amina Mukamana"],["Phone Number","phone","tel","+250 788 000 000"],["Email","email","email","you@example.com"],["Password","password","password","Min. 8 characters"],["Confirm Password","confirm","password","Re-enter password"]].map(([label,key,type,ph])=>(
                  <div key={key} style={{marginBottom:14}}><label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray[600],marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</label><input style={inp()} type={type} value={form[key]} onChange={e=>upd(key,e.target.value)} placeholder={ph} /></div>
                ))}
                <button type="submit" disabled={loading} style={{width:"100%",height:46,background:loading?"#D3D1C7":C.teal[400],color:loading?C.gray[400]:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",marginTop:6}}>{loading?"Sending code…":"Continue"}</button>
              </form>
              <p style={{textAlign:"center",marginTop:16,fontSize:13,color:C.gray[400]}}>Already have an account? <span onClick={onSwitchToLogin} style={{color:C.teal[600],fontWeight:600,cursor:"pointer"}}>Sign in</span></p>
            </>
          ) : (
            <>
              <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:C.gray[900],textAlign:"center"}}>Verify Your Phone</h2>
              <p style={{textAlign:"center",fontSize:13,color:C.gray[600],margin:"0 0 20px"}}>{info}</p>
              <form onSubmit={handleVerifyAndRegister}>
                {error&&<div style={{background:C.red[50],border:`1px solid ${C.red[400]}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.red[400]}}>⚠ {error}</div>}
                <div style={{marginBottom:18}}>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray[600],marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>6-digit code</label>
                  <input style={otpInp()} type="text" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} placeholder="000000" autoFocus />
                </div>
                <button type="submit" disabled={loading} style={{width:"100%",height:46,background:loading?"#D3D1C7":C.teal[400],color:loading?C.gray[400]:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>{loading?"Verifying…":"Verify & Create Account"}</button>
              </form>
              <p style={{textAlign:"center",marginTop:16,fontSize:13,color:C.gray[400]}}>
                Didn't get a code? <span onClick={handleResend} style={{color:C.teal[600],fontWeight:600,cursor:"pointer"}}>Resend</span>
                {" · "}
                <span onClick={()=>{setStep("form");setError("");setInfo("");}} style={{color:C.gray[600],fontWeight:600,cursor:"pointer"}}>Edit details</span>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
