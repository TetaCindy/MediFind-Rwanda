import { useState, useEffect } from "react";
import { adminAPI } from "../api";
import { useAuth } from "../AuthContext";
const C = { teal:{50:"#E1F5EE",100:"#9FE1CB",400:"#1D9E75",600:"#0F6E56",800:"#085041"}, green:{50:"#EAF3DE",100:"#C0DD97",400:"#639922"}, amber:{50:"#FAEEDA",100:"#FAC775",400:"#BA7517"}, red:{50:"#FCEBEB",100:"#F7C1C1",400:"#E24B4A",600:"#A32D2D"}, blue:{50:"#E6F1FB",100:"#B5D4F4",600:"#185FA5"}, gray:{50:"#F1EFE8",100:"#D3D1C7",400:"#888780",600:"#5F5E5A",800:"#444441",900:"#2C2C2A"} };
export default function AdminPanel({ onLogout }) {
  const { token } = useAuth();
  const [tab,setTab]=useState("overview"); const [analytics,setAnalytics]=useState(null); const [facilities,setFacilities]=useState([]); const [loading,setLoading]=useState(true); const [toast,setToast]=useState(null);
  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const load=async()=>{setLoading(true);try{const[a,f]=await Promise.all([adminAPI.analytics(token),adminAPI.facilities(null,token)]);setAnalytics(a);setFacilities(f.facilities||[]);}catch(e){showToast(e.message,"warn");}finally{setLoading(false);};};
  useEffect(()=>{if(token)load();},[token]);
  const handleApprove=async(id,name)=>{try{await adminAPI.approve(id,token);showToast(`${name} approved.`);load();}catch(e){showToast(e.message,"warn");}};
  const handleReject=async(id,name)=>{try{await adminAPI.reject(id,token);showToast(`${name} rejected.`,"warn");load();}catch(e){showToast(e.message,"warn");}};
  const handleToggle=async(id,name,status)=>{const ns=status==="active"?"inactive":"active";try{await adminAPI.toggleFacility(id,ns,token);showToast(`${name} is now ${ns}.`);load();}catch(e){showToast(e.message,"warn");}};
  const pending=facilities.filter(f=>f.status==="pending");
  const TABS=[["overview","📊 Overview"],["approvals",`✅ Approvals${pending.length>0?" ("+pending.length+")":""}`],["facilities","🏥 Facilities"]];
  return (
    <div style={{fontFamily:"Georgia,serif",background:"#F4F7F4",minHeight:"100vh"}}>
      <nav style={{background:C.teal[800],padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{background:C.teal[400],borderRadius:8,padding:"3px 10px",fontWeight:700,fontSize:14,color:"#fff"}}>Medi<span style={{color:C.teal[50]}}>Find</span></div><div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/><p style={{margin:0,fontSize:13,fontWeight:600,color:"#fff"}}>System Administration</p></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>{pending.length>0&&<div style={{background:C.amber[400],color:"#fff",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600}}>🔔 {pending.length} pending</div>}<button onClick={onLogout} style={{background:C.teal[600],color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:11,cursor:"pointer"}}>Sign out</button></div>
      </nav>
      <div style={{background:"#fff",borderBottom:`1px solid ${C.gray[100]}`,padding:"0 24px",display:"flex",gap:4}}>
        {TABS.map(([v,l])=><button key={v} onClick={()=>setTab(v)} style={{padding:"9px 18px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:tab===v?`2px solid ${C.teal[400]}`:"2px solid transparent",color:tab===v?C.teal[600]:C.gray[400],background:"transparent"}}>{l}</button>)}
      </div>
      <div style={{padding:"24px 24px 60px",maxWidth:1060,margin:"0 auto"}}>
        {loading?<div style={{textAlign:"center",padding:"60px 0",color:C.gray[400]}}>⏳ Loading…</div>:(
          <>
            {tab==="overview"&&analytics&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
                  {[["Active Facilities",analytics.facilities?.active||0,"serving patients",C.teal[400],"🏥"],["Total Patients",analytics.total_patients||0,"registered",C.green[400],"👥"],["Pending",analytics.facilities?.pending||0,"awaiting review",C.amber[400],"⏳"],["Stale",analytics.stale_facilities?.length||0,"no update 48h",C.red[400],"⚠️"]].map(([l,v,s,c,i])=>(
                    <div key={l} style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,padding:"16px 18px",borderTop:`3px solid ${c}`}}><div style={{display:"flex",justifyContent:"space-between"}}><p style={{margin:0,fontSize:11,fontWeight:700,color:C.gray[400],textTransform:"uppercase"}}>{l}</p><span style={{fontSize:20}}>{i}</span></div><p style={{margin:"8px 0 2px",fontSize:30,fontWeight:700,color:C.gray[900]}}>{v}</p><p style={{margin:0,fontSize:11,color:C.gray[400]}}>{s}</p></div>
                  ))}
                </div>
                {analytics.top_drugs?.length>0&&<div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,padding:"18px 20px",marginBottom:20}}>
                  <p style={{margin:"0 0 14px",fontWeight:700,fontSize:14,color:C.gray[900]}}>Most Watched Medicines</p>
                  {analytics.top_drugs.map((d,i)=><div key={d.name_en} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}><span style={{fontSize:11,color:C.gray[400],width:20,textAlign:"right"}}>#{i+1}</span><span style={{fontSize:13,color:C.gray[800],flex:1}}>{d.name_en}</span><div style={{width:140,height:8,background:C.gray[50],borderRadius:8,overflow:"hidden"}}><div style={{width:`${Math.min((d.watch_count/Math.max(analytics.top_drugs[0].watch_count,1))*100,100)}%`,height:"100%",background:C.teal[400],borderRadius:8}}/></div><span style={{fontSize:12,color:C.gray[600],width:30,textAlign:"right"}}>{d.watch_count}</span></div>)}
                </div>}
              </>
            )}
            {tab==="approvals"&&(
              <>{pending.length===0?<div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,padding:"48px 0",textAlign:"center",color:C.gray[400]}}><div style={{fontSize:40,marginBottom:10}}>✅</div><p>No pending approvals.</p></div>
              :pending.map(f=><div key={f.id} style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,padding:"16px 18px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                  <div><p style={{margin:0,fontWeight:700,fontSize:14,color:C.gray[900]}}>{f.name}</p><p style={{margin:"3px 0 0",fontSize:12,color:C.gray[400]}}>{f.type} · {f.district} · License: {f.license_number}</p><p style={{margin:"3px 0 0",fontSize:12,color:C.gray[400]}}>📞 {f.phone}</p></div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}><button onClick={()=>handleApprove(f.id,f.name)} style={{background:C.teal[400],color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>✓ Approve</button><button onClick={()=>handleReject(f.id,f.name)} style={{background:"transparent",color:C.red[400],border:`1px solid ${C.red[100]}`,borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>✕ Reject</button></div>
                </div>
              </div>)}</>
            )}
            {tab==="facilities"&&(
              <div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 80px 1.2fr 120px",padding:"9px 18px",background:C.gray[50],borderBottom:`1px solid ${C.gray[100]}`,fontSize:10,fontWeight:700,color:C.gray[400],textTransform:"uppercase",letterSpacing:".06em",gap:8}}><span>Facility</span><span>Type</span><span>District</span><span>Drugs</span><span>Last Sync</span><span style={{textAlign:"right"}}>Status</span></div>
                {facilities.filter(f=>f.status!=="pending"&&f.status!=="rejected").map((f,i,arr)=>(
                  <div key={f.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 80px 1.2fr 120px",padding:"13px 18px",borderBottom:i<arr.length-1?`0.5px solid ${C.gray[50]}`:"none",alignItems:"center",gap:8}}>
                    <p style={{margin:0,fontWeight:600,fontSize:13,color:f.status==="inactive"?C.gray[400]:C.gray[900]}}>{f.name}</p>
                    <span style={{fontSize:11,color:C.blue[600],background:C.blue[50],border:`1px solid ${C.blue[100]}`,borderRadius:20,padding:"2px 8px",fontWeight:600}}>{f.type}</span>
                    <span style={{fontSize:12,color:C.gray[600]}}>{f.district}</span>
                    <span style={{fontSize:13,fontWeight:600,color:C.gray[800]}}>{f.drug_count||0}</span>
                    <span style={{fontSize:12,color:C.gray[600]}}>{f.last_inventory_update?new Date(f.last_inventory_update).toLocaleDateString():"Never"}</span>
                    <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                      <span style={{background:f.status==="active"?C.teal[50]:C.red[50],color:f.status==="active"?C.teal[800]:C.red[600],border:`1px solid ${f.status==="active"?C.teal[100]:C.red[100]}`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>{f.status}</span>
                      <button onClick={()=>handleToggle(f.id,f.name,f.status)} style={{background:"transparent",border:`1px solid ${C.gray[100]}`,borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:600,color:f.status==="active"?C.red[400]:C.teal[400],cursor:"pointer"}}>{f.status==="active"?"Disable":"Enable"}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.type==="warn"?C.amber[400]:C.teal[400],color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:500}}>{toast.type!=="warn"?"✓ ":"⚠ "}{toast.msg}</div>}
    </div>
  );
}
