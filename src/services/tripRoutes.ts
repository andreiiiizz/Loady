import { TripRoute } from '../types';

export const POPULAR_TRIP_ROUTES: TripRoute[] = [
  {
    id: 'route-mnl-baguio',
    name: 'Manila to Baguio City (TPLEX / Marcos Highway)',
    origin: 'Metro Manila (Balintawak Toll Plaza)',
    destination: 'Baguio City (Burnham Park)',
    distanceKm: 245,
    durationEst: '4 hrs 15 mins',
    summaryAdvisory: 'Smart has the strongest continuous 5G/4G signal along TPLEX. DITO drops to 3G/deadzone along the mountain climb between Rosario and Tuba. Keep a Smart or Globe SIM active for Waze / Google Maps navigation.',
    path: [
      [14.6575, 120.9995], // Balintawak
      [14.8527, 120.8160], // Malolos / NLEX
      [15.1764, 120.5367], // Clark / Angeles
      [15.4865, 120.5982], // Tarlac City (TPLEX Start)
      [15.9758, 120.5714], // Urdaneta Bypass
      [16.2285, 120.4852], // Rosario Toll Exit
      [16.3500, 120.5500], // Marcos Highway Climb
      [16.4124, 120.5980]  // Baguio City
    ],
    checkpoints: [
      {
        name: 'NLEX Balintawak to San Fernando',
        coordinates: [14.8527, 120.8160],
        kmMark: 50,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 4, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'All carriers provide flawless 5G & LTE.'
      },
      {
        name: 'SCTEX / TPLEX Tarlac Corridor',
        coordinates: [15.4865, 120.5982],
        kmMark: 125,
        carrierStrength: { Smart: 5, Globe: 4, DITO: 3, GOMO: 4, TM: 4, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Smart and Globe hold steady 5G. DITO experiences intermittent latency.'
      },
      {
        name: 'TPLEX Rosario Exit (Pangasinan-La Union border)',
        coordinates: [16.2285, 120.4852],
        kmMark: 195,
        carrierStrength: { Smart: 5, Globe: 4, DITO: 3, GOMO: 4, TM: 4, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Reload before starting the mountain ascent.'
      },
      {
        name: 'Marcos Highway Mountain Pass (Tuba)',
        coordinates: [16.3500, 120.5750],
        kmMark: 230,
        carrierStrength: { Smart: 4, Globe: 3, DITO: 2, GOMO: 3, TM: 3, TNT: 4 },
        deadzoneCarriers: ['DITO'],
        recommendation: 'Deep mountain curve: Smart has the best line-of-sight signal; DITO deadzone for ~8km.'
      },
      {
        name: 'Baguio City Center (Session Road / Burnham)',
        coordinates: [16.4124, 120.5980],
        kmMark: 245,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 4, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Full 5G coverage across city hotels, cafes, and terminals.'
      }
    ]
  },
  {
    id: 'route-ceb-moalboal',
    name: 'Cebu City to Moalboal (South Coastal Highway)',
    origin: 'Cebu South Bus Terminal',
    destination: 'Panagsama Beach, Moalboal',
    distanceKm: 89,
    durationEst: '2 hrs 45 mins',
    summaryAdvisory: 'Globe and Smart provide continuous 4G/5G along Talisay to Carcar. In the mountainous Barili interior transit, Globe and Smart hold adequate GPS data. Top up before leaving Carcar City.',
    path: [
      [10.3015, 123.8920], // Cebu South Bus Terminal
      [10.2447, 123.8492], // Talisay City
      [10.1985, 123.7548], // Naga City
      [10.1119, 123.6427], // Carcar City (Rotunda)
      [10.0215, 123.5182], // Barili
      [9.9575, 123.3664]   // Moalboal
    ],
    checkpoints: [
      {
        name: 'Talisay & Minglanilla Corridor',
        coordinates: [10.2447, 123.8492],
        kmMark: 15,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 4, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Full coverage for video streaming and mapping.'
      },
      {
        name: 'Carcar City Rotunda',
        coordinates: [10.1119, 123.6427],
        kmMark: 40,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 4, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Last major shopping/reload hub before crossing through west mountain passes.'
      },
      {
        name: 'Barili Mountain Segment',
        coordinates: [10.0215, 123.5182],
        kmMark: 65,
        carrierStrength: { Smart: 4, Globe: 4, DITO: 2, GOMO: 4, TM: 4, TNT: 4 },
        deadzoneCarriers: ['DITO'],
        recommendation: 'Globe and Smart maintain 4G. DITO drops in narrow river valleys.'
      },
      {
        name: 'Moalboal Town & Panagsama Beach',
        coordinates: [9.9575, 123.3664],
        kmMark: 89,
        carrierStrength: { Smart: 4, Globe: 4, DITO: 4, GOMO: 4, TM: 4, TNT: 4 },
        deadzoneCarriers: [],
        recommendation: 'Stable 4G LTE across all resort strips and diving spots.'
      }
    ]
  },
  {
    id: 'route-mnl-tagaytay',
    name: 'Manila to Tagaytay / Batangas Pier (SLEX & CALAX)',
    origin: 'Makati / SLEX Nichols',
    destination: 'Tagaytay Ridge / Batangas Port',
    distanceKm: 110,
    durationEst: '1 hr 50 mins',
    summaryAdvisory: 'Heavy 5G density along entire CALAX expressway and Tagaytay ridge. Smart and Globe perform exceptionally well for video streaming and live navigation.',
    path: [
      [14.5200, 121.0180], // Nichols
      [14.3312, 121.0825], // Santa Rosa Laguna
      [14.2465, 121.0100], // CALAX Silang
      [14.1153, 120.9621], // Tagaytay Ridge
      [13.7565, 121.0583]  // Batangas Port
    ],
    checkpoints: [
      {
        name: 'SLEX Santa Rosa & Nuvali Corridor',
        coordinates: [14.3312, 121.0825],
        kmMark: 38,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 5, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Blazing 5G speeds for all networks.'
      },
      {
        name: 'CALAX Silang Aguinaldo Exit',
        coordinates: [14.2465, 121.0100],
        kmMark: 52,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 4, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Smooth handover between cell towers.'
      },
      {
        name: 'Tagaytay Ridge (Taal View Highway)',
        coordinates: [14.1153, 120.9621],
        kmMark: 65,
        carrierStrength: { Smart: 5, Globe: 4, DITO: 4, GOMO: 4, TM: 4, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Strong Smart and Globe signals across coffee shops and hotels.'
      }
    ]
  },
  {
    id: 'route-edsa-carousel',
    name: 'Metro Manila EDSA Busway Carousel',
    origin: 'Monumento, Caloocan',
    destination: 'PITX (Parañaque Integrated Terminal Exchange)',
    distanceKm: 28,
    durationEst: '1 hr 10 mins',
    summaryAdvisory: '100% 5G signal across all 6 carriers along EDSA. DITO and Smart boast the lowest peak-hour congestion around Cubao and Ortigas.',
    path: [
      [14.6542, 120.9839], // Monumento
      [14.6575, 121.0332], // North Ave
      [14.6195, 121.0515], // Cubao
      [14.5872, 121.0568], // Ortigas / Megamall
      [14.5518, 121.0233], // Ayala / Makati
      [14.5125, 120.9922]  // PITX
    ],
    checkpoints: [
      {
        name: 'North Avenue MRT / TriNoma',
        coordinates: [14.6575, 121.0332],
        kmMark: 6,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 5, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Dense multi-carrier cell nodes.'
      },
      {
        name: 'Ortigas Center / SM Megamall',
        coordinates: [14.5872, 121.0568],
        kmMark: 15,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 5, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Peak hours: Smart and DITO experience lowest buffer lag.'
      },
      {
        name: 'Ayala Station / One Ayala Hub',
        coordinates: [14.5518, 121.0233],
        kmMark: 22,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 5, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'Underground/concourse repeaters active for all networks.'
      },
      {
        name: 'PITX Terminal Concourses',
        coordinates: [14.5125, 120.9922],
        kmMark: 28,
        carrierStrength: { Smart: 5, Globe: 5, DITO: 5, GOMO: 5, TM: 5, TNT: 5 },
        deadzoneCarriers: [],
        recommendation: 'High-speed 5G throughout boarding bays and waiting lounges.'
      }
    ]
  }
];
