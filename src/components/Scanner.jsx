import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, AlertTriangle, ShieldOff } from "lucide-react";

const Scanner = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const h5InstanceRef = useRef(null);
  const rafRef = useRef(null);
  const fileInputRef = useRef(null);

  const [state, setState] = useState("requesting");
  const [msg, setMsg] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(true);

  const stop = async () => {
    if (h5InstanceRef.current) {
      const inst = h5InstanceRef.current;
      h5InstanceRef.current = null;
      try {
        // Html5Qrcode state check: SCANNING=2, PAUSED=3
        const state = inst.getState();
        if (state === 2 || state === 3) {
          try {
            await inst.stop();
          } catch (_) {
            // Expected: library throws if camera stream already released on unmount
            try { await inst.clear(); } catch (_) { }
          }
        }
        // Only clear if NOT_STARTED=1
        const mountEl = document.getElementById("h5qr-live");
        if (inst.getState() === 1 && mountEl) {
          try { await inst.clear(); } catch (_) { }
        }
      } catch (_) {
        // Silently swallow — all stop/clear errors are expected on unmount
      }
    }
    setLoading(true);
  };

  const tick = null;

  const start = async () => {
    try {
      // Priority: use Html5Qrcode for everything as it's more cross-browser compatible and robust
      const { Html5Qrcode } = await import("html5-qrcode");
      const elementId = "h5qr-live";

      // Clear any existing instance before starting
      if (h5InstanceRef.current) {
        try { await h5InstanceRef.current.stop(); } catch { }
        h5InstanceRef.current = null;
      }

      const config = {
        fps: 20,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      const onDecode = (decoded) => {
        stop();
        if (onScan) onScan(decoded);
      };

      const html5 = new Html5Qrcode(elementId, { verbose: false });
      h5InstanceRef.current = html5;

      // explicitly constrain the scanner to use the rear-facing camera
      try {
        await html5.start({ facingMode: { exact: "environment" } }, config, onDecode, () => { });
      } catch (e) {
        await html5.start({ facingMode: "environment" }, config, onDecode, () => { });
      }

      // Enforce mobile video attributes (playsInline)
      const videoEl = document.querySelector("#h5qr-live video");
      if (videoEl) {
        videoEl.setAttribute("playsinline", "true");
        videoEl.setAttribute("webkit-playsinline", "true");
        videoEl.setAttribute("autoplay", "true");
        videoEl.setAttribute("muted", "true");
        videoEl.muted = true;
        videoEl.style.objectFit = "cover";
      }

      setLoading(false);
      setState("active");
    } catch (err) {
      console.error("Scanner start error:", err);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setState("denied");
        setMsg("Enable camera permissions and reload.");
      } else if (name === "NotFoundError") {
        setState("error");
        setMsg("No camera found on this device. Use gallery upload.");
      } else {
        setState("error");
        setMsg(err?.message || "Camera error.");
      }
    }
  };

  useEffect(() => {
    setState("requesting");
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setLoading(true);

    const { Html5Qrcode } = await import("html5-qrcode");
    const html5 = new Html5Qrcode("h5qr-live", { verbose: false });

    try {
      // Pass 1: Use Html5Qrcode's native file scanner (very robust)
      let code = "";
      try {
        code = await html5.scanFile(file, true);
      } catch (e) {
        console.log("Pass 1 (Native) failed, trying advanced passes...");
      }

      // Pass 2: Binary Thresholding & Rotations (our custom logic) if Pass 1 fails
      if (!code) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        await (img.decode ? img.decode() : new Promise((res, rej) => { img.onload = () => res(); img.onerror = rej; }));
        URL.revokeObjectURL(url);

        const detector = ("BarcodeDetector" in window)
          ? new window.BarcodeDetector({ formats: ["qr_code", "data_matrix"] })
          : null;

        const tryAdvanced = async (canvas) => {
          // Try BarcodeDetector first (fastest)
          if (detector) {
            try {
              const res = await detector.detect(canvas);
              if (res?.[0]?.rawValue) return res[0].rawValue;
            } catch { }
          }
          // Try Html5Qrcode on the processed canvas
          try {
            return await html5.scanFileV2(canvas, false);
          } catch { }
          return "";
        };

        // Attempt different image processings
        const passes = [
          () => makeBW(img, { scale: 1, rotate: 0, maxDim: 1200 }),
          () => makeBW(img, { scale: 1, rotate: 90, maxDim: 1200 }),
          () => makeBW(img, { scale: 1.5, rotate: 0, maxDim: 1600 }),
          () => makeBW(img, { scale: 1, rotate: 180, maxDim: 1200 }),
        ];

        for (const pass of passes) {
          const processed = pass();
          code = await tryAdvanced(processed);
          if (code) break;
        }
      }

      if (!code) throw new Error("No QR found");

      setUploadError("");
      if (onScan) onScan(code);
    } catch (err) {
      console.error("Gallery Scan Error:", err);
      setUploadError("No code detected. Ensure the white quiet zone is visible, increase contrast, and avoid glare.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const makeBW = (image, { scale = 1, rotate = 0, maxDim = 1200 } = {}) => {
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    const s = Math.min(scale, maxDim / Math.max(iw * scale, ih * scale));
    const w = Math.max(1, Math.floor(iw * s)), h = Math.max(1, Math.floor(ih * s));
    const ang = (rotate * Math.PI) / 180;
    const sin = Math.abs(Math.sin(ang)), cos = Math.abs(Math.cos(ang));
    const cw = Math.floor(w * cos + h * sin), ch = Math.floor(w * sin + h * cos);
    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    const ctx = c.getContext("2d");
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate(ang);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    const imgData = ctx.getImageData(0, 0, cw, ch);
    const data = imgData.data;
    let sum = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += y; count++;
    }
    const thr = Math.max(120, Math.min(200, sum / count));
    for (let i = 0; i < data.length; i += 4) {
      const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const v = y > thr ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  };

  const overlay = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    borderRadius: 16,
    background: "rgba(0,0,0,0.55)",
    padding: 24,
    textAlign: "center",
    gap: 12,
    color: "#fff",
  };

  return (
    <div className="farmer-scanner-wrap flex flex-col items-center w-full">
      <div className="relative w-full aspect-square min-h-[300px] flex items-center justify-center bg-black rounded-2xl overflow-hidden border-2 border-gray-800 shadow-inner">
        <div
          id="h5qr-live"
          className="w-full h-full absolute inset-0 flex flex-col items-center justify-center bg-black"
        />

        {(state === "requesting" || loading) && (
          <div style={{ ...overlay, position: "absolute", inset: 0 }}>
            <Camera size={40} style={{ opacity: 0.6, marginBottom: 8 }} />
            <p style={{ fontWeight: 700, margin: 0 }}>Initializing camera…</p>
          </div>
        )}
        {state === "denied" && (
          <div style={{ ...overlay, position: "absolute", inset: 0, background: "rgba(239,68,68,0.15)" }}>
            <ShieldOff size={44} style={{ color: "#f87171" }} />
            <p style={{ fontWeight: 800, color: "#fca5a5", margin: 0, fontSize: "1rem" }}>Camera Permission Denied</p>
            <p style={{ color: "#fca5a5", margin: 0, fontSize: "0.85rem", lineHeight: 1.5 }}>{msg}</p>
          </div>
        )}
        {state === "error" && (
          <div style={{ ...overlay, position: "absolute", inset: 0 }}>
            <AlertTriangle size={40} style={{ color: "#fbbf24" }} />
            <p style={{ fontWeight: 700, color: "#fde68a", margin: 0 }}>{msg}</p>
          </div>
        )}
      </div>

      <label
        htmlFor="qr-gallery-input"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          boxSizing: "border-box",
          marginTop: 14,
          padding: "12px 0",
          borderRadius: 12,
          fontWeight: 800,
          fontSize: "0.95rem",
          background: "linear-gradient(135deg, #10B981, #059669)",
          color: "#fff",
          boxShadow: "0 0 14px rgba(16,185,129,0.4)",
          cursor: "pointer",
          userSelect: "none",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <ImagePlus size={20} />
        Upload from Gallery
      </label>
      <input
        id="qr-gallery-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {!!uploadError && (
        <p style={{ marginTop: 10, color: "#f87171", fontWeight: 600, textAlign: "center", fontSize: "0.85rem" }}>
          {uploadError}
        </p>
      )}
    </div>
  );
};

export default Scanner;
