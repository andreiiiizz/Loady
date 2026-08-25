import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CoverageReport, TelcoProvider } from '../types';
import { submitCoverageReport, logOutOfAreaLookup } from '../services/firebase';
import { findNearestBarangayLocal, BATANGAS_BARANGAYS } from '../data/batangasBarangays';
import { Star, MapPin, Radio, AlertCircle, Loader2, Info, Check, ShieldAlert } from 'lucide-react';

const SUBMISSIONS_HISTORY_KEY = 'loady_reports_submission_timestamps_v1';
const MAX_REPORTS_PER_HOUR = 10;
const SUBMISSION_COOLDOWN_SEC = 6;

function getRecentSubmissionCount(): number {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_HISTORY_KEY);
    if (!raw) return 0;
    const timestamps: number[] = JSON.parse(raw);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const valid = timestamps.filter(t => t > oneHourAgo);
    return valid.length;
  } catch {
    return 0;
  }
}

function recordSubmissionTimestamp(): void {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_HISTORY_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const valid = [...timestamps.filter(t => t > oneHourAgo), Date.now()];
    localStorage.setItem(SUBMISSIONS_HISTORY_KEY, JSON.stringify(valid));
  } catch {
    // ignore
  }
}

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
  const [barangayName, setBarangayName] = useState('Alangilan');
  const [barangayCode, setBarangayCode] = useState<string>('btg_batangas_city_alangilan');
  const [city, setCity] = useState('Batangas City');
  const [province, setProvince] = useState('Batangas');
  const [signalRating, setSignalRating] = useState<number>(5);
  const [networkType, setNetworkType] = useState<CoverageReport['networkType']>('5G');
  const [notes, setNotes] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outOfAreaNotice, setOutOfAreaNotice] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number]>([13.7844, 121.0743]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSec > 0) {
      const timer = setTimeout(() => setCooldownSec(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSec]);

  // Filtered barangay list for fast discrete selector
  const filteredBarangays = useMemo(() => {
    if (!searchQuery.trim()) return BATANGAS_BARANGAYS.slice(0, 30);
    const q = searchQuery.toLowerCase();
    return BATANGAS_BARANGAYS.filter(
      b => b.name.toLowerCase().includes(q) || b.municipality.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      setOutOfAreaNotice(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoordinates([lat, lng]);

          // 100% Local In-Memory Haversine nearest barangay lookup
          const { barangay, distanceKm, isWithinSupportedArea } = findNearestBarangayLocal(lat, lng);

          if (isWithinSupportedArea) {
            setBarangayName(barangay.name);
            setBarangayCode(barangay.barangay_code);
            setCity(barangay.municipality);
            setProvince(barangay.province);
            setOutOfAreaNotice(null);
          } else {
            // Out-of-area graceful fallback: acknowledge, surface nearest, and log demand telemetry
            setBarangayName(barangay.name);
            setBarangayCode(barangay.barangay_code);
            setCity(barangay.municipality);
            setProvince(barangay.province);
            setOutOfAreaNotice(
              `We haven't expanded to your exact GPS location yet (~${distanceKm}km from active coverage zone). We've logged this area to prioritize upcoming nationwide expansion!`
            );
            logOutOfAreaLookup(lat, lng, `Outside dataset (~${distanceKm}km away)`);
          }

          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        }
      );
    }
  };

  const handleSelectBarangay = (b: typeof BATANGAS_BARANGAYS[0]) => {
    setBarangayName(b.name);
    setBarangayCode(b.barangay_code);
    setCity(b.municipality);
    setProvince(b.province);
    setCoordinates([b.lat, b.lng]);
    setOutOfAreaNotice(null);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangayName.trim()) return;

    // Rate limiting check (max 10 submissions/hour)
    const recentCount = getRecentSubmissionCount();
    if (recentCount >= MAX_REPORTS_PER_HOUR) {
      setSubmitError(`Hourly limit reached (${MAX_REPORTS_PER_HOUR} reports/hour). Please wait before submitting another signal report.`);
      return;
    }

    if (cooldownSec > 0) {
      setSubmitError(`Please wait ${cooldownSec}s before submitting another report.`);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const newReport: CoverageReport = {
      id: 'report-' + Date.now(),
      barangay_code: barangayCode || undefined,
      telco,
      barangay: barangayName.trim(),
      city: city.trim() || 'Batangas City',
      province: province.trim() || 'Batangas',
      coordinates,
      signalRating,
      networkType,
      notes: notes.trim() || undefined,
      reportedAt: new Date().toISOString(),
      upvotes: 1,
      flagged: false,
      flag_count: 0
    };

    try {
      const res = await submitCoverageReport(newReport);
      if (!res.success && res.error) {
        setSubmitError(res.error);
        setIsSubmitting(false);
        return;
      }

      recordSubmissionTimestamp();
      setCooldownSec(SUBMISSION_COOLDOWN_SEC);

      try {
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }

      onSubmitReport(res.report || newReport);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit report');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
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
              <Radio size={20} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                Log Radar Signal
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                COMMUNITY SIGNAL TELEMETRY
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

        {/* Out of Area Graceful Fallback Banner */}
        {outOfAreaNotice && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem',
            marginBottom: '0.85rem',
            color: '#38bdf8',
            fontSize: '0.74rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.45rem',
            lineHeight: 1.4
          }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{outOfAreaNotice}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Telco Selector */}
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
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

          {/* Barangay Location Selector */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                BARANGAY & MUNICIPALITY
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

            {/* Selected Barangay Display / Search Trigger */}
            <div
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                width: '100%',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.65rem 0.85rem',
                color: 'var(--on-surface)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>Brgy. {barangayName}</span>
                <span style={{ color: 'var(--on-surface-variant)', marginLeft: '0.4rem', fontSize: '0.75rem' }}>
                  ({city}, {province})
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Change ▾</span>
            </div>

            {/* Barangay Search Dropdown */}
            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 50,
                marginTop: '0.3rem',
                background: 'rgba(20, 24, 34, 0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                padding: '0.5rem',
                maxHeight: '220px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search barangay or municipality..."
                  style={{
                    width: '100%',
                    background: 'var(--surface-container-high)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.65rem',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    outline: 'none'
                  }}
                />

                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {filteredBarangays.map((b) => (
                    <div
                      key={b.barangay_code}
                      onClick={() => handleSelectBarangay(b)}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: barangayCode === b.barangay_code ? 'var(--primary-container)' : 'transparent',
                        color: barangayCode === b.barangay_code ? 'var(--on-primary-container)' : '#ffffff'
                      }}
                    >
                      <div>
                        <strong>{b.name}</strong>
                        <span style={{ opacity: 0.7, marginLeft: '0.35rem', fontSize: '0.7rem' }}>
                          • {b.municipality}
                        </span>
                      </div>
                      {barangayCode === b.barangay_code && <Check size={13} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Signal Rating */}
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              SIGNAL QUALITY ({signalRating}/5 BARS)
            </label>
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
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
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    color: star <= signalRating ? '#facc15' : 'var(--on-surface-variant)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1
                  }}
                >
                  <Star size={17} fill={star <= signalRating ? '#facc15' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Network Tier */}
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
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

          {/* Notes */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              COVERAGE NOTES (OPTIONAL)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fast 5G outdoors, low ping in Mobile Legends..."
              rows={2}
              style={{
                width: '100%',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.6rem',
                color: 'var(--on-surface)',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {submitError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.8rem',
              color: '#f87171',
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || cooldownSec > 0}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '0.35rem',
              padding: '0.8rem',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: cooldownSec > 0 ? 0.65 : 1
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Transmitting Radar Signal...
              </>
            ) : cooldownSec > 0 ? (
              <>
                <ShieldAlert size={16} /> Cooldown ({cooldownSec}s)
              </>
            ) : (
              <>
                <Radio size={16} /> Log Radar Signal
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
