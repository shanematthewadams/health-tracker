const ACTIVE_WITH_STORAGE_KEY = "with-active-with-id";

export function normalizeWithMemberships(memberships = [], households = []) {
  const householdById = Object.fromEntries((households || []).map((household) => [household.id, household]));

  return (memberships || [])
    .map((membership) => {
      const household = householdById[membership.household_id];
      if (!household) return null;
      return {
        id: household.id,
        name: household.name || "Your With",
        inviteCode: household.invite_code || "",
        role: membership.role || "member",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function chooseActiveWithId(withs = [], preferredId = null) {
  if (!withs.length) return null;
  if (preferredId && withs.some((withItem) => withItem.id === preferredId)) return preferredId;
  return withs[0].id;
}

export function readStoredActiveWithId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_WITH_STORAGE_KEY) || null;
}

export function storeActiveWithId(withId) {
  if (typeof window === "undefined") return;
  if (withId) window.localStorage.setItem(ACTIVE_WITH_STORAGE_KEY, withId);
  else window.localStorage.removeItem(ACTIVE_WITH_STORAGE_KEY);
}

export function clearStoredActiveWithId() {
  storeActiveWithId(null);
}
