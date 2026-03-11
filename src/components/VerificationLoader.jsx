import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import "./VerificationLoader.css";

const VerificationLoader = ({ progress, status, error, onComplete }) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smoothly animate the progress ring
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev < progress) return Math.min(prev + 1, progress);
        if (prev > progress) return prev; // Don't go backwards
        return prev;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [progress]);

  useEffect(() => {
    if (displayProgress >= 100 || error) {
      const delay = error ? 2000 : 800;
      const timeout = setTimeout(() => {
        if (onComplete) onComplete();
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [displayProgress, error, onComplete]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayProgress / 100) * circumference;

  const getRingColor = () => {
    if (error) return "#EF4444"; // Red
    // Transition from Neon Mint to Sovereign Blue
    if (displayProgress < 50) return "#00FF9D";
    return "#3B82F6";
  };

  return (
    <div className="quantum-loader-wrap">
      <div className="quantum-loader-container">
        <div className="quantum-ring-wrap">
          <svg className="quantum-svg" width="180" height="180">
            <circle
              className="quantum-track"
              cx="90"
              cy="90"
              r={radius}
              strokeWidth="6"
            />
            <circle
              className="quantum-progress"
              cx="90"
              cy="90"
              r={radius}
              strokeWidth="8"
              stroke={getRingColor()}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>

          <div className={`quantum-shield-center ${error ? 'error-state' : ''}`}>
            {error ? (
              <AlertTriangle size={48} className="quantum-error-icon" />
            ) : (
              <>
                <ShieldCheck size={48} className="quantum-shield-icon" style={{ color: getRingColor() }} />
                <div className="quantum-pulse-ring" style={{ borderColor: getRingColor() }}></div>
              </>
            )}
          </div>
        </div>

        <div className="quantum-content">
          <div className="quantum-pct mono-text" style={{ color: getRingColor() }}>
            {Math.round(displayProgress)}%
          </div>
          <div className={`quantum-status mono-text ${error ? 'error-text' : ''}`}>
            {error || status || "Initializing Quantum Link..."}
          </div>
          {error && (
            <div className="validation-failed-msg mono-text">
              {String(error).includes("chronological sequence") ? "SEQUENCE VIOLATION" : "VALIDATION FAILED"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationLoader;
