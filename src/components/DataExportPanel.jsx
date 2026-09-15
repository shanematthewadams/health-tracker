import { useState } from "react";
import { Check, Copy, Download, FileText } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";
import { buildStoredZip, preparePersonalDataExport } from "../dataExport.js";

export default function DataExportPanel({ styles }) {
  const { SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, bigButton } = styles;
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState("");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  async function downloadData() {
    setExportBusy(true);
    setExportError("");
    setCopyStatus("");

    try {
      const { data: exportData, error: exportFunctionError } = await supabase.functions.invoke("export-personal-data", { body: {} });
      if (exportFunctionError) throw exportFunctionError;

      const prepared = preparePersonalDataExport(exportData);
      const zipBytes = buildStoredZip(prepared.files);
      const blob = new Blob([zipBytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `with-data-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setAnalysisPrompt(prepared.analysisPrompt);
    } catch (error) {
      console.error("With data export failed", error);
      setExportError("We couldn’t prepare your data right now. Nothing was changed. Try again.");
    } finally {
      setExportBusy(false);
    }
  }

  async function copyPrompt() {
    if (!analysisPrompt) return;
    setCopyStatus("");

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(analysisPrompt);
      setCopyStatus("Prompt copied");
      window.setTimeout(() => setCopyStatus(""), 2400);
    } catch {
      setShowPrompt(true);
      setCopyStatus("Copying isn’t available here. The prompt is shown below so you can copy it manually.");
    }
  }

  return (
    <section data-testid="personal-data-export" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>Your health data</div>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, lineHeight: 1.2 }}>Take your data with you</div>
      <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>Your health data is yours. Download a copy anytime.</div>

      <button
        type="button"
        onClick={downloadData}
        disabled={exportBusy}
        style={{ ...bigButton(brand.teal, brand.inkOn), marginTop: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: exportBusy ? .65 : 1 }}
      >
        <Download size={15} strokeWidth={1.9} />
        {exportBusy ? "Preparing your data…" : "Download my With data"}
      </button>

      {exportError && <div role="alert" style={{ color: WARN, fontSize: 12, lineHeight: 1.45, marginTop: 9 }}>{exportError}</div>}

      {analysisPrompt && (
        <div data-testid="analysis-prompt-panel" style={{ marginTop: 18, padding: 16, borderRadius: 14, background: SURFACE_2, border: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: brand.tealDark, marginBottom: 8 }}>
            <FileText size={15} strokeWidth={1.9} />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Want to go deeper?</span>
          </div>
          <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 19, fontWeight: 600, lineHeight: 1.2 }}>Want to know more about what this tells you?</div>
          <div style={{ color: TEXT, fontSize: 12, fontWeight: 900, letterSpacing: ".045em", marginTop: 10 }}>WITH IS NOT THE PLACE FOR THAT.</div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.55, marginTop: 7 }}>
            With helps you track your health and notice patterns. It doesn’t diagnose conditions, explain why something happened, or tell you what your data means medically.
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>
            With is very intentionally not your doctor, nutritionist, therapist, or weird uncle who read one study.
          </div>

          <div style={{ marginTop: 13, paddingTop: 12, borderTop: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, lineHeight: 1.5 }}>
            <strong>Before you upload anything:</strong> Once you upload your data somewhere else, that service’s privacy rules apply.
          </div>

          <button
            type="button"
            onClick={copyPrompt}
            style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            {copyStatus === "Prompt copied" ? <Check size={15} strokeWidth={1.9} /> : <Copy size={15} strokeWidth={1.9} />}
            {copyStatus === "Prompt copied" ? "Prompt copied" : "Copy analysis prompt"}
          </button>

          <button type="button" onClick={() => setShowPrompt((value) => !value)} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 11, fontWeight: 800, padding: "9px 0 0" }}>
            {showPrompt ? "Hide prompt" : "View prompt"}
          </button>

          {copyStatus && copyStatus !== "Prompt copied" && <div role="status" style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 7 }}>{copyStatus}</div>}

          {showPrompt && (
            <textarea
              readOnly
              aria-label="With analysis prompt"
              value={analysisPrompt}
              onFocus={(event) => event.currentTarget.select()}
              style={{ width: "100%", minHeight: 240, marginTop: 10, boxSizing: "border-box", border: `1px solid ${BORDER}`, borderRadius: 10, background: "transparent", color: TEXT, padding: 11, font: "inherit", fontSize: 11, lineHeight: 1.45, resize: "vertical" }}
            />
          )}
        </div>
      )}
    </section>
  );
}
