import { useEffect, useState } from "react";
import LegacyAdminApp from "./AdminAppLegacy.jsx";
import EmailAdmin from "./EmailAdmin.jsx";
import ReflectionQuotesAdmin from "./ReflectionQuotesAdmin.jsx";
import { brand } from "./brand.jsx";
import { supabase } from "./supabase.js";

function readInitialView() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("view");
  return ["quotes", "emails"].includes(requested) ? requested : "system";
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
    if (nextView === "system") url.searchParams.delete("view");
    else url.searchParams.set("view", nextView);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: brand.bg, color: brand.text }}>
      {adminAuthorized && (
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "12px 16px 0", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
          <nav aria-label="Admin sections" style={{ display: "flex", gap: 14, alignItems: "end", paddingBottom: 2, overflowX: "auto" }}>
            <div>
              <div style={{ color: brand.textSoft, fontSize: 9, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", margin: "0 0 5px 4px" }}>System</div>
              <button
                type="button"
                onClick={() => chooseView("system")}
                style={{
                  minHeight: 34,
                  borderRadius: 999,
                  padding: "7px 12px",
                  border: `1px solid ${view === "system" ? brand.teal : brand.border}`,
                  background: view === "system" ? brand.surfaceSoft : brand.surface,
                  color: view === "system" ? brand.text : brand.textMuted,
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                System
              </button>
            </div>
            <div>
              <div style={{ color: brand.textSoft, fontSize: 9, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", margin: "0 0 5px 4px" }}>Editorial</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  ["quotes", "Quotes"],
                  ["emails", "Emails"],
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
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}

      {adminAuthorized && view === "quotes" ? (
        <ReflectionQuotesAdmin />
      ) : adminAuthorized && view === "emails" ? (
        <EmailAdmin />
      ) : (
        <LegacyAdminApp />
      )}
    </div>
  );
}
