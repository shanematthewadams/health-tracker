from pathlib import Path

tracker = Path("src/Tracker.jsx")
source = tracker.read_text()

import_line = 'import TodayTab from "./tabs/TodayTab.jsx";\n'
supabase_import = 'import { supabase } from "./supabase";\n'
if import_line not in source:
    if supabase_import not in source:
        raise SystemExit("Could not locate Supabase import.")
    source = source.replace(supabase_import, supabase_import + import_line, 1)

start_marker = '        {tab === "today" && ('
end_marker = '\n\n        {tab === "log" && ('
start = source.find(start_marker)
end = source.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit("Could not locate the Today tab block safely.")

replacement = '''        {tab === "today" && (
          <TodayTab
            activeUser={activeUser}
            activeCanEdit={activeCanEdit}
            data={data}
            profileNames={profileNames}
            today={today}
            todayStats={todayStats}
            activeFasts={activeFasts}
            fastPromptDismissedToday={fastPromptDismissedToday}
            fastEditorOpen={fastEditorOpen}
            fastBusy={fastBusy}
            fastStartDate={fastStartDate}
            fastStartTime={fastStartTime}
            setFastStartDate={setFastStartDate}
            setFastStartTime={setFastStartTime}
            setFastEditorOpen={setFastEditorOpen}
            dismissFastPromptToday={dismissFastPromptToday}
            openFastEditor={openFastEditor}
            startFast={startFast}
            updateFastStart={updateFastStart}
            endFast={endFast}
            fastElapsed={fastElapsed}
            openLog={openLog}
            setActiveUser={setActiveUser}
            profileColor={profileColor}
            profileText={profileText}
            styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}'''

source = source[:start] + replacement + source[end:]
tracker.write_text(source)

# Remove the one-time machinery so it doesn't become permanent repo clutter.
Path("scripts/refactor_today.py").unlink(missing_ok=True)
Path(".github/workflows/refactor-today.yml").unlink(missing_ok=True)
