import { useEffect, useRef, useState, useCallback } from "react";

export default function BarcodeScannerView({ onBarcodeDetected, onClose }) {
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("loading"); // loading | live | photo
  const [photoError, setPhotoError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const detectedRef = useRef(false);
  const [manualCode, setManualCode] = useState("");

  // Try live camera first, fall back to photo mode
  useEffect(() => {
    let scanner;
    import("html5-qrcode")
      .then(({ Html5Qrcode }) => {
        scanner = new Html5Qrcode("barcode-reader");
        html5QrCodeRef.current = scanner;

        return scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth) => {
              const width = Math.min(viewfinderWidth * 0.85, 365);
              return { width, height: Math.floor(width * 0.5) };
            },
          },
          (decodedText) => {
            if (detectedRef.current) return;
            detectedRef.current = true;
            scanner.stop().catch(() => {});
            onBarcodeDetected(decodedText);
          },
          () => {},
        );
      })
      .then(() => setMode("live"))
      .catch(() => setMode("photo"));

    return () => {
      if (scanner) scanner.stop().catch(() => {});
    };
  }, [onBarcodeDetected]);

  // Decode barcode from a photo using BarcodeDetector API + html5-qrcode fallback
  const decodeFromPhoto = useCallback(
    async (file) => {
      if (!file) return;
      setProcessing(true);
      setPhotoError(null);

      try {
        // Try native BarcodeDetector first (Chrome 83+, Safari 17.2+, secure context only)
        try {
          if ("BarcodeDetector" in window) {
            const imageBitmap = await createImageBitmap(file);
            const detector = new BarcodeDetector({
              formats: ["upc_a", "upc_e", "ean_13", "ean_8", "code_128"],
            });
            const barcodes = await detector.detect(imageBitmap);
            if (barcodes.length > 0) {
              onBarcodeDetected(barcodes[0].rawValue);
              return;
            }
          }
        } catch {
          // BarcodeDetector failed (insecure context, etc.) — fall through to html5-qrcode
        }

        // Fallback: html5-qrcode scanFile (pure JS, works without secure context)
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("barcode-decode-target");
        const result = await scanner.scanFile(file, false);
        scanner.clear();
        onBarcodeDetected(result);
      } catch {
        setPhotoError("No barcode found — try holding the camera closer");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } finally {
        setProcessing(false);
      }
    },
    [onBarcodeDetected],
  );

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (/^\d{8,14}$/.test(code)) {
      onBarcodeDetected(code);
    }
  };

  const isValidCode = /^\d{8,14}$/.test(manualCode.trim());

  return (
    <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
      {/* Constrain html5-qrcode's internally injected video element */}
      <style>{`
        #barcode-reader {
          max-height: 60vh !important;
          overflow: hidden !important;
        }
        #barcode-reader video {
          max-height: 60vh !important;
          object-fit: cover !important;
        }
      `}</style>
      {/* Hidden target for scanFile fallback */}
      <div
        id="barcode-decode-target"
        style={{ height: 0, overflow: "hidden" }}
      />

      {/* Scanner target — always in DOM so html5-qrcode can attach on mount */}
      <div style={{ position: "relative" }}>
        <div
          id="barcode-reader"
          style={{
            width: "100%",
            background: "#000",
            maxHeight: "70vh",
            overflow: "hidden",
            display: mode === "photo" ? "none" : "block",
          }}
        />

        {/* Close button — overlaid on camera feed */}
        {(mode === "loading" || mode === "live") && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "16px",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        )}

        {/* Transparent barcode hint overlay */}
        {mode === "live" && (
          <svg
            viewBox="0 0 120 60"
            width="200"
            height="100"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              opacity: 0.12,
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            {/* UPC-style barcode bars */}
            <rect x="2" y="0" width="2" height="55" fill="#fff" />
            <rect x="6" y="0" width="1" height="55" fill="#fff" />
            <rect x="9" y="0" width="3" height="55" fill="#fff" />
            <rect x="14" y="0" width="1" height="55" fill="#fff" />
            <rect x="17" y="0" width="2" height="55" fill="#fff" />
            <rect x="21" y="0" width="1" height="55" fill="#fff" />
            <rect x="24" y="0" width="3" height="55" fill="#fff" />
            <rect x="29" y="0" width="1" height="55" fill="#fff" />
            <rect x="32" y="0" width="2" height="55" fill="#fff" />
            <rect x="36" y="0" width="1" height="55" fill="#fff" />
            <rect x="39" y="0" width="3" height="55" fill="#fff" />
            <rect x="44" y="0" width="1" height="55" fill="#fff" />
            <rect x="47" y="0" width="2" height="55" fill="#fff" />
            <rect x="51" y="0" width="1" height="55" fill="#fff" />
            <rect x="54" y="0" width="3" height="55" fill="#fff" />
            <rect x="59" y="0" width="1" height="55" fill="#fff" />
            <rect x="62" y="0" width="1" height="55" fill="#fff" />
            <rect x="65" y="0" width="3" height="55" fill="#fff" />
            <rect x="70" y="0" width="1" height="55" fill="#fff" />
            <rect x="73" y="0" width="2" height="55" fill="#fff" />
            <rect x="77" y="0" width="1" height="55" fill="#fff" />
            <rect x="80" y="0" width="3" height="55" fill="#fff" />
            <rect x="85" y="0" width="1" height="55" fill="#fff" />
            <rect x="88" y="0" width="2" height="55" fill="#fff" />
            <rect x="92" y="0" width="1" height="55" fill="#fff" />
            <rect x="95" y="0" width="3" height="55" fill="#fff" />
            <rect x="100" y="0" width="1" height="55" fill="#fff" />
            <rect x="103" y="0" width="2" height="55" fill="#fff" />
            <rect x="107" y="0" width="1" height="55" fill="#fff" />
            <rect x="110" y="0" width="3" height="55" fill="#fff" />
            <rect x="115" y="0" width="1" height="55" fill="#fff" />
            <rect x="118" y="0" width="2" height="55" fill="#fff" />
          </svg>
        )}
      </div>

      {/* Loading shimmer while camera initializes */}
      {mode === "loading" && (
        <div style={{ padding: "20px 20px", textAlign: "center" }}>
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              margin: "0 auto 16px",
              width: "200px",
              background:
                "linear-gradient(90deg, transparent, #E8C872, transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
            Starting scanner...
          </p>
        </div>
      )}

      {/* Live mode hint */}
      {mode === "live" && (
        <div style={{ padding: "16px 20px", textAlign: "center" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Point camera at the barcode on the package
          </p>
        </div>
      )}

      {/* Photo capture mode (fallback when getUserMedia unavailable) */}
      {mode === "photo" && (
        <div style={{ padding: "40px 20px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#fff",
                margin: 0,
              }}
            >
              Scan Barcode
            </h3>
            <button
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "13px",
              marginBottom: "20px",
              lineHeight: 1.5,
            }}
          >
            Take a clear photo of the barcode — hold steady and fill the frame
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "12px",
              border: "none",
              cursor: processing ? "default" : "pointer",
              background: processing
                ? "rgba(232,200,114,0.3)"
                : "linear-gradient(135deg, #E8C872, #D4A843)",
              color: "#0C0C0E",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: "'DM Sans',sans-serif",
              marginBottom: "12px",
            }}
          >
            {processing ? "Reading barcode..." : "📷 Scan Barcode"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => decodeFromPhoto(e.target.files?.[0])}
            style={{ display: "none" }}
          />

          {processing && (
            <div
              style={{
                height: "3px",
                borderRadius: "2px",
                marginBottom: "12px",
                width: "100%",
                background:
                  "linear-gradient(90deg, transparent, #E8C872, transparent)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }}
            />
          )}

          {photoError && (
            <p
              style={{
                color: "#E87272",
                fontSize: "12px",
                textAlign: "center",
                marginBottom: "12px",
              }}
            >
              {photoError}
            </p>
          )}
        </div>
      )}

      {/* Manual entry — shown for all modes */}
      {mode !== "loading" && (
        <div style={{ padding: "0 20px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "1px",
                background: "rgba(255,255,255,0.08)",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.25)",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              or type it
            </span>
            <div
              style={{
                flex: 1,
                height: "1px",
                background: "rgba(255,255,255,0.08)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Barcode number"
              onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#fff",
                fontSize: "16px",
                fontFamily: "'DM Sans',sans-serif",
                outline: "none",
                letterSpacing: "1px",
              }}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!isValidCode}
              style={{
                padding: "12px 20px",
                borderRadius: "12px",
                border: "none",
                cursor: isValidCode ? "pointer" : "default",
                background: isValidCode
                  ? "linear-gradient(135deg, #E8C872, #D4A843)"
                  : "rgba(255,255,255,0.04)",
                color: isValidCode ? "#0C0C0E" : "rgba(255,255,255,0.2)",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
