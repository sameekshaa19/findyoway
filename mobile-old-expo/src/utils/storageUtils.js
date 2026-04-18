import AsyncStorage from '@react-native-async-storage/async-storage';

const FLOOR_PLAN_PREFIX = 'floorplan_';
const LANGUAGE_KEY = 'selectedLanguage';

/**
 * Saves a floor plan JSON to AsyncStorage so it works offline next time.
 * Key is derived from the venue name (lowercased + trimmed).
 */
export async function cacheFloorPlan(venueName, floorPlan) {
  const key = FLOOR_PLAN_PREFIX + venueName.toLowerCase().trim();
  await AsyncStorage.setItem(key, JSON.stringify(floorPlan));
}

/**
 * Retrieves a cached floor plan. Returns null if not cached.
 */
export async function getCachedFloorPlan(venueName) {
  const key = FLOOR_PLAN_PREFIX + venueName.toLowerCase().trim();
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Saves the user's chosen language.
 */
export async function saveLanguage(language) {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

/**
 * Retrieves the saved language. Returns null if not set yet.
 */
export async function getSavedLanguage() {
  return AsyncStorage.getItem(LANGUAGE_KEY);
}
