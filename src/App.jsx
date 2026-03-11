import React, { useState } from "react";
import {
  Scan,
  Truck,
  User,
  ShieldCheck,
  UserCircle,
  PackageCheck,
  ExternalLink,
  MapPin,
  ChevronLeft
} from "lucide-react";
import Scanner from "./components/Scanner.jsx";
import SeedSensePage from "./components/SeedSensePage.jsx";
import VerificationSuccess from "./components/VerificationSuccess.jsx";
import VerificationError from "./components/VerificationError.jsx";
import VerificationLoader from "./components/VerificationLoader.jsx";
import GlobalSyncButton from "./components/GlobalSyncButton.jsx";
import { BlockchainProvider } from "./BlockchainContext.jsx";
import { verifyAndBurnPacket } from "./services/verificationService.js";
import { updateTransitLocation } from "./services/transitService.js";
import { getAgronomicAdvice } from "./services/agronomicService.js";
import "./App.css";

const App = () => {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaderFinished, setLoaderFinished] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [verifyStatus, setVerifyStatus] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [mode, setMode] = useState("farmer");
  const [transitParentId, setTransitParentId] = useState("");
  const [handlerName, setHandlerName] = useState("");
  const [transitStatus, setTransitStatus] = useState("");
  const [transitError, setTransitError] = useState("");
  const [transitSaving, setTransitSaving] = useState(false);
  const [gpsLat, setGpsLat] = useState(null);
  const [gpsLng, setGpsLng] = useState(null);
  const [finalRetailer, setFinalRetailer] = useState(false);
  const [route, setRoute] = useState(window.location.hash || "");

  React.useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const handleScanStart = () => {
    setLastResult(null);
    setScanning(true);
  };

  const handleLogisticsScanStart = () => {
    setTransitStatus("");
    setTransitError("");
    setTransitParentId("");
    setFinalRetailer(false);
    setGpsLat(null);
    setGpsLng(null);
    setScanning(true);
  };

  const handleScanResult = async (childId) => {
    setScanning(false);
    setLoading(true);
    setLoaderFinished(false);
    setVerifyProgress(0);
    setVerifyStatus("Initializing Quantum Link...");
    setVerifyError("");

    try {
      // Smart Link parsing: Extract raw BATCH_ID from URL parameter
      const rawId = childId.includes('?id=') ? childId.split('?id=')[1] : childId;

      // Pass the progress callback to sync the UI with blockchain phases
      const result = await verifyAndBurnPacket(rawId.trim(), (pct, msg) => {
        setVerifyProgress(pct);
        setVerifyStatus(msg);
      });
      setLastResult({ success: true, ...result });
    } catch (err) {
      console.error("Verification Error Caught in App.jsx:", err);
      // Ensure the error state is set so the Loader knows it failed
      setVerifyError(err.message || "Validation Failed");
      
      // We set lastResult immediately. The VerificationLoader will wait a second 
      // (because of `error ? 2000 : 800`) then call `onComplete` to hide the loader and show this result.
      setLastResult({
        success: false,
        message: err.message,
        reason: err.reason || "ERROR"
      });
    }
  };

  const handleLogisticsScanResult = (scannedData) => {
    setScanning(false);
    
    // Smart Link parsing: Extract raw BATCH_ID from URL parameter
    const rawData = String(scannedData).trim();
    const cartonId = rawData.includes('?id=') ? rawData.split('?id=')[1] : rawData;
    setTransitParentId(cartonId);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
      });
    }
  };

  const handleTransitSubmit = async (e) => {
    e.preventDefault();
    setTransitSaving(true);
    setTransitError("");
    try {
      await updateTransitLocation(transitParentId, handlerName, gpsLat, gpsLng, finalRetailer);
      setTransitStatus("Transit update recorded successfully.");
      setTransitParentId("");
      setHandlerName("");
    } catch (err) {
      setTransitError(err.message);
    } finally {
      setTransitSaving(false);
    }
  };

  if ((route || "").startsWith("#/seedsense")) {
    return (
      <BlockchainProvider>
        <SeedSensePage />
      </BlockchainProvider>
    );
  }

  return (
    <BlockchainProvider>
      <div className="farmer-app-wrap">
        <div className="farmer-card">
          <header className="farmer-header" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <GlobalSyncButton />
            </div>
            <div className="farmer-logo-icon">
              <ShieldCheck size={32} />
            </div>
            <h1 className="farmer-title">SeedSecure</h1>
            <p className="farmer-subtitle">Next-Gen Agricultural Trust</p>
          </header>

          <div className="farmer-tabs">
            <button
              className={`farmer-tab ${mode === "farmer" ? "active" : ""}`}
              onClick={() => {
                setMode("farmer");
                setScanning(false);
                setLastResult(null);
              }}
            >
              <User size={18} />
              Farmer
            </button>
            <button
              className={`farmer-tab ${mode === "logistics" ? "active" : ""}`}
              onClick={() => {
                setMode("logistics");
                setScanning(false);
                setTransitStatus("");
              }}
            >
              <Truck size={18} />
              Logistics
            </button>
          </div>

          {mode === "farmer" ? (
            <div className="farmer-content">
              {!scanning ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <PackageCheck size={48} style={{ color: 'var(--accent-emerald)', opacity: 0.5, marginBottom: 16 }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Verify Seed Packet</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Scan the QR code on your child packet to verify authenticity on the blockchain.
                    </p>
                  </div>

                  {!lastResult && !loading && (
                    <button className="farmer-btn-primary" onClick={handleScanStart}>
                      <Scan size={24} />
                      Scan Packet QR
                    </button>
                  )}

                  {loading && (
                    <div className={`verification-loader-overlay ${loaderFinished ? 'v-fade-out' : ''}`}>
                      <VerificationLoader
                        progress={verifyProgress}
                        status={verifyStatus}
                        error={verifyError}
                        onComplete={() => {
                          setLoaderFinished(true);
                          setTimeout(() => setLoading(false), 800);
                        }}
                      />
                    </div>
                  )}

                  {lastResult && loaderFinished && !loading && (
                    <div className="farmer-result-container v-flip-in">
                      {lastResult.success ? (
                        <VerificationSuccess
                          {...lastResult}
                          onRetry={() => {
                            setLastResult(null);
                            setScanning(true);
                          }}
                          onHome={() => {
                            setLastResult(null);
                            setScanning(false);
                          }}
                        />
                      ) : (
                        <VerificationError
                          {...lastResult}
                          onRetry={() => {
                            setLastResult(null);
                            setScanning(true);
                          }}
                          onHome={() => {
                            setLastResult(null);
                            setScanning(false);
                          }}
                        />
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="farmer-scanner-container">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <button onClick={() => setScanning(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <ChevronLeft size={24} />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Align QR Code</h3>
                  </div>
                  <div className="farmer-scanner-box">
                    <Scanner onScan={handleScanResult} onClose={() => setScanning(false)} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="farmer-content">
              {!scanning ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <MapPin size={48} style={{ color: 'var(--accent-cyan)', opacity: 0.5, marginBottom: 16 }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Transit Tracking</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Record movement of parent cartons through the supply chain.
                    </p>
                  </div>

                  {!transitParentId ? (
                    <button
                      className="farmer-btn-primary"
                      onClick={handleLogisticsScanStart}
                      style={{ background: 'linear-gradient(135deg, var(--accent-cyan) 0%, #0891b2 100%)', boxShadow: '0 20px 40px -10px rgba(6, 182, 212, 0.4)' }}
                    >
                      <Scan size={24} />
                      Scan Parent Carton
                    </button>
                  ) : (
                    <form onSubmit={handleTransitSubmit} className="farmer-form">
                      <div className="farmer-form-group">
                        <div className="farmer-form-label">Batch ID</div>
                        <div className="farmer-form-input" style={{ opacity: 0.7 }}>{transitParentId}</div>
                      </div>
                      <div className="farmer-form-group">
                        <label htmlFor="handlerName" className="farmer-form-label">Handler Name</label>
                        <div style={{ position: 'relative' }}>
                          <UserCircle size={18} style={{ position: 'absolute', left: 16, top: 16, color: 'var(--text-muted)' }} />
                          <input
                            id="handlerName"
                            type="text"
                            className="farmer-form-input"
                            style={{ paddingLeft: 44 }}
                            placeholder="Enter your name/organization"
                            value={handlerName}
                            onChange={(e) => setHandlerName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="farmer-checkbox-wrap">
                        <input
                          id="finalRetailer"
                          type="checkbox"
                          checked={finalRetailer}
                          onChange={(e) => setFinalRetailer(e.target.checked)}
                        />
                        <label htmlFor="finalRetailer">Mark as final retailer (Ready for sale)</label>
                      </div>

                      <button
                        type="submit"
                        className="farmer-btn-primary"
                        disabled={transitSaving}
                        style={{ marginTop: 24 }}
                      >
                        {transitSaving ? "Updating Ledger..." : "Confirm Transit Update"}
                      </button>
                      <button
                        type="button"
                        className="farmer-btn-secondary"
                        onClick={() => setTransitParentId("")}
                      >
                        Cancel
                      </button>
                    </form>
                  )}

                  {transitStatus && (
                    <div className="farmer-result-card farmer-result-success" style={{ textAlign: 'center' }}>
                      <p style={{ color: 'var(--accent-emerald)', fontWeight: 700, margin: 0 }}>{transitStatus}</p>
                    </div>
                  )}
                  {transitError && (
                    <div className="farmer-result-card farmer-result-error" style={{ textAlign: 'center' }}>
                      <p style={{ color: 'var(--danger)', fontWeight: 700, margin: 0 }}>{transitError}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="farmer-scanner-container">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <button onClick={() => setScanning(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <ChevronLeft size={24} />
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Scan Parent Carton</h3>
                  </div>
                  <div className="farmer-scanner-box" style={{ borderColor: 'var(--accent-cyan)' }}>
                    <Scanner onScan={handleLogisticsScanResult} onClose={() => setScanning(false)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
      </div>
    </BlockchainProvider>
  );
};

export default App;
