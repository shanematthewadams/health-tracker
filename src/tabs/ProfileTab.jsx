import { brand } from "../brand.jsx";
import { useMemo, useState } from "react";
import { Share2, Check, LogOut, Users } from "lucide-react";
import { WithMark } from "../WithMarks.jsx";
import ProfileWithsPanel from "../components/ProfileWithsPanel.jsx";
import MyTrackersPanel from "../components/MyTrackersPanel.jsx";
import LoggingRemindersPanel from "../components/LoggingRemindersPanel.jsx";
import DataExportPanel from "../components/DataExportPanel.jsx";
import { supabase } from "../supabase.js";
import { readStoredActiveWithId } from "../withMemberships.js";

export default function ProfileTab({
  activeUser,
  data,
  session,
  timeZone,
  deviceTimeZone,
  saveTimeZone,
  waterShortcuts,
  saveWaterShortcuts,
  householdName,
  householdRole,
  profileNames,
  profileNameInput,
  setProfileNameInput,
  profileColors,
  profileColor,
  profileWithmarks,
  profileWithmark,
  withmarkOptions,
  profileColorOptions,
  saveProfileColor,
  saveProfileWithmark,
  saveProfileName,
  openGoalsEdit,
  fmtGoalDate,
  emailInput,
  setEmailInput,
  saveEmail,
  newPasswordInput,
  setNewPasswordInput,
  confirmPasswordInput,
  setConfirmPasswordInput,
  savePassword,
  accountBusy,
  accountError,
  accountMessage,
  renamingWith,
  setRenamingWith,
  withNameInput,
  setWithNameInput,
  renameWith,
  clearAccountError,
  signOut,
  deleteConfirm,
  setDeleteConfirm,
  deleteAccount,
  successColor,
  styles,
}) {
  const [shareStatus, setShareStatus] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [editingTimeZone, setEditingTimeZone] = useState(false);
  const [editingWaterShortcuts, setEditingWaterShortcuts] = useState(false);
  const [waterShortcutDraft, setWaterShortcutDraft] = useState(() => (waterShortcuts || [8, 16, 24]).map(String));
  const [hasMultipleWiths, setHasMultipleWiths] = useState(false);
  const [openPreference, setOpenPreference] = useState("");

  const timeZoneOptions = useMemo(() => {
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    const fallback = ["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Phoenix","Pacific/Honolulu","America/Anchorage","UTC"];
    return supported.length ? supported : fallback;
  }, []);

  const {
    SURFACE,
    SURFACE_2,
    BORDER,
    TEXT,
    TEXT_MUTED,
    WARN,
    fieldLabel,
    inputStyle,
    bigButton,
  } = styles;

  const accountOnlyMessage = accountMessage && ![
    "Your profile name is already up to date.",
    "Profile name updated.",
    "Your color is updated.",
    "Your Withmark is updated.",
    "Your With has been renamed.",
  ].includes(accountMessage)
    ? accountMessage
    : "";

  const sectionLabel = {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".06em",
    marginBottom: 7,
  };

  const preferenceButton = {
    width: "100%",
    border: `1px solid ${BORDER}`,
    borderRadius: 13,
    background: SURFACE_2,
    color: TEXT,
    padding: "13px 14px",
    textAlign: "left",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 12,
  };

  async function shareWith() {
    const url = window.location.origin;
    const shareData = {
      title: "With",
      text: "I’ve been using With to keep track of my health in a simple, private way. Thought you might like it too.",
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied");
      window.setTimeout(() => setShareStatus(""), 2200);
    } catch (error) {
      if (error?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setShareStatus("Link copied");
        window.setTimeout(() => setShareStatus(""), 2200);
      } catch {
        setShareStatus("Couldn’t copy the link");
        window.setTimeout(() => setShareStatus(""), 2600);
      }
    }
  }

  async function sendInviteEmail() {
    const email = inviteEmail.trim();
    const householdId = readStoredActiveWithId();
    setInviteError("");
    setInviteMessage("");

    if (!email) {
      setInviteError("Enter an email address.");
      return;
    }
    if (!householdId) {
      setInviteError("We couldn’t identify this With. Refresh and try again.");
      return;
    }

    setInviteBusy(true);
    const { error } = await supabase.functions.invoke("send-with-invite", {
      body: { email, householdId },
    });

    if (error) {
      setInviteError("We couldn’t send that invitation. Try again.");
    } else {
      setInviteMessage(`Invite sent to ${email}.`);
      setInviteEmail("");
    }
    setInviteBusy(false);
  }

  function startAnotherWith() {
    window.dispatchEvent(new CustomEvent("with:open-create-dialog"));
  }

  const goal = data[activeUser];
  const goalSentence = goal?.goalWeight
    ? `Working toward ${goal.goalWeight} lb${goal.goalDate ? ` by ${fmtGoalDate(goal.goalDate)}` : ""}.`
    : "You haven’t set a health goal yet.";

  function togglePreference(key) {
    setOpenPreference((current) => current === key ? "" : key);
  }

  return (
    <>
      <div style={{ padding: "0.2rem 0.1rem 1.05rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Profile</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>You, your people, and the things you’re working toward.</div>
      </div>

      <section style={{ padding: "0 0.1rem 1.25rem", borderBottom: `1px solid ${BORDER}`, marginBottom: 18 }}>
        <div style={{ ...sectionLabel, marginBottom: 9 }}>You</div>
        {!editingProfile ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <WithMark id={profileWithmark(activeUser)} size={22} color={profileColor(activeUser)} />
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 28, fontWeight: 600, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileNameInput || activeUser}</div>
            </div>
            <button onClick={() => { clearAccountError(); setEditingProfile(true); }} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "6px 0" }}>Edit</button>
          </div>
        ) : (
          <div>
            <div style={fieldLabel}>Profile name</div>
            <input type="text" maxLength={40} value={profileNameInput} onChange={(e) => setProfileNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />

            <div style={fieldLabel}>Your color</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 15 }}>
              {profileColorOptions.map((c) => {
                const selected = (profileColors[profileNameInput || activeUser] || profileColor(profileNameInput || activeUser)) === c.value;
                return (
                  <button key={c.value} type="button" title={c.name} aria-label={`Choose ${c.name}`} onClick={() => saveProfileColor(c.value)} style={{ width: 34, height: 34, borderRadius: "50%", background: c.value, border: selected ? `3px solid ${TEXT}` : `2px solid ${SURFACE}`, boxShadow: selected ? `0 0 0 2px ${BORDER}` : `0 0 0 1px ${BORDER}`, padding: 0 }} />
                );
              })}
            </div>

            <div style={fieldLabel}>Your Withmark</div>
            <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.4, marginBottom: 9 }}>A little mark that represents you in your With.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 7, marginBottom: 16 }}>
              {withmarkOptions.map((option) => {
                const selected = (profileWithmarks[profileNameInput || activeUser] || profileWithmark(profileNameInput || activeUser)) === option.id;
                return (
                  <button key={option.id} type="button" title={option.name} aria-label={`Choose ${option.name} Withmark`} onClick={() => saveProfileWithmark(option.id)} style={{ minWidth: 0, aspectRatio: "1", display: "grid", placeItems: "center", background: selected ? SURFACE_2 : SURFACE, border: selected ? `2px solid ${TEXT}` : `1px solid ${BORDER}`, borderRadius: 10, padding: 5 }}>
                    <WithMark id={option.id} size={22} color={selected ? profileColor(activeUser) : TEXT_MUTED} />
                  </button>
                );
              })}
            </div>

            {accountError && <div style={{ color: WARN, fontSize: 12, marginBottom: 10 }}>{accountError}</div>}
            {accountMessage && <div style={{ color: successColor, fontSize: 12, marginBottom: 10 }}>{accountMessage}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingProfile(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
              <button onClick={async () => { const ok = await saveProfileName(); if (ok !== false) setEditingProfile(false); }} disabled={accountBusy} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", paddingInline: 18 }}>Save</button>
            </div>
          </div>
        )}

        {!editingProfile && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: TEXT }}>Your goal</div>
              <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>{goalSentence}</div>
            </div>
            <button onClick={openGoalsEdit} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: 0, flexShrink: 0 }}>{goal?.goalWeight ? "Manage" : "Set goal"}</button>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={sectionLabel}>{hasMultipleWiths ? "Your Current With" : "Your With"}</div>

        {!renamingWith ? (
          <>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, lineHeight: 1.05 }}>{householdName}</div>
            <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 7, lineHeight: 1.45 }}>
              {profileNames.length === 1
                ? `${profileNames[0]} is doing this here.`
                : `${profileNames.slice(0, -1).join(", ")}${profileNames.length > 2 ? "," : ""} and ${profileNames[profileNames.length - 1]} are doing this together.`}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {profileNames.map((name) => (
                <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: SURFACE_2, borderRadius: 999, padding: "6px 9px", fontSize: 12 }}>
                  <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColor(name) }} />
                  {name}
                </span>
              ))}
            </div>

            {householdRole === "owner" && (
              <button onClick={() => { setWithNameInput(householdName); setRenamingWith(true); clearAccountError(); }} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "12px 0 0" }}>Edit With name</button>
            )}

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>Invite someone to your With</div>
              <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 5 }}>
                {profileNames.length === 1 ? "With is better with others. Add someone you know to this With so you can support each other in your goals." : "Add someone else to your With so you can support each other in your goals."}
              </div>
              <button onClick={() => setInviting((v) => !v)} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "8px 0 0" }}>{inviting ? "Close invite" : "Invite someone"}</button>
            </div>
          </>
        ) : (
          <div>
            <div style={fieldLabel}>With name</div>
            <input type="text" maxLength={40} value={withNameInput} onChange={(e) => setWithNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            {accountError && <div style={{ color: WARN, fontSize: 12, marginBottom: 10 }}>{accountError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => { setRenamingWith(false); setWithNameInput(householdName); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={renameWith} disabled={accountBusy} style={bigButton(brand.teal, brand.inkOn)}>{accountBusy ? "Saving…" : "Save name"}</button>
            </div>
          </div>
        )}

        {inviting && !renamingWith && (
          <div style={{ marginTop: 12, padding: 14, background: SURFACE_2, borderRadius: 12 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>Who would you like to invite? We’ll email them a private invitation tied to this With.</div>
            <div style={fieldLabel}>Email address</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="friend@example.com" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={sendInviteEmail} disabled={inviteBusy || !inviteEmail.trim()} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", padding: "10px 14px", opacity: inviteBusy || !inviteEmail.trim() ? .6 : 1 }}>{inviteBusy ? "Sending…" : "Send"}</button>
            </div>
            {inviteError && <div style={{ color: WARN, fontSize: 12, marginTop: 8 }}>{inviteError}</div>}
            {inviteMessage && <div style={{ color: successColor, fontSize: 12, marginTop: 8 }}>{inviteMessage}</div>}
          </div>
        )}

        {!renamingWith && (
          <ProfileWithsPanel styles={{ SURFACE_2, BORDER, TEXT, TEXT_MUTED }} onMultipleWithsChange={setHasMultipleWiths} />
        )}

        {!renamingWith && !hasMultipleWiths && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: SURFACE_2, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Users size={16} color={brand.tealDark} strokeWidth={1.9} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>You can have more than one With</div>
                <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>Your health stays yours. You keep one profile and one health history, so you only log food, weight, movement, water, and everything else once. Each With is simply another private group of people you’re doing life With.</div>
                <button type="button" onClick={startAnotherWith} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "9px 0 0" }}>Start another With</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
        <div style={sectionLabel}>How you use With</div>
        <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>Keep the everyday settings here. Open only what you want to change.</div>

        <div style={{ display: "grid", gap: 8 }}>
          <button type="button" onClick={() => togglePreference("trackers")} aria-expanded={openPreference === "trackers"} style={preferenceButton}>
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>Trackers</span>
              <span style={{ display: "block", color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>Choose what you track and who can see it.</span>
            </span>
            <span style={{ color: brand.tealDark, fontSize: 11, fontWeight: 800 }}>{openPreference === "trackers" ? "Close" : "Manage"}</span>
          </button>

          {openPreference === "trackers" && (
            <div style={{ margin: "-2px 0 4px" }}>
              <MyTrackersPanel
                session={session}
                onOpenGoals={openGoalsEdit}
                styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, fieldLabel, inputStyle, bigButton }}
              />
            </div>
          )}

          <button type="button" onClick={() => togglePreference("reminders")} aria-expanded={openPreference === "reminders"} style={preferenceButton}>
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>Reminders</span>
              <span style={{ display: "block", color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>Choose when With gives you a gentle nudge.</span>
            </span>
            <span style={{ color: brand.tealDark, fontSize: 11, fontWeight: 800 }}>{openPreference === "reminders" ? "Close" : "Manage"}</span>
          </button>

          {openPreference === "reminders" && (
            <div style={{ margin: "-2px 0 4px" }}>
              <LoggingRemindersPanel
                session={session}
                styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, fieldLabel, inputStyle, bigButton }}
              />
            </div>
          )}

          <button type="button" onClick={() => togglePreference("quick-add")} aria-expanded={openPreference === "quick-add"} style={preferenceButton}>
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>Quick add</span>
              <span style={{ display: "block", color: TEXT_MUTED, fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>Water shortcuts: {waterShortcuts.join(" oz, ")} oz</span>
            </span>
            <span style={{ color: brand.tealDark, fontSize: 11, fontWeight: 800 }}>{openPreference === "quick-add" ? "Close" : "Manage"}</span>
          </button>

          {openPreference === "quick-add" && (
            <div style={{ padding: "11px 4px 4px" }}>
              {!editingWaterShortcuts ? (
                <>
                  <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45 }}>Your water quick-add buttons are <strong style={{ color: TEXT }}>{waterShortcuts.join(" oz, ")} oz</strong>.</div>
                  <button onClick={() => { clearAccountError(); setWaterShortcutDraft(waterShortcuts.map(String)); setEditingWaterShortcuts(true); }} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "7px 0 0" }}>Change water shortcuts</button>
                </>
              ) : (
                <>
                  <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>Set the three amounts you use most often.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {waterShortcutDraft.map((value, index) => (
                      <div key={index}>
                        <div style={fieldLabel}>Shortcut {index + 1}</div>
                        <div style={{ position: "relative" }}>
                          <input type="number" min="1" max="999" step="0.1" inputMode="decimal" value={value} onChange={(e) => setWaterShortcutDraft((prev) => prev.map((item, i) => i === index ? e.target.value : item))} style={{ ...inputStyle, paddingRight: 34 }} />
                          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED, fontSize: 12, pointerEvents: "none" }}>oz</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setWaterShortcutDraft(waterShortcuts.map(String)); setEditingWaterShortcuts(false); }} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
                    <button onClick={async () => { const ok = await saveWaterShortcuts(waterShortcutDraft); if (ok !== false) setEditingWaterShortcuts(false); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Save shortcuts</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <DataExportPanel styles={{ SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, bigButton }} />

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 18 }}>
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Account</div>

        {!editingEmail ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.45 }}>You sign in with <strong style={{ color: TEXT }}>{session?.user?.email}</strong>.</div>
            <button onClick={() => { clearAccountError(); setEditingEmail(true); }} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "6px 0 0" }}>Change email</button>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>Email</div>
            <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingEmail(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
              <button onClick={async () => { const ok = await saveEmail(); if (ok !== false) setEditingEmail(false); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Update email</button>
            </div>
          </div>
        )}

        {!changingPassword ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Your account is protected by a password.</div>
            <button onClick={() => { clearAccountError(); setChangingPassword(true); }} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "6px 0 0" }}>Change password</button>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>New password</div>
            <input type="password" minLength={6} value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={fieldLabel}>Confirm new password</div>
            <input type="password" minLength={6} value={confirmPasswordInput} onChange={(e) => setConfirmPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setChangingPassword(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
              <button onClick={async () => { const ok = await savePassword(); if (ok !== false) setChangingPassword(false); }} disabled={accountBusy || !newPasswordInput} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Save password</button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          {!editingTimeZone ? (
            <>
              <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.45 }}>Your day follows <strong style={{ color: TEXT }}>{timeZone}</strong>.</div>
              <button onClick={() => { clearAccountError(); setEditingTimeZone(true); }} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "6px 0 0" }}>Change time zone</button>
            </>
          ) : (
            <>
              <div style={fieldLabel}>Time zone</div>
              <select defaultValue={timeZone} id="with-timezone-select" style={{ ...inputStyle, marginBottom: 8 }}>
                {timeZoneOptions.map((zone) => <option key={zone} value={zone}>{zone}{zone === deviceTimeZone ? " · device" : ""}</option>)}
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEditingTimeZone(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
                <button onClick={async () => { const nextZone = document.getElementById("with-timezone-select")?.value; const ok = await saveTimeZone(nextZone); if (ok !== false) setEditingTimeZone(false); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Save time zone</button>
              </div>
            </>
          )}
        </div>

        {accountError && <div style={{ color: WARN, fontSize: 13, marginTop: 8 }}>{accountError}</div>}
        {accountOnlyMessage && <div style={{ color: successColor, fontSize: 13, marginTop: 8 }}>{accountOnlyMessage}</div>}
      </section>

      <section style={{ padding: "2px 0 22px" }}>
        <button onClick={signOut} style={{ width: "100%", background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 11, color: TEXT, padding: "11px 13px", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <LogOut style={{ width: 15, height: 15 }} strokeWidth={1.9} /> Sign out
        </button>
      </section>

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 15, paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 14px", marginBottom: 16, width: "100%" }}>
          <a href="/privacy" style={{ color: TEXT_MUTED, fontWeight: 700, fontSize: 11, textDecoration: "none" }}>Privacy policy</a>
          <button onClick={shareWith} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 0, fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
            {shareStatus === "Link copied" ? <Check style={{ width: 12, height: 12 }} /> : <Share2 style={{ width: 12, height: 12 }} />}
            {shareStatus || "Share With"}
          </button>
        </div>
        <details>
          <summary style={{ cursor: "pointer", color: WARN, fontWeight: 700, fontSize: 12 }}>Delete account</summary>
          <div style={{ marginTop: 12 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>
              This permanently removes your login, your profile, and your personal health entries. It does not delete other people or their data.
              {householdRole === "owner" && profileNames.length > 1 ? " Another person in this With will become the owner." : ""}
              {profileNames.length === 1 ? " Because you’re the only person in this With, the With itself will also be removed." : ""}
            </div>
            <div style={fieldLabel}>Type DELETE to confirm</div>
            <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <button onClick={deleteAccount} disabled={accountBusy || deleteConfirm !== "DELETE"} style={{ ...bigButton("#6E3531", "#FFE8E4"), opacity: deleteConfirm === "DELETE" ? 1 : .55 }}>Delete my account</button>
          </div>
        </details>
      </section>
    </>
  );
}
