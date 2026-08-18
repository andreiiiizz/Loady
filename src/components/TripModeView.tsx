import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { POPULAR_TRIP_ROUTES } from '../services/tripRoutes';
import {
  PH_POPULAR_LOCATIONS,
  resolveLocationCoords,
  generateCustomTripRoute,
  identifyClosestLocationName,
  loadSavedCustomRoutes,
  saveCustomRoute,
  deleteCustomRoute
} from '../services/tripPlannerEngine';
import { TripRoute, TelcoProvider } from '../types';
import {
  Navigation,
  AlertTriangle,
  CheckCircle,
  Compass,
  Crosshair,
  MapPin,
  ArrowUpDown,
  Sparkles,
  Bookmark,
  Trash2,
  Share2,
  Radio
} from 'lucide-react';

export const TripModeView: React.FC = () => {
  const [plannerTab, setPlannerTab] = useState<'custom' | 'popular' | 'saved'>('custom');
  const [selectedRouteId, setSelectedRouteId] = useState<string>(POPULAR_TRIP_ROUTES[0].id);

  // Custom Route inputs
  const [originInput, setOriginInput] = useState<string>('');
  const [destInput, setDestInput] = useState<string>('');
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'locked' | 'error'>('idle');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Custom route output
  const [customRoute, setCustomRoute] = useState<TripRoute | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [savedRoutes, setSavedRoutes] = useState<TripRoute[]>(loadSavedCustomRoutes());
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Suggestions dropdowns
  const [showOriginSuggestions, setShowOriginSuggestions] = useState<boolean>(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState<boolean>(false);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const mapLayersRef = useRef<L.LayerGroup | null>(null);

  // Determine current active route for display
  const currentRoute: TripRoute =
    plannerTab === 'custom' && customRoute
      ? customRoute
      : plannerTab === 'saved' && savedRoutes.find(r => r.id === selectedRouteId)
      ? savedRoutes.find(r => r.id === selectedRouteId)!
      : POPULAR_TRIP_ROUTES.find(r => r.id === selectedRouteId) || POPULAR_TRIP_ROUTES[0];

  // GPS Location Trigger
  const handleUseGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMsg('Geolocation is not supported on this browser.');
      return;
    }

    setGpsStatus('locating');
    setGpsErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude, accuracy } = position.coords;
        const coords: [number, number] = [latitude, longitude];
        const locationLabel = identifyClosestLocationName(coords);

        setOriginCoords(coords);
        setOriginInput(`📍 Current Location (${locationLabel})`);
        setGpsAccuracy(Math.round(accuracy));
        setGpsStatus('locked');
        setShowOriginSuggestions(false);
      },
      error => {
        setGpsStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setGpsErrorMsg('Location permission denied. Please allow location access or type your starting point.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsErrorMsg('GPS signal unavailable. Please type your starting point manually.');
        } else {
          setGpsErrorMsg('GPS request timed out. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  };

  // Swap Origin and Destination
  const handleSwapLocations = () => {
    const tempInput = originInput;
    const tempCoords = originCoords;
    setOriginInput(destInput);
    setOriginCoords(destCoords);
    setDestInput(tempInput);
    setDestCoords(tempCoords);
  };

  // Execute Route Analysis
  const handleAnalyzeCustomRoute = async () => {
    if (!originInput.trim() || !destInput.trim()) {
      alert('Please specify both a starting point and a destination.');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Resolve start coordinates
      let startPoint = originCoords;
      let startName = originInput.replace(/^📍\s*/, '');
      if (!startPoint) {
        const resolvedOrigin = await resolveLocationCoords(originInput);
        startPoint = resolvedOrigin.coords;
        startName = resolvedOrigin.name;
      }

      // Resolve destination coordinates
      let endPoint = destCoords;
      let endName = destInput;
      if (!endPoint) {
        const resolvedDest = await resolveLocationCoords(destInput);
        endPoint = resolvedDest.coords;
        endName = resolvedDest.name;
      }

      const generated = generateCustomTripRoute(startName, startPoint, endName, endPoint);
      setCustomRoute(generated);
      setSelectedRouteId(generated.id);

      // Save to history/saved
      saveCustomRoute(generated);
      setSavedRoutes(loadSavedCustomRoutes());
    } catch (err) {
      console.error('Failed to generate route:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Delete saved route
  const handleDeleteSavedRoute = (id: string) => {
    const updated = deleteCustomRoute(id);
    setSavedRoutes(updated);
    if (selectedRouteId === id) {
      if (updated.length > 0) {
        setSelectedRouteId(updated[0].id);
      } else {
        setPlannerTab('popular');
        setSelectedRouteId(POPULAR_TRIP_ROUTES[0].id);
      }
    }
  };

  // Copy share summary
  const handleShareRoute = () => {
    const text = `🚗 Trip Route Signal Advisory: ${currentRoute.name}\n📍 Distance: ${currentRoute.distanceKm} km (~${currentRoute.durationEst})\n📡 Intelligence: ${currentRoute.summaryAdvisory}\n⚡ Checked via Loady App`;
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2200);
  };

  // Setup Leaflet Interactive Map for current route
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([14.5995, 120.9842], 8);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
      mapLayersRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const layers = mapLayersRef.current;

    if (layers) {
      layers.clearLayers();

      if (currentRoute && currentRoute.path && currentRoute.path.length > 0) {
        // Draw route polyline with glowing outer line
        const polylineGlow = L.polyline(currentRoute.path, {
          color: '#a855f7',
          weight: 7,
          opacity: 0.45,
          lineCap: 'round',
          lineJoin: 'round'
        });
        const polylineCore = L.polyline(currentRoute.path, {
          color: '#ddb7ff',
          weight: 3,
          opacity: 0.95,
          dashArray: '6, 6'
        });

        layers.addLayer(polylineGlow);
        layers.addLayer(polylineCore);

        // Add Start Pin
        const startCoord = currentRoute.path[0];
        const isGpsStart = gpsStatus === 'locked' && plannerTab === 'custom';
        const startIcon = L.divIcon({
          className: 'custom-trip-marker',
          html: `<div style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: ${isGpsStart ? '#38bdf8' : '#4ade80'};
            border: 2px solid #ffffff;
            box-shadow: 0 0 14px ${isGpsStart ? 'rgba(56, 189, 248, 0.9)' : 'rgba(74, 222, 128, 0.9)'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: #000;
            font-weight: 800;
          ">A</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        const startMarker = L.marker(startCoord, { icon: startIcon }).bindPopup(
          `<strong>Starting Point:</strong><br/>${currentRoute.origin}`
        );
        layers.addLayer(startMarker);

        // Add Destination Pin
        const endCoord = currentRoute.path[currentRoute.path.length - 1];
        const endIcon = L.divIcon({
          className: 'custom-trip-marker',
          html: `<div style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #f472b6;
            border: 2px solid #ffffff;
            box-shadow: 0 0 14px rgba(244, 114, 182, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: #000;
            font-weight: 800;
          ">B</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        const endMarker = L.marker(endCoord, { icon: endIcon }).bindPopup(
          `<strong>Destination:</strong><br/>${currentRoute.destination}`
        );
        layers.addLayer(endMarker);

        // Add Checkpoint Markers along the way
        currentRoute.checkpoints.forEach((cp, idx) => {
          if (idx === 0 || idx === currentRoute.checkpoints.length - 1) return;
          const hasDeadzone = cp.deadzoneCarriers && cp.deadzoneCarriers.length > 0;
          const cpIcon = L.divIcon({
            className: 'custom-trip-cp-marker',
            html: `<div style="
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: ${hasDeadzone ? '#f43f5e' : '#a855f7'};
              border: 2px solid #ffffff;
              box-shadow: 0 0 10px ${hasDeadzone ? '#f43f5e' : '#a855f7'};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              color: #ffffff;
              font-weight: 700;
            ">${idx}</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          const cpMarker = L.marker(cp.coordinates, { icon: cpIcon }).bindPopup(
            `<strong>${cp.name}</strong><br/>KM ${cp.kmMark}<br/>Smart: ${cp.carrierStrength.Smart}/5 • Globe: ${cp.carrierStrength.Globe}/5 • DITO: ${cp.carrierStrength.DITO}/5`
          );
          layers.addLayer(cpMarker);
        });

        // Fit map bounds to encompass the entire route
        const bounds = L.latLngBounds(currentRoute.path);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    }
  }, [currentRoute, gpsStatus, plannerTab]);

  const getCarrierBarColor = (score: number) => {
    if (score >= 4) return 'var(--neon-lime)';
    if (score === 3) return 'var(--primary)';
    return 'var(--cyber-pink)';
  };

  // Filter suggestion list
  const originSuggestions = PH_POPULAR_LOCATIONS.filter(l =>
    originInput ? l.name.toLowerCase().includes(originInput.toLowerCase()) : true
  ).slice(0, 5);

  const destSuggestions = PH_POPULAR_LOCATIONS.filter(l =>
    destInput ? l.name.toLowerCase().includes(destInput.toLowerCase()) : true
  ).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Hero Header */}
      <div className="glass-panel glow-active" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary-container) 0%, var(--electric-purple) 100%)',
              boxShadow: 'var(--glow-active)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--on-primary-container)',
              flexShrink: 0
            }}>
              <Navigation size={20} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                Trip Mode: Route Coverage Advisor
              </h2>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                GPS DEADZONE & HIGHWAY SIGNAL PLANNER
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
          Plan your road trip or provincial commute. Set your starting point using your live GPS or custom address to detect cellular deadzones along expressways and mountain passes.
        </p>

        {/* Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          background: 'var(--surface-container-lowest)',
          padding: '0.3rem',
          borderRadius: 'var(--radius-lg)',
          marginTop: '1rem',
          border: '1px solid var(--glass-border)'
        }}>
          <button
            onClick={() => setPlannerTab('custom')}
            style={{
              flex: 1,
              padding: '0.5rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: plannerTab === 'custom' ? 'var(--primary-container)' : 'transparent',
              color: plannerTab === 'custom' ? '#ffffff' : 'var(--on-surface-variant)',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={14} /> Custom Route & GPS
          </button>

          <button
            onClick={() => setPlannerTab('popular')}
            style={{
              flex: 1,
              padding: '0.5rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: plannerTab === 'popular' ? 'var(--primary-container)' : 'transparent',
              color: plannerTab === 'popular' ? '#ffffff' : 'var(--on-surface-variant)',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Compass size={14} /> Popular Expressways
          </button>

          {savedRoutes.length > 0 && (
            <button
              onClick={() => setPlannerTab('saved')}
              style={{
                flex: 1,
                padding: '0.5rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: plannerTab === 'saved' ? 'var(--primary-container)' : 'transparent',
                color: plannerTab === 'saved' ? '#ffffff' : 'var(--on-surface-variant)',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Bookmark size={14} /> Saved ({savedRoutes.length})
            </button>
          )}
        </div>
      </div>

      {/* 1. CUSTOM ROUTE PLANNER VIEW */}
      {plannerTab === 'custom' && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <span className="font-label-caps" style={{ color: 'var(--primary)' }}>
              PLAN CUSTOM ROAD TRIP
            </span>
            <button
              onClick={handleSwapLocations}
              className="btn-icon"
              title="Swap Start and Destination"
              style={{
                background: 'var(--surface-container-high)',
                border: '1px solid var(--glass-border)',
                color: 'var(--on-surface-variant)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem'
              }}
            >
              <ArrowUpDown size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* STARTING POINT INPUT */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={13} color="var(--neon-lime)" /> Starting Point
                </label>

                {/* GPS Trigger Button */}
                <button
                  type="button"
                  onClick={handleUseGpsLocation}
                  disabled={gpsStatus === 'locating'}
                  style={{
                    background: gpsStatus === 'locked' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.15)',
                    border: gpsStatus === 'locked' ? '1px solid #38bdf8' : '1px solid var(--electric-purple)',
                    color: gpsStatus === 'locked' ? '#38bdf8' : 'var(--primary)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Crosshair size={12} className={gpsStatus === 'locating' ? 'animate-spin' : ''} />
                  {gpsStatus === 'locating'
                    ? 'Acquiring GPS...'
                    : gpsStatus === 'locked'
                    ? `GPS Locked (±${gpsAccuracy}m)`
                    : 'Use My GPS'}
                </button>
              </div>

              <input
                type="text"
                value={originInput}
                onChange={e => {
                  setOriginInput(e.target.value);
                  setOriginCoords(null);
                  setShowOriginSuggestions(true);
                  if (gpsStatus === 'locked') setGpsStatus('idle');
                }}
                onFocus={() => setShowOriginSuggestions(true)}
                placeholder="e.g. Current GPS, PITX, NAIA T3, Cubao..."
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-container-low)',
                  border: gpsStatus === 'locked' ? '1px solid #38bdf8' : '1px solid var(--glass-border)',
                  color: '#ffffff',
                  fontSize: '0.85rem'
                }}
              />

              {/* GPS Error notification */}
              {gpsStatus === 'error' && gpsErrorMsg && (
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--cyber-pink)',
                  marginTop: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <AlertTriangle size={12} /> {gpsErrorMsg}
                </div>
              )}

              {/* Suggestions Dropdown for Origin */}
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: 'var(--surface-container-high)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}
                >
                  {originSuggestions.map((sug, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setOriginInput(sug.name);
                        setOriginCoords(sug.coords);
                        setShowOriginSuggestions(false);
                      }}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderBottom: i < originSuggestions.length - 1 ? '1px solid var(--glass-border)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{sug.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)' }}>{sug.region}</div>
                      </div>
                      <span className="font-label-caps" style={{ fontSize: '0.62rem', color: 'var(--primary)' }}>
                        {sug.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Origin Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {[
                { label: '📍 GPS Location', action: handleUseGpsLocation },
                { label: '🚌 PITX', name: 'PITX (Parañaque Integrated Terminal Exchange)', coords: [14.5125, 120.9922] as [number, number] },
                { label: '✈️ NAIA T3', name: 'NAIA Terminal 3 (Pasay)', coords: [14.5204, 121.0194] as [number, number] },
                { label: '🏙️ BGC', name: 'BGC (Bonifacio High Street)', coords: [14.5516, 121.0510] as [number, number] },
                { label: '⚓ Batangas Port', name: 'Batangas Port Passenger Terminal', coords: [13.7565, 121.0435] as [number, number] }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (chip.action) {
                      chip.action();
                    } else if (chip.name && chip.coords) {
                      setOriginInput(chip.name);
                      setOriginCoords(chip.coords);
                      setShowOriginSuggestions(false);
                    }
                  }}
                  style={{
                    background: 'var(--surface-container-highest)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.68rem',
                    color: 'var(--on-surface-variant)',
                    cursor: 'pointer'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* DESTINATION INPUT */}
            <div style={{ position: 'relative', marginTop: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                <MapPin size={13} color="var(--cyber-pink)" /> Destination
              </label>

              <input
                type="text"
                value={destInput}
                onChange={e => {
                  setDestInput(e.target.value);
                  setDestCoords(null);
                  setShowDestSuggestions(true);
                }}
                onFocus={() => setShowDestSuggestions(true)}
                placeholder="e.g. Baguio City, Tagaytay, Batangas Port, La Union..."
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--glass-border)',
                  color: '#ffffff',
                  fontSize: '0.85rem'
                }}
              />

              {/* Suggestions Dropdown for Destination */}
              {showDestSuggestions && destSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: 'var(--surface-container-high)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}
                >
                  {destSuggestions.map((sug, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setDestInput(sug.name);
                        setDestCoords(sug.coords);
                        setShowDestSuggestions(false);
                      }}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderBottom: i < destSuggestions.length - 1 ? '1px solid var(--glass-border)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{sug.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)' }}>{sug.region}</div>
                      </div>
                      <span className="font-label-caps" style={{ fontSize: '0.62rem', color: 'var(--secondary)' }}>
                        {sug.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Destination Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {[
                { label: '🏔️ Baguio', name: 'Baguio City (Burnham Park)', coords: [16.4124, 120.5980] as [number, number] },
                { label: '🌋 Tagaytay', name: 'Tagaytay Ridge (Taal View)', coords: [14.1153, 120.9621] as [number, number] },
                { label: '🏄 La Union', name: 'San Juan Surf Town', coords: [16.6664, 120.3204] as [number, number] },
                { label: '🏖️ Moalboal', name: 'Panagsama Beach, Moalboal', coords: [9.9575, 123.3664] as [number, number] },
                { label: '🌴 Baler', name: 'Baler (Sabang Beach)', coords: [15.7606, 121.5644] as [number, number] }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDestInput(chip.name);
                    setDestCoords(chip.coords);
                    setShowDestSuggestions(false);
                  }}
                  style={{
                    background: 'var(--surface-container-highest)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.68rem',
                    color: 'var(--on-surface-variant)',
                    cursor: 'pointer'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyzeCustomRoute}
              disabled={isAnalyzing || !originInput.trim() || !destInput.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer'
              }}
            >
              <Radio size={16} className={isAnalyzing ? 'animate-pulse' : ''} />
              {isAnalyzing ? 'Analyzing Cell Towers & Terrain...' : '⚡ Generate Signal & Deadzone Forecast'}
            </button>
          </div>
        </div>
      )}

      {/* 2. POPULAR PRESET ROUTES LIST */}
      {plannerTab === 'popular' && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <label className="font-label-caps" style={{ color: 'var(--primary)', marginBottom: '0.75rem', display: 'block' }}>
            SELECT POPULAR EXPRESSWAY ROUTE:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {POPULAR_TRIP_ROUTES.map(route => {
              const isSelected = route.id === selectedRouteId;
              return (
                <button
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  style={{
                    background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--surface-container-low)',
                    border: isSelected ? '1px solid var(--electric-purple)' : '1px solid var(--glass-border)',
                    boxShadow: isSelected ? 'var(--glow-active)' : 'none',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : '#ffffff' }}>
                      {route.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                      {route.distanceKm} km • Est. {route.durationEst}
                    </div>
                  </div>
                  {isSelected && <CheckCircle size={18} color="var(--primary)" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SAVED CUSTOM ROUTES */}
      {plannerTab === 'saved' && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <label className="font-label-caps" style={{ color: 'var(--primary)', marginBottom: '0.75rem', display: 'block' }}>
            YOUR SAVED ROAD TRIPS:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {savedRoutes.map(route => {
              const isSelected = route.id === selectedRouteId;
              return (
                <div
                  key={route.id}
                  style={{
                    background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--surface-container-low)',
                    border: isSelected ? '1px solid var(--electric-purple)' : '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div
                    onClick={() => setSelectedRouteId(route.id)}
                    style={{ flex: 1, cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : '#ffffff' }}>
                      {route.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                      {route.distanceKm} km • Est. {route.durationEst}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isSelected && <CheckCircle size={18} color="var(--primary)" />}
                    <button
                      onClick={() => handleDeleteSavedRoute(route.id)}
                      className="btn-icon"
                      title="Delete trip"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--on-surface-variant)',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LEAFLET INTERACTIVE ROUTE MAP */}
      <div className="glass-panel" style={{ padding: '1rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <MapPin size={16} color="var(--electric-purple)" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
              Interactive Route Signal Radar
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleShareRoute}
              className="btn-icon"
              style={{
                background: 'var(--surface-container-high)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.3rem 0.55rem',
                fontSize: '0.7rem',
                color: copyFeedback ? 'var(--neon-lime)' : 'var(--on-surface-variant)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              {copyFeedback ? <CheckCircle size={13} /> : <Share2 size={13} />}
              {copyFeedback ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>

        {/* Leaflet Map Box */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '240px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            background: '#0b0e17'
          }}
        />

        {/* Map Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} /> Origin
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f472b6' }} /> Destination
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} /> Checkpoint
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} /> Deadzone Risk
          </span>
        </div>
      </div>

      {/* TRIP STATS & ADVISORY ALERT BANNER */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        borderColor: 'rgba(221, 183, 255, 0.3)'
      }}>
        <Compass size={24} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
              {currentRoute.name}
            </div>
            <span className="font-label-caps" style={{
              background: 'rgba(168, 85, 247, 0.2)',
              color: 'var(--primary)',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)'
            }}>
              {currentRoute.distanceKm} KM • {currentRoute.durationEst}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '0.45rem', lineHeight: 1.45 }}>
            {currentRoute.summaryAdvisory}
          </p>
        </div>
      </div>

      {/* ROUTE CHECKPOINTS BREAKDOWN */}
      <div className="glass-panel" style={{ padding: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
            Signal Strength by Checkpoint ({currentRoute.checkpoints.length} Zones)
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
            Carrier Ratings / 5
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {currentRoute.checkpoints.map((cp, idx) => {
            const hasDeadzone = cp.deadzoneCarriers && cp.deadzoneCarriers.length > 0;

            return (
              <div
                key={idx}
                style={{
                  background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  border: hasDeadzone ? '1px solid rgba(244, 114, 182, 0.35)' : '1px solid var(--glass-border)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className="font-label-caps" style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--primary)'
                      }}>
                        KM {cp.kmMark}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff' }}>
                        {cp.name}
                      </span>
                    </div>
                  </div>

                  {hasDeadzone && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--cyber-pink)',
                      background: 'rgba(244, 114, 182, 0.15)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      <AlertTriangle size={11} /> {cp.deadzoneCarriers.join(', ')} Deadzone
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.55rem', margin: '0.85rem 0' }}>
                  {(['Smart', 'Globe', 'DITO'] as TelcoProvider[]).map(telco => {
                    const score = cp.carrierStrength[telco] || 3;
                    const color = getCarrierBarColor(score);
                    return (
                      <div key={telco} style={{ background: 'var(--surface-container-highest)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600 }}>{telco}</span>
                          <span style={{ fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{score}/5</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${(score / 5) * 100}%`,
                            height: '100%',
                            backgroundColor: color,
                            borderRadius: '2px'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                  💡 <span style={{ fontWeight: 500 }}>{cp.recommendation}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
