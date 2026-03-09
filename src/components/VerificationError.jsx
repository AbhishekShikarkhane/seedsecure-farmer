import React from "react";
import { AlertTriangle, ShieldAlert, Ban, RefreshCw, Home } from "lucide-react";

const getFriendlyErrorMessage = (rawErrorText) => {
  const text = String(rawErrorText || "").toLowerCase();
  if (text.includes("batch not found") || text.includes("invalid qr")) {
    return "This QR code is invalid or not recognized by the manufacturer. Please check with your retailer.";
  }
  if (
    text.includes("fake or duplicate") ||
    text.includes("already verified") ||
    text.includes("already scanned")
  ) {
    return "WARNING: This seed packet appears to be fake or has already been used.";
  }
  if (text.includes("gas") || text.includes("network") || text.includes("rpc")) {
    return "The network is currently busy. Please try scanning again in a moment.";
  }
  return "An unexpected error occurred while checking this packet.";
};

const VerificationError = ({ message, reason, onRetry, onHome }) => {
  const isDuplicate = reason === "ALREADY_SCANNED" || reason === "ALREADY_SOLD_FIREBASE";
  const friendly = getFriendlyErrorMessage(message);

  return (
    <div className="farmer-result-card farmer-result-error">
      <div className="farmer-result-icon error">
        {isDuplicate ? <Ban size={32} /> : <ShieldAlert size={32} />}
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 className="farmer-result-title" style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>
          {isDuplicate ? "Verification Alert" : "Validation Failed"}
        </h3>
        <p className="farmer-result-message" style={{ color: 'var(--text-primary)', opacity: 0.9, fontSize: '1rem', lineHeight: 1.5 }}>
          {friendly}
        </p>
        <div style={{ borderTop: '1px solid rgba(239,68,68,0.2)', margin: '12px 0' }} />
        <div style={{ fontSize: '10px', color: 'rgba(252,165,165,0.5)', fontFamily: 'monospace', wordBreak: 'break-word', lineHeight: 1.4 }}>
          {String(message || "")}
        </div>
      </div>

      {isDuplicate && (
        <div style={{ background: 'rgba(239,68,68,0.1)', padding: 16, borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#fecaca', lineHeight: 1.5 }}>
            <strong>Security Warning:</strong> This cryptographic seal has already been used. Do not accept this product if the physical seal is broken.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              fontWeight: 700,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          >
            <RefreshCw size={18} />
            Scan Another
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #374151',
              color: '#d1d5db',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              fontWeight: 700,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          >
            <Home size={18} />
            Back to Home
          </button>
        )}
      </div>
    </div>
  );
};

export default VerificationError;
