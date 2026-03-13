/**
 * Generates a unique venue ID from the venue's name and city.
 * Format: "city-name-slug" e.g. "bengaluru-city-hospital"
 */
export function generateVenueId(name, city) {
  const slug = (str) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')

  return `${slug(city)}-${slug(name)}`
}
