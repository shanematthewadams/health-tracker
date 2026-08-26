import { useState } from "react";
import { ChevronRight, Share2, Check } from "lucide-react";

export default function ProfileTab({
  activeUser,
  data,
  session,
  householdName,
  householdRole,
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
      <div style={{ padding: "0.25rem 0.1rem 0.9rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05 }}>Profile</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Your account, your goals, your people.</div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 25, fontWeight: 600, marginBottom: 4 }}>{profileNameInput || activeUser}</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{session?.user?.email}</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 2 }}>{householdName}</div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>Health goals & targets</div>
            <div style={{ color: TEXT_MUTED, fontSize: 12 }}>
              {data[activeUser]?.goalWeight ? `${data[activeUser].goalWeight} lb${data[activeUser].goalDate ? ` by ${fmtGoalDate(data[activeUser].goalDate)}` : ""}` : "Not set yet"}
            </div>
          </div>
          <button onClick={openGoalsEdit} style={{ background: "none", border: "none", color: profileColor(activeUser, true), display: "flex", alignItems: "center", gap: 3, fontWeight: 700, fontSize: 12 }}>
            Manage <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={headingStyle}>Your profile</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 16 }}>This is how your name appears to the people you’re with.</div>
        <div style={fieldLabel}>Profile name</div>
        <input type="text" value={profileNameInput} onChange={(e) => setProfileNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />
        <div style={fieldLabel}>Your color</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {profileColorOptions.map((c) => {
            const selected = (profileColors[profileNameInput || activeUser] || profileColor(profileNameInput || activeUser)) === c.value;
            return (
              <button
                key={c.value}
                type="button"
                title={c.name}
                aria-label={`Choose ${c.name}`}
                onClick={() => saveProfileColor(c.value)}
                style={{ width: 36, height: 36, borderRadius: "50%", background: c.value, border: selected ? `3px solid ${TEXT}` : `2px solid ${SURFACE}`, boxShadow: selected ? `0 0 0 2px ${BORDER}` : `0 0 0 1px ${BORDER}`, padding: 0 }}
              />
            );
          })}
        </div>
        <button onClick={saveProfileName} disabled={accountBusy} style={bigButton(profileSaveColor, profileSaveText)}>Save profile</button>
      </div>

      <div style={cardStyle}>
        <div style={headingStyle}>Account</div>
        <div style={fieldLabel}>Email</div>
        <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <button onClick={saveEmail} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, marginBottom: 18 }}>Update email</button>

        <div style={fieldLabel}>New password</div>
        <input type="password" minLength={6} value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={fieldLabel}>Confirm new password</div>
        <input type="password" minLength={6} value={confirmPasswordInput} onChange={(e) => setConfirmPasswordInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <button onClick={savePassword} disabled={accountBusy || !newPasswordInput} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Change password</button>

        {accountError && <div style={{ color: WARN, fontSize: 13, marginTop: 12 }}>{accountError}</div>}
        {accountMessage && <div style={{ color: successColor, fontSize: 13, marginTop: 12 }}>{accountMessage}</div>}
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ ...headingStyle, marginBottom: 0 }}>Your With</div>
          {householdRole === "owner" && !renamingWith && (
            <button
              onClick={() => {
                setWithNameInput(householdName);
                setRenamingWith(true);
                clearAccountError();
              }}
              style={{ background: "none", border: "none", color: profileColor(activeUser, true), fontSize: 12, fontWeight: 700 }}
            >
              Rename
            </button>
          )}
        </div>

        {renamingWith ? (
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <div style={fieldLabel}>With name</div>
            <input type="text" maxLength={40} value={withNameInput} onChange={(e) => setWithNameInput(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => { setRenamingWith(false); setWithNameInput(householdName); }} disabled={accountBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={renameWith} disabled={accountBusy} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{accountBusy ? "Saving…" : "Save name"}</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{householdName}</div>
        )}

        <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 12 }}>{profileNames.length} {profileNames.length === 1 ? "person" : "people"} you’re with</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {profileNames.map((name) => <span key={name} style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "6px 9px", fontSize: 12 }}>{name}</span>)}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={headingStyle}>Share With</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
          Know someone who might like With? Share the app with them. They’ll create their own account and can start their own With.
        </div>
        <button
          onClick={shareWith}
          style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {shareStatus === "Link copied" ? <Check style={{ width: 16, height: 16 }} /> : <Share2 style={{ width: 16, height: 16 }} />}
          {shareStatus || "Share With"}
        </button>
      </div>

      <div style={cardStyle}>
        <button onClick={signOut} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Sign out</button>
      </div>

      <div style={{ ...cardStyle, borderColor: "#6E3531" }}>
        <div style={{ ...headingStyle, color: WARN }}>Delete account</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>
          This permanently removes your login, your profile, and your personal health entries. It does not delete other people or their data.
        </div>
        <div style={fieldLabel}>Type DELETE to confirm</div>
        <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <button onClick={deleteAccount} disabled={accountBusy || deleteConfirm !== "DELETE"} style={{ ...bigButton("#6E3531", "#FFE8E4"), opacity: deleteConfirm === "DELETE" ? 1 : .55 }}>Delete my account</button>
      </div>
    </>
  );
}
