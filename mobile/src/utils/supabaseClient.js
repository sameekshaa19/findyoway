import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Offline-first venue storage
export const venueStorage = {
  async cacheVenueGraph(venueId, graphData) {
    try {
      await AsyncStorage.setItem(`venue_graph_${venueId}`, JSON.stringify({
        data: graphData,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Failed to cache venue:', e);
    }
  },

  async getCachedVenue(venueId) {
    try {
      const cached = await AsyncStorage.getItem(`venue_graph_${venueId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is fresh (24 hours)
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
};
