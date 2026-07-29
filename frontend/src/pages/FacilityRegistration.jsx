import { useState } from "react";
import { authAPI } from "../api";

const C = {
  teal:  { 50:"#E1F5EE",100:"#9FE1CB",200:"#5DCAA5",400:"#1D9E75",600:"#0F6E56",800:"#085041" },
  green: { 50:"#EAF3DE",100:"#C0DD97",400:"#639922" },
  amber: { 50:"#FAEEDA",400:"#BA7517" },
  red:   { 50:"#FCEBEB",100:"#F7C1C1",400:"#E24B4A",600:"#A32D2D" },
  gray:  { 50:"#F1EFE8",100:"#D3D1C7",400:"#888780",600:"#5F5E5A",800:"#444441",900:"#2C2C2A" },
};

const DISTRICTS = ["Gasabo","Kicukiro","Nyarugenge","Bugesera","Burera","Gakenke","Gicumbi","Gisagara","Huye","Kamonyi","Karongi","Kayonza","Muhanga","Musanze","Ngoma","Ngororero","Nyabihu","Nyagatare","Nyamasheke","Nyanza","Nyaruguru","Rubavu","Ruhango","Rulindo","Rusizi","Rutsiro","Rwamagana"];

const STEPS = [
  { id:1, label:"Facility Info",       icon:"🏥" },
  { id:2, label:"Contact & Location",  icon:"📍" },
  { id:3, label:"Admin Account",       icon:"👤" },
  { id:4, label:"Review & Submit",     icon:"✅" },
];

const EMPTY = {
  facilityName:"", facilityType:"", licenseNumber:"", operatingHours:"",
  district:"", address:"", latitude:"", longitude:"", phone:"",
  adminName:"", adminEmail:"", adminPhone:"", password:"", confirmPassword:"",
};

const inputStyle = (err) => ({
  width:"100%", height:44, padding:"0 14px", fontSize:14,
  border:`1.5px solid ${err ? C.red[400] : C.gray[100]}`,
  borderRadius:10, outline:"none", color:C.gray[900],
  fontFamily:"Georgia,serif", boxSizing:"border-box",
  background: err ? C.red[50] : "#fff",
});

const selectStyle = (err) => ({
  ...inputStyle(err), cursor:"pointer",
});

function Field({ label, required, error, hint, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.gray[600], marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>
        {label}{required && <span style={{ color:C.red[400] }}> *</span>}
      </label>
      {children}
      {hint && !error && <p style={{ margin:"4px 0 0", fontSize:11, color:C.gray[400] }}>{hint}</p>}
      {error && <p style={{ margin:"4px 0 0", fontSize:11, color:C.red[400] }}>⚠ {error}</p>}
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
function Step1({ form, setForm, errors }) {
  const upd = (k, v) => setForm(f => ({ ...f, [k]:v }));
  return (
    <>
      <Field label="Facility Name" required error={errors.facilityName}>
        <input style={inputStyle(errors.facilityName)} value={form.facilityName} onChange={e => upd("facilityName", e.target.value)} placeholder="e.g. Remera Community Pharmacy" />
      </Field>
      <Field label="Facility Type" required error={errors.facilityType}>
        <select style={selectStyle(errors.facilityType)} value={form.facilityType} onChange={e => upd("facilityType", e.target.value)}>
          <option value="">Select type…</option>
          <option value="Pharmacy">Pharmacy</option>
          <option value="Health Center">Health Center</option>
          <option value="Hospital">Hospital</option>
          <option value="Clinic">Private Clinic</option>
        </select>
      </Field>
      <Field label="Rwanda FDA License Number" required error={errors.licenseNumber} hint="Format: RWF-YYYY-NNNN">
        <input style={inputStyle(errors.licenseNumber)} value={form.licenseNumber} onChange={e => upd("licenseNumber", e.target.value)} placeholder="e.g. RWF-2025-1042" />
      </Field>
      <Field label="Operating Hours" required error={errors.operatingHours} hint="e.g. Mon–Fri 7:30–18:00 | Sat 8:00–14:00">
        <input style={inputStyle(errors.operatingHours)} value={form.operatingHours} onChange={e => upd("operatingHours", e.target.value)} placeholder="e.g. Mon–Fri 7:30–18:00" />
      </Field>
    </>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
function Step2({ form, setForm, errors }) {
  const upd = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => { upd("latitude", pos.coords.latitude.toFixed(6)); upd("longitude", pos.coords.longitude.toFixed(6)); },
      ()  => alert("Could not get location. Please enter GPS coordinates manually.")
    );
  };
  return (
    <>
      <Field label="District" required error={errors.district}>
        <select style={selectStyle(errors.district)} value={form.district} onChange={e => upd("district", e.target.value)}>
          <option value="">Select district…</option>
          {DISTRICTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Physical Address" required error={errors.address} hint="Street, sector and landmark">
        <input style={inputStyle(errors.address)} value={form.address} onChange={e => upd("address", e.target.value)} placeholder="e.g. KG 9 Ave, Remera, near roundabout" />
      </Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="GPS Latitude" hint="e.g. -1.9441">
          <input style={inputStyle(false)} type="number" step="0.0001" value={form.latitude} onChange={e => upd("latitude", e.target.value)} placeholder="-1.9441" />
        </Field>
        <Field label="GPS Longitude" hint="e.g. 30.0619">
          <input style={inputStyle(false)} type="number" step="0.0001" value={form.longitude} onChange={e => upd("longitude", e.target.value)} placeholder="30.0619" />
        </Field>
      </div>
      <button type="button" onClick={getLocation} style={{ background:C.teal[50], color:C.teal[800], border:`1px solid ${C.teal[100]}`, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer", marginBottom:14 }}>
        📍 Use My Current Location
      </button>
      <Field label="Facility Phone Number" required error={errors.phone} hint="The number patients call to reach you">
        <input style={inputStyle(errors.phone)} value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="+250 788 000 000" />
      </Field>
    </>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function Step3({ form, setForm, errors }) {
  const upd = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const [showPwd, setShowPwd] = useState(false);
  return (
    <>
      <div style={{ background:C.teal[50], border:`1px solid ${C.teal[100]}`, borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:13, color:C.teal[800] }}>
        This will be the primary administrator account for your facility on MediFind Rwanda.
      </div>
      <Field label="Full Name" required error={errors.adminName}>
        <input style={inputStyle(errors.adminName)} value={form.adminName} onChange={e => upd("adminName", e.target.value)} placeholder="e.g. Marie Uwase" />
      </Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Email Address" error={errors.adminEmail}>
          <input style={inputStyle(errors.adminEmail)} type="email" value={form.adminEmail} onChange={e => upd("adminEmail", e.target.value)} placeholder="admin@facility.rw" />
        </Field>
        <Field label="Phone Number" required error={errors.adminPhone} hint="Used for OTP & login">
          <input style={inputStyle(errors.adminPhone)} value={form.adminPhone} onChange={e => upd("adminPhone", e.target.value)} placeholder="+250 788 000 000" />
        </Field>
      </div>
      <Field label="Password" required error={errors.password} hint="At least 8 characters">
        <div style={{ position:"relative" }}>
          <input style={{ ...inputStyle(errors.password), paddingRight:48 }} type={showPwd ? "text" : "password"} value={form.password} onChange={e => upd("password", e.target.value)} placeholder="Create a strong password" />
          <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", cursor:"pointer", fontSize:16, color:C.gray[400] }}>{showPwd ? "🙈" : "👁"}</button>
        </div>
      </Field>
      <Field label="Confirm Password" required error={errors.confirmPassword}>
        <input style={inputStyle(errors.confirmPassword)} type="password" value={form.confirmPassword} onChange={e => upd("confirmPassword", e.target.value)} placeholder="Re-enter password" />
      </Field>
    </>
  );
}

// ── Step 4 — Review ───────────────────────────────────────────────────────────
function Step4({ form, agreed, setAgreed }) {
  const Row = ({ label, value }) => (
    <div style={{ display:"flex", padding:"8px 0", borderBottom:`0.5px solid ${C.gray[50]}`, fontSize:13 }}>
      <span style={{ color:C.gray[400], width:150, flexShrink:0 }}>{label}</span>
      <span style={{ color:C.gray[900], fontWeight:600 }}>{value || <span style={{ color:C.gray[200] }}>—</span>}</span>
    </div>
  );
  return (
    <>
      <div style={{ background:C.green[50], border:`1px solid ${C.green[100]}`, borderRadius:12, padding:"12px 14px", marginBottom:16, fontSize:13, color:C.green[400] }}>
        ✅ Please review carefully. Your application will be verified against the Rwanda FDA registry.
      </div>
      <div style={{ background:"#fff", border:`1px solid ${C.gray[100]}`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
        <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:C.gray[400], textTransform:"uppercase" }}>Facility</p>
        <Row label="Name"          value={form.facilityName} />
        <Row label="Type"          value={form.facilityType} />
        <Row label="License"       value={form.licenseNumber} />
        <Row label="Hours"         value={form.operatingHours} />
      </div>
      <div style={{ background:"#fff", border:`1px solid ${C.gray[100]}`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
        <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:C.gray[400], textTransform:"uppercase" }}>Location</p>
        <Row label="District"      value={form.district} />
        <Row label="Address"       value={form.address} />
        <Row label="Phone"         value={form.phone} />
        {form.latitude && <Row label="GPS" value={`${form.latitude}, ${form.longitude}`} />}
      </div>
      <div style={{ background:"#fff", border:`1px solid ${C.gray[100]}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
        <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:C.gray[400], textTransform:"uppercase" }}>Administrator</p>
        <Row label="Name"          value={form.adminName} />
        <Row label="Phone"         value={form.adminPhone} />
        <Row label="Email"         value={form.adminEmail} />
      </div>
      <div style={{ background:C.gray[50], border:`1px solid ${C.gray[100]}`, borderRadius:10, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start", fontSize:12, color:C.gray[600] }}>
        <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop:2, cursor:"pointer" }} />
        <label htmlFor="terms" style={{ cursor:"pointer", lineHeight:1.6 }}>
          I confirm all information is accurate and this facility is licensed by the Rwanda FDA. I agree to keep stock data up to date and comply with MediFind Rwanda's terms and Rwanda Law No. 058/2021 on data protection.
        </label>
      </div>
    </>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ facilityName, onBack }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 24px" }}>
      <div style={{ width:72, height:72, background:C.teal[50], border:`2px solid ${C.teal[200]}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 20px" }}>✅</div>
      <h2 style={{ margin:"0 0 10px", fontSize:22, fontWeight:700, color:C.gray[900] }}>Application Submitted!</h2>
      <p style={{ margin:"0 0 6px", fontSize:14, color:C.gray[600] }}><b>{facilityName}</b> has been received.</p>
      <p style={{ margin:"0 0 28px", fontSize:13, color:C.gray[400], maxWidth:380, marginLeft:"auto", marginRight:"auto", lineHeight:1.7 }}>
        The MediFind Rwanda team will verify your Rwanda FDA license and review your application. You'll receive an SMS within 24–48 hours.
      </p>
      <button onClick={onBack} style={{ background:C.teal[400], color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
        Back to Home
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FacilityRegistration({ onSwitchToLogin }) {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState(EMPTY);
  const [errors, setErrors]   = useState({});
  const [agreed, setAgreed]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]   = useState("");

  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.facilityName.trim())    e.facilityName    = "Facility name is required.";
      if (!form.facilityType)           e.facilityType    = "Please select a facility type.";
      if (!form.licenseNumber.trim())   e.licenseNumber   = "License number is required.";
      if (!form.operatingHours.trim())  e.operatingHours  = "Operating hours are required.";
    }
    if (s === 2) {
      if (!form.district)               e.district = "Please select a district.";
      if (!form.address.trim())         e.address  = "Physical address is required.";
      if (!form.phone.trim())           e.phone    = "Phone number is required.";
    }
    if (s === 3) {
      if (!form.adminName.trim())       e.adminName    = "Full name is required.";
      if (!form.adminPhone.trim())      e.adminPhone   = "Phone number is required.";
      if (!form.password)               e.password     = "Password is required.";
      else if (form.password.length < 8) e.password   = "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    }
    return e;
  };

  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const back = () => { setErrors({}); setApiError(""); setStep(s => s - 1); };

  const submit = async () => {
    if (!agreed) { setApiError("Please agree to the terms before submitting."); return; }
    setSubmitting(true);
    setApiError("");
    try {
      await authAPI.registerFacility({
        facilityName:    form.facilityName,
        facilityType:    form.facilityType,
        licenseNumber:   form.licenseNumber,
        operatingHours:  form.operatingHours,
        district:        form.district,
        address:         form.address,
        phone:           form.phone,
        latitude:        form.latitude  || null,
        longitude:       form.longitude || null,
        adminName:       form.adminName,
        adminEmail:      form.adminEmail,
        adminPhone:      form.adminPhone,
        password:        form.password,
      });
      setSubmitted(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div style={{ fontFamily:"Georgia,serif", background:"#F4F7F4", minHeight:"100vh" }}>
      {/* Nav */}
      <nav style={{ background:C.teal[800], padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ background:C.teal[400], borderRadius:8, padding:"3px 10px", fontWeight:700, fontSize:14, color:"#fff" }}>Medi<span style={{ color:C.teal[50] }}>Find</span></div>
        <span style={{ color:"rgba(255,255,255,0.5)" }}>/</span>
        <span style={{ color:C.teal[100], fontSize:13 }}>Register your facility</span>
      </nav>

      <div style={{ maxWidth:620, margin:"0 auto", padding:"32px 16px 60px" }}>
        {submitted ? (
          <SuccessScreen facilityName={form.facilityName} onBack={() => onSwitchToLogin && onSwitchToLogin()} />
        ) : (
          <>
            {/* Step indicators */}
            <div style={{ marginBottom:28 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                {STEPS.map(s => (
                  <div key={s.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flex:1 }}>
                    <div style={{
                      width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
                      background: step > s.id ? C.teal[400] : step === s.id ? C.teal[800] : "#fff",
                      border:`2px solid ${step >= s.id ? C.teal[400] : C.gray[100]}`,
                      color: step >= s.id ? "#fff" : C.gray[400], fontWeight:700,
                    }}>
                      {step > s.id ? "✓" : s.icon}
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, color:step===s.id ? C.teal[800] : C.gray[400], textAlign:"center", maxWidth:70 }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ height:4, background:C.gray[100], borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${progress}%`, background:C.teal[400], borderRadius:4, transition:"width 0.4s" }} />
              </div>
            </div>

            {/* Card */}
            <div style={{ background:"#fff", border:`1px solid ${C.gray[100]}`, borderRadius:18, padding:"28px 28px 24px" }}>
              <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700, color:C.gray[900] }}>{STEPS[step-1].label}</h2>
              <p style={{ margin:"0 0 20px", fontSize:13, color:C.gray[400] }}>Step {step} of {STEPS.length}</p>

              {step === 1 && <Step1 form={form} setForm={setForm} errors={errors} />}
              {step === 2 && <Step2 form={form} setForm={setForm} errors={errors} />}
              {step === 3 && <Step3 form={form} setForm={setForm} errors={errors} />}
              {step === 4 && <Step4 form={form} agreed={agreed} setAgreed={setAgreed} />}

              {apiError && (
                <div style={{ background:C.red[50], border:`1px solid ${C.red[400]}`, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:C.red[400] }}>
                  ⚠ {apiError}
                </div>
              )}

              <div style={{ display:"flex", gap:10, marginTop:8 }}>
                {step > 1 && (
                  <button onClick={back} style={{ flex:1, height:46, background:"transparent", border:`1px solid ${C.gray[100]}`, borderRadius:12, fontSize:14, fontWeight:600, color:C.gray[600], cursor:"pointer" }}>← Back</button>
                )}
                {step < 4 ? (
                  <button onClick={next} style={{ flex:2, height:46, background:C.teal[400], border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>Continue →</button>
                ) : (
                  <button onClick={submit} disabled={submitting} style={{ flex:2, height:46, background: submitting ? C.gray[100] : C.green[400], border:"none", borderRadius:12, color: submitting ? C.gray[400] : "#fff", fontSize:14, fontWeight:700, cursor: submitting ? "not-allowed" : "pointer" }}>
                    {submitting ? "Submitting…" : "Submit Application"}
                  </button>
                )}
              </div>
            </div>

            <p style={{ textAlign:"center", marginTop:18, fontSize:13, color:C.gray[400] }}>
              Already registered?{" "}
              <span onClick={onSwitchToLogin} style={{ color:C.teal[600], fontWeight:600, cursor:"pointer" }}>Sign in</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
