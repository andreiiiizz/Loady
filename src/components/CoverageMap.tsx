import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CoverageReport } from '../types';
import { Plus, Navigation2, Star, Zap, ThumbsUp, MapPin, Radio } from 'lucide-react';

interface CoverageMapProps {
  reports: CoverageReport[];
  onOpenReportModal: () => void;
  onUpvoteReport: (reportId: string) => void;
}

const REGION_JUMPS = [
  { name: 'Batangas', coords: [13.8500, 121.0500] as [number, number], zoom: 10 },
  { name: 'Metro Manila', coords: [14.5995, 121.0364] as [number, number], zoom: 11 },
  { name: 'Baguio', coords: [16.4023, 120.5960] as [number, number], zoom: 12 },
  { name: 'Cebu', coords: [10.3157, 123.8854] as [number, number], zoom: 11 },
  { name: 'Davao', coords: [7.0731, 125.6128] as [number, number], zoom: 11 }
];

// Helper to determine Storm Radar Color & Intensity Tier
function getSignalRadarStyle(report: CoverageReport) {
  const speed = report.speedMbps || 0;
  const rating = report.signalRating;

  // 1. Heavy Intensity Red (Strong 5G / High Speed / 5 Stars)
  if (report.networkType === '5G' || speed >= 120 || rating === 5) {
    return {
      tier: 'Heavy',
      colorName: 'Red (Strong Signal)',
      coreColor: '#ef4444',
      glowShadow: '0 0 25px rgba(239, 68, 68, 0.85)',
      gradientBg: 'radial-gradient(circle, rgba(239, 68, 68, 0.85) 0%, rgba(249, 115, 22, 0.55) 45%, rgba(234, 179, 8, 0.25) 75%, transparent 100%)',
      animation: 'radarPulseRed 2.2s infinite ease-in-out',
      size: 58
    };
  }

  // 2. Moderate Intensity Orange (4G LTE / 50-119 Mbps / 4 Stars)
  if (report.networkType === '4G/LTE' && (speed >= 40 || rating === 4)) {
    return {
      tier: 'Moderate',
      colorName: 'Orange (Good Signal)',
      coreColor: '#f97316',
      glowShadow: '0 0 20px rgba(249, 115, 22, 0.75)',
      gradientBg: 'radial-gradient(circle, rgba(249, 115, 22, 0.8) 0%, rgba(234, 179, 8, 0.45) 55%, transparent 100%)',
      animation: 'radarPulseOrange 2.5s infinite ease-in-out',
      size: 48
    };
  }

  // 3. Weak / Fringe Intensity Yellow (3G/2G / <40 Mbps / 1-3 Stars)
  if (report.networkType !== 'Deadzone' && (rating <= 3 || speed < 40)) {
    return {
      tier: 'Weak',
      colorName: 'Yellow (Weak Signal)',
      coreColor: '#eab308',
      glowShadow: '0 0 16px rgba(234, 179, 8, 0.65)',
      gradientBg: 'radial-gradient(circle, rgba(234, 179, 8, 0.75) 0%, rgba(163, 230, 53, 0.3) 60%, transparent 100%)',
      animation: 'radarPulseYellow 2.8s infinite ease-in-out',
      size: 40
    };
  }

  // 4. Deadzone
  return {
    tier: 'Deadzone',
    colorName: 'Gray/Pink (Deadzone)',
    coreColor: '#f472b6',
    glowShadow: '0 0 14px rgba(244, 114, 182, 0.6)',
    gradientBg: 'radial-gradient(circle, rgba(244, 114, 182, 0.7) 0%, rgba(100, 116, 139, 0.25) 60%, transparent 100%)',
    animation: 'none',
    size: 34
  };
}

export const CoverageMap: React.FC<CoverageMapProps> = ({
  reports,
  onOpenReportModal,
  onUpvoteReport
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedTelco, setSelectedTelco] = useState<string>('ALL');
  const [selectedNetworkType, setSelectedNetworkType] = useState<string>('ALL');
  const [activeRegion, setActiveRegion] = useState<string>('Batangas');
  const [activeReport, setActiveReport] = useState<CoverageReport | null>(null);

  // Filter reports
  const filteredReports = reports.filter(r => {
    const matchesTelco = selectedTelco === 'ALL' || r.telco === selectedTelco;
    const matchesNet = selectedNetworkType === 'ALL' || r.networkType.includes(selectedNetworkType);
    return matchesTelco && matchesNet;
  });

  // Initialize Map with Dark Radar tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [13.8500, 121.0500],
        zoom: 10,
        zoomControl: false,
        attributionControl: false
      });

      // Dark Radar Tiles for high-contrast storm heatmap visibility
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }
  }, []);

  // Update Storm Doppler Radar Heat Blobs on filteredReports or activeReport change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredReports.forEach(report => {
      const radar = getSignalRadarStyle(report);
      const isSelected = activeReport?.id === report.id;

      // Define geographic radii in meters and translucent opacities
      let outerRadius = 1500;
      let innerRadius = 600;
      let outerOpacity = isSelected ? 0.38 : 0.14;
      let innerOpacity = isSelected ? 0.70 : 0.32;

      if (report.networkType === '5G' || (report.speedMbps && report.speedMbps >= 120) || report.signalRating === 5) {
        outerRadius = 2000;
        innerRadius = 750;
        outerOpacity = isSelected ? 0.42 : 0.18;
        innerOpacity = isSelected ? 0.75 : 0.38;
      } else if (report.networkType === '4G/LTE' || (report.speedMbps && report.speedMbps >= 40) || report.signalRating === 4) {
        outerRadius = 1500;
        innerRadius = 550;
        outerOpacity = isSelected ? 0.38 : 0.14;
        innerOpacity = isSelected ? 0.68 : 0.32;
      } else if (report.networkType !== 'Deadzone') {
        outerRadius = 1100;
        innerRadius = 400;
        outerOpacity = isSelected ? 0.35 : 0.12;
        innerOpacity = isSelected ? 0.65 : 0.28;
      } else {
        // Deadzone
        outerRadius = 800;
        innerRadius = 300;
        outerOpacity = isSelected ? 0.40 : 0.16;
        innerOpacity = isSelected ? 0.72 : 0.35;
      }

      // Outer Heatmap Aura (soft translucent radar wash, no outline)
      const outerCircle = L.circle(report.coordinates, {
        radius: outerRadius,
        stroke: false,
        fillColor: radar.coreColor,
        fillOpacity: outerOpacity,
        interactive: true,
        className: `coverage-radar-aura ${isSelected ? 'selected' : ''}`
      });

      // Inner Core Heat Blob (illuminates when selected, no outline)
      const innerCircle = L.circle(report.coordinates, {
        radius: innerRadius,
        stroke: false,
        fillColor: radar.coreColor,
        fillOpacity: innerOpacity,
        interactive: true,
        className: `coverage-radar-core ${isSelected ? 'selected' : ''}`
      });

      outerCircle.on('click', () => setActiveReport(report));
      innerCircle.on('click', () => setActiveReport(report));

      markersLayerRef.current?.addLayer(outerCircle);
      markersLayerRef.current?.addLayer(innerCircle);
    });
  }, [filteredReports, activeReport]);

  const handleLocateMe = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          mapInstanceRef.current?.flyTo([lat, lng], 14, { duration: 1.5 });

          const pulseIcon = L.divIcon({
            className: 'user-loc-pulse',
            html: `<div style="width: 20px; height: 20px; border-radius: 50%; background: radial-gradient(circle, #38bdf8 0%, rgba(56, 189, 248, 0.4) 60%, transparent 100%); filter: blur(2px); box-shadow: 0 0 16px #38bdf8;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          L.marker([lat, lng], { icon: pulseIcon }).addTo(mapInstanceRef.current!);
        },
        () => {
          mapInstanceRef.current?.flyTo([13.8500, 121.0500], 10);
        }
      );
    }
  };

  const handleJumpRegion = (region: typeof REGION_JUMPS[0]) => {
    setActiveRegion(region.name);
    mapInstanceRef.current?.flyTo(region.coords, region.zoom, { duration: 1.2 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', position: 'relative' }}>
      {/* Quick Region Jump Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        overflowX: 'auto',
        paddingBottom: '0.1rem',
        scrollbarWidth: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, paddingRight: '0.2rem' }}>
          <MapPin size={13} /> RADAR REGION:
        </div>
        {REGION_JUMPS.map(reg => (
          <button
            key={reg.name}
            onClick={() => handleJumpRegion(reg)}
            className="btn btn-sm"
            style={{
              background: activeRegion === reg.name ? 'rgba(168, 85, 247, 0.25)' : 'var(--surface-container-low)',
              color: activeRegion === reg.name ? '#ffffff' : 'var(--on-surface-variant)',
              border: activeRegion === reg.name ? '1px solid var(--electric-purple)' : '1px solid var(--glass-border)',
              boxShadow: activeRegion === reg.name ? 'var(--glow-active)' : 'none',
              fontWeight: 700,
              fontSize: 'clamp(0.66rem, 2.2vw, 0.72rem)',
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-full)',
              flexShrink: 0
            }}
          >
            {reg.name}
          </button>
        ))}
      </div>

      {/* Carrier & Network Tier Filter Chips */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        overflowX: 'auto',
        paddingBottom: '0.15rem',
        scrollbarWidth: 'none'
      }}>
        {['ALL', 'Smart', 'Globe', 'DITO', 'GOMO'].map(telco => (
          <button
            key={telco}
            onClick={() => setSelectedTelco(telco)}
            className="btn btn-sm"
            style={{
              background: selectedTelco === telco ? 'var(--primary-container)' : 'var(--glass-surface)',
              color: selectedTelco === telco ? 'var(--on-primary-container)' : 'var(--on-surface)',
              border: selectedTelco === telco ? '1px solid var(--electric-purple)' : '1px solid var(--glass-border)',
              boxShadow: selectedTelco === telco ? 'var(--glow-active)' : 'none',
              fontWeight: 700,
              fontSize: 'clamp(0.68rem, 2.2vw, 0.72rem)',
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-full)'
            }}
          >
            {telco}
          </button>
        ))}

        <div style={{ width: '1px', height: '16px', background: 'var(--glass-border)', margin: '0 0.15rem' }} />

        {['ALL', '5G', '4G'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedNetworkType(type)}
            className="btn btn-sm"
            style={{
              background: selectedNetworkType === type ? 'var(--neon-lime)' : 'var(--glass-surface)',
              color: selectedNetworkType === type ? '#022c22' : 'var(--on-surface)',
              border: selectedNetworkType === type ? '1px solid var(--neon-lime)' : '1px solid var(--glass-border)',
              boxShadow: selectedNetworkType === type ? 'var(--glow-success)' : 'none',
              fontWeight: 700,
              fontSize: 'clamp(0.68rem, 2.2vw, 0.72rem)',
              padding: '0.25rem 0.55rem',
              borderRadius: 'var(--radius-full)'
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Map Viewport Container */}
      <div
        className="glass-panel"
        style={{
          height: 'clamp(320px, 50vh, 420px)',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Storm Radar Intensity Legend Bar */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 400,
          background: 'rgba(16, 19, 28, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.35rem 0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          boxShadow: '0 0 15px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--on-surface-variant)' }}>
              <Radio size={11} color="var(--primary)" className="animate-pulse" />
              <span>SIGNAL DOPPLER RADAR</span>
            </div>
            <span style={{ color: 'var(--neon-lime)', fontSize: '8.5px' }}>
              • {filteredReports.length} CROWD REPORTS
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
              <span style={{ color: '#ef4444', fontWeight: 700 }}>Strong (5G)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316' }} />
              <span style={{ color: '#f97316', fontWeight: 600 }}>Good (4G)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }} />
              <span style={{ color: '#eab308', fontWeight: 600 }}>Weak</span>
            </div>
          </div>
        </div>

        {/* Locate Me FAB */}
        <button
          onClick={handleLocateMe}
          className="btn-icon"
          title="Center on My Location"
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 400,
            background: 'var(--surface-container-high)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glow-active)',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}
        >
          <Navigation2 size={16} />
        </button>

        {/* Floating Report CTA */}
        <button
          onClick={onOpenReportModal}
          className="btn-primary"
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: 400,
            fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <Plus size={14} /> Log Radar Signal
        </button>
      </div>

      {/* Active Pin Card Detail Preview */}
      {activeReport && (
        <div className="glass-panel glow-active" style={{
          background: 'rgba(24, 27, 37, 0.95)',
          padding: 'clamp(0.85rem, 3vw, 1.1rem)',
          borderRadius: 'var(--radius-xl)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className={`badge badge-${activeReport.telco.toLowerCase()}`}>
                  {activeReport.telco}
                </span>
                <span className="badge badge-5g">
                  {activeReport.networkType}
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: getSignalRadarStyle(activeReport).coreColor,
                  background: 'rgba(255,255,255,0.06)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {getSignalRadarStyle(activeReport).tier.toUpperCase()} INTENSITY
                </span>
              </div>
              <h4 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(0.9rem, 3.2vw, 1rem)', fontWeight: 700, marginTop: '0.25rem', color: '#ffffff' }}>
                {activeReport.barangay}
              </h4>
              <div style={{ fontSize: 'clamp(0.68rem, 2.2vw, 0.74rem)', color: 'var(--on-surface-variant)' }}>
                {activeReport.city}, {activeReport.province}
              </div>
            </div>

            <button
              onClick={() => setActiveReport(null)}
              style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.45rem 0', fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#facc15' }}>
              <Star size={13} fill="#facc15" />
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{activeReport.signalRating}/5</span>
            </div>

            {activeReport.speedMbps && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--neon-lime)' }}>
                <Zap size={13} />
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{activeReport.speedMbps} Mbps</span>
              </div>
            )}

            <div style={{ fontSize: 'clamp(0.65rem, 2.2vw, 0.7rem)', color: 'var(--on-surface-variant)' }}>
              Scout: {activeReport.reporterName}
            </div>
          </div>

          {activeReport.notes && (
            <p style={{ fontSize: 'clamp(0.7rem, 2.4vw, 0.75rem)', color: 'var(--on-surface-variant)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
              "{activeReport.notes}"
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem' }}>
            <span style={{ fontSize: 'clamp(0.65rem, 2.2vw, 0.7rem)', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
              {new Date(activeReport.reportedAt).toLocaleDateString()}
            </span>
            <button
              onClick={() => onUpvoteReport(activeReport.id)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 'clamp(0.68rem, 2.2vw, 0.72rem)', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <ThumbsUp size={12} /> Confirm ({activeReport.upvotes})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
