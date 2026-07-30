import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { notifAPI } from "../api";
import { useAuth } from "../AuthContext";

// Leaflet's default marker icon paths don't resolve correctly under webpack/CRA —
// point them at the CDN copies instead of trying to bundle local image assets.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const C = {
  green: { 50:"#EAF3DE",100:"#C0DD97",400:"#639922",600:"#3B6D11" },
  teal:  { 50:"#E1F5EE",100:"#9FE1CB",200:"#5DCAA5",400:"#1D9E75",600:"#0F6E56",800:"#085041" },
  amber: { 50:"#FAEEDA",100:"#FAC775",400:"#BA7517",600:"#854F0B" },
  red:   { 50:"#FCEBEB",100:"#F7C1C1",400:"#E24B4A",600:"#A32D2D" },
  gray:  { 50:"#F1EFE8",100:"#D3D1C7",400:"#888780",600:"#5F5E5A",800:"#444441",900:"#2C2C2A" },
};

const T = {
  en: {
    tagline:"Find your medicine, fast.",
    subtitle:"Search real-time stock at clinics & pharmacies near you",
    placeholder:"Search medicine name…",
    listView:"List", mapView:"Map",
    allTypes:"All types", pharmacy:"Pharmacy",
    healthCenter:"Health Center", hospital:"Hospital",
    sortDist:"Nearest first", sortRecent:"Recently updated",
    inStock:"In stock", lowStock:"Low stock", outOfStock:"Out of stock",
    call:"Call", directions:"Directions",
    updated:"Updated", away:"away", units:"units",
    noMeds:"No facilities found with this medicine nearby.",
    noSearch:"Search above to see real-time stock at nearby facilities.",
    loading:"Searching…", langBtn:"Kinyarwanda", qty:"Qty:",
    locating:"Getting your location…",
    noLocation:"Could not get location. Showing all results.",
    guest:"Sign in to get alerts when a medicine becomes available.",
    notifyMe:"🔔 Notify me when back in stock",
    stopNotify:"Stop notifications",
    notifyingMsg:"You'll get an alert when this is back in stock nearby.",
    notifyPrompt:"Not seeing it in stock? Get notified when it's available nearby.",
  },
  kin: {
    tagline:"Shaka imiti yawe vuba.",
    subtitle:"Reba aho imiti ihari mu bitaro no mu maduka hafi yawe",
    placeholder:"Shaka izina ry'imiti…",
    listView:"Urutonde", mapView:"Ikarita",
    allTypes:"Ubwoko bwose", pharmacy:"Duka ry'imiti",
    healthCenter:"Ikigo Nderabuzima", hospital:"Ibitaro",
    sortDist:"Hafi kurusha", sortRecent:"Yavuguruwe vuba",
    inStock:"Irahari", lowStock:"Insoro nkeya", outOfStock:"Nta nsoro",
    call:"Hamagara", directions:"Inzira",
    updated:"Yavuguruwe", away:"uvuye aho uri", units:"insoro",
    noMeds:"Nta nkigo cyabonetse kuri iyi miti hafi.",
    noSearch:"Shaka imiti haruguru kugira ngo ubone amakuru.",
    loading:"Birasesengurwa…", langBtn:"English", qty:"Umubare:",
    locating:"Turabona aho uri…",
    noLocation:"Ntawe wabonetse. Turimo kwerekana ibisubizo byose.",
    guest:"Injira kugira ngo ubone imenyesha iyo imiti ibonetse.",
    notifyMe:"🔔 Menyesha iyo ihari",
    stopNotify:"Hagarika imenyesha",
    notifyingMsg:"Uzamenyeshwa iyo iyi miti ibonetse hafi yawe.",
    notifyPrompt:"Ntabwo ibonetse? Menyeshwa iyo ibonetse hafi yawe.",
  },
};

const statusStyle = (s) => {
  if (s === "in_stock")   return { bg:C.teal[50],  txt:C.teal[800],  dot:C.teal[400]  };
  if (s === "low_stock")  return { bg:C.amber[50], txt:C.amber[600], dot:C.amber[400] };
  return                         { bg:C.red[50],   txt:C.red[600],   dot:C.red[400]   };
};

// ── Autocomplete ──────────────────────────────────────────────────────────────
function Autocomplete({ value, onChange, onSelect, suggestions, placeholder, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative", flex:1 }}>
      <input
        type="text" value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{
          width:"100%", height:52, padding:"0 16px", fontSize:16,
          border:`1.5px solid ${C.teal[400]}`, borderRadius:10,
          outline:"none", background:"#fff", color:C.gray[900],
          boxSizing:"border-box", fontFamily:"Georgia,serif",
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position:"absolute", top:56, left:0, right:0,
          background:"#fff", border:`1px solid ${C.gray[100]}`,
          borderRadius:10, boxShadow:"0 4px 16px rgba(0,0,0,0.10)",
          zIndex:100, overflow:"hidden",
        }}>
          {suggestions.map(d => (
            <div key={d.id} onClick={() => { onSelect(d); setOpen(false); }}
              style={{
                padding:"11px 16px", cursor:"pointer", fontSize:14,
                color:C.gray[800], borderBottom:`0.5px solid ${C.gray[50]}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.teal[50]}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span>{d.name_en}</span>
              {d.name_kin && <span style={{ fontSize:11, color:C.gray[400], marginLeft:8 }}>({d.name_kin})</span>}
              <span style={{ float:"right", fontSize:11, color:C.gray[400] }}>{d.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Facility card ─────────────────────────────────────────────────────────────
function FacilityCard({ f, t }) {
  const st = statusStyle(f.status);
  const label = f.status === "in_stock" ? t.inStock : f.status === "low_stock" ? t.lowStock : t.outOfStock;
  const updatedAgo = new Date(f.last_updated).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

  return (
    <div style={{
      background:"#fff", border:`1px solid ${C.gray[100]}`,
      borderRadius:14, padding:"16px 18px",
      display:"flex", flexDirection:"column", gap:10,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div>
          <p style={{ margin:0, fontWeight:600, fontSize:15, color:C.gray[900] }}>{f.name}</p>
          <p style={{ margin:"2px 0 0", fontSize:12, color:C.gray[400] }}>
            {f.type} · {f.distance_km} km {t.away}
          </p>
        </div>
        <span style={{
          background:st.bg, color:st.txt, fontSize:11, fontWeight:600,
          padding:"4px 10px", borderRadius:20, whiteSpace:"nowrap",
          display:"flex", alignItems:"center", gap:5,
        }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:st.dot, display:"inline-block" }} />
          {label}
        </span>
      </div>

      <div style={{ display:"flex", gap:16, fontSize:13, color:C.gray[600] }}>
        {f.quantity > 0 && <span>{t.qty} <b style={{ color:C.gray[800] }}>{f.quantity} {f.unit}</b></span>}
        <span>{t.updated} {updatedAgo}</span>
      </div>

      <div style={{ fontSize:12, color:C.gray[400], lineHeight:1.6 }}>
        <div>📍 {f.address}</div>
        <div>🕐 {f.operating_hours}</div>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <a href={`tel:${f.phone}`} style={{
          background:C.teal[50], color:C.teal[800],
          border:`1px solid ${C.teal[100]}`, borderRadius:8,
          padding:"7px 14px", fontSize:12, fontWeight:600, textDecoration:"none",
        }}>📞 {t.call}</a>
        <a href={`https://maps.google.com/?q=${f.address}`} target="_blank" rel="noreferrer" style={{
          background:C.gray[50], color:C.gray[800],
          border:`1px solid ${C.gray[100]}`, borderRadius:8,
          padding:"7px 14px", fontSize:12, fontWeight:600, textDecoration:"none",
        }}>🗺 {t.directions}</a>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PatientSearch({ user, onLoginClick, onAccountClick, onLogout }) {
  const { token } = useAuth();
  const [lang, setLang]           = useState("en");
  const [query, setQuery]         = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [facilities, setFacilities]   = useState([]);
  const [searched, setSearched]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [locMsg, setLocMsg]       = useState("");
  const [userPos, setUserPos]     = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy]       = useState("distance");
  const [viewMode, setViewMode]   = useState("list");
  const [error, setError]         = useState("");
  const [watching, setWatching]   = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  const t = T[lang];

  // Check whether the currently selected drug is already on the patient's watch list
  useEffect(() => {
    if (!user || !token || !selectedDrug) { setWatching(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await notifAPI.watchList(token);
        const list = res.watch_list || [];
        if (!cancelled) setWatching(list.some(w => w.drug_id === selectedDrug.id));
      } catch { /* silently ignore — not critical to page function */ }
    })();
    return () => { cancelled = true; };
  }, [user, token, selectedDrug]);

  const handleToggleWatch = async () => {
    if (!selectedDrug) return;
    setWatchBusy(true);
    setError("");
    try {
      if (watching) {
        await notifAPI.unwatch(selectedDrug.id, token);
        setWatching(false);
      } else {
        await notifAPI.watch(
          { drugId: selectedDrug.id, radiusKm: 5, userLat: userPos?.lat, userLng: userPos?.lng },
          token
        );
        setWatching(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setWatchBusy(false);
    }
  };

  // Get user location on load
  useEffect(() => {
    setLocMsg(t.locating);
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocMsg(""); },
      ()    => { setLocMsg(t.noLocation); setUserPos({ lat:-1.9441, lng:30.0619 }); } // default: Kigali
    );
  }, []);

  // Autocomplete — call API as user types
  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`${API}/drugs/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.drugs || []);
      } catch { setSuggestions([]); }
    }, 300); // debounce 300ms
    return () => clearTimeout(timer);
  }, [query]);

  // Search facilities for a selected drug
  const searchFacilities = useCallback(async (drug) => {
    if (!drug) return;
    setLoading(true);
    setSearched(true);
    setError("");
    setFacilities([]);

    const lat = userPos?.lat || -1.9441;
    const lng = userPos?.lng || 30.0619;

    try {
      const params = new URLSearchParams({
        lat, lng, radius:15,
        ...(filterType !== "all" && { type: filterType }),
        sort: sortBy,
      });
      const res  = await fetch(`${API}/drugs/${drug.id}/facilities?${params}`);
      const data = await res.json();
      setFacilities(data.facilities || []);
    } catch (err) {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [userPos, filterType, sortBy]);

  const handleSelect = (drug) => {
    setSelectedDrug(drug);
    setQuery(drug.name_en);
    setSuggestions([]);
    searchFacilities(drug);
  };

  const handleSearch = () => {
    if (selectedDrug) { searchFacilities(selectedDrug); return; }
    if (suggestions.length > 0) { handleSelect(suggestions[0]); }
  };

  // Re-search when filters change
  useEffect(() => {
    if (selectedDrug && searched) searchFacilities(selectedDrug);
  }, [filterType, sortBy]);

  const typeOptions = [
    { val:"all",          label:t.allTypes     },
    { val:"Pharmacy",     label:t.pharmacy     },
    { val:"Health Center",label:t.healthCenter },
    { val:"Hospital",     label:t.hospital     },
  ];

  return (
    <div style={{ fontFamily:"Georgia,'Times New Roman',serif", background:"#F8FAF6", minHeight:"100vh" }}>

      {/* Nav */}
      <nav style={{
        background:"#fff", borderBottom:`1px solid ${C.gray[100]}`,
        padding:"0 24px", height:60,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <span style={{
          background:C.teal[400], color:"#fff", borderRadius:8,
          padding:"4px 10px", fontWeight:700, fontSize:15,
        }}>Medi<span style={{ color:C.teal[50] }}>Find</span></span>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={() => setLang(l => l==="en"?"kin":"en")} style={{
            background:"transparent", border:`1px solid ${C.teal[200]}`,
            color:C.teal[600], borderRadius:8, padding:"6px 14px",
            fontSize:12, fontWeight:600, cursor:"pointer",
          }}>🌐 {t.langBtn}</button>
          {user ? (
            <>
              <button onClick={onAccountClick} style={{
                background:"transparent", border:`1px solid ${C.teal[400]}`,
                color:C.teal[600], borderRadius:8, padding:"7px 16px",
                fontSize:12, fontWeight:600, cursor:"pointer",
              }}>{user.fullName ? user.fullName.split(" ")[0] : "My Account"}</button>
              <button onClick={onLogout} style={{
                background:C.teal[400], color:"#fff", border:"none",
                borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer",
              }}>Log out</button>
            </>
          ) : (
            <button onClick={onLoginClick} style={{
              background:C.teal[400], color:"#fff", border:"none",
              borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer",
            }}>Sign in</button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        background:`linear-gradient(135deg,${C.teal[800]} 0%,${C.green[600]} 100%)`,
        padding:"48px 24px 56px", textAlign:"center",
      }}>
        <h1 style={{ color:"#fff", fontSize:34, fontWeight:700, margin:"0 0 10px" }}>{t.tagline}</h1>
        <p style={{ color:C.teal[100], fontSize:16, margin:"0 0 28px" }}>{t.subtitle}</p>
        {locMsg && <p style={{ color:C.teal[100], fontSize:12, margin:"0 0 10px" }}>📍 {locMsg}</p>}

        <div style={{ maxWidth:600, margin:"0 auto", display:"flex", gap:10 }}>
          <Autocomplete
            value={query} onChange={setQuery}
            onSelect={handleSelect}
            suggestions={suggestions}
            placeholder={t.placeholder}
            loading={loading}
          />
          <button onClick={handleSearch} style={{
            background:C.green[400], color:"#fff", border:"none",
            borderRadius:10, padding:"0 24px", fontSize:15,
            fontWeight:700, cursor:"pointer", flexShrink:0, height:52,
          }}>Search</button>
        </div>

        {/* Quick chips */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginTop:16 }}>
          {["Amoxicillin 500mg","Paracetamol 500mg","Metformin 500mg","Artemether/Lumefantrine 20/120mg"].map(name => (
            <button key={name} onClick={async () => {
              setQuery(name);
              const res  = await fetch(`${API}/drugs/search?q=${encodeURIComponent(name)}`);
              const data = await res.json();
              if (data.drugs?.[0]) handleSelect(data.drugs[0]);
            }} style={{
              background:"rgba(255,255,255,0.15)", color:"#fff",
              border:"1px solid rgba(255,255,255,0.3)",
              borderRadius:20, padding:"5px 14px", fontSize:12, cursor:"pointer",
            }}>{name}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 16px 60px" }}>
        {error && (
          <div style={{ background:C.red[50], border:`1px solid ${C.red[100]}`, borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13, color:C.red[600] }}>
            ⚠ {error}
          </div>
        )}

        {!searched ? (
          <div style={{ textAlign:"center", padding:"48px 0", color:C.gray[400] }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💊</div>
            <p style={{ fontSize:15 }}>{t.noSearch}</p>
          </div>
        ) : (
          <>
            {/* Result header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:C.gray[900] }}>{query}</h2>
                <p style={{ margin:"2px 0 0", fontSize:13, color:C.gray[400] }}>
                  {loading ? t.loading : `${facilities.length} facilities · Kigali area`}
                </p>
              </div>
              <div style={{ display:"flex", background:C.gray[50], border:`1px solid ${C.gray[100]}`, borderRadius:8, overflow:"hidden" }}>
                {["list","map"].map(v => (
                  <button key={v} onClick={() => setViewMode(v)} style={{
                    padding:"7px 16px", border:"none", cursor:"pointer",
                    fontSize:12, fontWeight:600,
                    background: viewMode===v ? C.teal[400] : "transparent",
                    color:      viewMode===v ? "#fff" : C.gray[600],
                  }}>{v==="list" ? t.listView : t.mapView}</button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div style={{
              background:"#fff", border:`1px solid ${C.gray[100]}`,
              borderRadius:12, padding:"12px 16px", marginBottom:16,
              display:"flex", gap:12, flexWrap:"wrap", alignItems:"center",
            }}>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
                border:`1px solid ${C.gray[100]}`, borderRadius:8, padding:"5px 10px",
                fontSize:12, color:C.gray[800], background:"#fff", cursor:"pointer",
              }}>
                {typeOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                border:`1px solid ${C.gray[100]}`, borderRadius:8, padding:"5px 10px",
                fontSize:12, color:C.gray[800], background:"#fff", cursor:"pointer",
              }}>
                <option value="distance">{t.sortDist}</option>
                <option value="updated">{t.sortRecent}</option>
              </select>
            </div>

            {/* Cards or map */}
            {loading ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.gray[400] }}>
                <div style={{ fontSize:32, marginBottom:10 }}>⏳</div>
                <p>{t.loading}</p>
              </div>
            ) : viewMode === "list" ? (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {facilities.length === 0
                  ? <p style={{ textAlign:"center", color:C.gray[400], padding:"32px 0" }}>{t.noMeds}</p>
                  : facilities.map(f => <FacilityCard key={f.id} f={f} t={t} />)
                }
              </div>
            ) : (
              <div style={{
                borderRadius:14, border:`1px solid ${C.teal[100]}`,
                overflow:"hidden", minHeight:360,
              }}>
                {facilities.length === 0 ? (
                  <div style={{
                    background:C.teal[50], padding:24, textAlign:"center",
                    minHeight:360, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", gap:12,
                  }}>
                    <div style={{ fontSize:40 }}>🗺️</div>
                    <p style={{ color:C.teal[600], fontSize:13 }}>{t.noMeds}</p>
                  </div>
                ) : (
                  <MapContainer
                    key={facilities.map(f => f.id).join(",")}
                    center={[userPos?.lat ?? -1.9441, userPos?.lng ?? 30.0619]}
                    zoom={13}
                    style={{ height:360, width:"100%" }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {userPos && (
                      <Marker position={[userPos.lat, userPos.lng]}>
                        <Popup>📍 You are here</Popup>
                      </Marker>
                    )}
                    {facilities
                      .filter(f => f.latitude != null && f.longitude != null)
                      .map(f => (
                        <Marker key={f.id} position={[f.latitude, f.longitude]}>
                          <Popup>
                            <strong>{f.name}</strong><br />
                            {f.type} · {f.distance_km} km<br />
                            {f.address}
                          </Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                )}
              </div>
            )}

            {/* Guest nudge */}
            {!user && (
              <div style={{
                marginTop:20, background:C.green[50],
                border:`1px solid ${C.green[100]}`, borderRadius:10,
                padding:"12px 16px", fontSize:13, color:C.green[600],
                display:"flex", alignItems:"center", gap:10,
              }}>
                <span>🔔</span>
                <span>{t.guest}</span>
                <button onClick={onLoginClick} style={{
                  marginLeft:"auto", background:C.teal[400], color:"#fff",
                  border:"none", borderRadius:8, padding:"5px 14px",
                  fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0,
                }}>Sign in</button>
              </div>
            )}

            {/* Notify me toggle — logged-in patients only */}
            {user && selectedDrug && (
              <div style={{
                marginTop:20,
                background: watching ? C.teal[50] : C.gray[50],
                border:`1px solid ${watching ? C.teal[100] : C.gray[100]}`,
                borderRadius:10, padding:"12px 16px", fontSize:13,
                color: watching ? C.teal[600] : C.gray[600],
                display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
              }}>
                <span>🔔</span>
                <span>{watching ? t.notifyingMsg : t.notifyPrompt}</span>
                <button onClick={handleToggleWatch} disabled={watchBusy} style={{
                  marginLeft:"auto",
                  background: watching ? "transparent" : C.teal[400],
                  color: watching ? C.teal[600] : "#fff",
                  border: watching ? `1px solid ${C.teal[400]}` : "none",
                  borderRadius:8, padding:"5px 14px",
                  fontSize:12, fontWeight:600,
                  cursor: watchBusy ? "not-allowed" : "pointer", flexShrink:0,
                }}>{watchBusy ? "…" : watching ? t.stopNotify : t.notifyMe}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}