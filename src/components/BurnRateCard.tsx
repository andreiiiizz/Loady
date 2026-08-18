import React from 'react';
import { SimCard, ForecastResult } from '../types';
import { calculateForecast, formatDepletionTimestamp } from '../services/burnRateEngine';
import { CheckCircle2, AlertTriangle, Flame, ShieldAlert, Sparkles, Wifi, MessageSquare, Infinity } from 'lucide-react';

interface BurnRateCardProps {
  sim: SimCard;
}

export const BurnRateCard: React.FC<BurnRateCardProps> = ({
  sim
}) => {
  const forecast: ForecastResult = calculateForecast(sim);

  const remainingGb = (Math.max(0, sim.remainingDataMb) / 1024).toFixed(2);
  const totalGb = (sim.totalDataMb / 1024).toFixed(1);
  const percentage = Math.min(100, Math.max(0, (sim.remainingDataMb / Math.max(1, sim.totalDataMb)) * 100));

  // 5-bar signal countdown calculation
  const filledBars = Math.ceil((percentage / 100) * 5);

  // Format countdown string in clean JetBrains Mono format (e.g. "1d 14h 22m")
  const formatCountdown = (hours: number): string => {
    if (hours <= 0) return '0d 00h 00m';
    const d = Math.floor(hours / 24);
    const h = Math.floor(hours % 24);
    const m = Math.floor((hours * 60) % 60);
    return `${d}d ${h < 10 ? '0' + h : h}h ${m < 10 ? '0' + m : m}m`;
  };

  const isNoExpiry = sim.isNoExpiry || sim.telco === 'GOMO';
  const isCritical = forecast.urgencyStatus === 'critical_6h' || forecast.isExhausted;
  const isWarning = forecast.urgencyStatus === 'warning_24h';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.75rem, 2.5vw, 1rem)' }}>
      {/* Hero Status Card */}
      <section className="glass-panel glow-active" style={{
        padding: 'clamp(1.1rem, 3.5vw, 1.6rem) clamp(0.85rem, 3vw, 1.25rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        {/* Ambient Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom right, rgba(168, 85, 247, 0.08), transparent)',
          pointerEvents: 'none'
        }} />

        <div style={{ zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Top Label */}
          <span className="font-label-caps" style={{ color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>
            {isNoExpiry ? 'Estimated Data Depletion (At Current Pace)' : 'Active Promo Expires In'}
          </span>

          {/* 5-Bar Signal Countdown */}
          <div className="signal-bars-container" style={{ marginBottom: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map(barIndex => {
              const isActive = barIndex <= filledBars;
              let barClass = 'signal-bar';
              if (isActive) {
                barClass += isCritical ? ' active-pink' : isWarning ? ' active-purple' : ' active-lime';
              }
              return <div key={barIndex} className={barClass} />;
            })}
          </div>

          {/* Large Countdown Display */}
          <h2 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(1.5rem, 6.5vw, 2.1rem)',
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            marginBottom: '0.65rem',
            lineHeight: 1.15
          }}>
            {formatCountdown(forecast.hoursRemaining)}
          </h2>

          {/* Status Capsule Indicator */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.8rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(50, 52, 63, 0.6)',
            border: '1px solid var(--glass-border)'
          }}>
            {isCritical ? (
              <>
                <ShieldAlert size={14} color="var(--cyber-pink)" />
                <span style={{ fontSize: 'clamp(0.72rem, 2.4vw, 0.8rem)', color: 'var(--cyber-pink)', fontWeight: 600 }} className="animate-pulse">
                  Critical Data Depletion (&lt;6h)
                </span>
              </>
            ) : isWarning ? (
              <>
                <AlertTriangle size={14} color="var(--primary)" />
                <span style={{ fontSize: 'clamp(0.72rem, 2.4vw, 0.8rem)', color: 'var(--primary)', fontWeight: 600 }}>
                  Depletes in ~{Math.round(forecast.hoursRemaining)}h
                </span>
              </>
            ) : isNoExpiry ? (
              <>
                <Infinity size={14} color="var(--neon-lime)" />
                <span style={{ fontSize: 'clamp(0.72rem, 2.4vw, 0.8rem)', color: 'var(--neon-lime)', fontWeight: 600 }}>
                  No Expiry • Burn Rate Tracking Active
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} color="var(--neon-lime)" />
                <span style={{ fontSize: 'clamp(0.72rem, 2.4vw, 0.8rem)', color: 'var(--neon-lime)', fontWeight: 600 }}>
                  Operational • Safe Buffer
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Current Promo Details Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
        {/* Card 1: Data Allocation */}
        <div className="glass-panel" style={{ padding: 'clamp(0.85rem, 3vw, 1.15rem)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(0.95rem, 3.4vw, 1.05rem)', fontWeight: 700, color: '#ffffff' }}>
                {sim.activePromo}
              </span>
              <Wifi size={18} color="var(--electric-purple)" />
            </div>
            <p style={{ fontSize: 'clamp(0.7rem, 2.4vw, 0.76rem)', color: 'var(--on-surface-variant)', marginBottom: '0.85rem' }}>
              {sim.telco} High-Speed Prepaid Pool
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Data Left</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>{remainingGb} GB / {totalGb} GB</span>
            </div>

            {/* Glow Track Progress Bar */}
            <div className="glow-track">
              <div
                className={isCritical ? 'glow-track-bar-pink' : 'glow-track-bar-purple'}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Validity / Regular Balance */}
        <div className="glass-panel" style={{ padding: 'clamp(0.85rem, 3vw, 1.15rem)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(0.95rem, 3.4vw, 1.05rem)', fontWeight: 700, color: '#ffffff' }}>
                {isNoExpiry ? 'No Expiry Pool' : `Load: ₱${(sim.regularBalancePhp || 0).toFixed(2)}`}
              </span>
              {isNoExpiry ? (
                <Infinity size={18} color="var(--primary)" />
              ) : (
                <MessageSquare size={18} color="var(--secondary)" />
              )}
            </div>
            <p style={{ fontSize: 'clamp(0.7rem, 2.4vw, 0.76rem)', color: 'var(--on-surface-variant)', marginBottom: '0.85rem' }}>
              {isNoExpiry ? 'Convertible to calls/texts via Mo Creds' : `Valid until ${formatDepletionTimestamp(sim.expiryDate)}`}
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>Validity</span>
              <span style={{
                color: isNoExpiry ? 'var(--neon-lime)' : isCritical ? 'var(--cyber-pink)' : 'var(--neon-lime)',
                fontWeight: 600
              }}>
                {isNoExpiry ? 'Never Expires' : isCritical ? 'Expiring Soon' : 'Active & Connected'}
              </span>
            </div>

            <div className="glow-track">
              <div
                className={isNoExpiry ? 'glow-track-bar-green' : isCritical ? 'glow-track-bar-pink' : 'glow-track-bar-green'}
                style={{ width: isNoExpiry ? '100%' : isCritical ? '92%' : '45%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Burn Velocity Telemetry Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
        <div className="glass-panel" style={{ padding: 'clamp(0.75rem, 2.5vw, 0.95rem)', background: 'var(--surface-container-low)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--on-surface-variant)' }}>
            <Flame size={13} color="var(--cyber-pink)" />
            <span className="font-label-caps">BURN VELOCITY</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1rem, 4vw, 1.15rem)', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
            {forecast.burnRateMbPerHour} <span style={{ fontSize: 'clamp(0.68rem, 2.2vw, 0.72rem)', color: 'var(--on-surface-variant)', fontWeight: 400 }}>MB/hr</span>
          </div>
          <div style={{ fontSize: 'clamp(0.65rem, 2.2vw, 0.7rem)', color: 'var(--on-surface-variant)', marginTop: '0.1rem' }}>
            ~{forecast.burnRateGbPerDay} GB/day ({sim.usageProfile})
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 'clamp(0.75rem, 2.5vw, 0.95rem)', background: 'var(--surface-container-low)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--on-surface-variant)' }}>
            <Sparkles size={13} color="var(--neon-lime)" />
            <span className="font-label-caps">{isNoExpiry ? 'DAILY CONSUMPTION' : 'DAILY QUOTA'}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1rem, 4vw, 1.15rem)', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
            {(forecast.recommendedDailyQuotaMb / 1024).toFixed(2)} <span style={{ fontSize: 'clamp(0.68rem, 2.2vw, 0.72rem)', color: 'var(--on-surface-variant)', fontWeight: 400 }}>GB/day</span>
          </div>
          <div style={{ fontSize: 'clamp(0.65rem, 2.2vw, 0.7rem)', color: 'var(--on-surface-variant)', marginTop: '0.1rem' }}>
            {isNoExpiry ? 'Typical daily burn rate' : 'Paces data to expiry'}
          </div>
        </div>
      </section>
    </div>
  );
};
