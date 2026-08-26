import { Search, BookmarkPlus, Pencil, Trash2, Star, Utensils, Scale, Dumbbell, Droplet, Footprints } from "lucide-react";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LogTab(props) {
  const {
    activeUser, activeCanEdit, data, today, ts,
    logTab, setLogTab, buttonSuccess,
    activeFasts, fastPromptDismissedToday, fastEditorOpen, fastBusy,
    fastStartDate, fastStartTime, setFastStartDate, setFastStartTime,
    setFastEditorOpen, dismissFastPromptToday, openFastEditor, startFast, updateFastStart, fastElapsed,
    savedFoods, globalFoods, savedSearch, setSavedSearch, selectedSavedFoodId, setSelectedSavedFoodId,
    foodQuantity, foodServingLabel, saveAsSaved, setSaveAsSaved, editingSavedId,
    showManageSaved, setShowManageSaved, foodLibraryTab, setFoodLibraryTab,
    visibleLibraryFoods, managedSavedFoods, chooseSavedFood, isFavoriteFood, toggleFavorite,
    editSavedFood, deleteSavedFood, changeQuantity, clearFoodForm, saveSavedFoodOnly,
    foodName, setFoodName, foodMeal, setFoodMeal, foodDate, setFoodDate,
    foodCals, setFoodCals, foodProtein, setFoodProtein, foodCarbs, setFoodCarbs,
    foodFat, setFoodFat, foodFiber, setFoodFiber, foodNotes, setFoodNotes, setFoodServingLabel,
    foodError, addFood,
    weightInput, setWeightInput, weightDate, setWeightDate, weightError, addWeight, deleteWeight,
    actName, setActName, actCals, setActCals, actDate, setActDate, addActivity,
    waterOz, setWaterOz, waterDate, setWaterDate, addWater,
    stepsInput, setStepsInput, stepsDate, setStepsDate, saveSteps,
    profileColor, profileText,
    styles,
  } = props;

  const { SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, WARN, cardStyle, headingStyle, fieldLabel, inputStyle, bigButton } = styles;

  const todayFoods = data[activeUser].foods.filter((f) => f.date === today);
  const todayActivities = data[activeUser].activities.filter((a) => a.date === today);
  const todayWeight = data[activeUser].weights.find((w) => w.date === today);
  const activityCals = todayActivities.reduce((sum, a) => sum + a.caloriesBurned, 0);
  const context = {
    food: todayFoods.length ? `${todayFoods.length} ${todayFoods.length === 1 ? "food" : "foods"} · ${Math.round(ts.calories)} calories logged` : "No food logged today.",
    weight: todayWeight ? `${todayWeight.weight} lb logged today. Saving another weight for today will update it.` : "No weight logged today.",
    activity: todayActivities.length ? `${todayActivities.length} ${todayActivities.length === 1 ? "activity" : "activities"} · ${Math.round(activityCals)} calories burned` : "No activity logged today.",
    water: ts.water > 0 ? `${Math.round(ts.water)} oz logged today.` : "No water logged today.",
    steps: ts.steps != null ? `${ts.steps.toLocaleString()} steps logged today. Saving another total for today will update it.` : "No steps logged today.",
  }[logTab];

  const currentLogDate = {
    food: foodDate,
    weight: weightDate,
    activity: actDate,
    water: waterDate,
    steps: stepsDate,
  }[logTab] || today;

  const changeLogTab = (id) => {
    if (id === "food") setFoodDate(currentLogDate);
    if (id === "weight") setWeightDate(currentLogDate);
    if (id === "activity") setActDate(currentLogDate);
    if (id === "water") setWaterDate(currentLogDate);
    if (id === "steps") setStepsDate(currentLogDate);
    setLogTab(id);
    localStorage.setItem("with-log-tab", id);
  };

  return (
    <>
      <div style={{ padding: "0.25rem 0.1rem 0.9rem" }}>
        <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 31, fontWeight: 600, lineHeight: 1.05 }}>Log</div>
        <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Add something to your day.</div>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 1px 10px", marginBottom: 6, WebkitOverflowScrolling: "touch" }}>
        {[
          ["food", "Food", Utensils],
          ["weight", "Weight", Scale],
          ["activity", "Activity", Dumbbell],
          ["water", "Water", Droplet],
          ["steps", "Steps", Footprints],
        ].map(([id, label, Icon]) => (
          <button key={id} onClick={() => changeLogTab(id)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, border: `1px solid ${logTab === id ? profileColor(activeUser) : BORDER}`, background: logTab === id ? "#FBF7F0" : SURFACE, color: logTab === id ? TEXT : TEXT_MUTED, borderRadius: 999, padding: "9px 13px", fontSize: 12, fontWeight: 700 }}>
            <Icon style={{ width: 14, height: 14 }} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#F7F3EC", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "9px 11px", marginBottom: 10, color: TEXT_MUTED, fontSize: 12, lineHeight: 1.35 }}>
        <span style={{ fontWeight: 800, color: TEXT, flexShrink: 0 }}>Today</span><span>·</span><span>{context}</span>
      </div>

      {logTab === "food" && <>
        {activeFasts[activeUser] ? (
          <div style={{ ...cardStyle, background: "#FFFDF9", borderColor: "#E6E1D8", borderRadius: 10, padding: "1rem 1.1rem", boxShadow: "0 2px 7px rgba(63,52,39,.045)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>Fasting · {fastElapsed(activeFasts[activeUser].started_at)}</div><div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>You can still log food from earlier.</div></div>
              {activeCanEdit && <button onClick={() => openFastEditor(activeFasts[activeUser])} style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "8px 10px", fontSize: 11, fontWeight: 700 }}>Edit</button>}
            </div>
          </div>
        ) : activeCanEdit && !fastPromptDismissedToday ? (
          <div style={{ ...cardStyle, background: "#FFFDF9", borderColor: "#E6E1D8", borderRadius: 10, padding: "1rem 1.1rem", boxShadow: "0 2px 7px rgba(63,52,39,.045)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>Fasting today?</div><div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>WITH can adjust your food prompts while you fast.</div></div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={dismissFastPromptToday} style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "8px 9px", fontSize: 11, fontWeight: 700 }}>Not today</button>
                <button onClick={() => openFastEditor()} style={{ background: SURFACE, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "8px 10px", fontSize: 11, fontWeight: 700 }}>Start fast</button>
              </div>
            </div>
          </div>
        ) : null}

        {activeCanEdit && fastEditorOpen && (
          <div style={{ ...cardStyle, padding: "1.05rem 1.1rem" }}>
            <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{activeFasts[activeUser] ? "Edit fast start" : "When did your fast start?"}</div>
            <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 12 }}>It defaults to right now. Backdating is completely fine.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><div style={fieldLabel}>Date</div><input type="date" max={todayStr()} value={fastStartDate} onChange={(e) => setFastStartDate(e.target.value)} style={inputStyle} /></div>
              <div><div style={fieldLabel}>Time</div><input type="time" value={fastStartTime} onChange={(e) => setFastStartTime(e.target.value)} style={inputStyle} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => setFastEditorOpen(false)} disabled={fastBusy} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={activeFasts[activeUser] ? updateFastStart : startFast} disabled={fastBusy} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{fastBusy ? "Saving…" : activeFasts[activeUser] ? "Save start" : "Start fast"}</button>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ ...headingStyle, marginBottom: 0 }}>Food</div>
            {savedFoods.length > 0 && <button onClick={() => setShowManageSaved(!showManageSaved)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12 }}>{showManageSaved ? "done" : `manage mine (${savedFoods.length})`}</button>}
          </div>

          {(savedFoods.length > 0 || globalFoods.length > 0) && (
            <div style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, ...fieldLabel }}><Search style={{ width: 13, height: 13 }} /> Find a food</div>
              <input type="text" placeholder="Search all foods" value={savedSearch} onChange={(e) => setSavedSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
              {!showManageSaved && <>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 4 }}>
                  {[["recent", "Recent"], ["favorites", "★ Favorites"], ["mine", "All Mine"], ["shared", "Shared"]].map(([id, label]) => (
                    <button key={id} onClick={() => { setFoodLibraryTab(id); setSavedSearch(""); }} style={{ flexShrink: 0, border: `1px solid ${foodLibraryTab === id ? profileColor(activeUser) : BORDER}`, background: foodLibraryTab === id ? SURFACE : "transparent", color: foodLibraryTab === id ? TEXT : TEXT_MUTED, borderRadius: 8, padding: "8px 11px", fontSize: 11, fontWeight: 700 }}>{label}</button>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                  {visibleLibraryFoods.slice(0, savedSearch ? 20 : 12).map((f) => (
                    <div key={`${f.source}-${f.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 5, alignItems: "stretch" }}>
                      <button onClick={() => chooseSavedFood(f)} style={{ textAlign: "left", background: selectedSavedFoodId === `${f.source}:${f.id}` ? SURFACE : "transparent", border: `1px solid ${selectedSavedFoodId === `${f.source}:${f.id}` ? profileColor(activeUser) : BORDER}`, color: TEXT, borderRadius: 8, padding: "10px 11px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontWeight: 700 }}>{f.name}</span><span className="num" style={{ color: TEXT_MUTED, fontSize: 11 }}>{Math.round(f.calories)} cal</span></div>
                        <div className="num" style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 2 }}>{f.serving_label || "1 serving"} · P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)} · Fiber {Math.round(f.fiber)}g</div>
                        <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{f.source === "global" ? "Shared" : "Household"}</div>
                      </button>
                      <button aria-label={`${isFavoriteFood(f) ? "Remove" : "Add"} ${f.name} ${isFavoriteFood(f) ? "from" : "to"} favorites`} onClick={() => toggleFavorite(f)} style={{ width: 42, background: "transparent", border: `1px solid ${BORDER}`, color: isFavoriteFood(f) ? profileColor(activeUser) : TEXT_MUTED, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Star style={{ width: 18, height: 18 }} fill={isFavoriteFood(f) ? "currentColor" : "none"} /></button>
                    </div>
                  ))}
                  {visibleLibraryFoods.length === 0 && <div style={{ color: TEXT_MUTED, fontSize: 12, padding: "8px 0" }}>{savedSearch ? "No foods match that search." : foodLibraryTab === "recent" ? "No recent foods yet. Log a saved or shared food and it’ll show up here." : foodLibraryTab === "favorites" ? "No favorites yet. Tap a star beside any food." : "Nothing here yet."}</div>}
                </div>
              </>}
              {showManageSaved && <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                {managedSavedFoods.map((f) => <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: `1px solid ${BORDER}`, padding: "8px 0" }}>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{f.name}</div><div className="num" style={{ fontSize: 11, color: TEXT_MUTED }}>{f.serving_label || "1 serving"} · {Math.round(f.calories)} cal</div></div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button aria-label={`Edit ${f.name}`} onClick={() => editSavedFood(f)} style={{ background: "none", border: "none", color: TEXT_MUTED, padding: 6 }}><Pencil style={{ width: 15, height: 15 }} /></button>
                    <button aria-label={`Delete ${f.name}`} onClick={() => deleteSavedFood(f.id)} style={{ background: "none", border: "none", color: WARN, padding: 6 }}><Trash2 style={{ width: 15, height: 15 }} /></button>
                  </div>
                </div>)}
              </div>}
            </div>
          )}

          {selectedSavedFoodId && <>
            <div style={fieldLabel}>Quantity</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input type="number" step="0.25" min="0.25" inputMode="decimal" value={foodQuantity} onChange={(e) => changeQuantity(e.target.value)} style={inputStyle} />
              <div style={{ display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 8, background: SURFACE_2, color: TEXT_MUTED, fontSize: 13 }}>{foodServingLabel} each</div>
            </div>
          </>}

          <div style={fieldLabel}>Food name</div>
          <input type="text" placeholder="Food name" value={foodName} onChange={(e) => { setFoodName(e.target.value); if (selectedSavedFoodId) setSelectedSavedFoodId(null); }} style={{ ...inputStyle, marginBottom: 10 }} />
          <div style={fieldLabel}>Meal</div>
          <select value={foodMeal} onChange={(e) => setFoodMeal(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select>
          <div style={fieldLabel}>Date</div><input type="date" value={foodDate} onChange={(e) => setFoodDate(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={fieldLabel}>Calories</div><input type="number" inputMode="numeric" value={foodCals} onChange={(e) => setFoodCals(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Protein (g)</div><input type="number" step="0.1" inputMode="decimal" value={foodProtein} onChange={(e) => setFoodProtein(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Carbs (g)</div><input type="number" step="0.1" inputMode="decimal" value={foodCarbs} onChange={(e) => setFoodCarbs(e.target.value)} style={inputStyle} /></div>
            <div><div style={fieldLabel}>Fat (g)</div><input type="number" step="0.1" inputMode="decimal" value={foodFat} onChange={(e) => setFoodFat(e.target.value)} style={inputStyle} /></div>
          </div>
          <div style={fieldLabel}>Fiber (g)</div><input type="number" step="0.1" inputMode="decimal" value={foodFiber} onChange={(e) => setFoodFiber(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
          {!selectedSavedFoodId && <><div style={fieldLabel}>Serving description</div><input type="text" placeholder="e.g. 1 bar, 2 tbsp, 3/4 cup" value={foodServingLabel} onChange={(e) => setFoodServingLabel(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} /></>}
          <div style={fieldLabel}>Notes (optional)</div><input type="text" placeholder="Restaurant, brand, whatever helps" value={foodNotes} onChange={(e) => setFoodNotes(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

          {!selectedSavedFoodId && !editingSavedId && <label style={{ display: "flex", alignItems: "center", gap: 9, color: TEXT_MUTED, fontSize: 13, marginBottom: 12, cursor: "pointer" }}><input type="checkbox" checked={saveAsSaved} onChange={(e) => setSaveAsSaved(e.target.checked)} style={{ width: 18, height: 18 }} /><BookmarkPlus style={{ width: 15, height: 15 }} /> Save this to household foods</label>}
          {foodError && <div style={{ color: WARN, fontSize: 12, marginBottom: 8 }}>{foodError}</div>}
          {editingSavedId ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={clearFoodForm} style={{ ...bigButton(SURFACE_2, TEXT), border: `1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={saveSavedFoodOnly} style={bigButton(profileColor(activeUser), profileText(activeUser))}>Save changes</button>
          </div> : <button onClick={addFood} disabled={!activeCanEdit} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{buttonSuccess === "food" ? "✓ Added" : selectedSavedFoodId ? `Log ${foodQuantity || 1} × serving` : "Log food"}</button>}
        </div>
      </>}

      {logTab === "weight" && <div style={cardStyle}>
        <div style={headingStyle}>Weight</div><div style={fieldLabel}>Weight (lb)</div>
        <input type="number" step="0.1" inputMode="decimal" placeholder="e.g. 182.4" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={fieldLabel}>Date</div><input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        {weightError && <div style={{ color: WARN, fontSize: 12, marginBottom: 8 }}>{weightError}</div>}
        <button onClick={addWeight} disabled={!activeCanEdit} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{buttonSuccess === "weight" ? "✓ Logged" : (weightDate === today && data[activeUser].weights.some((w) => w.date === today)) ? "Update today’s weight" : "Log weight"}</button>
        {data[activeUser].weights.length > 0 && <div style={{ marginTop: 14 }}>{data[activeUser].weights.slice().reverse().slice(0, 3).map((w) => <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}><span style={{ color: TEXT_MUTED }}>{fmtDate(w.date)}</span><span className="num">{w.weight} lb</span><button onClick={() => deleteWeight(w.id)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 12 }}>remove</button></div>)}</div>}
      </div>}

      {logTab === "activity" && <div style={cardStyle}>
        <div style={headingStyle}>Activity</div><div style={fieldLabel}>Activity</div>
        <input type="text" placeholder="e.g. run, lifting, walk" value={actName} onChange={(e) => setActName(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={fieldLabel}>Calories burned</div><input type="number" inputMode="numeric" value={actCals} onChange={(e) => setActCals(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={fieldLabel}>Date</div><input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        <button onClick={addActivity} disabled={!activeCanEdit} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{buttonSuccess === "activity" ? "✓ Added" : "Log activity"}</button>
      </div>}

      {logTab === "water" && <div style={cardStyle}>
        <div style={headingStyle}>Water</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>{[8,16,24].map((oz) => <button key={oz} onClick={() => addWater(oz)} style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600 }}>+{oz} oz</button>)}</div>
        <div style={fieldLabel}>Custom amount (oz)</div><input type="number" inputMode="numeric" value={waterOz} onChange={(e) => setWaterOz(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={fieldLabel}>Date</div><input type="date" value={waterDate} onChange={(e) => setWaterDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        <button onClick={() => addWater()} disabled={!activeCanEdit} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{buttonSuccess === "water" ? "✓ Added" : "Add water"}</button>
      </div>}

      {logTab === "steps" && <div style={cardStyle}>
        <div style={headingStyle}>Steps</div><div style={fieldLabel}>Step count</div>
        <input type="number" inputMode="numeric" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={fieldLabel}>Date</div><input type="date" value={stepsDate} onChange={(e) => setStepsDate(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
        <button onClick={saveSteps} disabled={!activeCanEdit} style={bigButton(profileColor(activeUser), profileText(activeUser))}>{buttonSuccess === "steps" ? "✓ Saved" : (stepsDate === today && ts.steps != null) ? "Update today’s steps" : "Save steps"}</button>
      </div>}
    </>
  );
}
