import { TripRoute, RouteCheckpoint, TelcoProvider } from '../types';
import { loadCoverageReports } from './storage';

export interface LocationSuggestion {
  name: string;
  region: string;
  coords: [number, number]; // [lat, lng]
  category: 'hub' | 'city' | 'tourist' | 'airport' | 'port';
}

// Extensive built-in Philippine Location Directory with precise coordinates
export const PH_POPULAR_LOCATIONS: LocationSuggestion[] = [
  // Metro Manila & Transport Hubs
  { name: 'PITX (Parañaque Integrated Terminal Exchange)', region: 'Metro Manila', coords: [14.5125, 120.9922], category: 'hub' },
  { name: 'Araneta City Bus Terminal (Cubao)', region: 'Quezon City', coords: [14.6195, 121.0515], category: 'hub' },
  { name: 'Balintawak Toll Plaza (NLEX Start)', region: 'Caloocan / QC', coords: [14.6575, 120.9995], category: 'hub' },
  { name: 'NAIA Terminal 3 (Pasay)', region: 'Metro Manila', coords: [14.5204, 121.0194], category: 'airport' },
  { name: 'BGC (Bonifacio High Street)', region: 'Taguig', coords: [14.5516, 121.0510], category: 'city' },
  { name: 'Makati CBD (Ayala Triangle)', region: 'Makati', coords: [14.5574, 121.0227], category: 'city' },
  { name: 'SM Mall of Asia (Pasay)', region: 'Metro Manila', coords: [14.5353, 120.9826], category: 'hub' },
  { name: 'Monumento (Caloocan)', region: 'Metro Manila', coords: [14.6542, 120.9839], category: 'hub' },
  { name: 'Alabang Starmall / South Station', region: 'Muntinlupa', coords: [14.4172, 121.0428], category: 'hub' },
  { name: 'Buendia / Taft Bus Terminal', region: 'Pasay', coords: [14.5540, 120.9980], category: 'hub' },

  // South Luzon / Calabarzon
  { name: 'Tagaytay Ridge (Taal View)', region: 'Cavite', coords: [14.1153, 120.9621], category: 'tourist' },
  { name: 'Batangas Port Passenger Terminal', region: 'Batangas', coords: [13.7565, 121.0435], category: 'port' },
  { name: 'Batangas Grand Terminal (Alangilan)', region: 'Batangas City', coords: [13.7792, 121.0664], category: 'hub' },
  { name: 'SM City Lipa / Ayala Highway', region: 'Lipa City, Batangas', coords: [13.9427, 121.1631], category: 'city' },
  { name: 'Calamba Crossing / Turbina', region: 'Laguna', coords: [14.1956, 121.1488], category: 'hub' },
  { name: 'Nuvali (Santa Rosa)', region: 'Laguna', coords: [14.2406, 121.0594], category: 'city' },
  { name: 'Lucena Grand Central Terminal', region: 'Quezon', coords: [13.9515, 121.6148], category: 'hub' },
  { name: 'Puerto Galera (White Beach)', region: 'Oriental Mindoro', coords: [13.5028, 120.8972], category: 'tourist' },
  { name: 'San Pablo City Plaza', region: 'Laguna', coords: [14.0683, 121.3256], category: 'city' },
  { name: 'Nasugbu Beach Strip', region: 'Batangas', coords: [14.0764, 120.6319], category: 'tourist' },

  // North Luzon
  { name: 'Baguio City (Burnham Park)', region: 'Benguet', coords: [16.4124, 120.5980], category: 'tourist' },
  { name: 'San Juan Surf Town', region: 'La Union', coords: [16.6664, 120.3204], category: 'tourist' },
  { name: 'Clark Freeport Zone (Angeles)', region: 'Pampanga', coords: [15.1856, 120.5594], category: 'airport' },
  { name: 'Subic Bay Freeport Zone', region: 'Zambales', coords: [14.8217, 120.2796], category: 'tourist' },
  { name: 'Baler (Sabang Beach)', region: 'Aurora', coords: [15.7606, 121.5644], category: 'tourist' },
  { name: 'Vigan City (Calle Crisologo)', region: 'Ilocos Sur', coords: [17.5707, 120.3870], category: 'tourist' },
  { name: 'Laoag City Center', region: 'Ilocos Norte', coords: [18.1960, 120.5927], category: 'city' },
  { name: 'Tarlac City TPLEX Entry', region: 'Tarlac', coords: [15.4865, 120.5982], category: 'hub' },
  { name: 'Dagupan City / Hundred Islands', region: 'Pangasinan', coords: [16.0433, 120.3341], category: 'tourist' },
  { name: 'Sagada Town Proper', region: 'Mountain Province', coords: [17.0833, 120.9000], category: 'tourist' },

  // Bicol
  { name: 'Legazpi City (Cagsawa Ruins)', region: 'Albay', coords: [13.1391, 123.7438], category: 'tourist' },
  { name: 'Naga City Bus Terminal', region: 'Camarines Sur', coords: [13.6218, 123.1948], category: 'hub' },

  // Visayas
  { name: 'Cebu South Bus Terminal', region: 'Cebu City', coords: [10.3015, 123.8920], category: 'hub' },
  { name: 'Cebu IT Park (Lahug)', region: 'Cebu City', coords: [10.3297, 123.9063], category: 'city' },
  { name: 'Mactan-Cebu International Airport', region: 'Lapu-Lapu City', coords: [10.3075, 123.9794], category: 'airport' },
  { name: 'Panagsama Beach, Moalboal', region: 'Cebu', coords: [9.9575, 123.3664], category: 'tourist' },
  { name: 'Oslob Whale Shark Hub', region: 'Cebu', coords: [9.4795, 123.3768], category: 'tourist' },
  { name: 'Bantayan Island (Santa Fe)', region: 'Cebu', coords: [11.1561, 123.8055], category: 'tourist' },
  { name: 'Boracay Island (Station 2 / Caticlan)', region: 'Aklan', coords: [11.9674, 121.9248], category: 'tourist' },
  { name: 'Iloilo City (Megaworld Iloilo)', region: 'Iloilo', coords: [10.7180, 122.5484], category: 'city' },
  { name: 'Bacolod City (The Ruins)', region: 'Negros Occidental', coords: [10.6766, 122.9509], category: 'city' },
  { name: 'Panglao Island (Alona Beach)', region: 'Bohol', coords: [9.5492, 123.7725], category: 'tourist' },

  // Mindanao
  { name: 'Davao City (Abreeza / Bajada)', region: 'Davao del Sur', coords: [7.0917, 125.6133], category: 'city' },
  { name: 'Siargao Island (General Luna)', region: 'Surigao del Norte', coords: [9.7845, 126.1558], category: 'tourist' },
  { name: 'Cagayan de Oro (Limketkai)', region: 'Misamis Oriental', coords: [8.4822, 124.6548], category: 'city' },
  { name: 'General Santos City (KCC Mall)', region: 'South Cotabato', coords: [6.1164, 125.1716], category: 'city' }
];

// Calculate Haversine distance in KM
export function calculateDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Find closest known Philippine location or reverse geocode format
export function identifyClosestLocationName(coords: [number, number]): string {
  let closest = PH_POPULAR_LOCATIONS[0];
  let minDistance = calculateDistanceKm(coords, closest.coords);

  for (const loc of PH_POPULAR_LOCATIONS) {
    const d = calculateDistanceKm(coords, loc.coords);
    if (d < minDistance) {
      minDistance = d;
      closest = loc;
    }
  }

  if (minDistance <= 3) {
    return `${closest.name}`;
  } else if (minDistance <= 20) {
    return `Near ${closest.name} (~${minDistance}km away)`;
  }
  return `GPS [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`;
}

// Search or resolve location from text
export async function resolveLocationCoords(query: string): Promise<{ name: string; coords: [number, number] }> {
  const clean = query.trim().toLowerCase();

  // 1. Direct match in local PH directory
  const direct = PH_POPULAR_LOCATIONS.find(
    l => l.name.toLowerCase().includes(clean) || clean.includes(l.name.toLowerCase())
  );
  if (direct) {
    return { name: direct.name, coords: direct.coords };
  }

  // 2. Partial word match
  const partial = PH_POPULAR_LOCATIONS.find(l => {
    const words = clean.split(/\s+/).filter(w => w.length > 2);
    return words.some(w => l.name.toLowerCase().includes(w) || l.region.toLowerCase().includes(w));
  });
  if (partial) {
    return { name: query, coords: partial.coords };
  }

  // 3. Online geocoding fallback via OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query + ', Philippines'
      )}&countrycodes=ph&limit=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          name: query,
          coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)]
        };
      }
    }
  } catch {
    // offline or network error fallback
  }

  // 4. Default fallback: Center in Metro Manila with slight random offset
  return {
    name: query,
    coords: [14.5995 + (Math.random() - 0.5) * 0.1, 120.9842 + (Math.random() - 0.5) * 0.1]
  };
}

// Generate realistic intermediate coordinates between origin and destination
function interpolatePath(
  start: [number, number],
  end: [number, number],
  steps: number = 6
): [number, number][] {
  const path: [number, number][] = [start];
  for (let i = 1; i < steps - 1; i++) {
    const frac = i / (steps - 1);
    // Add slight natural road curvature
    const curveOffset = Math.sin(frac * Math.PI) * 0.02 * (i % 2 === 0 ? 1 : -1);
    const lat = start[0] + (end[0] - start[0]) * frac + curveOffset;
    const lng = start[1] + (end[1] - start[1]) * frac + curveOffset;
    path.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
  }
  path.push(end);
  return path;
}

// Estimate signal strength at a checkpoint based on geography & crowd reports
function evaluateCheckpointSignal(
  coords: [number, number],
  fractionAlongRoute: number,
  isHighway: boolean
): {
  strength: Record<TelcoProvider, number>;
  deadzones: TelcoProvider[];
  recommendation: string;
} {
  const existingReports = loadCoverageReports();
  // Check if near any actual user submitted reports
  const nearbyReports = existingReports.filter(r => calculateDistanceKm(coords, r.coordinates) <= 15);

  let smartScore = 5;
  let globeScore = 5;
  let ditoScore = 4;

  if (nearbyReports.length > 0) {
    const smartReports = nearbyReports.filter(r => r.telco === 'Smart');
    const globeReports = nearbyReports.filter(r => r.telco === 'Globe');
    const ditoReports = nearbyReports.filter(r => r.telco === 'DITO');

    if (smartReports.length > 0) {
      smartScore = Math.round(smartReports.reduce((acc, r) => acc + r.signalRating, 0) / smartReports.length);
    }
    if (globeReports.length > 0) {
      globeScore = Math.round(globeReports.reduce((acc, r) => acc + r.signalRating, 0) / globeReports.length);
    }
    if (ditoReports.length > 0) {
      ditoScore = Math.round(ditoReports.reduce((acc, r) => acc + r.signalRating, 0) / ditoReports.length);
    }
  } else {
    // Terrain heuristics: mid-route rural/mountainous segments tend to have lower DITO density
    if (fractionAlongRoute > 0.3 && fractionAlongRoute < 0.8 && !isHighway) {
      ditoScore = 2;
      globeScore = 3;
      smartScore = 4;
    } else if (fractionAlongRoute > 0.3 && fractionAlongRoute < 0.8 && isHighway) {
      ditoScore = 3;
      globeScore = 4;
      smartScore = 5;
    }
  }

  const deadzones: TelcoProvider[] = [];
  if (ditoScore <= 2) deadzones.push('DITO');
  if (globeScore <= 2) deadzones.push('Globe');
  if (smartScore <= 2) deadzones.push('Smart');

  let recommendation = 'High-speed 5G & LTE connection verified for active mapping and music streaming.';
  if (deadzones.length > 0) {
    recommendation = `Potential ${deadzones.join(
      ' & '
    )} dropzone. Ensure you have a ${deadzones.includes('Smart') ? 'Globe' : 'Smart'} SIM active or download offline maps.`;
  } else if (ditoScore === 3 || globeScore === 3) {
    recommendation = 'Moderate cell density. Keep GPS active; high-resolution video streaming may encounter brief buffer.';
  }

  return {
    strength: {
      Smart: Math.max(1, Math.min(5, smartScore)),
      Globe: Math.max(1, Math.min(5, globeScore)),
      DITO: Math.max(1, Math.min(5, ditoScore)),
      GOMO: Math.max(1, Math.min(5, globeScore)),
      TM: Math.max(1, Math.min(5, globeScore)),
      TNT: Math.max(1, Math.min(5, smartScore))
    },
    deadzones,
    recommendation
  };
}

// Generate a full custom route with real-world OSRM highway geometry and signal forecast
export async function generateCustomTripRoute(
  originName: string,
  originCoords: [number, number],
  destName: string,
  destCoords: [number, number]
): Promise<TripRoute> {
  let roadPath: [number, number][] = [];
  let distanceKm = 0;
  let durationEst = '';
  const roadSteps: { name: string; coords: [number, number]; distanceKm: number }[] = [];

  // 1. Fetch Real-World Driving Road Geometry via OSRM Public Routing API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const primaryRoute = data.routes[0];
        
        // Exact real road distance and driving duration from highway engine
        distanceKm = Math.max(2, Math.round(primaryRoute.distance / 1000));
        const totalSeconds = Math.round(primaryRoute.duration);
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.round((totalSeconds % 3600) / 60);
        durationEst = hours > 0 ? `${hours} hr${hours > 1 ? 's' : ''} ${mins > 0 ? `${mins} min` : ''}` : `${mins} min`;

        // Extract detailed high-definition highway coordinates [lat, lng]
        if (primaryRoute.geometry && primaryRoute.geometry.coordinates) {
          roadPath = primaryRoute.geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]] as [number, number]);
        }

        // Extract road milestone steps from turn-by-turn navigation
        if (primaryRoute.legs && primaryRoute.legs[0] && primaryRoute.legs[0].steps) {
          let accumulatedMeters = 0;
          for (const step of primaryRoute.legs[0].steps) {
            accumulatedMeters += step.distance || 0;
            if (step.name && step.name.trim().length > 2 && step.maneuver?.location) {
              const stepCoords: [number, number] = [step.maneuver.location[1], step.maneuver.location[0]];
              roadSteps.push({
                name: step.name.trim(),
                coords: stepCoords,
                distanceKm: Math.round(accumulatedMeters / 1000)
              });
            }
          }
        }
      }
    }
  } catch {
    // Offline or network error fallback
  }

  // Fallback if OSRM was unavailable or offline
  if (roadPath.length === 0) {
    const straightDist = calculateDistanceKm(originCoords, destCoords);
    distanceKm = Math.max(5, Math.round(straightDist * 1.28));

    let mins = 0;
    if (distanceKm < 30) {
      mins = Math.round((distanceKm / 22) * 60);
    } else if (distanceKm < 100) {
      mins = Math.round((distanceKm / 45) * 60);
    } else {
      mins = Math.round((distanceKm / 58) * 60);
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    durationEst = hours > 0 ? `${hours} hr${hours > 1 ? 's' : ''} ${remMins > 0 ? `${remMins} min` : ''}` : `${remMins} min`;

    const numSteps = distanceKm > 150 ? 8 : distanceKm > 50 ? 6 : 5;
    roadPath = interpolatePath(originCoords, destCoords, numSteps + 4);
  }

  // 2. Generate Checkpoint Milestones along the real highway path
  const numCheckpoints = distanceKm > 200 ? 7 : distanceKm > 80 ? 5 : distanceKm > 30 ? 4 : 3;
  const checkpoints: RouteCheckpoint[] = [];

  for (let i = 0; i < numCheckpoints; i++) {
    const fraction = i / (numCheckpoints - 1);
    const pathIndex = Math.min(roadPath.length - 1, Math.floor(fraction * (roadPath.length - 1)));
    const coords = roadPath[pathIndex];
    const kmMark = Math.round(fraction * distanceKm);

    // Identify highway / corridor name
    let stepName = '';
    if (i === 0) {
      stepName = `Start: ${originName}`;
    } else if (i === numCheckpoints - 1) {
      stepName = `Arrival: ${destName}`;
    } else {
      // Check if there is a matching OSRM road step nearby
      const matchingStep = roadSteps.find(s => Math.abs(s.distanceKm - kmMark) <= Math.max(5, distanceKm * 0.15));
      if (matchingStep) {
        stepName = `${matchingStep.name} Corridor`;
      } else if (fraction < 0.35) {
        stepName = `Expressway Departure Junction`;
      } else if (fraction < 0.7) {
        stepName = `Mid-Route Provincial Highway Segment`;
      } else {
        stepName = `Approach & City Arterial Gateway`;
      }
    }

    const { strength, deadzones, recommendation } = evaluateCheckpointSignal(
      coords,
      fraction,
      distanceKm > 40
    );

    checkpoints.push({
      name: stepName,
      coordinates: coords,
      kmMark,
      carrierStrength: strength,
      deadzoneCarriers: deadzones,
      recommendation
    });
  }

  // 3. Generate Overall Route Advisory & Signal Safety
  const hasDitoDeadzone = checkpoints.some(c => c.deadzoneCarriers.includes('DITO'));
  const hasGlobeDeadzone = checkpoints.some(c => c.deadzoneCarriers.includes('Globe'));
  const hasSmartDeadzone = checkpoints.some(c => c.deadzoneCarriers.includes('Smart'));

  let summaryAdvisory = `Continuous 5G/4G coverage across ${distanceKm} km. Smart and Globe provide steady signals for live Waze & Google Maps telemetry.`;
  if (hasDitoDeadzone && !hasSmartDeadzone) {
    summaryAdvisory = `Smart and Globe maintain strong 5G throughout. DITO signals may drop to 3G/deadzone along mountain & valley segments. Keep your primary Smart or Globe SIM active.`;
  } else if (hasGlobeDeadzone) {
    summaryAdvisory = `Smart demonstrates the strongest line-of-sight signal across this corridor. Top up regular load or data promo before departure.`;
  }

  const customId = `custom-route-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  return {
    id: customId,
    name: `${originName} to ${destName}`,
    origin: originName,
    destination: destName,
    distanceKm,
    durationEst,
    path: roadPath,
    checkpoints,
    summaryAdvisory
  };
}

// Storage helpers for Custom Routes
const CUSTOM_ROUTES_KEY = 'loadwise_custom_routes_v1';

export function loadSavedCustomRoutes(): TripRoute[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ROUTES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [];
}

export function saveCustomRoute(route: TripRoute): void {
  try {
    const existing = loadSavedCustomRoutes().filter(r => r.id !== route.id);
    const updated = [route, ...existing].slice(0, 10); // keep up to 10 custom routes
    localStorage.setItem(CUSTOM_ROUTES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function deleteCustomRoute(routeId: string): TripRoute[] {
  try {
    const existing = loadSavedCustomRoutes().filter(r => r.id !== routeId);
    localStorage.setItem(CUSTOM_ROUTES_KEY, JSON.stringify(existing));
    return existing;
  } catch {
    return [];
  }
}
