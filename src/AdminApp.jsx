import { useEffect, useState } from "react";
import LegacyAdminApp from "./AdminAppLegacy.jsx";
import ReflectionQuotesAdmin from "./ReflectionQuotesAdmin.jsx";
import { brand } from "./brand.jsx";
import { supabase } from "./supabase.js";

function readInitialView() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "quotes" ? "quotes" : "system";
}

export default function AdminApp() {
  const [view, setView] = useState(readInitialView);
  const [adminAuthorized, setAdminAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin(nextSession) {
      if (!nextSession?.user) {
        if (!cancelled) setAdminAuthorized(false);
        return;
      }
      const { data, error } = await supabase.rpc("is_app_admin");
      if (!cancelled) setAdminAuthorized(!error && data === true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => checkAdmin(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      checkAdmin(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  function chooseView(nextView) {
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === "quotes") url.searchParams.set("view", "quotes");
    else url.searchParams.delete("view");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: brand.bg, color: brand.text }}>
      {adminAuthorized && (
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "12px 16px 0" }}>
          <nav aria-label="Admin sections" style={{ display: "flex", gap: 6, paddingBottom: 2, overflowX: "auto" }}>
            {[
              ["system", "System"],
              ["quotes", "Editorial Library"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => chooseView(id)}
                style={{
                  minHeight: 34,
                  borderRadius: 999,
                  padding: "7px 12px",
                  border: `1px solid ${view === id ? brand.teal : brand.border}`,
                  background: view === id ? brand.surfaceSoft : brand.surface,
                  color: view === id ? brand.text : brand.textMuted,
                  fontFamily: "'DM Sans', -apple-system, sans-serif",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {adminAuthorized && view === "quotes" ? <ReflectionQuotesAdmin /> : <LegacyAdminApp />}
    </div>
  );
}
