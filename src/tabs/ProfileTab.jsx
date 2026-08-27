import { brand } from "../brand.jsx";
import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ProfileTab({
  activeUser,
  data,
  session,
  householdName,
  householdRole,
  inviteCode,
  inviteEmail,
  setInviteEmail,
  inviteBusy,
  inviteMessage,
  inviteError,
  sendInviteEmail,
  shareInvite,
  copyInviteCode,
  profileNames,
  profileNameInput,
  setProfileNameInput,
  profileColors,
  profileColor,
  profileColorOptions,
  saveProfileColor,
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

  const {
    SURFACE,
    SURFACE_2,
    BORDER,
    TEXT,
    TEXT_MUTED,
    WARN,
    headingStyle,
    fieldLabel,
    inputStyle,
    bigButton,
  } = styles;

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

  const goal = data[activeUser];
  const goalSentence = goal?.goalWeight
    ? `You’re working toward ${goal.goalWeight} lb${goal.goalDate ? ` by ${fmtGoalDate(goal.goalDate)}` : ""}.`
    : "You haven’t set a health goal yet.";

  return (
    <>
      <div style={{ padding: "0.25rem 0.1rem 1rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05 }}>Profile</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>You, your people, and the things you’re working toward.</div>
      </div>

      <section style={{ padding: "0 0.1rem 1.25rem", borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
        {!editingProfile ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: profileColor(activeUser), flexShrink: 0 }} />
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 29, fontWeight: 600, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileNameInput || activeUser}</div>
            </div>
            <button onClick={() => setEditingProfile(true)} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "6px 0" }}>Edit</button>
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
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    aria-label={`Choose ${c.name}`}
                    onClick={() => saveProfileColor(c.value)}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: c.value, border: selected ? `3px solid ${TEXT}` : `2px solid ${SURFACE}`, boxShadow: selected ? `0 0 0 2px ${BORDER}` : `0 0 0 1px ${BORDER}`, padding: 0 }}
                  />
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingProfile(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
              <button onClick={async () => { await saveProfileName(); setEditingProfile(false); }} disabled={accountBusy} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", paddingInline: 18 }}>Save</button>
            </div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>Your With</div>

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

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
              {inviteCode && <button onClick={() => setInviting((v) => !v)} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: 0 }}>Invite someone</button>}
              {householdRole === "owner" && (
                <button onClick={() => { setWithNameInput(householdName); setRenamingWith(true); clearAccountError(); }} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: 0 }}>Edit With name</button>
              )}
            </div>
          </>
        ) : (
          <div>
            <div style={fieldLabel}>With name</div>
            <input type="text" maxLength={40} value={withNameInput} onChange={(e) => setWithNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => { setRenamingWith(false); setWithNameInput(householdName); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={renameWith} disabled={accountBusy} style={bigButton(brand.teal, brand.inkOn)}>{accountBusy ? "Saving…" : "Save name"}</button>
            </div>
          </div>
        )}

        {inviteCode && inviting && !renamingWith && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>Who would you like to invite? They’ll create their own account and health profile.</div>
            <div style={fieldLabel}>Email address</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="friend@example.com" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={sendInviteEmail} disabled={inviteBusy || !inviteEmail.trim()} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", padding: "10px 14px", opacity: inviteBusy || !inviteEmail.trim() ? .6 : 1 }}>{inviteBusy ? "Sending…" : "Send"}</button>
            </div>
            <button type="button" onClick={shareInvite} style={{ background: "none", border: "none", color: brand.tealDark, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 0" }}>
              <Share2 style={{ width: 14, height: 14 }} /> Share invite link
            </button>
            {inviteError && <div style={{ color: WARN, fontSize: 12, marginTop: 8 }}>{inviteError}</div>}
            {inviteMessage && <div style={{ color: successColor, fontSize: 12, marginTop: 8 }}>{inviteMessage}</div>}
            <details style={{ marginTop: 10 }}>
              <summary style={{ color: TEXT_MUTED, fontSize: 11, cursor: "pointer" }}>Use invite code instead</summary>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1, background: SURFACE_2, borderRadius: 8, padding: "9px 10px", fontFamily: "monospace", fontWeight: 700, letterSpacing: 1.2 }}>{inviteCode}</div>
                <button type="button" onClick={copyInviteCode} style={{ background: "none", border: "none", color: brand.tealDark, fontWeight: 700, fontSize: 12 }}>Copy</button>
              </div>
            </details>
          </div>
        )}
      </section>

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>Goals</div>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 21, fontWeight: 600, lineHeight: 1.25 }}>{goalSentence}</div>
        <button onClick={openGoalsEdit} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "8px 0 0" }}>{goal?.goalWeight ? "Manage goals" : "Set a goal"}</button>
      </section>

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Account</div>

        {!editingEmail ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.45 }}>You sign in with <strong style={{ color: TEXT }}>{session?.user?.email}</strong>.</div>
            <button onClick={() => setEditingEmail(true)} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "6px 0 0" }}>Change email</button>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>Email</div>
            <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingEmail(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
              <button onClick={async () => { await saveEmail(); setEditingEmail(false); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Update email</button>
            </div>
          </div>
        )}

        {!changingPassword ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Your account is protected by a password.</div>
            <button onClick={() => setChangingPassword(true)} style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 800, padding: "6px 0 0" }}>Change password</button>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>New password</div>
            <input type="password" minLength={6} value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={fieldLabel}>Confirm new password</div>
            <input type="password" minLength={6} value={confirmPasswordInput} onChange={(e) => setConfirmPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setChangingPassword(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12, fontWeight: 700, padding: "8px 0" }}>Cancel</button>
              <button onClick={async () => { await savePassword(); setChangingPassword(false); }} disabled={accountBusy || !newPasswordInput} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Save password</button>
            </div>
          </div>
        )}

        {accountError && <div style={{ color: WARN, fontSize: 13, marginTop: 8 }}>{accountError}</div>}
        {accountMessage && <div style={{ color: successColor, fontSize: 13, marginTop: 8 }}>{accountMessage}</div>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 16 }}>
          <button onClick={signOut} style={{ background: "none", border: "none", color: TEXT, padding: 0, fontWeight: 800, fontSize: 12 }}>Sign out</button>
          <button onClick={shareWith} style={{ background: "none", border: "none", color: brand.tealDark, padding: 0, fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            {shareStatus === "Link copied" ? <Check style={{ width: 14, height: 14 }} /> : <Share2 style={{ width: 14, height: 14 }} />}
            {shareStatus || "Share With"}
          </button>
        </div>
      </section>

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 18, paddingBottom: 8 }}>
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
