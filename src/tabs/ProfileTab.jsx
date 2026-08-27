import { brand } from "../brand.jsx";
import { useState } from "react";
import { ChevronRight, Share2, Check } from "lucide-react";

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
  profileText,
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
  profileSaveColor,
  profileSaveText,
  successColor,
  styles,
}) {
  const [shareStatus, setShareStatus] = useState("");

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

  const {
    SURFACE,
    SURFACE_2,
    BORDER,
    TEXT,
    TEXT_MUTED,
    WARN,
    cardStyle,
    headingStyle,
    fieldLabel,
    inputStyle,
    bigButton,
  } = styles;

  return (
    <>
      <div style={{ padding: "0.25rem 0.1rem 1rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05 }}>Profile</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Your account, your goals, your people.</div>
      </div>

      <section style={{ padding: "0 0.1rem 1.2rem", borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: "50%", background: profileColor(activeUser), flexShrink: 0 }} />
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 27, fontWeight: 600, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileNameInput || activeUser}</div>
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 6 }}>{session?.user?.email}</div>
            <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>With {householdName}</div>
          </div>
          <button onClick={openGoalsEdit} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 999, color: brand.tealDark, padding: "7px 10px", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
            Goals
          </button>
        </div>
        {data[activeUser]?.goalWeight && (
          <div style={{ marginTop: 12, color: TEXT_MUTED, fontSize: 12 }}>
            Goal: <strong style={{ color: TEXT }}>{data[activeUser].goalWeight} lb</strong>{data[activeUser].goalDate ? ` by ${fmtGoalDate(data[activeUser].goalDate)}` : ""}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={{ ...headingStyle, marginBottom: 5 }}>Your profile</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 14 }}>This is how you appear to the people you’re with.</div>

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

        <button onClick={saveProfileName} disabled={accountBusy} style={{ ...bigButton(brand.teal, brand.inkOn), width: "auto", paddingInline: 18 }}>Save profile</button>
      </section>

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ ...headingStyle, marginBottom: 3 }}>Your With</div>
            {!renamingWith && <div style={{ color: TEXT_MUTED, fontSize: 12 }}>{profileNames.length} {profileNames.length === 1 ? "person" : "people"} you’re with</div>}
          </div>
          {householdRole === "owner" && !renamingWith && (
            <button
              onClick={() => { setWithNameInput(householdName); setRenamingWith(true); clearAccountError(); }}
              style={{ background: "none", border: "none", color: brand.tealDark, fontSize: 12, fontWeight: 700 }}
            >
              Rename
            </button>
          )}
        </div>

        {renamingWith ? (
          <div style={{ marginTop: 12 }}>
            <div style={fieldLabel}>With name</div>
            <input type="text" maxLength={40} value={withNameInput} onChange={(e) => setWithNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => { setRenamingWith(false); setWithNameInput(householdName); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={renameWith} disabled={accountBusy} style={bigButton(brand.teal, brand.inkOn)}>{accountBusy ? "Saving…" : "Save name"}</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 12 }}>{householdName}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
              {profileNames.map((name) => (
                <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: SURFACE_2, borderRadius: 999, padding: "6px 9px", fontSize: 12 }}>
                  <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: profileColor(name) }} />
                  {name}
                </span>
              ))}
            </div>
          </>
        )}

        {inviteCode && (
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", color: brand.tealDark, fontWeight: 700, fontSize: 12 }}>Invite someone to your With</summary>
            <div style={{ marginTop: 12, paddingLeft: 1 }}>
              <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>They’ll create their own account and health profile.</div>
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
          </details>
        )}
      </section>

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginBottom: 24 }}>
        <div style={{ ...headingStyle, marginBottom: 5 }}>Account</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 14 }}>Sign-in details and account access.</div>

        <div style={fieldLabel}>Email</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 16 }}>
          <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={inputStyle} />
          <button onClick={saveEmail} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto", paddingInline: 14 }}>Update</button>
        </div>

        <details>
          <summary style={{ cursor: "pointer", color: brand.tealDark, fontWeight: 700, fontSize: 12 }}>Change password</summary>
          <div style={{ marginTop: 12 }}>
            <div style={fieldLabel}>New password</div>
            <input type="password" minLength={6} value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={fieldLabel}>Confirm new password</div>
            <input type="password" minLength={6} value={confirmPasswordInput} onChange={(e) => setConfirmPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
            <button onClick={savePassword} disabled={accountBusy || !newPasswordInput} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, width: "auto" }}>Save new password</button>
          </div>
        </details>

        {accountError && <div style={{ color: WARN, fontSize: 13, marginTop: 12 }}>{accountError}</div>}
        {accountMessage && <div style={{ color: successColor, fontSize: 13, marginTop: 12 }}>{accountMessage}</div>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18 }}>
          <button onClick={signOut} style={{ background: "none", border: "none", color: TEXT, padding: 0, fontWeight: 700, fontSize: 12 }}>Sign out</button>
          <button onClick={shareWith} style={{ background: "none", border: "none", color: brand.tealDark, padding: 0, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
            {shareStatus === "Link copied" ? <Check style={{ width: 14, height: 14 }} /> : <Share2 style={{ width: 14, height: 14 }} />}
            {shareStatus || "Share With"}
          </button>
        </div>
      </section>

      <section style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, paddingBottom: 8 }}>
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
