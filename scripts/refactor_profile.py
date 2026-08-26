from pathlib import Path

tracker = Path("src/Tracker.jsx")
source = tracker.read_text()

import_line = 'import ProfileTab from "./tabs/ProfileTab.jsx";\n'
goals_import = 'import GoalsTab from "./tabs/GoalsTab.jsx";\n'
if import_line not in source:
    if goals_import not in source:
        raise SystemExit("Could not locate GoalsTab import.")
    source = source.replace(goals_import, goals_import + import_line, 1)

start_marker = '        {tab === "profile" && ('
end_marker = '\n\n      </div>\n\n      {toast && ('
start = source.find(start_marker)
end = source.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit("Could not locate the Profile tab block safely.")

replacement = '''        {tab === "profile" && (
          <ProfileTab
            activeUser={activeUser}
            data={data}
            session={session}
            householdName={householdName}
            householdRole={householdRole}
            profileNames={profileNames}
            profileNameInput={profileNameInput}
            setProfileNameInput={setProfileNameInput}
            profileColors={profileColors}
            profileColor={profileColor}
            profileText={profileText}
            profileColorOptions={PROFILE_COLORS}
            saveProfileColor={saveProfileColor}
            saveProfileName={saveProfileName}
            openGoalsEdit={openGoalsEdit}
            fmtGoalDate={fmtGoalDate}
            emailInput={emailInput}
            setEmailInput={setEmailInput}
            saveEmail={saveEmail}
            newPasswordInput={newPasswordInput}
            setNewPasswordInput={setNewPasswordInput}
            confirmPasswordInput={confirmPasswordInput}
            setConfirmPasswordInput={setConfirmPasswordInput}
            savePassword={savePassword}
            accountBusy={accountBusy}
            accountError={accountError}
            accountMessage={accountMessage}
            renamingWith={renamingWith}
            setRenamingWith={setRenamingWith}
            withNameInput={withNameInput}
            setWithNameInput={setWithNameInput}
            renameWith={renameWith}
            clearAccountError={() => setAccountError("")}
            signOut={() => supabase.auth.signOut()}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            deleteAccount={deleteAccount}
            profileSaveColor={USER_COLOR.Shane}
            profileSaveText={USER_TEXT_ON.Shane}
            successColor={USER_COLOR.Alli}
            styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}'''

source = source[:start] + replacement + source[end:]
tracker.write_text(source)

Path("scripts/refactor_profile.py").unlink(missing_ok=True)
Path(".github/workflows/refactor-profile.yml").unlink(missing_ok=True)
