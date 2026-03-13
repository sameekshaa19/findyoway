import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Read from Expo extra config (set via app.json's extra or expo-constants)
const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Searches for a registered venue by name (and optionally city).
 * Mobile queries Supabase directly — no Flask middleman needed.
 * @returns {Object|null} venue row or null if not found
 */
export async function fetchVenueByName(name, city = '') {
  let query = supabase
    .from('venues')
    .select('*')
    .ilike('name', `%${name}%`);

  if (city) query = query.ilike('city', `%${city}%`);

  const { data, error } = await query.limit(1).single();
  if (error) {
    console.log('Venue lookup error:', error.message);
    return null;
  }
  return data;
}

/**
 * Downloads the floor plan JSON for a given venue ID.
 * The floor plan has this shape:
 * { nodes: { id: { label: string } }, edges: [{ from, to, weight }] }
 *
 * @param {string} venueId
 * @returns {Object|null} floor plan or null on error
 */
export async function fetchFloorPlan(venueId) {
  const { data, error } = await supabase
    .from('floor_plans')
    .select('graph_json')
    .eq('venue_id', venueId)
    .single();

  if (error) {
    console.log('Floor plan fetch error:', error.message);
    return null;
  }
  return data?.graph_json || null;
}
