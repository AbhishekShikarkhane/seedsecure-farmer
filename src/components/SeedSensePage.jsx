import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Sprout, CloudSun, Calendar, ArrowLeft, Droplets, ExternalLink, RefreshCw } from "lucide-react";
import { getCultivationGuideHTML } from "../services/geminiService";
import { getAgronomicAdvice } from "../services/agronomicService";
import { BlockchainContext } from "../BlockchainContext";
import HashDisplay from "./HashDisplay.jsx";

const sanitizeHTML = (html) => {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT, null);
  const toRemove = [];
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (el.tagName && el.tagName.toLowerCase() === "script") {
      toRemove.push(el);
      continue;
    }
    [...el.attributes].forEach((attr) => {
      const n = attr.name.toLowerCase();
      const v = String(attr.value || "");
      if (n.startsWith("on") || v.toLowerCase().includes("javascript:")) {
        el.removeAttribute(attr.name);
      }
      if (n === "style" && /expression|url\(/i.test(v)) {
        el.removeAttribute("style");
      }
    });
  }
  toRemove.forEach((n) => n.remove());
  return div.innerHTML;
};

const PolygonIcon = ({ size = 16, color = "#8247E5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block" }}>
    <path d="M16.5 4.5L20.25 6.75V11.25L16.5 13.5L12.75 11.25V6.75L16.5 4.5Z" fill={color} />
    <path d="M7.5 10.5L11.25 12.75V17.25L7.5 19.5L3.75 17.25V12.75L7.5 10.5Z" fill={color} />
    <path d="M12 7.5L15.75 9.75V14.25L12 16.5L8.25 14.25V9.75L12 7.5Z" fill={color} fillOpacity="0.8" />
  </svg>
);

const Card = ({ icon: Icon, title, children, fullWidth = false, delay = "0s" }) => (
  <div
    className="seedsense-card"
    style={{
      background: "#161B22",
      border: "1px solid #1f2937",
      borderRadius: "0.75rem",
      padding: "1.5rem",
      opacity: 0,
      transform: "translateY(12px)",
      animation: `ssFade 0.5s ease forwards ${delay}`,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      transition: "all 0.3s ease",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,255,157,0.1)", border: "1px solid rgba(0,255,157,0.2)"
      }}>
        <Icon size={20} style={{ color: "#00FF9D" }} />
      </div>
      <div style={{ fontWeight: 800, color: "#00FF9D", fontSize: "1rem", letterSpacing: "0.02em" }}>{title}</div>
    </div>
    <div style={{ color: "#e5f6ee", fontSize: "0.9375rem", lineHeight: 1.6, flex: 1 }}>
      {children}
    </div>
  </div>
);

const SeedSensePage = () => {
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const { syncAllDashboardData, isSyncing } = React.useContext(BlockchainContext) || {};

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const payload = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("seedsense:context");
      if (raw) return JSON.parse(raw);
    } catch { }
    const params = new URLSearchParams((window.location.hash.split("?")[1] || ""));
    return {
      seedType: params.get("seedType") || "Unknown",
      manufacturer: params.get("manufacturer") || "Verified Manufacturer",
      batchId: params.get("batchId") || "",
      purityScore: params.get("purity") || "100",
      txHash: params.get("txHash") || "",
    };
  }, []);

  const agronomic = getAgronomicAdvice(payload.seedType) || {};
  const today = "2026-02-28";

  useEffect(() => {
    let mounted = true;
    const fetchGuide = async () => {
      try {
        setLoading(true);
        const jsonStr = await getCultivationGuideHTML(payload.seedType, payload.batchId);
        if (!mounted) return;
        setAiData(JSON.parse(jsonStr));
      } catch (e) {
        if (!mounted) return;
        setError("AI analysis unavailable. Showing recommended agronomic guidance.");
        setAiData({
          cultivationTips: [
            "Prepare a fine tilth and ensure good soil drainage.",
            "Follow recommended spacing and certified inputs.",
            "Monitor for early pest pressure and irrigate judiciously."
          ],
          climateGuard: "Maintain ideal temperature and humidity based on your local zone.",
          soilNutrition: "Maintain soil organic matter with compost or green manure.",
          healthSummary: `Batch analysis for ${payload.seedType}—optimized guidance for 2026.`
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchGuide();

    // Global Context handles WebSockets for us, so we just let BlockchainContext run its loop
    // and rely on our own fetchGuide() call here upon component mount.
    // If BlockchainContext emits a global update (from App level), it keeps global App state fresh.

    return () => {
      mounted = false;
    };
  }, [payload.seedType, payload.batchId]);

  const handleSync = async () => {
    try {
      if (syncAllDashboardData) await syncAllDashboardData();
      const jsonStr = await getCultivationGuideHTML(payload.seedType, payload.batchId);
      setAiData(JSON.parse(jsonStr));
    } catch (e) {
      console.error("Sync failed:", e);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      padding: "2rem 1rem",
      background: "#0d1117",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "var(--font-sans, sans-serif)"
    }}>
      <style>{`
        @keyframes ssFadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ssPulseMedal {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 157, 0.2); }
          50% { box-shadow: 0 0 20px 4px rgba(0, 255, 157, 0.3); }
        }
        @keyframes ssSkeleton {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .seedsense-card:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(0, 255, 157, 0.4) !important;
          box-shadow: 0 12px 40px -10px rgba(0, 0, 0, 0.5);
          transform: translateY(-4px);
        }
        .mono-text { font-family: 'JetBrains Mono', 'Fira Code', monospace; letter-spacing: -0.02em; }
        ::-webkit-scrollbar { display: none; }
        html, body, * { scrollbar-width: none; }
        
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: ssSkeleton 1.5s infinite;
          border-radius: 8px;
        }

        @media (max-width: 640px) {
          .seedsense-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ width: "100%", maxWidth: "64rem", margin: "0 auto", display: "flex", flexDirection: "column", gap: '1.5rem' }}>
        {/* Top Intelligence Bar (Sticky) */}
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 24,
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)"
        }}>
          <button
            onClick={() => {
              const ret = sessionStorage.getItem("seedsense:return") || "";
              if (window.history.length > 1) window.history.back();
              else window.location.hash = ret || "";
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              color: "#94A3B8",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: "0.95rem",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => e.currentTarget.style.color = "#94A3B8"}
          >
            <ArrowLeft size={20} /> Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={handleSync}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0, 255, 157, 0.1)",
                border: "1px solid rgba(0, 255, 157, 0.4)",
                color: "#00FF9D",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(0, 255, 157, 0.2)"; e.currentTarget.style.transform = "scale(1.05)"; } }}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = "rgba(0, 255, 157, 0.1)"; e.currentTarget.style.transform = "scale(1)"; } }}
            >
              <RefreshCw size={18} className={loading || isSyncing ? "animate-spin" : ""} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#00FF9D", fontWeight: 850, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              <ShieldCheck size={16} /> Verified
            </div>
            <div style={{
              padding: "8px 16px",
              borderRadius: 14,
              background: "rgba(0, 255, 157, 0.1)",
              border: "1px solid rgba(0, 255, 157, 0.4)",
              color: "#00FF9D",
              fontWeight: 900,
              fontSize: "0.8rem",
              letterSpacing: "0.05em",
              animation: "ssPulseMedal 2.5s ease-in-out infinite"
            }}>
              PURITY {payload.purityScore}%
            </div>
          </div>
        </div>

        {/* Intelligence Identity Header */}
        <div style={{
          background: "#161B22",
          border: "1px solid #1f2937",
          borderRadius: "0.75rem",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "ssFadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards"
        }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.2em", display: "block", marginBottom: 8 }}>Agronomic Analysis</span>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.03em", lineHeight: 1 }}>{payload.seedType}</h1>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, color: "#94A3B8", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sprout size={14} color="#00FF9D" /> <HashDisplay hash={payload.manufacturer} />
              </div>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#334155" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={14} color="#00FF9D" /> Season {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: '1.5rem' }}>
            <div className="skeleton" style={{ height: 300, borderRadius: '0.75rem', border: '1px solid #1f2937' }} />
            <div style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: '#161B22', padding: '12px 24px', borderRadius: 99, border: '1px solid rgba(0, 255, 157, 0.3)', color: '#00FF9D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <RefreshCw size={18} className="animate-spin" /> 🤖 Generating Agronomic Profile...
            </div>
          </div>
        ) : (
          <Card icon={ShieldCheck} title="SeedSense AI Analysis" delay="0.1s">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <h4 style={{ color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.5rem" }}>Cultivation Tips</h4>
                <ul style={{ listStyleType: "disc", paddingLeft: "1.25rem", margin: 0 }}>
                  {aiData?.cultivationTips?.map((tip, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={{ color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.5rem" }}>Climate Guard</h4>
                <p style={{ margin: 0 }}>{aiData?.climateGuard}</p>
              </div>
              <div>
                <h4 style={{ color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.5rem" }}>Soil Nutrition</h4>
                <p style={{ margin: 0 }}>{aiData?.soilNutrition}</p>
              </div>
              <div style={{ marginTop: "0.5rem", paddingTop: "1rem", borderTop: "1px solid #1f2937" }}>
                <h4 style={{ color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.5rem" }}>Seed Health Summary</h4>
                <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 500 }}>
                  {aiData?.healthSummary}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Tech Details Footer */}
        <div style={{
          marginTop: '0',
          padding: "1.5rem",
          background: "#161B22",
          border: "1px solid #1f2937",
          borderRadius: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: '1.5rem',
          animation: "ssFadeInUp 0.8s ease forwards"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(130, 71, 229, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PolygonIcon size={18} />
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#8247E5", textTransform: "uppercase", letterSpacing: "0.15em" }}>On-Chain Verification Proof</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748B" }}>Batch Identifier</span>
              <HashDisplay hash={payload.batchId} />
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: "0.85rem", color: "#64748B" }}>Transaction Hash</span>
                <a
                  href={`https://amoy.polygonscan.com/tx/${payload.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#00FF9D", fontSize: "0.75rem", textTransform: "none", display: "flex", alignItems: "center", gap: 4, textDecoration: "none", fontWeight: 700 }}
                >
                  View on PolygonScan <ExternalLink size={12} />
                </a>
              </div>
              <HashDisplay hash={payload.txHash} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeedSensePage;
