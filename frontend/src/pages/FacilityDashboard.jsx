import { useState, useEffect } from "react";
import { inventoryAPI, notifAPI, drugsAPI } from "../api";
import { useAuth } from "../AuthContext";
const C = { teal:{50:"#E1F5EE",100:"#9FE1CB",400:"#1D9E75",600:"#0F6E56",800:"#085041"}, amber:{50:"#FAEEDA",100:"#FAC775",400:"#BA7517",600:"#854F0B"}, red:{50:"#FCEBEB",100:"#F7C1C1",400:"#E24B4A",600:"#A32D2D"}, blue:{50:"#E6F1FB",100:"#B5D4F4",600:"#185FA5"}, gray:{50:"#F1EFE8",100:"#D3D1C7",400:"#888780",600:"#5F5E5A",800:"#444441",900:"#2C2C2A"} };
const getStatus=(qty,thresh)=>qty===0?"out":qty<=thresh?"low":"in";
const statusMeta={in:{label:"In Stock",bg:C.teal[50],txt:C.teal[800],dot:C.teal[400]},low:{label:"Low Stock",bg:C.amber[50],txt:C.amber[600],dot:C.amber[400]},out:{label:"Out of Stock",bg:C.red[50],txt:C.red[600],dot:C.red[400]}};
function Badge({qty,threshold}){const s=statusMeta[getStatus(qty,threshold)];return<span style={{display:"inline-flex",alignItems:"center",gap:4,background:s.bg,color:s.txt,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}><span style={{width:6,height:6,borderRadius:"50%",background:s.dot}}/>{s.label}</span>;}
export default function FacilityDashboard({ onLogout }) {
  const { user, token } = useAuth();
  const [inventory,setInventory]=useState([]); const [notifications,setNotifications]=useState([]); const [allDrugs,setAllDrugs]=useState([]); const [loading,setLoading]=useState(true); const [search,setSearch]=useState(""); const [statusFilter,setStatusFilter]=useState("all"); const [editing,setEditing]=useState(null); const [showAdd,setShowAdd]=useState(false); const [newDrug,setNewDrug]=useState(""); const [newQty,setNewQty]=useState(0); const [showNotifs,setShowNotifs]=useState(false); const [toast,setToast]=useState(null); const [editQty,setEditQty]=useState(0); const [editThresh,setEditThresh]=useState(10); const [editNote,setEditNote]=useState("");
  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const loadInv=async()=>{try{const d=await inventoryAPI.get(token);setInventory(d.inventory||[]);}catch(e){showToast(e.message,"warn");}};
  useEffect(()=>{
    const init=async()=>{setLoading(true);try{const[inv,notif,drugs]=await Promise.all([inventoryAPI.get(token),notifAPI.facilityNotifs(token),drugsAPI.all()]);setInventory(inv.inventory||[]);setNotifications(notif.notifications||[]);setAllDrugs(drugs.drugs||[]);}catch(e){showToast(e.message,"warn");}finally{setLoading(false);}};
    if(token)init();
  },[token]);
  const handleUpdate=async()=>{try{await inventoryAPI.update(editing.id,{quantity:Number(editQty),lowThreshold:Number(editThresh),note:editNote},token);await loadInv();setEditing(null);showToast("Stock updated.");}catch(e){showToast(e.message,"warn");}};
  const handleMarkOut=async(id)=>{try{await inventoryAPI.markOut(id,token);await loadInv();showToast("Marked as out of stock.","warn");}catch(e){showToast(e.message,"warn");}};
  const handleAdd=async()=>{if(!newDrug)return;try{await inventoryAPI.add({drugId:newDrug,quantity:Number(newQty),lowThreshold:10},token);await loadInv();setShowAdd(false);setNewDrug("");setNewQty(0);showToast("Drug added.");}catch(e){showToast(e.message,"warn");}};
  const filtered=inventory.filter(d=>(statusFilter==="all"||d.status===statusFilter)&&d.drug_name_en.toLowerCase().includes(search.toLowerCase()));
  const inS=inventory.filter(d=>d.status==="in_stock").length; const lowS=inventory.filter(d=>d.status==="low_stock").length; const outS=inventory.filter(d=>d.status==="out_of_stock").length;
  return (
    <div style={{fontFamily:"Georgia,serif",background:"#F4F7F4",minHeight:"100vh"}}>
      <nav style={{background:C.teal[800],padding:"0 20px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{background:C.teal[400],borderRadius:8,padding:"3px 10px",fontWeight:700,fontSize:14,color:"#fff"}}>Medi<span style={{color:C.teal[50]}}>Find</span></div><div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/><div><p style={{margin:0,fontSize:13,fontWeight:600,color:"#fff"}}>{user?.facilityName||"Facility Dashboard"}</p><p style={{margin:0,fontSize:10,color:C.teal[100]}}>Staff: {user?.full_name}</p></div></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setShowNotifs(v=>!v)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#fff",fontSize:20}}>🔔</button>
          <button onClick={onLogout} style={{background:C.teal[600],color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:11,cursor:"pointer"}}>Sign out</button>
        </div>
      </nav>
      <div style={{padding:"20px 18px 60px",maxWidth:1060,margin:"0 auto"}}>
        {loading?<div style={{textAlign:"center",padding:"60px 0",color:C.gray[400]}}>⏳ Loading inventory…</div>:(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[["Total",inventory.length,"in inventory",C.gray[400]],["In Stock",inS,"above threshold",C.teal[400]],["Low Stock",lowS,"near threshold",C.amber[400]],["Out of Stock",outS,"needs restock",C.red[400]]].map(([l,v,s,c])=>(
                <div key={l} style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,padding:"14px 16px",borderTop:`3px solid ${c}`}}><p style={{margin:0,fontSize:10,fontWeight:700,color:C.gray[400],textTransform:"uppercase"}}>{l}</p><p style={{margin:"6px 0 2px",fontSize:26,fontWeight:700,color:C.gray[900]}}>{v}</p><p style={{margin:0,fontSize:10,color:C.gray[400]}}>{s}</p></div>
              ))}
            </div>
            <div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search medicines…" style={{flex:1,minWidth:140,height:34,padding:"0 10px",border:`1px solid ${C.gray[100]}`,borderRadius:8,fontSize:12,outline:"none",fontFamily:"Georgia,serif"}}/>
              <div style={{display:"flex",background:C.gray[50],border:`1px solid ${C.gray[100]}`,borderRadius:8,overflow:"hidden"}}>
                {[["all","All"],["in_stock","In"],["low_stock","Low"],["out_of_stock","Out"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setStatusFilter(v)} style={{padding:"6px 11px",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:statusFilter===v?C.teal[400]:"transparent",color:statusFilter===v?"#fff":C.gray[600]}}>{l}</button>
                ))}
              </div>
              <button onClick={()=>setShowAdd(true)} style={{background:C.teal[400],color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",marginLeft:"auto"}}>+ Add Medicine</button>
            </div>
            <div style={{background:"#fff",border:`1px solid ${C.gray[100]}`,borderRadius:14,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 80px 80px 100px 1.4fr 130px",padding:"9px 16px",background:C.gray[50],borderBottom:`1px solid ${C.gray[100]}`,fontSize:10,fontWeight:700,color:C.gray[400],textTransform:"uppercase",letterSpacing:".06em",gap:6}}>
                <span>Medicine</span><span>Category</span><span>Qty</span><span>Threshold</span><span>Status</span><span>Updated</span><span style={{textAlign:"right"}}>Actions</span>
              </div>
              {filtered.length===0?<div style={{padding:"40px 0",textAlign:"center",color:C.gray[400],fontSize:13}}>No medicines found.</div>
              :filtered.map((d,i)=>(
                <div key={d.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 80px 80px 100px 1.4fr 130px",padding:"12px 16px",borderBottom:i<filtered.length-1?`0.5px solid ${C.gray[50]}`:"none",alignItems:"center",gap:6,background:d.status==="out_of_stock"?"#FEFAFA":d.status==="low_stock"?"#FFFDF6":"#fff"}}>
                  <div><p style={{margin:0,fontSize:13,fontWeight:600,color:C.gray[900]}}>{d.drug_name_en}</p><p style={{margin:0,fontSize:10,color:C.gray[400]}}>per {d.unit}</p></div>
                  <span style={{fontSize:10,background:C.blue[50],color:C.blue[600],border:`1px solid ${C.blue[100]}`,borderRadius:20,padding:"2px 7px",fontWeight:600}}>{d.category}</span>
                  <span style={{fontSize:15,fontWeight:700,color:d.status==="out_of_stock"?C.red[400]:d.status==="low_stock"?C.amber[400]:C.gray[900]}}>{d.quantity}</span>
                  <span style={{fontSize:12,color:C.gray[400]}}>{d.low_threshold}</span>
                  <Badge qty={d.quantity} threshold={d.low_threshold}/>
                  <span style={{fontSize:11,color:C.gray[600]}}>{new Date(d.updated_at).toLocaleString()}</span>
                  <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
                    <button onClick={()=>{setEditing(d);setEditQty(d.quantity);setEditThresh(d.low_threshold);setEditNote("");}} style={{background:C.teal[400],color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Update</button>
                    {d.quantity>0&&<button onClick={()=>handleMarkOut(d.id)} style={{background:"transparent",color:C.red[400],border:`1px solid ${C.red[100]}`,borderRadius:8,padding:"5px 8px",fontSize:11,fontWeight:600,cursor:"pointer"}}>× Out</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {editing&&(
        <div style={{position:"fixed",inset:0,background:"rgba(8,80,65,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}} onClick={e=>{if(e.target===e.currentTarget)setEditing(null);}}>
          <div style={{background:"#fff",borderRadius:18,padding:"28px",width:"100%",maxWidth:420}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><div><h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.gray[900]}}>Update Stock</h2><p style={{margin:"3px 0 0",fontSize:13,color:C.gray[400]}}>{editing.drug_name_en}</p></div><button onClick={()=>setEditing(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:C.gray[400]}}>✕</button></div>
            <label style={{fontSize:11,fontWeight:700,color:C.gray[600],display:"block",marginBottom:6,textTransform:"uppercase"}}>New Quantity</label>
            <input type="number" min="0" value={editQty} onChange={e=>setEditQty(e.target.value)} style={{width:"100%",height:46,padding:"0 14px",fontSize:18,border:`1.5px solid ${C.teal[400]}`,borderRadius:10,outline:"none",fontWeight:700,fontFamily:"Georgia,serif",boxSizing:"border-box",marginBottom:8}}/>
            <div style={{display:"flex",gap:6,marginBottom:14}}>{[0,10,25,50,100].map(p=><button key={p} onClick={()=>setEditQty(p)} style={{background:Number(editQty)===p?C.teal[400]:C.gray[50],color:Number(editQty)===p?"#fff":C.gray[600],border:`1px solid ${Number(editQty)===p?C.teal[400]:C.gray[100]}`,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>{p}</button>)}</div>
            <label style={{fontSize:11,fontWeight:700,color:C.gray[600],display:"block",marginBottom:6,textTransform:"uppercase"}}>Threshold</label>
            <input type="number" min="0" value={editThresh} onChange={e=>setEditThresh(e.target.value)} style={{width:"100%",height:40,padding:"0 14px",fontSize:14,border:`1px solid ${C.gray[100]}`,borderRadius:10,outline:"none",fontFamily:"Georgia,serif",boxSizing:"border-box",marginBottom:12}}/>
            <label style={{fontSize:11,fontWeight:700,color:C.gray[600],display:"block",marginBottom:6,textTransform:"uppercase"}}>Note</label>
            <input type="text" value={editNote} onChange={e=>setEditNote(e.target.value)} placeholder="e.g. New delivery received" style={{width:"100%",height:40,padding:"0 14px",fontSize:13,border:`1px solid ${C.gray[100]}`,borderRadius:10,outline:"none",fontFamily:"Georgia,serif",boxSizing:"border-box",marginBottom:20}}/>
            <div style={{display:"flex",gap:10}}><button onClick={()=>setEditing(null)} style={{flex:1,height:44,background:"transparent",border:`1px solid ${C.gray[100]}`,borderRadius:10,fontSize:14,fontWeight:600,color:C.gray[600],cursor:"pointer"}}>Cancel</button><button onClick={handleUpdate} style={{flex:2,height:44,background:C.teal[400],border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Save Update</button></div>
          </div>
        </div>
      )}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(8,80,65,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}} onClick={e=>{if(e.target===e.currentTarget)setShowAdd(false);}}>
          <div style={{background:"#fff",borderRadius:18,padding:"28px",width:"100%",maxWidth:400}}>
            <h2 style={{margin:"0 0 20px",fontSize:17,fontWeight:700,color:C.gray[900]}}>Add Medicine to Inventory</h2>
            <label style={{fontSize:11,fontWeight:700,color:C.gray[600],display:"block",marginBottom:6,textTransform:"uppercase"}}>Select Medicine</label>
            <select value={newDrug} onChange={e=>setNewDrug(e.target.value)} style={{width:"100%",height:44,padding:"0 12px",border:`1px solid ${C.gray[100]}`,borderRadius:10,fontSize:14,marginBottom:14,fontFamily:"Georgia,serif"}}><option value="">Choose from master list…</option>{allDrugs.map(d=><option key={d.id} value={d.id}>{d.name_en}</option>)}</select>
            <label style={{fontSize:11,fontWeight:700,color:C.gray[600],display:"block",marginBottom:6,textTransform:"uppercase"}}>Initial Quantity</label>
            <input type="number" min="0" value={newQty} onChange={e=>setNewQty(e.target.value)} style={{width:"100%",height:44,padding:"0 14px",fontSize:16,border:`1px solid ${C.gray[100]}`,borderRadius:10,outline:"none",fontFamily:"Georgia,serif",boxSizing:"border-box",marginBottom:20}}/>
            <div style={{display:"flex",gap:10}}><button onClick={()=>setShowAdd(false)} style={{flex:1,height:44,background:"transparent",border:`1px solid ${C.gray[100]}`,borderRadius:10,fontSize:14,fontWeight:600,color:C.gray[600],cursor:"pointer"}}>Cancel</button><button onClick={handleAdd} style={{flex:2,height:44,background:C.teal[400],border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Add to Inventory</button></div>
          </div>
        </div>
      )}
      {showNotifs&&(
        <div style={{position:"fixed",top:0,right:0,bottom:0,width:300,background:"#fff",borderLeft:`1px solid ${C.gray[100]}`,zIndex:300,display:"flex",flexDirection:"column",boxShadow:"-4px 0 20px rgba(0,0,0,.08)"}}>
          <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.gray[100]}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{margin:0,fontSize:14,fontWeight:700,color:C.gray[900]}}>Notifications</h3><button onClick={()=>setShowNotifs(false)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:C.gray[400]}}>✕</button></div>
          <div style={{flex:1,overflowY:"auto"}}>{notifications.length===0?<div style={{padding:"40px 16px",textAlign:"center",color:C.gray[400],fontSize:13}}>No notifications yet.</div>:notifications.map(n=><div key={n.id} style={{padding:"12px 18px",borderBottom:`0.5px solid ${C.gray[50]}`,display:"flex",gap:8}}><span>{n.type==="low_stock"?"🟡":"✅"}</span><div><p style={{margin:0,fontSize:12,color:C.gray[800],lineHeight:1.5}}>{n.message}</p><p style={{margin:"3px 0 0",fontSize:10,color:C.gray[400]}}>{new Date(n.created_at).toLocaleString()}</p></div></div>)}</div>
        </div>
      )}
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.type==="warn"?C.amber[400]:C.teal[400],color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:500}}>{toast.type!=="warn"?"✓ ":"⚠ "}{toast.msg}</div>}
    </div>
  );
}
