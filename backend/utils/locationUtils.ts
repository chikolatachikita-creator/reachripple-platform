/**
 * Location distance mapping for UK
 * Maps UK locations to approximate coordinates for distance calculations
 */

export interface LocationCoords {
  city: string;
  lat: number;
  lng: number;
  regions?: string[]; // Sub-regions (e.g., North London, East London)
}

export const LOCATION_COORDINATES: Record<string, LocationCoords> = {
  "London": {
    city: "London",
    lat: 51.5074,
    lng: -0.1278,
    regions: ["North London", "East London", "South London", "West London", "Central London"]
  },
  "Manchester": {
    city: "Manchester",
    lat: 53.4808,
    lng: -2.2426,
  },
  "Birmingham": {
    city: "Birmingham",
    lat: 52.5086,
    lng: -1.8755,
  },
  "Leeds": {
    city: "Leeds",
    lat: 53.8008,
    lng: -1.5491,
  },
  "Liverpool": {
    city: "Liverpool",
    lat: 53.4084,
    lng: -2.9916,
  },
  "Bristol": {
    city: "Bristol",
    lat: 51.4545,
    lng: -2.5879,
  },
  "Edinburgh": {
    city: "Edinburgh",
    lat: 55.9533,
    lng: -3.1883,
  },
  "Glasgow": {
    city: "Glasgow",
    lat: 55.8642,
    lng: -4.2518,
  },
  "Cardiff": {
    city: "Cardiff",
    lat: 51.4816,
    lng: -3.1791,
  },
  "Belfast": {
    city: "Belfast",
    lat: 54.5973,
    lng: -5.9301,
  },
};

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get coordinates for a location string
 */
export function getLocationCoords(locationString: string): LocationCoords | null {
  const normalized = locationString.trim();
  
  // Direct match
  if (LOCATION_COORDINATES[normalized]) {
    return LOCATION_COORDINATES[normalized];
  }
  
  // Case-insensitive match
  for (const [key, value] of Object.entries(LOCATION_COORDINATES)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return value;
    }
  }
  
  return null;
}

/**
 * VivaStreet-style location normalization
 * Extracts and normalizes location fields from postcode/location string
 */

// UK postcode regex: outcode (required) + optional incode
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})?$/i;

// London outcode to district mapping
const LONDON_DISTRICTS: Record<string, string> = {
  'E1': 'Whitechapel', 'E2': 'Bethnal Green', 'E3': 'Bow', 'E4': 'Chingford',
  'E5': 'Clapton', 'E6': 'East Ham', 'E7': 'Forest Gate', 'E8': 'Hackney',
  'E9': 'Hackney Wick', 'E10': 'Leyton', 'E11': 'Leytonstone', 'E12': 'Manor Park',
  'E13': 'Plaistow', 'E14': 'Poplar', 'E15': 'Stratford', 'E16': 'Victoria Docks',
  'E17': 'Walthamstow', 'E18': 'South Woodford', 'E20': 'Olympic Park',
  'N1': 'Islington', 'N2': 'East Finchley', 'N3': 'Finchley', 'N4': 'Finsbury Park',
  'N5': 'Highbury', 'N6': 'Highgate', 'N7': 'Holloway', 'N8': 'Hornsey',
  'N9': 'Edmonton', 'N10': 'Muswell Hill', 'N11': 'New Southgate', 'N12': 'North Finchley',
  'N13': 'Palmers Green', 'N14': 'Southgate', 'N15': 'Seven Sisters', 'N16': 'Stoke Newington',
  'N17': 'Tottenham', 'N18': 'Edmonton', 'N19': 'Archway', 'N20': 'Whetstone',
  'N21': 'Winchmore Hill', 'N22': 'Wood Green',
  'NW1': 'Camden', 'NW2': 'Cricklewood', 'NW3': 'Hampstead', 'NW4': 'Hendon',
  'NW5': 'Kentish Town', 'NW6': 'Kilburn', 'NW7': 'Mill Hill', 'NW8': "St John's Wood",
  'NW9': 'Colindale', 'NW10': 'Willesden', 'NW11': 'Golders Green',
  'SE1': 'Southwark', 'SE2': 'Abbey Wood', 'SE3': 'Blackheath', 'SE4': 'Brockley',
  'SE5': 'Camberwell', 'SE6': 'Catford', 'SE7': 'Charlton', 'SE8': 'Deptford',
  'SE9': 'Eltham', 'SE10': 'Greenwich', 'SE11': 'Kennington', 'SE12': 'Lee',
  'SE13': 'Lewisham', 'SE14': 'New Cross', 'SE15': 'Peckham', 'SE16': 'Rotherhithe',
  'SE17': 'Walworth', 'SE18': 'Woolwich', 'SE19': 'Crystal Palace', 'SE20': 'Penge',
  'SE21': 'Dulwich', 'SE22': 'East Dulwich', 'SE23': 'Forest Hill', 'SE24': 'Herne Hill',
  'SE25': 'South Norwood', 'SE26': 'Sydenham', 'SE27': 'West Norwood', 'SE28': 'Thamesmead',
  'SW1': 'Westminster', 'SW2': 'Brixton', 'SW3': 'Chelsea', 'SW4': 'Clapham',
  'SW5': "Earl's Court", 'SW6': 'Fulham', 'SW7': 'South Kensington', 'SW8': 'Vauxhall',
  'SW9': 'Stockwell', 'SW10': "West Brompton", 'SW11': 'Battersea', 'SW12': 'Balham',
  'SW13': 'Barnes', 'SW14': 'Mortlake', 'SW15': 'Putney', 'SW16': 'Streatham',
  'SW17': 'Tooting', 'SW18': 'Wandsworth', 'SW19': 'Wimbledon', 'SW20': 'West Wimbledon',
  'W1': 'West End', 'W2': 'Paddington', 'W3': 'Acton', 'W4': 'Chiswick',
  'W5': 'Ealing', 'W6': 'Hammersmith', 'W7': 'Hanwell', 'W8': 'Kensington',
  'W9': 'Maida Vale', 'W10': 'North Kensington', 'W11': 'Notting Hill', 'W12': "Shepherd's Bush",
  'W13': 'West Ealing', 'W14': 'West Kensington',
  'WC1': 'Bloomsbury', 'WC2': 'Covent Garden',
  'EC1': 'Clerkenwell', 'EC2': 'City of London', 'EC3': 'Tower Hill', 'EC4': 'Fleet Street',
};

/**
 * Convert string to URL-safe slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract outcode from a postcode string
 */
export function extractOutcode(input: string): string | null {
  const match = input.trim().toUpperCase().match(UK_POSTCODE_REGEX);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Get district name from outcode
 */
export function getDistrictFromOutcode(outcode: string): string | null {
  const normalized = outcode.toUpperCase().replace(/\s/g, '');
  return LONDON_DISTRICTS[normalized] || null;
}

/**
 * Normalize location fields for an ad
 * Returns normalized location data for consistent searching
 */
export interface NormalizedLocation {
  outcode?: string;        // e.g., "N1"
  district?: string;       // e.g., "Islington"
  districtSlug?: string;   // e.g., "islington"
  postcode?: string;       // e.g., "N1 6XW" (full postcode if provided)
  locationSlug?: string;   // e.g., "n1-islington"
}

export function normalizeLocationFields(
  location?: string,
  postcode?: string,
): NormalizedLocation {
  const result: NormalizedLocation = {};
  
  // Try to extract outcode from postcode first
  const postcodeToCheck = postcode || location || '';
  const extractedOutcode = extractOutcode(postcodeToCheck);
  
  if (extractedOutcode) {
    result.outcode = extractedOutcode;
    
    // Store full postcode if it was a complete postcode
    if (postcode && UK_POSTCODE_REGEX.test(postcode.trim())) {
      result.postcode = postcode.trim().toUpperCase();
    }
    
    // Get district from outcode
    const district = getDistrictFromOutcode(extractedOutcode);
    if (district) {
      result.district = district;
      result.districtSlug = slugify(district);
      result.locationSlug = `${extractedOutcode.toLowerCase()}-${slugify(district)}`;
    } else {
      result.locationSlug = extractedOutcode.toLowerCase();
    }
  } else if (location) {
    // If no postcode pattern found, use location as-is
    result.district = location;
    result.districtSlug = slugify(location);
    result.locationSlug = slugify(location);
  }
  
  return result;
}
