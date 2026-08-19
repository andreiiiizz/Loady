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
  ArrowUpDown,
  Sparkles,
  Bookmark,
  Trash2,
  Share2,
  Radio,
  Play,
  Pause,
  FastForward,
  ShieldAlert
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

  // Live Drive Simulation state (Google Maps Route Preview)
  const [isDriving, setIsDriving] = useState<boolean>(false);
  const [driveProgressIndex, setDriveProgressIndex] = useState<number>(0);
  const [driveSpeedMultiplier, setDriveSpeedMultiplier] = useState<number>(1);
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState<number>(0);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const mapLayersRef = useRef<L.LayerGroup | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const driveIntervalRef = useRef<number | null>(null);

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

  // Execute Route Analysis via real OSRM engine
  const handleAnalyzeCustomRoute = async () => {
    if (!originInput.trim() || !destInput.trim()) {
      alert('Please specify both a starting point and a destination.');
      return;
    }

    setIsAnalyzing(true);
    // Stop any ongoing drive preview
    handleStopDrive();

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

      const generated = await generateCustomTripRoute(startName, startPoint, endName, endPoint);
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

  // Fly map camera to a specific checkpoint
  const handleFlyToCheckpoint = (coords: [number, number], index: number) => {
    setActiveCheckpointIndex(index);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coords, 12, {
        duration: 1.2
      });
    }
  };

  // Live Drive Simulation Controls
  const handleToggleDrive = () => {
    if (isDriving) {
      setIsDriving(false);
      if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    } else {
      setIsDriving(true);
    }
  };

  const handleStopDrive = () => {
    setIsDriving(false);
    setDriveProgressIndex(0);
    if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    if (carMarkerRef.current && mapLayersRef.current) {
      mapLayersRef.current.removeLayer(carMarkerRef.current);
      carMarkerRef.current = null;
    }
    // Fit back to full route bounds
    if (mapInstanceRef.current && currentRoute.path.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(currentRoute.path), { padding: [40, 40] });
    }
  };

  // Drive animation effect
  useEffect(() => {
    if (!isDriving || !currentRoute.path || currentRoute.path.length === 0) {
      if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
      return;
    }

    const intervalTime = Math.max(100, 250 / driveSpeedMultiplier);
    driveIntervalRef.current = window.setInterval(() => {
      setDriveProgressIndex(prev => {
        const next = prev + 1;
        if (next >= currentRoute.path.length) {
          setIsDriving(false);
          return currentRoute.path.length - 1;
        }

        const currentCoord = currentRoute.path[next];
        // Pan map smoothly to follow vehicle
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(currentCoord, { animate: true, duration: 0.25 });
        }

        // Update car marker
        if (mapLayersRef.current) {
          if (!carMarkerRef.current) {
            const carIcon = L.divIcon({
              className: 'live-car-marker',
              html: `<div style="
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #38bdf8, #3b82f6);
                border: 2px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 20px #38bdf8;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
              ">🚗</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
            carMarkerRef.current = L.marker(currentCoord, { icon: carIcon });
            mapLayersRef.current.addLayer(carMarkerRef.current);
          } else {
            carMarkerRef.current.setLatLng(currentCoord);
          }
        }

        return next;
      });
    }, intervalTime);

    return () => {
      if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    };
  }, [isDriving, driveSpeedMultiplier, currentRoute]);

  // Setup Leaflet Interactive Map for current route
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([14.5995, 120.9842], 8);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
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
      carMarkerRef.current = null;

      if (currentRoute && currentRoute.path && currentRoute.path.length > 0) {
        // 1. Google Maps-Style Highway Polyline (Outer glowing border + vibrant highway core)
        const polylineGlow = L.polyline(currentRoute.path, {
          color: '#1e40af', // Deep highway blue casing
          weight: 8,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round'
        });
        const polylineCore = L.polyline(currentRoute.path, {
          color: '#38bdf8', // Vibrant Google Maps navigation blue
          weight: 4.5,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        });

        layers.addLayer(polylineGlow);
        layers.addLayer(polylineCore);

        // 2. Start Marker (Green "A" Pin)
        const startCoord = currentRoute.path[0];
        const startIcon = L.divIcon({
          className: 'google-start-pin',
          html: `<div style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #22c55e;
            border: 2px solid #ffffff;
            box-shadow: 0 0 16px rgba(34, 197, 94, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            font-family: sans-serif;
          ">A</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        const startMarker = L.marker(startCoord, { icon: startIcon }).bindPopup(
          `<div style="font-size: 12px; color: #111827;"><strong>🟢 Starting Point:</strong><br/>${currentRoute.origin}</div>`
        );
        layers.addLayer(startMarker);

        // 3. Destination Marker (Red "B" Pin)
        const endCoord = currentRoute.path[currentRoute.path.length - 1];
        const endIcon = L.divIcon({
          className: 'google-dest-pin',
          html: `<div style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: #ef4444;
            border: 2px solid #ffffff;
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            font-family: sans-serif;
          ">B</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        const endMarker = L.marker(endCoord, { icon: endIcon }).bindPopup(
          `<div style="font-size: 12px; color: #111827;"><strong>🔴 Destination:</strong><br/>${currentRoute.destination}</div>`
        );
        layers.addLayer(endMarker);

        // 4. Deadzone Hazard Alert Pins & Checkpoint Milestones
        currentRoute.checkpoints.forEach((cp, idx) => {
          if (idx === 0 || idx === currentRoute.checkpoints.length - 1) return;
          const hasDeadzone = cp.deadzoneCarriers && cp.deadzoneCarriers.length > 0;

          if (hasDeadzone) {
            const hazardIcon = L.divIcon({
              className: 'deadzone-hazard-pin',
              html: `<div style="
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: #f43f5e;
                border: 2px solid #ffffff;
                box-shadow: 0 0 16px rgba(244, 63, 94, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-size: 11px;
                animation: pulse 1.8s infinite;
              ">⚠️</div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            const hazardMarker = L.marker(cp.coordinates, { icon: hazardIcon }).bindPopup(
              `<div style="font-size: 12px; color: #111827; min-width: 170px;">
                <strong style="color: #e11d48;">⚠️ ${cp.name} (KM ${cp.kmMark})</strong><br/>
                <span style="font-size: 11px; color: #4b5563;">Potential ${cp.deadzoneCarriers.join(' & ')} dropzone.</span><br/>
                <div style="margin-top: 4px; font-weight: 600;">
                  Smart: ${cp.carrierStrength.Smart}/5 • Globe: ${cp.carrierStrength.Globe}/5 • DITO: ${cp.carrierStrength.DITO}/5
                </div>
              </div>`
            );
            layers.addLayer(hazardMarker);
          } else {
            const cpIcon = L.divIcon({
              className: 'custom-trip-cp-marker',
              html: `<div style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #a855f7;
                border: 2px solid #ffffff;
                box-shadow: 0 0 10px #a855f7;
              "></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
            const cpMarker = L.marker(cp.coordinates, { icon: cpIcon }).bindPopup(
              `<div style="font-size: 12px; color: #111827;">
                <strong>${cp.name} (KM ${cp.kmMark})</strong><br/>
                Smart: ${cp.carrierStrength.Smart}/5 • Globe: ${cp.carrierStrength.Globe}/5 • DITO: ${cp.carrierStrength.DITO}/5
              </div>`
            );
            layers.addLayer(cpMarker);
          }
        });

        // Fit map bounds to encompass the entire route
        const bounds = L.latLngBounds(currentRoute.path);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  }, [currentRoute]);

  const getCarrierBarColor = (score: number) => {
    if (score >= 4) return 'var(--neon-lime)';
    if (score === 3) return 'var(--primary)';
    return '#f43f5e';
  };

  // Filter suggestion list
  const originSuggestions = PH_POPULAR_LOCATIONS.filter(l =>
    originInput ? l.name.toLowerCase().includes(originInput.toLowerCase()) : true
  ).slice(0, 5);

  const destSuggestions = PH_POPULAR_LOCATIONS.filter(l =>
    destInput ? l.name.toLowerCase().includes(destInput.toLowerCase()) : true
  ).slice(0, 5);

  // Compute live vehicle progress during simulation
  const progressPercent = currentRoute.path.length > 0 
    ? Math.min(100, Math.round((driveProgressIndex / (currentRoute.path.length - 1)) * 100))
    : 0;
  const currentKmSimulated = Math.round((progressPercent / 100) * currentRoute.distanceKm);
  const currentSimCheckpoint = currentRoute.checkpoints.find(c => Math.abs(c.kmMark - currentKmSimulated) <= 25) || currentRoute.checkpoints[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 🚀 GOOGLE MAPS TRIP PLANNER HEADER */}
      <div className="glass-panel" style={{
        padding: 'clamp(1rem, 3.5vw, 1.4rem)',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(20, 24, 33, 0.98) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0
            }}>
              <Navigation size={20} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                Trip Signal Navigator
              </h2>
              <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                GOOGLE MAPS-POWERED SIGNAL & DEADZONE FORECAST
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', lineHeight: 1.45, margin: 0 }}>
          Real highway routing across the Philippines. Forecast where Smart, Globe, and DITO will have high-speed 5G vs cellular deadzones before you drive.
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
            onClick={() => {
              setPlannerTab('custom');
              handleStopDrive();
            }}
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
            onClick={() => {
              setPlannerTab('popular');
              handleStopDrive();
            }}
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
            <Compass size={14} /> Expressways
          </button>

          {savedRoutes.length > 0 && (
            <button
              onClick={() => {
                setPlannerTab('saved');
                handleStopDrive();
              }}
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

      {/* 1. CUSTOM ROUTE PLANNER VIEW (Google Maps style inputs) */}
      {plannerTab === 'custom' && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <span className="font-label-caps" style={{ color: '#38bdf8' }}>
              PLAN NEW ROAD TRIP
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
            
            {/* STARTING POINT INPUT (A) */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#22c55e', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>A</span>
                  Starting Point (Origin)
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
                placeholder="e.g. Current GPS, PITX, NAIA T3, Cubao, Manila..."
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

              {gpsStatus === 'error' && gpsErrorMsg && (
                <div style={{ color: '#f87171', fontSize: '0.72rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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

            {/* DESTINATION INPUT (B) */}
            <div style={{ position: 'relative', marginTop: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>B</span>
                Destination
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
                placeholder="e.g. Baguio City, Tagaytay, Batangas Port, La Union, Moalboal..."
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

            {/* Generate Button */}
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
              {isAnalyzing ? 'Routing via OSRM Highway Engine...' : '⚡ Generate Road Trip Signal Forecast'}
            </button>
          </div>
        </div>
      )}

      {/* 2. POPULAR PRESET ROUTES LIST */}
      {plannerTab === 'popular' && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <label className="font-label-caps" style={{ color: '#38bdf8', marginBottom: '0.75rem', display: 'block' }}>
            SELECT POPULAR EXPRESSWAY ROUTE:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {POPULAR_TRIP_ROUTES.map(route => {
              const isSelected = route.id === selectedRouteId;
              return (
                <button
                  key={route.id}
                  onClick={() => {
                    setSelectedRouteId(route.id);
                    handleStopDrive();
                  }}
                  style={{
                    background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface-container-low)',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid var(--glass-border)',
                    boxShadow: isSelected ? '0 0 15px rgba(56, 189, 248, 0.25)' : 'none',
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
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#38bdf8' : '#ffffff' }}>
                      {route.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                      {route.distanceKm} km • Est. {route.durationEst}
                    </div>
                  </div>
                  {isSelected && <CheckCircle size={18} color="#38bdf8" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SAVED CUSTOM ROUTES */}
      {plannerTab === 'saved' && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <label className="font-label-caps" style={{ color: '#38bdf8', marginBottom: '0.75rem', display: 'block' }}>
            YOUR SAVED ROAD TRIPS:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {savedRoutes.map(route => {
              const isSelected = route.id === selectedRouteId;
              return (
                <div
                  key={route.id}
                  style={{
                    background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface-container-low)',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div
                    onClick={() => {
                      setSelectedRouteId(route.id);
                      handleStopDrive();
                    }}
                    style={{ flex: 1, cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#38bdf8' : '#ffffff' }}>
                      {route.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                      {route.distanceKm} km • Est. {route.durationEst}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isSelected && <CheckCircle size={18} color="#38bdf8" />}
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

      {/* 🗺️ GOOGLE MAPS TRIP OVERVIEW & INTERACTIVE MAP */}
      <div className="glass-panel" style={{ padding: '1rem', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        
        {/* Navigation Summary Bar (Google Maps style) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.85rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {currentRoute.durationEst}
              </span>
              <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.82rem' }}>
                ({currentRoute.distanceKm} km)
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--neon-lime)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle size={12} /> Fastest route via real-world highway network
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {/* Drive Preview Trigger */}
            <button
              onClick={handleToggleDrive}
              className="btn btn-sm"
              style={{
                background: isDriving ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #0284c7, #38bdf8)',
                color: isDriving ? '#f87171' : '#ffffff',
                border: isDriving ? '1px solid #ef4444' : 'none',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.35rem 0.75rem'
              }}
            >
              {isDriving ? <Pause size={13} /> : <Play size={13} />}
              {isDriving ? 'Pause Preview' : '🚗 Drive Preview'}
            </button>

            {isDriving && (
              <button
                onClick={() => setDriveSpeedMultiplier(prev => (prev === 1 ? 2 : prev === 2 ? 4 : 1))}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.7rem', padding: '0.35rem 0.55rem' }}
                title="Change drive simulation speed"
              >
                <FastForward size={12} /> {driveSpeedMultiplier}x
              </button>
            )}

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

        {/* Live Drive HUD Overlay (when driving simulation is active) */}
        {isDriving && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #38bdf8',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem 1rem',
            marginBottom: '0.85rem',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.2)',
                border: '1px solid #38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px'
              }}>
                🚗
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  KM {currentKmSimulated} / {currentRoute.distanceKm} KM ({progressPercent}%)
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>
                  Near: {currentSimCheckpoint.name}
                </div>
              </div>
            </div>

            {/* Live Telemetry Bars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {(['Smart', 'Globe', 'DITO'] as TelcoProvider[]).map(t => {
                const s = currentSimCheckpoint.carrierStrength[t] || 3;
                const col = getCarrierBarColor(s);
                return (
                  <div key={t} style={{ background: 'rgba(255,255,255,0.06)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', minWidth: '45px' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--on-surface-variant)' }}>{t}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: col, fontFamily: 'var(--font-mono)' }}>{s}/5</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaflet Map Box */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '280px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            background: '#0b0e17'
          }}
        />

        {/* Map Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} /> Origin (A)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} /> Destination (B)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }} /> Real Highway Route
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }} /> Deadzone Hazard
          </span>
        </div>
      </div>

      {/* TRIP ADVISORY ALERT BANNER */}
      <div className="glass-panel" style={{
        padding: '1.15rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(20, 24, 33, 0.95) 100%)'
      }}>
        <ShieldAlert size={22} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
              {currentRoute.name}
            </div>
            <span className="font-label-caps" style={{
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '10px'
            }}>
              {currentRoute.distanceKm} KM • {currentRoute.durationEst}
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--on-surface-variant)', marginTop: '0.35rem', lineHeight: 1.45, margin: 0 }}>
            {currentRoute.summaryAdvisory}
          </p>
        </div>
      </div>

      {/* 🧭 GOOGLE MAPS-STYLE TURN-BY-TURN CORRIDOR CHECKPOINTS */}
      <div className="glass-panel" style={{ padding: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
            Turn-by-Turn Signal Forecast ({currentRoute.checkpoints.length} Corridors)
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
            Tap milestone to fly map
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {currentRoute.checkpoints.map((cp, idx) => {
            const hasDeadzone = cp.deadzoneCarriers && cp.deadzoneCarriers.length > 0;
            const isOrigin = idx === 0;
            const isDest = idx === currentRoute.checkpoints.length - 1;

            return (
              <div
                key={idx}
                onClick={() => handleFlyToCheckpoint(cp.coordinates, idx)}
                style={{
                  background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  border: hasDeadzone 
                    ? '1px solid rgba(244, 63, 94, 0.4)' 
                    : activeCheckpointIndex === idx 
                    ? '1px solid #38bdf8' 
                    : '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isOrigin ? '#22c55e' : isDest ? '#ef4444' : hasDeadzone ? '#f43f5e' : '#38bdf8',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {isOrigin ? 'A' : isDest ? 'B' : idx}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className="font-label-caps" style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          padding: '0.12rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          color: '#38bdf8',
                          fontSize: '10px'
                        }}>
                          KM {cp.kmMark}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff' }}>
                          {cp.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {hasDeadzone && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#f87171',
                      background: 'rgba(239, 68, 68, 0.18)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
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

                {/* Carrier Signal Gauge Bars */}
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

                <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
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
