import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CoverageReport, TelcoProvider } from '../types';
import { Star, MapPin, Award } from 'lucide-react';

interface CoverageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: CoverageReport) => void;
  defaultTelco: TelcoProvider;
}

export const CoverageReportModal: React.FC<CoverageReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport,
  defaultTelco
}) => {
  const [telco, setTelco] = useState<TelcoProvider>(defaultTelco);
  const [barangay, setBarangay] = useState('');
  const [city] = useState('Metro Manila');
  const [province] = useState('NCR');
  const [signalRating, setSignalRating] = useState<number>(5);
  const [networkType, setNetworkType] = useState<CoverageReport['networkType']>('5G');
  const [speedMbps, setSpeedMbps] = useState<string>('85.0');
  const [notes, setNotes] = useState('');
  const [reporterName, setReporterName] = useState('PinoyScout');
  const [isLocating, setIsLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number]>([14.6202, 121.0531]);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates([pos.coords.latitude, pos.coords.longitude]);
          setBarangay('Current GPS Location');
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangay.trim()) return;

    const newReport: CoverageReport = {
      id: 'report-' + Date.now(),
      telco,
      barangay: barangay.trim(),
      city: city.trim() || 'Metro Manila',
      province: province.trim() || 'Luzon',
      coordinates,
      signalRating,
      networkType,
      speedMbps: speedMbps ? parseFloat(speedMbps) : undefined,
      notes: notes.trim() || undefined,
      reporterName: reporterName.trim() || 'Anonymous Scout',
      reportedAt: new Date().toISOString(),
      upvotes: 1
    };

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    onSubmitReport(newReport);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--neon-lime), #059669)',
              boxShadow: 'var(--glow-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#022c22'
            }}>
              <Award size={20} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Report Signal Strength
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--neon-lime)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                +50 SCOUT POINTS & BADGE
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Telco Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
              CARRIER / SIM YOU ARE USING
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
              {(['Globe', 'Smart', 'DITO', 'GOMO', 'TM', 'TNT'] as TelcoProvider[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTelco(t)}
                  className="btn btn-sm"
                  style={{
                    background: telco === t ? 'var(--primary-container)' : 'var(--surface-container-high)',
                    color: telco === t ? 'var(--on-primary-container)' : 'var(--on-surface)',
                    border: telco === t ? '1px solid var(--electric-purple)' : '1px solid var(--glass-border)',
                    boxShadow: telco === t ? 'var(--glow-active)' : 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Location & GPS Autofill */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                BARANGAY & LOCATION
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <MapPin size={12} /> {isLocating ? 'Locating...' : 'Use My GPS'}
              </button>
            </div>
            <input
              type="text"
              required
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              placeholder="e.g. Brgy. San Antonio / SM Megamall"
              style={{
                width: '100%',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.75rem',
                color: 'var(--on-surface)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Signal Rating */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
              SIGNAL QUALITY ({signalRating}/5 BARS)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSignalRating(star)}
                  style={{
                    background: 'var(--surface-container-high)',
                    border: star <= signalRating ? '1px solid #facc15' : '1px solid var(--glass-border)',
                    boxShadow: star <= signalRating ? '0 0 10px rgba(250, 204, 21, 0.4)' : 'none',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.6rem 0.85rem',
                    cursor: 'pointer',
                    color: star <= signalRating ? '#facc15' : 'var(--on-surface-variant)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1
                  }}
                >
                  <Star size={18} fill={star <= signalRating ? '#facc15' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Network Tier */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
              NETWORK TIER
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
              {(['5G', '4G/LTE', '3G', 'Deadzone'] as CoverageReport['networkType'][]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNetworkType(type)}
                  className="btn btn-sm"
                  style={{
                    background: networkType === type ? 'var(--neon-lime)' : 'var(--surface-container-high)',
                    color: networkType === type ? '#022c22' : 'var(--on-surface)',
                    border: networkType === type ? '1px solid var(--neon-lime)' : '1px solid var(--glass-border)',
                    boxShadow: networkType === type ? 'var(--glow-success)' : 'none',
                    fontWeight: 700,
                    fontSize: '0.72rem'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Speed & Scout Handle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                SPEEDTEST MBPS
              </label>
              <input
                type="number"
                step="any"
                value={speedMbps}
                onChange={(e) => setSpeedMbps(e.target.value)}
                placeholder="e.g. 120"
                style={{
                  width: '100%',
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.65rem',
                  color: 'var(--on-surface)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                SCOUT HANDLE
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="e.g. Makatizen"
                style={{
                  width: '100%',
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.65rem',
                  color: 'var(--on-surface)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>
              COVERAGE NOTES
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fast 5G outdoors, drops slightly inside basement parking..."
              rows={2}
              style={{
                width: '100%',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.65rem',
                color: 'var(--on-surface)',
                fontSize: '0.82rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem', borderRadius: 'var(--radius-lg)' }}
          >
            Submit Coverage Report (+50 Pts)
          </button>
        </form>
      </div>
    </div>
  );
};
