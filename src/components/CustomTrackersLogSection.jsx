import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { brand } from "../brand.jsx";
import { supabase } from "../supabase.js";
import { useCustomTrackerLogging } from "../useCustomTrackerLogging.js";
import CustomTrackerLogger from "./CustomTrackerLogger.jsx";

export default function CustomTrackersLogSection({ activeCanEdit, today, initialDate, styles }) {
  const { BORDER, TEXT, TEXT_MUTED, SURFACE_2, cardStyle, fieldLabel, inputStyle } = styles;
  const [profileId, setProfileId] = useState(null);
  const [entryDate, setEntryDate] = useState(initialDate || today);

  useEffect(() => {
    setEntryDate(initialDate || today);
  }, [initialDate, today]);

  useEffect(() => {
    let cancelled = false;
    async function resolveOwnedProfile() {
      if (!activeCanEdit) { setProfileId(null); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cancelled) setProfileId(data?.id || null);
    }
    resolveOwnedProfile();
    return () => { cancelled = true; };
  }, [activeCanEdit]);

  const { metrics, entries, loading, savingId, error, saveValue, deleteValue } = useCustomTrackerLogging(profileId, activeCanEdit, entryDate);

  if (!activeCanEdit || (!loading && metrics.length === 0)) return null;

  return (
    <section style={{ ...cardStyle, marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: TEXT, fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600 }}>
            <Sparkles style={{ width: 17, height: 17, color: brand.teal }} strokeWidth={1.9} /> My Trackers
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 4 }}>The personal things you’ve chosen to track.</div>
        </div>
        <div style={{ width: 126, flexShrink: 0 }}>
          <div style={{ ...fieldLabel, marginBottom: 4 }}>Date</div>
          <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} style={{ ...inputStyle, minHeight: 38, height: 38, padding: "0 7px", fontSize: 13 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "8px 0" }}>Loading your trackers…</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {metrics.map((metric) => (
            <div key={metric.id} style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
              <CustomTrackerLogger
                metric={metric}
                entry={entries[metric.id]}
                entryDate={entryDate}
                isToday={entryDate === today}
                saving={savingId === metric.id}
                onSave={saveValue}
                onDelete={deleteValue}
                styles={styles}
                compact
              />
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ color: "#A64B43", fontSize: 11, marginTop: 10 }}>{error}</div>}
    </section>
  );
}
