from pathlib import Path

tracker = Path("src/Tracker.jsx")
source = tracker.read_text()

# Imports
old_recharts = 'import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";\n'
source = source.replace(old_recharts, "", 1)

log_import = 'import LogTab from "./tabs/LogTab.jsx";\n'
trends_import = 'import TrendsTab from "./tabs/TrendsTab.jsx";\n'
if trends_import not in source:
    source = source.replace(log_import, log_import + trends_import, 1)

start_marker = '        {tab === "trends" && ('
end_marker = '\n\n        {tab === "goals" && ('
start = source.find(start_marker)
end = source.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit("Could not locate Trends tab block safely.")

replacement = '''        {tab === "trends" && (
          <TrendsTab
            profileNames={profileNames}
            chartData={chartData}
            streaks={streaks}
            goalInfo={goalInfo}
            profileColor={profileColor}
            fmtDate={fmtDate}
            styles={{ SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle }}
          />
        )}'''

source = source[:start] + replacement + source[end:]
tracker.write_text(source)

Path("scripts/refactor_trends.py").unlink(missing_ok=True)
Path(".github/workflows/refactor-trends.yml").unlink(missing_ok=True)
