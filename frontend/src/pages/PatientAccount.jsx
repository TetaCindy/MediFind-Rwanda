import { useState, useEffect } from "react";
import { notifAPI } from "../api";
import { useAuth } from "../AuthContext";
const C = { teal:{50:"#E1F5EE",100:"#9FE1CB",400:"#1D9E75",600:"#0F6E56",800:"#085041"}, amber:{50:"#FAEEDA",100:"#FAC775",400:"#BA7517"}, red:{400:"#E24B4A"}, green:{50:"#EAF3DE",100:"#C0DD97",400:"#639922"}, gray:{50:"#F1EFE8",100:"#D3D1C7",400:"#888780",600:"#5F5E5A",800:"#444441",900:"#2C2C2A"} };
function Toggle({ value, onChange }) {
  return <button onClick={()=>onChange(!value)} style={{width:40,height:22,borderRadius:11,border:"none",cursor:"pointer",background:value?C.teal[400]:C.gray[100],position:"relative"}}><span style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",left:value?21:3,transition:"left .2s"}} /></button>;
}
export default function PatientAccount({ onBack, onLogout }) {
  const { user, token } = useAuth();
  const [tab,setTab]=useState("watched"); const [watchList,setWatchList]=useState([]); const [notifs,setNotifs]=useState([]); const [loading,setLoading]=useState(true); const [toast,setToast]=useState(null); const [settings,setSettings]=useState({smsAlerts:true,pushAlerts:true});
  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      try{const [wl,nf]=await Promise.all([notifAPI.watchList(token),notifAPI.myNotifs(token)]);setWatchList(wl.watch_list||[]);setNotifs(nf.notifications||[]);}
      catch(err){showToast("Could not load data: "+err.message);}
      finally{setLoading(false);}
    };
    if(token)load();
  },[token]);
  const handleUnwatch=async(drugId)=>{try{await notifAPI.unwatch(drugId,token);setWatchList(p=>p.filter(w=>w.drug_id!==drugId));showToast("Removed from watch list.");}catch(err){showToast("Error: "+err.message);}};
  const initials=user?.full_name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"??";
  const TABS=[{id:"watched",label:"💊 Watched Medicines",badge:watchList.length},{id:"notifs",label:"🔔 Notifications",badge:notifs.filter(n=>n.status==="sent").length,red:true},{id:"settings",label:"⚙️ Settings"}];
  return (
    <div style={{fontFamily:"Georgia,serif",background:"#F4F7F4",minHeight:"100vh"}}>
      <nav style={{background:C.teal[800],padding:"0 20px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={onBack} style={{background:"transparent",border:"none",color:C.teal[100],cursor:"pointer",fontSize:18}}>←</button><div style={{background:C.teal[400],borderRadius:8,padding:"3px 10px",fontWeight:700,fontSize:13,color:"#fff"}}>Medi<span style={{color:C.teal[50]}}>Find</span></div></div>
        <button onClick={onLogout} style={{background:C.teal[600],color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:11,cursor:"pointer"}}>Sign out</button>
      </nav>
      <div style={{maxWidth:820,margin:"0 auto",padding:"24px 16px 60px",display:"grid",gridTemplateColumns:"210px 1fr",gap:20}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,padding:"20px 16px",textAlign:"center"}}>
            <div style={{width:58,height:58,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal[400]},${C.teal[800]})`,color:"#fff",fontSize:20,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>{initials}</div>
            <p style={{margin:0,fontWeight:700,fontSize:14,color:C.gray[900]}}>{user?.full_name}</p>
            <p style={{margin:"3px 0 0",fontSize:11,color:C.gray[400]}}>{user?.phone}</p>
          </div>
          <div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,overflow:"hidden"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"11px 14px",border:"none",borderBottom:`0.5px solid ${C.gray[50]}`,background:tab===t.id?C.teal[50]:"transparent",color:tab===t.id?C.teal[800]:C.gray[600],fontSize:12,fontWeight:tab===t.id?700:400,cursor:"pointer"}}>
                {t.label}{t.badge>0&&<span style={{marginLeft:"auto",background:t.red?C.red[400]:C.teal[400],color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>{t.badge}</span>}
              </button>
            ))}
          </div>
        </div>
        <div>
          {loading?<div style={{textAlign:"center",padding:"60px 0",color:C.gray[400]}}>⏳ Loading…</div>:(
            <>
              {tab==="watched"&&<div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.gray[50]}`}}><p style={{margin:0,fontWeight:700,fontSize:14,color:C.gray[900]}}>Watched Medicines</p></div>
                {watchList.length===0?<div style={{padding:"40px 0",textAlign:"center",color:C.gray[400],fontSize:13}}><div style={{fontSize:36,marginBottom:10}}>💊</div><p>No medicines watched yet.</p></div>
                :watchList.map(w=>(
                  <div key={w.id} style={{padding:"13px 18px",borderBottom:`0.5px solid ${C.gray[50]}`,display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:18}}>{w.available_nearby>0?"✅":"🔔"}</span>
                    <div style={{flex:1}}><p style={{margin:0,fontWeight:600,fontSize:13,color:C.gray[900]}}>{w.drug_name_en}</p><p style={{margin:"2px 0 0",fontSize:11,color:C.gray[400]}}>Within {w.radius_km} km{w.available_nearby>0&&<span style={{color:C.teal[600],fontWeight:600}}> · {w.available_nearby} facilities found</span>}</p></div>
                    <button onClick={()=>handleUnwatch(w.drug_id)} style={{background:"transparent",border:`1px solid ${C.gray[100]}`,borderRadius:8,padding:"4px 10px",fontSize:10,color:C.gray[400],cursor:"pointer"}}>Remove</button>
                  </div>
                ))}
              </div>}
              {tab==="notifs"&&<div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.gray[50]}`}}><p style={{margin:0,fontWeight:700,fontSize:14,color:C.gray[900]}}>Notifications</p></div>
                {notifs.length===0?<div style={{padding:"40px 0",textAlign:"center",color:C.gray[400],fontSize:13}}>No notifications yet.</div>
                :notifs.map(n=>(
                  <div key={n.id} style={{padding:"12px 18px",borderBottom:`0.5px solid ${C.gray[50]}`,display:"flex",gap:10,alignItems:"flex-start"}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:n.type==="available"?C.teal[400]:C.gray[100],marginTop:5,flexShrink:0}} />
                    <div><p style={{margin:0,fontSize:12,color:C.gray[800],lineHeight:1.6}}>{n.message}</p><p style={{margin:"3px 0 0",fontSize:10,color:C.gray[400]}}>{new Date(n.created_at).toLocaleString()}</p></div>
                  </div>
                ))}
              </div>}
              {tab==="settings"&&<div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,padding:"16px 18px"}}>
                <p style={{margin:"0 0 12px",fontWeight:700,fontSize:14,color:C.gray[900]}}>Account Info</p>
                <p style={{fontSize:13,color:C.gray[600],margin:"0 0 6px"}}><b>Name:</b> {user?.full_name}</p>
                <p style={{fontSize:13,color:C.gray[600],margin:"0 0 6px"}}><b>Phone:</b> {user?.phone}</p>
                <p style={{fontSize:13,color:C.gray[600],margin:0}}><b>Email:</b> {user?.email||"Not set"}</p>
                <hr style={{margin:"16px 0",border:"none",borderTop:`1px solid ${C.gray[50]}`}} />
                <p style={{margin:"0 0 12px",fontWeight:700,fontSize:14,color:C.gray[900]}}>Notification Preferences</p>
                {[["SMS Alerts","smsAlerts","Get SMS when a watched medicine is available"],["Push Notifications","pushAlerts","In-app notifications"]].map(([label,key,sub])=>(
                  <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div><p style={{margin:0,fontSize:13,fontWeight:600,color:C.gray[800]}}>{label}</p><p style={{margin:"2px 0 0",fontSize:11,color:C.gray[400]}}>{sub}</p></div>
                    <Toggle value={settings[key]} onChange={v=>setSettings(s=>({...s,[key]:v}))} />
                  </div>
                ))}
              </div>}
            </>
          )}
        </div>
      </div>
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:C.teal[400],color:"#fff",borderRadius:10,padding:"9px 18px",fontSize:12,fontWeight:600,zIndex:500}}>{toast}</div>}
    </div>
  );
}
