from pathlib import Path
p = Path('src/Tracker.jsx')
s = p.read_text()
old = 'onClick={() => { setActiveUser(u); setFastEditorOpen(false); }}'
new = 'onClick={() => { setActiveUser(u); setFastEditorOpen(false); if (tab === "profile") setTab("today"); }}'
if old not in s:
    raise SystemExit('profile switch target not found')
s = s.replace(old, new, 1)
old2 = '{!activeCanEdit && ('
new2 = '{tab !== "profile" && !activeCanEdit && ('
if old2 not in s:
    raise SystemExit('view banner target not found')
s = s.replace(old2, new2, 1)
p.write_text(s)
# one-time helper
