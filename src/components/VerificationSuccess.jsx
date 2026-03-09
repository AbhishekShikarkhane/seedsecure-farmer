import React, { useState, useEffect } from "react";
import { CheckCircle, ExternalLink, Award, Package, ShieldCheck, Sun, Calendar, Sprout, Scan, Home } from "lucide-react";
import HashDisplay from "./HashDisplay.jsx";
import { getDigitalMemoJSON } from "../services/geminiService";

const navigateToSeedSense = ({ seedType, manufacturer, batchId, purityScore, txHash }) => {
  try {
    sessionStorage.setItem(
      "seedsense:context",
      JSON.stringify({ seedType, manufacturer, batchId, purityScore, txHash })
    );
  } catch { }
  const params = new URLSearchParams({
    seedType: seedType || "",
    manufacturer: manufacturer || "",
    batchId: String(batchId || ""),
    purity: String(purityScore ?? ""),
    txHash: txHash || "",
  });
  window.location.hash = `#/seedsense?${params.toString()}`;
};

const VerificationSuccess = ({ batchId, purityScore, txHash, status, manufacturer, seedType, onRetry, onHome }) => {
  const [memoData, setMemoData] = useState(null);
  const [loadingMemo, setLoadingMemo] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchMemo = async () => {
      try {
        setLoadingMemo(true);
        const data = await getDigitalMemoJSON(seedType, purityScore);
        if (mounted) setMemoData(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingMemo(false);
      }
    };
    fetchMemo();
    return () => { mounted = false; };
  }, [seedType, purityScore]);

  return (
    <div className="farmer-result-card farmer-result-success" style={{ padding: '1.5rem' }}>
      <style>{`
        @keyframes ssPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,255,157,0.25); }
          50% { transform: scale(1.04); box-shadow: 0 0 24px 2px rgba(0,255,157,0.35); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,255,157,0.25); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 16,
        marginBottom: 16,
        border: '1px solid rgba(0,255,157,0.35)',
        background: '#0F2F21',
        boxShadow: '0 20px 40px -20px rgba(0,255,157,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,255,157,0.12)', border: '1px solid rgba(0,255,157,0.30)',
            animation: 'ssPulse 2.2s ease-in-out infinite'
          }}>
            <ShieldCheck size={22} style={{ color: '#00FF9D' }} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#00FF9D', letterSpacing: '0.01em' }}>🛡️ Blockchain Verified</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Genuine {seedType || 'Seed'} Seed Packet</div>
          </div>
        </div>
        <div style={{
          padding: '6px 10px',
          borderRadius: 9999,
          background: 'linear-gradient(135deg, rgba(0,255,157,0.18), rgba(15,47,33,0.28))',
          border: '1px solid rgba(0,255,157,0.5)',
          color: '#00FF9D',
          fontWeight: 900,
          fontSize: 12
        }}>
          100% Purity Score
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            <Award size={14} /> Purity Score
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{purityScore}%</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            <Package size={14} /> Batch ID
          </div>
          <HashDisplay hash={String(batchId)} isLarge={true} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={12} /> Blockchain Transaction Hash
          </div>
          <a
            href={`https://amoy.polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '0.8125rem', color: '#FDE68A', textDecoration: 'none', fontWeight: 800
            }}
          >
            🔗 View on PolygonScan <ExternalLink size={14} />
          </a>
        </div>
        <HashDisplay hash={txHash} />
      </div>

      {/* AI Digital Memo Section */}
      <div style={{
        marginBottom: '1.5rem',
        padding: "1.5rem",
        borderRadius: "0.75rem",
        border: "1px solid #1f2937",
        background: "#161B22"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", marginBottom: "1rem" }}>
          <ShieldCheck size={20} style={{ color: "#10b981" }} /> Digital Seed Memo
        </div>

        {loadingMemo ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "1rem" }}>
              <div style={{ height: 80, borderRadius: "0.5rem", background: "rgba(255,255,255,0.05)", animation: "ssSkeleton 1.5s infinite" }} />
              <div style={{ height: 80, borderRadius: "0.5rem", background: "rgba(255,255,255,0.05)", animation: "ssSkeleton 1.5s infinite" }} />
              <div style={{ height: 80, borderRadius: "0.5rem", background: "rgba(255,255,255,0.05)", animation: "ssSkeleton 1.5s infinite" }} />
            </div>
            <div style={{ height: 120, borderRadius: "0.5rem", background: "rgba(255,255,255,0.05)", animation: "ssSkeleton 1.5s infinite" }} />
          </div>
        ) : memoData ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "#161B22", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #1f2937" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}><Sun size={16} style={{ color: "#3b82f6" }} /> Weather</div>
                <div style={{ fontSize: "1rem", color: "#ffffff", fontWeight: 600 }}>{memoData.idealWeather}</div>
              </div>
              <div style={{ background: "#161B22", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #1f2937" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}><Calendar size={16} style={{ color: "#10b981" }} /> Season</div>
                <div style={{ fontSize: "1rem", color: "#ffffff", fontWeight: 600 }}>{memoData.plantingSeason}</div>
              </div>
              <div style={{ background: "#161B22", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #1f2937" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}><Sprout size={16} style={{ color: "#10b981" }} /> Soil Type</div>
                <div style={{ fontSize: "1rem", color: "#ffffff", fontWeight: 600 }}>{memoData.soilType}</div>
              </div>
            </div>
            <div style={{ background: "#161B22", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #1f2937" }}>
              <h4 style={{ color: "#9ca3af", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem" }}>Actionable Care Instructions</h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {memoData.careInstructions?.map((tip, idx) => (
                  <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.875rem", color: "#d1d5db", lineHeight: 1.625 }}>
                    <CheckCircle size={16} style={{ color: "#10b981", flexShrink: 0, marginTop: "0.125rem" }} /> {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.9rem", border: "1px solid #1f2937", borderRadius: "0.5rem", background: "rgba(255,255,255,0.02)" }}>
            Advanced Agronomic data currently unavailable.
          </div>
        )}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6, fontWeight: 600 }}>Manufacturer</div>
        <div style={{
          marginTop: 6,
          display: 'flex',
          alignItems: 'flex-start'
        }}>
          {manufacturer === 'Verified Manufacturer' ? (
            <div style={{
              fontSize: 14, fontWeight: 800, color: '#e5f6ee',
              background: 'rgba(255,255,255,0.03)', border: '1px solid #1f2937', padding: '1rem', borderRadius: '0.75rem'
            }}>
              {manufacturer}
            </div>
          ) : (
            <HashDisplay hash={manufacturer} isLarge={true} />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: '2rem' }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              flex: 1, padding: '1rem', borderRadius: '0.75rem', fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.1)', color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
          >
            <Scan size={18} />
            Scan Another
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            style={{
              flex: 1, padding: '1rem', borderRadius: '0.75rem', fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.05)', color: '#D1D5DB',
              border: '1px solid #374151',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#F3F4F6';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#D1D5DB';
            }}
          >
            <Home size={18} />
            Back to Home
          </button>
        )}
      </div>

    </div>
  );
};

export default VerificationSuccess;
