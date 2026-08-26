from pathlib import Path

tracker = Path("src/Tracker.jsx")
source = tracker.read_text()

import_line = 'import LogTab from "./tabs/LogTab.jsx";\n'
today_import = 'import TodayTab from "./tabs/TodayTab.jsx";\n'
if import_line not in source:
    if today_import not in source:
        raise SystemExit("Could not locate TodayTab import.")
    source = source.replace(today_import, today_import + import_line, 1)

start_marker = '        {tab === "log" && ('
end_marker = '\n\n        {tab === "trends" && ('
start = source.find(start_marker)
end = source.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit("Could not locate the Log tab block safely.")

replacement = '''        {tab === "log" && (
          <LogTab
            activeUser={activeUser}
            activeCanEdit={activeCanEdit}
            data={data}
            today={today}
            ts={ts}
            logTab={logTab}
            setLogTab={setLogTab}
            buttonSuccess={buttonSuccess}
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
            fastElapsed={fastElapsed}
            savedFoods={savedFoods}
            globalFoods={globalFoods}
            savedSearch={savedSearch}
            setSavedSearch={setSavedSearch}
            selectedSavedFoodId={selectedSavedFoodId}
            setSelectedSavedFoodId={setSelectedSavedFoodId}
            foodQuantity={foodQuantity}
            foodServingLabel={foodServingLabel}
            saveAsSaved={saveAsSaved}
            setSaveAsSaved={setSaveAsSaved}
            editingSavedId={editingSavedId}
            showManageSaved={showManageSaved}
            setShowManageSaved={setShowManageSaved}
            foodLibraryTab={foodLibraryTab}
            setFoodLibraryTab={setFoodLibraryTab}
            visibleLibraryFoods={visibleLibraryFoods}
            managedSavedFoods={managedSavedFoods}
            chooseSavedFood={chooseSavedFood}
            isFavoriteFood={isFavoriteFood}
            toggleFavorite={toggleFavorite}
            editSavedFood={editSavedFood}
            deleteSavedFood={deleteSavedFood}
            changeQuantity={changeQuantity}
            clearFoodForm={clearFoodForm}
            saveSavedFoodOnly={saveSavedFoodOnly}
            foodName={foodName}
            setFoodName={setFoodName}
            foodMeal={foodMeal}
            setFoodMeal={setFoodMeal}
            foodDate={foodDate}
            setFoodDate={setFoodDate}
            foodCals={foodCals}
            setFoodCals={setFoodCals}
            foodProtein={foodProtein}
            setFoodProtein={setFoodProtein}
            foodCarbs={foodCarbs}
            setFoodCarbs={setFoodCarbs}
            foodFat={foodFat}
            setFoodFat={setFoodFat}
            foodFiber={foodFiber}
            setFoodFiber={setFoodFiber}
            foodNotes={foodNotes}
            setFoodNotes={setFoodNotes}
            setFoodServingLabel={setFoodServingLabel}
            foodError={foodError}
            addFood={addFood}
            weightInput={weightInput}
            setWeightInput={setWeightInput}
            weightDate={weightDate}
            setWeightDate={setWeightDate}
            weightError={weightError}
            addWeight={addWeight}
            deleteWeight={deleteWeight}
            actName={actName}
            setActName={setActName}
            actCals={actCals}
            setActCals={setActCals}
            actDate={actDate}
            setActDate={setActDate}
            addActivity={addActivity}
            waterOz={waterOz}
            setWaterOz={setWaterOz}
            waterDate={waterDate}
            setWaterDate={setWaterDate}
            addWater={addWater}
            stepsInput={stepsInput}
            setStepsInput={setStepsInput}
            stepsDate={stepsDate}
            setStepsDate={setStepsDate}
            saveSteps={saveSteps}
            profileColor={profileColor}
            profileText={profileText}
            styles={{ SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton }}
          />
        )}'''

source = source[:start] + replacement + source[end:]
tracker.write_text(source)

Path("scripts/refactor_log.py").unlink(missing_ok=True)
Path(".github/workflows/refactor-log.yml").unlink(missing_ok=True)
