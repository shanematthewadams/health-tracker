import { brand } from "../brand.jsx";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Droplets,
  LockKeyhole,
  LogOut,
  Mail,
  Pencil,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { WithMark } from "../WithMarks.jsx";
import ProfileWithsPanel from "../components/ProfileWithsPanel.jsx";
import MyTrackersPanel from "../components/MyTrackersPanel.jsx";
import LoggingRemindersPanel from "../components/LoggingRemindersPanel.jsx";
import DataExportPanel from "../components/DataExportPanel.jsx";
import { supabase } from "../supabase.js";
import { readStoredActiveWithId } from "../withMemberships.js";

const PROFILE_SECTIONS = [
  { id: "overview", label: "You & Your Withs" },
  { id: "preferences", label: "Preferences" },
  { id: "account", label: "Account" },
];

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
  const [section, setSection] = useState("overview");
  const [modal, setModal] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [editingTimeZone, setEditingTimeZone] = useState(false);
  const [timeZoneBusy, setTimeZoneBusy] = useState(false);
  const [timeZoneStatus, setTimeZoneStatus] = useState("");
  const [editingWaterShortcuts, setEditingWaterShortcuts] = useState(false);
  const [waterShortcutDraft, setWaterShortcutDraft] = useState(() => (waterShortcuts || [8, 16, 24]).map(String));
  const [hasMultipleWiths, setHasMultipleWiths] = useState(false);

  const timeZoneOptions = useMemo(() => {
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    const fallback = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "Pacific/Honolulu", "America/Anchorage", "UTC"];
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

  const metadata = session?.user?.user_metadata || {};
  const followsDeviceTimeZone = metadata.timezone_auto === true || (metadata.timezone_auto == null && !metadata.timezone);

  useEffect(() => {
    if (!followsDeviceTimeZone || !deviceTimeZone || deviceTimeZone === timeZone || timeZoneBusy) return;
    let cancelled = false;
    async function syncDeviceTimeZone() {
      setTimeZoneBusy(true);
      const currentData = session?.user?.user_metadata || {};
      const { error } = await supabase.auth.updateUser({
        data: { ...currentData, timezone_auto: true, timezone: deviceTimeZone },
      });
      if (!cancelled) {
        if (error) setTimeZoneStatus("We couldn’t update your time zone from this device.");
        setTimeZoneBusy(false);
      }
    }
    syncDeviceTimeZone();
    return () => { cancelled = true; };
  }, [followsDeviceTimeZone, deviceTimeZone, timeZone, session?.user?.id]);

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
    marginBottom: 8,
  };

  const rowStyle = {
    width: "100%",
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    background: SURFACE,
    color: TEXT,
    padding: "14px 15px",
    textAlign: "left",
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 2px 8px rgba(28,36,48,.025)",
  };

  const iconTileStyle = {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: SURFACE_2,
    border: `1px solid ${BORDER}`,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  };

  const inlineActionStyle = {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: 12,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };

  const goal = data[activeUser];
  const goalSentence = goal?.goalWeight
    ? `Working toward ${goal.goalWeight} lb${goal.goalDate ? ` by ${fmtGoalDate(goal.goalDate)}` : ""}.`
    : "You haven’t set a health goal yet.";

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

  function openModal(name) {
    clearAccountError();
    setModal(name);
  }

  function closeModal() {
    setModal("");
    setEditingWaterShortcuts(false);
  }

  async function setFollowDeviceTimeZone(next) {
    setTimeZoneBusy(true);
    setTimeZoneStatus("");
    clearAccountError();
    const currentData = session?.user?.user_metadata || {};
    const nextZone = next ? deviceTimeZone : timeZone;
    const { error } = await supabase.auth.updateUser({
      data: { ...currentData, timezone_auto: next, timezone: nextZone },
    });
    if (error) {
      setTimeZoneStatus("We couldn’t save that time zone preference. Try again.");
    } else {
      setTimeZoneStatus(next ? "With will follow this device’s time zone." : "Automatic time zone is off. Your current time zone is now fixed.");
      if (next) setEditingTimeZone(false);
    }
    setTimeZoneBusy(false);
  }

  function IconTile({ icon: Icon, color = brand.tealDark }) {
    return (
      <span aria-hidden="true" style={iconTileStyle}>
        <Icon size={17} strokeWidth={1.9} color={color} />
      </span>
    );
  }

  function InlineLabel({ icon: Icon, children, color = TEXT }) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color }}>
        <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
        <span>{children}</span>
      </span>
    );
  }

  function ModalShell({ title, icon: Icon, children }) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}
        style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(20,31,29,.38)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px 12px max(20px, env(safe-area-inset-bottom))" }}
      >
        <div style={{ width: "100%", maxWidth: 520, maxHeight: "88dvh", overflowY: "auto", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "16px 16px 20px", boxShadow: "0 20px 60px rgba(20,31,29,.22)" }}>
          <div style={{ position: "sticky", top: -16, zIndex: 2, background: SURFACE, padding: "2px 0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              {Icon && <IconTile icon={Icon} />}
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>{title}</div>
            </div>
            <button type="button" onClick={closeModal} aria-label={`Close ${title}`} style={{ border: "none", background: SURFACE_2, color: TEXT, width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}><X size={17} /></button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  function PreferenceRow({ icon, title, description, meta, onClick }) {
    return (
      <button type="button" onClick={onClick} style={rowStyle}>
        <IconTile icon={icon} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{title}</span>
          <span style={{ display: "block", color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>{description}</span>
          {meta && <span style={{ display: "block", color: brand.tealDark, fontSize: 11, fontWeight: 700, marginTop: 5 }}>{meta}</span>}
        </span>
        <ChevronRight size={17} color={TEXT_MUTED} />
      </button>
    );
  }

  return (
    <>
      <div style={{ padding: "0.2rem 0.1rem 0.9rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>Profile</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>You, your people, and the way With works for you.</div>
      </div>

      <div role="tablist" aria-label="Profile sections" style={{ display: "flex", gap: 5, padding: 4, background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 999, marginBottom: 22, overflowX: "auto" }}>
        {PROFILE_SECTIONS.map((item) => {
          const selected = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => { setSection(item.id); setEditingProfile(false); clearAccountError(); }}
              style={{ flex: "1 0 auto", border: "none", borderRadius: 999, background: selected ? SURFACE : "transparent", color: selected ? TEXT : TEXT_MUTED, padding: "8px 12px", fontSize: 12, fontWeight: selected ? 800 : 700, boxShadow: selected ? "0 1px 5px rgba(28,36,48,.08)" : "none" }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {section === "overview" && (
        <section>
          <div style={sectionLabel}>You</div>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, boxShadow: "0 3px 12px rgba(28,36,48,.03)" }}>
            {!editingProfile ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <WithMark id={profileWithmark(activeUser)} size={25} color={profileColor(activeUser)} />
                    <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 28, fontWeight: 600, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileNameInput || activeUser}</div>
                  </div>
                  <button onClick={() => { clearAccountError(); setEditingProfile(true); }} style={{ ...inlineActionStyle, color: brand.tealDark }}>
                    <Pencil size={14} strokeWidth={1.9} /> Edit
                  </button>
                </div>
                <div style={{ marginTop: 18, paddingTop: 15, borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}><InlineLabel icon={Target}>Your goal</InlineLabel></div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 5 }}>{goalSentence}</div>
                  </div>
                  <button onClick={openGoalsEdit} style={{ ...inlineActionStyle, color: brand.tealDark, flexShrink: 0 }}>
                    {goal?.goalWeight ? "Manage" : "Set goal"} <ChevronRight size={14} strokeWidth={1.9} />
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={fieldLabel}>Profile name</div>
                <input type="text" maxLength={40} value={profileNameInput} onChange={(e) => setProfileNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
                <div style={fieldLabel}>Your color</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 15 }}>
                  {profileColorOptions.map((c) => {
                    const selected = (profileColors[profileNameInput || activeUser] || profileColor(profileNameInput || activeUser)) === c.value;
                    return <button key={c.value} type="button" title={c.name} aria-label={`Choose ${c.name}`} onClick={() => saveProfileColor(c.value)} style={{ width: 34, height: 34, borderRadius: "50%", background: c.value, border: selected ? `3px solid ${TEXT}` : `2px solid ${SURFACE}`, boxShadow: selected ? `0 0 0 2px ${BORDER}` : `0 0 0 1px ${BORDER}`, padding: 0 }} />;
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
          </div>
        </section>
      )}

      {section === "overview" && (
        <section style={{ marginTop: 24 }}>
          <div style={sectionLabel}>{hasMultipleWiths ? "Current With" : "Your With"}</div>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, boxShadow: "0 3px 12px rgba(28,36,48,.03)" }}>
            {!renamingWith ? (
              <>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, lineHeight: 1.05 }}>{householdName}</div>
                <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 7, lineHeight: 1.45 }}>
                  {profileNames.length === 1
                    ? `${profileNames[0]} is doing this here.`
                    : `${profileNames.slice(0, -1).join(", ")}${profileNames.length > 2 ? "," : ""} and ${profileNames[profileNames.length - 1]} are doing this together.`}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
                  {profileNames.map((name) => (
                    <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: SURFACE_2, borderRadius: 999, padding: "6px 9px", fontSize: 12 }}>
                      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColor(name) }} />
                      {name}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
                  {householdRole === "owner" && (
                    <button onClick={() => { setWithNameInput(householdName); setRenamingWith(true); clearAccountError(); }} style={{ ...inlineActionStyle, color: TEXT_MUTED }}>
                      <Pencil size={14} strokeWidth={1.9} /> Edit With name
                    </button>
                  )}
                  <button type="button" onClick={() => openModal("invite")} style={{ ...inlineActionStyle, color: brand.tealDark }}>
                    <UserPlus size={15} strokeWidth={1.9} /> Invite someone
                  </button>
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
          </div>

          {!renamingWith && <ProfileWithsPanel styles={{ SURFACE_2, BORDER, TEXT, TEXT_MUTED }} onMultipleWithsChange={setHasMultipleWiths} />}

          {!renamingWith && !hasMultipleWiths && (
            <div style={{ marginTop: 16, padding: 15, border: `1px solid ${BORDER}`, borderRadius: 14, background: SURFACE_2 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: SURFACE, display: "grid", placeItems: "center", flexShrink: 0 }}><Users size={16} color={brand.tealDark} strokeWidth={1.9} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, fontWeight: 600 }}>You can have more than one With</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>Your health stays yours. One profile, one health history, however many groups of people you’re doing life With.</div>
                  <button type="button" onClick={startAnotherWith} style={{ ...inlineActionStyle, color: brand.tealDark, paddingTop: 9 }}>
                    <UserPlus size={14} strokeWidth={1.9} /> Start another With
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {section === "preferences" && (
        <section>
          <div style={sectionLabel}>How you use With</div>
          <div style={{ display: "grid", gap: 9 }}>
            <PreferenceRow icon={SlidersHorizontal} title="Trackers" description="Choose what you track and who can see it." meta="Standard and custom trackers" onClick={() => openModal("trackers")} />
            <PreferenceRow icon={Bell} title="Reminders" description="Choose when With gives you a gentle nudge." meta="Logging and catch-up preferences" onClick={() => openModal("reminders")} />
            <PreferenceRow icon={Droplets} title="Quick Add" description="Set the shortcuts that make everyday logging faster." meta={`Water: ${waterShortcuts.join(", ")} oz`} onClick={() => { setWaterShortcutDraft(waterShortcuts.map(String)); openModal("quick-add"); }} />
          </div>
        </section>
      )}

      {section === "account" && (
        <section>
          <div style={sectionLabel}>Account</div>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, boxShadow: "0 3px 12px rgba(28,36,48,.03)" }}>
            {!editingEmail ? (
              <div style={{ paddingBottom: 14, borderBottom: `1px solid ${BORDER}`, display: "grid", gridTemplateColumns: "34px minmax(0, 1fr)", gap: 11, alignItems: "start" }}>
                <IconTile icon={Mail} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Email</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.45, marginTop: 3, overflowWrap: "anywhere" }}>{session?.user?.email}</div>
                  <button onClick={() => { clearAccountError(); setEditingEmail(true); }} style={{ ...inlineActionStyle, color: brand.tealDark, paddingTop: 7 }}><Pencil size={14} strokeWidth={1.9} /> Change email</button>
                </div>
              </div>
            ) : (
              <div style={{ paddingBottom: 14, borderBottom: `1px solid ${BORDER}` }}>
                <div style={fieldLabel}>Email</div>
                <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setEditingEmail(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
                  <button onClick={async () => { const ok = await saveEmail(); if (ok !== false) setEditingEmail(false); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Update email</button>
                </div>
              </div>
            )}

            {!changingPassword ? (
              <div style={{ padding: "14px 0", borderBottom: `1px solid ${BORDER}`, display: "grid", gridTemplateColumns: "34px minmax(0, 1fr)", gap: 11, alignItems: "start" }}>
                <IconTile icon={LockKeyhole} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>Password</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 3 }}>Your account is protected by a password.</div>
                  <button onClick={() => { clearAccountError(); setChangingPassword(true); }} style={{ ...inlineActionStyle, color: brand.tealDark, paddingTop: 7 }}><Pencil size={14} strokeWidth={1.9} /> Change password</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
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

            <div style={{ paddingTop: 14, display: "grid", gridTemplateColumns: "34px minmax(0, 1fr)", gap: 11, alignItems: "start" }}>
              <IconTile icon={Clock3} />
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Time zone</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>
                      {followsDeviceTimeZone ? `Following this device · ${deviceTimeZone}` : `Fixed at ${timeZone}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={followsDeviceTimeZone}
                    aria-label="Use my device time zone"
                    disabled={timeZoneBusy}
                    onClick={() => setFollowDeviceTimeZone(!followsDeviceTimeZone)}
                    style={{ width: 46, height: 27, borderRadius: 999, border: "none", padding: 3, background: followsDeviceTimeZone ? brand.teal : "#D7D7D2", display: "flex", alignItems: "center", justifyContent: followsDeviceTimeZone ? "flex-end" : "flex-start", flexShrink: 0, opacity: timeZoneBusy ? .6 : 1 }}
                  >
                    <span style={{ width: 21, height: 21, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                  </button>
                </div>
                <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 8 }}>Use my device time zone</div>
                {!followsDeviceTimeZone && (
                  <div style={{ marginTop: 9 }}>
                    {!editingTimeZone ? (
                      <button onClick={() => { clearAccountError(); setEditingTimeZone(true); }} style={{ ...inlineActionStyle, color: brand.tealDark }}>Choose a time zone <ChevronRight size={14} strokeWidth={1.9} /></button>
                    ) : (
                      <>
                        <select defaultValue={timeZone} id="with-timezone-select" style={{ ...inputStyle, marginBottom: 8 }}>
                          {timeZoneOptions.map((zone) => <option key={zone} value={zone}>{zone}{zone === deviceTimeZone ? " · device" : ""}</option>)}
                        </select>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => setEditingTimeZone(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
                          <button onClick={async () => { const nextZone = document.getElementById("with-timezone-select")?.value; const ok = await saveTimeZone(nextZone); if (ok !== false) { setEditingTimeZone(false); setTimeZoneStatus("Time zone updated."); } }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Save time zone</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {timeZoneStatus && <div style={{ color: timeZoneStatus.startsWith("We couldn’t") ? WARN : successColor, fontSize: 11, lineHeight: 1.45, marginTop: 8 }}>{timeZoneStatus}</div>}
              </div>
            </div>

            {accountError && <div style={{ color: WARN, fontSize: 13, marginTop: 12 }}>{accountError}</div>}
            {accountOnlyMessage && <div style={{ color: successColor, fontSize: 13, marginTop: 12 }}>{accountOnlyMessage}</div>}
          </div>

          <div style={{ marginTop: 22 }}>
            <DataExportPanel styles={{ SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, bigButton }} />
          </div>

          <button onClick={signOut} style={{ width: "100%", background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 11, color: TEXT, padding: "11px 13px", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <LogOut style={{ width: 15, height: 15 }} strokeWidth={1.9} /> Sign out
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px 14px", margin: "18px 0 16px" }}>
            <a href="/privacy" style={{ color: TEXT_MUTED, fontWeight: 700, fontSize: 11, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}><ShieldCheck size={13} strokeWidth={1.9} /> Privacy policy</a>
            <button onClick={shareWith} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 0, fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5 }}>
              {shareStatus === "Link copied" ? <Check style={{ width: 13, height: 13 }} /> : <Share2 style={{ width: 13, height: 13 }} />}
              {shareStatus || "Share With"}
            </button>
          </div>

          <details style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
            <summary style={{ cursor: "pointer", color: WARN, fontWeight: 700, fontSize: 12, listStyle: "none", display: "inline-flex", alignItems: "center", gap: 6 }}><Trash2 size={14} strokeWidth={1.9} /> Delete account</summary>
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
      )}

      {modal === "invite" && (
        <ModalShell title="Invite someone" icon={UserPlus}>
          <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>Add someone you know to {householdName} so you can support each other while keeping your health data personal.</div>
          <div style={fieldLabel}>Email address</div>
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="friend@example.com" style={{ ...inputStyle, marginBottom: 10 }} />
          <button type="button" onClick={sendInviteEmail} disabled={inviteBusy || !inviteEmail.trim()} style={{ ...bigButton(brand.teal, brand.inkOn), opacity: inviteBusy || !inviteEmail.trim() ? .6 : 1 }}>{inviteBusy ? "Sending…" : "Send invitation"}</button>
          {inviteError && <div style={{ color: WARN, fontSize: 12, marginTop: 9 }}>{inviteError}</div>}
          {inviteMessage && <div style={{ color: successColor, fontSize: 12, marginTop: 9 }}>{inviteMessage}</div>}
        </ModalShell>
      )}

      {modal === "trackers" && (
        <ModalShell title="Trackers" icon={SlidersHorizontal}>
          <MyTrackersPanel session={session} onOpenGoals={openGoalsEdit} styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, fieldLabel, inputStyle, bigButton }} />
        </ModalShell>
      )}

      {modal === "reminders" && (
        <ModalShell title="Reminders" icon={Bell}>
          <LoggingRemindersPanel session={session} styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, fieldLabel, inputStyle, bigButton }} />
        </ModalShell>
      )}

      {modal === "quick-add" && (
        <ModalShell title="Quick Add" icon={Droplets}>
          <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>Set the three water amounts you use most often.</div>
          {!editingWaterShortcuts ? (
            <>
              <div style={{ padding: 14, borderRadius: 12, background: SURFACE_2, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13 }}>Water shortcuts: <strong>{waterShortcuts.join(" oz, ")} oz</strong></div>
              <button onClick={() => { setWaterShortcutDraft(waterShortcuts.map(String)); setEditingWaterShortcuts(true); }} style={{ ...inlineActionStyle, color: brand.tealDark, paddingTop: 10 }}><Pencil size={14} strokeWidth={1.9} /> Change water shortcuts</button>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
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
                <button onClick={async () => { const ok = await saveWaterShortcuts(waterShortcutDraft); if (ok !== false) setEditingWaterShortcuts(false); }} disabled={accountBusy} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto" }}>Save shortcuts</button>
              </div>
            </>
          )}
        </ModalShell>
      )}
    </>
  );
}
