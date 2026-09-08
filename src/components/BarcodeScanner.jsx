import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ScanLine, X } from "lucide-react";
import { brand } from "../brand.jsx";

function barcodeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isUsableBarcode(value) {
  const digits = barcodeDigits(value);
  return digits.length >= 8 && digits.length <= 14;
}

export default function BarcodeScanner({ onDetected, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Point the camera at the barcode.");
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    detectedRef.current = false;
    setStatus("Point the camera at the barcode.");

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    async function startCamera() {
      try {
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || detectedRef.current) return;
            const raw = result.getText?.() || String(result.text || "");
            if (!isUsableBarcode(raw)) {
              setStatus("I can see a code, but it doesn’t look like a UPC or GTIN yet.");
              return;
            }

            detectedRef.current = true;
            const digits = barcodeDigits(raw);
            controlsRef.current?.stop?.();
            setOpen(false);
            onDetected?.(digits);
          }
        );

        if (cancelled) {
          controls.stop?.();
          return;
        }
        controlsRef.current = controls;
      } catch (error) {
        console.error("Barcode scanner could not start", error);
        const name = String(error?.name || "");
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setStatus("Camera access is off. Allow camera access for With, then try again.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setStatus("I couldn’t find a camera on this device.");
        } else {
          setStatus("The camera couldn’t start. You can still type the UPC into food search.");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      controlsRef.current?.stop?.();
      controlsRef.current = null;
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onDetected]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="Scan barcode"
        title="Scan barcode"
        style={{
          height: 46,
          minWidth: 46,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${brand.border}`,
          borderRadius: 8,
          background: brand.surface,
          color: disabled ? brand.textSoft : brand.tealDark,
          padding: 0,
          cursor: disabled ? "default" : "pointer",
          flexShrink: 0,
        }}
      >
        <ScanLine style={{ width: 19, height: 19 }} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Scan a food barcode"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(23,24,22,.78)",
            display: "grid",
            alignItems: "end",
            padding: "18px 14px calc(18px + env(safe-area-inset-bottom))",
          }}
        >
          <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", background: brand.surface, borderRadius: 18, overflow: "hidden", boxShadow: "0 18px 60px rgba(0,0,0,.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 15px 12px" }}>
              <div>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 22, fontWeight: 600, color: brand.text, lineHeight: 1.05 }}>Scan barcode</div>
                <div style={{ color: brand.textMuted, fontSize: 11, marginTop: 3 }}>UPC or GTIN on packaged food</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close barcode scanner"
                style={{ width: 36, height: 36, display: "grid", placeItems: "center", border: `1px solid ${brand.border}`, borderRadius: "50%", background: brand.surfaceSoft, color: brand.textMuted, padding: 0 }}
              >
                <X style={{ width: 18, height: 18 }} strokeWidth={2} />
              </button>
            </div>

            <div style={{ position: "relative", background: "#111", aspectRatio: "4 / 3", overflow: "hidden" }}>
              <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div aria-hidden="true" style={{ position: "absolute", left: "9%", right: "9%", top: "32%", height: "36%", border: "2px solid rgba(255,255,255,.9)", borderRadius: 12, boxShadow: "0 0 0 999px rgba(0,0,0,.14)" }} />
              <div aria-hidden="true" style={{ position: "absolute", left: "15%", right: "15%", top: "50%", height: 1, background: "rgba(255,255,255,.72)" }} />
            </div>

            <div style={{ padding: "12px 15px 15px", color: brand.textMuted, fontSize: 12, lineHeight: 1.45 }}>
              {status}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
