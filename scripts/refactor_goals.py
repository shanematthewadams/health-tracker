from pathlib import Path

tracker = Path("src/Tracker.jsx")
source = tracker.read_text()

import_line = 'import GoalsTab from "./tabs/GoalsTab.jsx";\n'
anchor = 'import TrendsTab from "./tabs/TrendsTab.jsx";\n'
if import_line not in source:
    if anchor not in source:
        raise SystemExit("Could not locate TrendsTab import.")
    source = source.replace(anchor, anchor + import_line, 1)

start_marker = '        {tab === "goals" && ('
end_marker = '\n\n        {tab === "profile" && ('
start = source.find(start_marker)
end = source.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit("Could not locate the Goals tab block safely.")

replacement = '''        {tab === "goals" && (
          <GoalsTab
            activeUser={activeUser}
            activeCanEdit={activeCanEdit}
            data={data}
            gi={gi}
            editingGoals={editingGoals}
            setEditingGoals={setEditingGoals}
            goalInput={goalInput}
            setGoalInput={setGoalInput}
            goalDateInput={goalDateInput}
            setGoalDateInput={setGoalDateInput}
            tBmr={tBmr}
            setTBmr={setTBmr}
            tCal={tCal}
            setTCal={setTCal}
            tProtein={tProtein}
            setTProtein={setTProtein}
            tCarbs={tCarbs}
            setTCarbs={setTCarbs}
            tFat={tFat}
            setTFat={setTFat}
            tFiberMin={tFiberMin}
            setTFiberMin={setTFiberMin}
            tFiberMax={tFiberMax}
            setTFiberMax={setTFiberMax}
            saveGoal={saveGoal}
            saveTargets={saveTargets}
            profileColor={profileColor}
            profileText={profileText}
            fmtGoalDate={fmtGoalDate}
            styles={{ SURFACE_2, BORDER, TEXT, TEXT_MUTED, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}'''

source = source[:start] + replacement + source[end:]
tracker.write_text(source)

Path("scripts/refactor_goals.py").unlink(missing_ok=True)
Path(".github/workflows/refactor-goals.yml").unlink(missing_ok=True)
