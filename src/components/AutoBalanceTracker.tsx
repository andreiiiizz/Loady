import React, { useState } from 'react';
import { SimCard } from '../types';
import { parseTelcoSms, SAMPLE_TELCO_SMS } from '../services/smsParser';
import { applyAutoDecay } from '../services/burnRateEngine';
import { Clipboard, PhoneCall, Sparkles, CheckCircle2, RefreshCw, Smartphone, Activity, Zap, Check } from 'lucide-react';

interface AutoBalanceTrackerProps {
  sim: SimCard;
  onUpdateSim: (updatedSim: SimCard) => void;
}

export const AutoBalanceTracker: React.FC<AutoBalanceTrackerProps> = ({
  sim,
  onUpdateSim
}) => {
  const [smsInput, setSmsInput] = useState('');
  const [parseSuccessMsg, setParseSuccessMsg] = useState<string | null>(null);
  const [isSimulatingDecay, setIsSimulatingDecay] = useState(false);
  const [gomoGbInput, setGomoGbInput] = useState((sim.remainingDataMb / 1024).toFixed(1));

  const handleToggleAutoTracking = () => {
    const updated = { ...sim, autoTrackingEnabled: !sim.autoTrackingEnabled };
    onUpdateSim(updated);
  };

  const handleForceDecaySync = () => {
    setIsSimulatingDecay(true);
    setTimeout(() => {
      const { updatedSim, deductedMb } = applyAutoDecay({
        ...sim,
        lastSyncAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      });
      onUpdateSim(updatedSim);
      setIsSimulatingDecay(false);
      setParseSuccessMsg(`Background auto-sync complete! Deducted ${deductedMb} MB based on your ${sim.usageProfile} usage profile.`);
      setTimeout(() => setParseSuccessMsg(null), 4000);
    }, 600);
  };

  const handleParseAndApply = (textToParse: string) => {
    const parsed = parseTelcoSms(textToParse);
    if (parsed.success && parsed.remainingDataMb !== undefined) {
      const updated: SimCard = {
        ...sim,
        remainingDataMb: parsed.remainingDataMb,
        totalDataMb: parsed.totalDataMb || Math.max(sim.totalDataMb, parsed.remainingDataMb),
        activePromo: parsed.promoName || sim.activePromo,
        expiryDate: parsed.expiryDate || sim.expiryDate,
        isNoExpiry: parsed.expiryDate === 'NO_EXPIRY' || parsed.telco === 'GOMO',
        regularBalancePhp: parsed.regularBalancePhp !== undefined ? parsed.regularBalancePhp : sim.regularBalancePhp,
        lastSyncAt: new Date().toISOString(),
        usageHistory: [
          ...(sim.usageHistory || []),
          {
            id: 'sms-sync-' + Date.now(),
            timestamp: new Date().toISOString(),
            usedMb: 0,
            source: 'sms_sync' as const,
            description: `SMS Balance Update: ${(parsed.remainingDataMb / 1024).toFixed(2)} GB left`
          }
        ].slice(-50)
      };

      onUpdateSim(updated);
      setSmsInput('');
      setGomoGbInput((parsed.remainingDataMb / 1024).toFixed(1));
      setParseSuccessMsg(`Success! Updated balance to ${(parsed.remainingDataMb / 1024).toFixed(2)} GB (${parsed.promoName})`);
      setTimeout(() => setParseSuccessMsg(null), 5000);
    } else {
      setParseSuccessMsg('Could not detect data volume in SMS. Try pasting the full telco balance SMS.');
      setTimeout(() => setParseSuccessMsg(null), 4000);
    }
  };

  const handleQuickGomoSync = (e: React.FormEvent) => {
    e.preventDefault();
    const gb = parseFloat(gomoGbInput);
    if (isNaN(gb) || gb < 0) return;

    const remainingMb = Math.round(gb * 1024);
    const updated: SimCard = {
      ...sim,
      remainingDataMb: remainingMb,
      totalDataMb: Math.max(sim.totalDataMb, remainingMb, 30 * 1024),
      telco: sim.telco === 'GOMO' ? 'GOMO' : sim.telco,
      activePromo: sim.activePromo.includes('GOMO') ? sim.activePromo : '30GB No Expiry',
      expiryDate: 'NO_EXPIRY',
      isNoExpiry: true,
      lastSyncAt: new Date().toISOString(),
      usageHistory: [
        ...(sim.usageHistory || []),
        {
          id: 'manual-gomo-' + Date.now(),
          timestamp: new Date().toISOString(),
          usedMb: 0,
          source: 'manual' as const,
          description: `GOMO App Calibration: ${gb.toFixed(2)} GB set`
        }
      ].slice(-50)
    };

    onUpdateSim(updated);
    setParseSuccessMsg(`GOMO Balance successfully calibrated to ${gb.toFixed(2)} GB! LoadWise is now tracking usage.`);
    setTimeout(() => setParseSuccessMsg(null), 4500);
  };

  const handleReadClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSmsInput(text);
          handleParseAndApply(text);
        }
      }
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}>
      {/* Auto-Tracking Master Control */}
      <div className="glass-panel" style={{ padding: 'clamp(1rem, 3.5vw, 1.5rem)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: sim.autoTrackingEnabled ? 'rgba(74, 222, 128, 0.15)' : 'rgba(168, 85, 247, 0.1)',
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 'clamp(36px, 9vw, 42px)',
              height: 'clamp(36px, 9vw, 42px)',
              borderRadius: 'var(--radius-lg)',
              background: sim.autoTrackingEnabled ? 'linear-gradient(135deg, var(--neon-lime), #059669)' : 'var(--surface-container-high)',
              boxShadow: sim.autoTrackingEnabled ? 'var(--glow-success)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: sim.autoTrackingEnabled ? '#022c22' : 'var(--on-surface-variant)',
              flexShrink: 0
            }}>
              <Activity size={20} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: 'clamp(0.95rem, 3.4vw, 1.05rem)', color: '#ffffff' }}>
                Zero-Effort Auto Tracking
              </div>
              <div style={{ fontSize: 'clamp(0.7rem, 2.4vw, 0.75rem)', color: 'var(--on-surface-variant)' }}>
                {sim.autoTrackingEnabled ? 'Background decay active • No manual logging required' : 'Auto tracking is paused'}
              </div>
            </div>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={sim.autoTrackingEnabled}
              onChange={handleToggleAutoTracking}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              inset: 0,
              backgroundColor: sim.autoTrackingEnabled ? 'var(--neon-lime)' : 'var(--surface-container-highest)',
              boxShadow: sim.autoTrackingEnabled ? 'var(--glow-success)' : 'none',
              transition: '0.2s',
              borderRadius: '26px',
              border: '1px solid var(--glass-border)'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '20px',
                width: '20px',
                left: sim.autoTrackingEnabled ? '23px' : '3px',
                bottom: '2px',
                backgroundColor: '#ffffff',
                transition: '0.2s',
                borderRadius: '50%'
              }} />
            </span>
          </label>
        </div>

        {/* Status Breakdown */}
        <div style={{
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 0.95rem',
          marginTop: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)',
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>Assigned Profile:</span>
            <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              {sim.usageProfile} ({sim.usageProfile === 'light' ? '~360 MB/d' : sim.usageProfile === 'heavy' ? '~3.3 GB/d' : '~1.3 GB/d'})
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>Last Background Sync:</span>
            <span style={{ fontWeight: 500, color: 'var(--on-surface)', fontFamily: 'var(--font-mono)' }}>
              {sim.lastSyncAt ? new Date(sim.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            </span>
          </div>
        </div>

        <button
          onClick={handleForceDecaySync}
          disabled={isSimulatingDecay}
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={14} className={isSimulatingDecay ? 'animate-spin' : ''} />
          {isSimulatingDecay ? 'Recalculating Usage...' : 'Sync Background Burn Rate Now'}
        </button>
      </div>

      {/* GOMO & Quick Calibration Card */}
      <div className="glass-panel glow-active" style={{ padding: 'clamp(1rem, 3.5vw, 1.5rem)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(24, 27, 37, 0.95))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
          <Smartphone size={18} color="var(--primary)" />
          <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(0.95rem, 3.4vw, 1.05rem)', fontWeight: 700, color: '#ffffff' }}>
            GOMO / Direct GB Calibration
          </h3>
        </div>

        <p style={{ fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)', color: 'var(--on-surface-variant)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
          GOMO does not have a balance dialer code. Glance at your GOMO app balance, type your remaining GB below, and LoadWise takes over automatic burn-rate tracking:
        </p>

        <form onSubmit={handleQuickGomoSync} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="number"
              step="any"
              min="0"
              max="1000"
              value={gomoGbInput}
              onChange={(e) => setGomoGbInput(e.target.value)}
              placeholder="e.g. 2.03"
              style={{
                width: '100%',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--electric-purple)',
                boxShadow: 'var(--glow-active)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                fontSize: 'clamp(0.95rem, 3.5vw, 1.1rem)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                outline: 'none'
              }}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              GB
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.65rem 1rem', fontSize: 'clamp(0.78rem, 2.6vw, 0.85rem)' }}
          >
            <Check size={15} /> Set Balance
          </button>
        </form>
      </div>

      {/* Instant SMS Paste & Parser */}
      <div className="glass-panel" style={{ padding: 'clamp(1rem, 3.5vw, 1.5rem)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sparkles size={18} color="var(--primary)" />
            <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(0.95rem, 3.4vw, 1.05rem)', fontWeight: 700, color: '#ffffff' }}>
              Telco SMS Auto-Parser
            </h3>
          </div>
          <span style={{ fontSize: '9px', color: 'var(--neon-lime)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            ON-DEVICE
          </span>
        </div>

        <p style={{ fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)', color: 'var(--on-surface-variant)', marginBottom: '0.75rem', lineHeight: 1.45 }}>
          Paste any SMS from Globe (8080), Smart (9999), GOMO, or DITO (185) for instant calibration.
        </p>

        <div style={{ position: 'relative' }}>
          <textarea
            value={smsInput}
            onChange={(e) => setSmsInput(e.target.value)}
            placeholder="Paste your telco balance or registration SMS here..."
            rows={2}
            style={{
              width: '100%',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem',
              color: 'var(--on-surface)',
              fontSize: 'clamp(0.75rem, 2.5vw, 0.8rem)',
              fontFamily: 'var(--font-body)',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
          <button
            onClick={handleReadClipboard}
            className="btn btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
          >
            <Clipboard size={14} /> Paste
          </button>
          <button
            onClick={() => handleParseAndApply(smsInput)}
            disabled={!smsInput.trim()}
            className="btn btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
          >
            <Zap size={14} /> Parse & Apply
          </button>
        </div>

        {parseSuccessMsg && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(74, 222, 128, 0.15)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            color: 'var(--neon-lime)',
            fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <CheckCircle2 size={15} />
            {parseSuccessMsg}
          </div>
        )}

        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
          <div className="font-label-caps" style={{ color: 'var(--on-surface-variant)', marginBottom: '0.45rem', fontSize: '9px' }}>
            TAP TO TRY SAMPLE TELCO SMS:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {SAMPLE_TELCO_SMS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSmsInput(sample.text);
                  handleParseAndApply(sample.text);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 'clamp(0.64rem, 2vw, 0.7rem)', padding: '0.25rem 0.5rem' }}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Telco USSD Quick Dialers */}
      <div className="glass-panel" style={{ padding: 'clamp(1rem, 3.5vw, 1.5rem)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
          <PhoneCall size={18} color="var(--neon-lime)" />
          <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(0.95rem, 3.4vw, 1.05rem)', fontWeight: 700, color: '#ffffff' }}>
            USSD Shortcodes
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <a
            href="tel:*143%23"
            className="glass-panel"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', textDecoration: 'none', color: 'var(--on-surface)' }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Globe / TM</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>*143#</div>
            </div>
            <PhoneCall size={14} color="var(--primary)" />
          </a>

          <a
            href="tel:*123%23"
            className="glass-panel"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', textDecoration: 'none', color: 'var(--on-surface)' }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Smart / TNT</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--neon-lime)', fontFamily: 'var(--font-mono)' }}>*123#</div>
            </div>
            <PhoneCall size={14} color="var(--neon-lime)" />
          </a>
        </div>
      </div>
    </div>
  );
};
