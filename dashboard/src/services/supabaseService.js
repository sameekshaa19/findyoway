import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

/**
 * Inserts a new venue and its floor plan graph into Supabase.
 * @param {Object} venue - { id, name, city, address, floors }
 * @param {Object} graphJson - { nodes, edges } from FloorPlanEditor
 */
export async function registerVenue(venue, graphJson) {
  const { error: venueError } = await supabase.from('venues').insert([venue])
  if (venueError) throw new Error(venueError.message)

  const { error: fpError } = await supabase.from('floor_plans').insert([{
    venue_id: venue.id,
    graph_json: graphJson,
  }])
  if (fpError) throw new Error(fpError.message)
}

/**
 * Fetches all registered venues ordered by creation date.
 */
export async function getAllVenues() {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
