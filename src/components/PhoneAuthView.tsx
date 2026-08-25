import React, { useState, useEffect } from 'react';
import { AuthUser, TelcoProvider } from '../types';
import { Zap, ArrowRight, Sparkles, User, Phone } from 'lucide-react';

interface PhoneAuthViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  onSkipGuest: () => void;
}

// Build-time gate for Quick Demo bypass
const IS_DEMO_ENABLED = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true');

// Detect PH Carrier from mobile prefix
function detectPhCarrier(digits: string): TelcoProvider {
  const clean = digits.replace(/\D/g, '');
  const prefix = clean.startsWith('63') ? '0' + clean.slice(2, 5) : clean.slice(0, 4);

  // Globe / TM
  if (['0905','0906','0915','0916','0917','0926','0927','0935','0936','0945','0955','0956','0965','0966','0967','0975','0977','0995','0996','0997'].includes(prefix)) {
    return 'Globe';
  }
  // Smart / TNT
  if (['0908','0918','0919','0920','0921','0928','0929','0938','0939','0947','0948','0949','0950','0961','0963','0970','0981','0989','0998','0999'].includes(prefix)) {
    return 'Smart';
  }
  // DITO
  if (['0991','0992','0993','0994','0895','0896','0897','0898'].includes(prefix)) {
    return 'DITO';
  }
  // GOMO
  if (prefix === '0976') {
    return 'GOMO';
  }

  return 'Smart';
}

export const PhoneAuthView: React.FC<PhoneAuthViewProps> = ({
  onLoginSuccess,
  onSkipGuest
}) => {
  const [name, setName] = useState('Juan Dela Cruz');
  const [phoneNumber, setPhoneNumber] = useState('0919 123 4567');
  const [detectedTelco, setDetectedTelco] = useState<TelcoProvider>('Smart');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update carrier detection on phone change
  useEffect(() => {
    setDetectedTelco(detectPhCarrier(phoneNumber));
  }, [phoneNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your name or display nickname');
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setErrorMsg('Please enter a valid 11-digit Philippine mobile number');
      return;
    }

    setErrorMsg(null);

    const user: AuthUser = {
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      telco: detectedTelco,
      isLoggedIn: true,
      registeredAt: new Date().toISOString()
    };

    onLoginSuccess(user);
  };

  const handleSelectPreset = (presetName: string, presetPhone: string) => {
    setName(presetName);
    setPhoneNumber(presetPhone);
    setErrorMsg(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top, 0px) + 1.25rem) clamp(0.75rem, 3vw, 1.25rem) calc(env(safe-area-inset-bottom, 0px) + 1.25rem)',
      position: 'relative',
      maxWidth: '440px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '220px',
        height: '220px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      {/* Main Card */}
      <div className="glass-panel glow-active" style={{ padding: 'clamp(1.25rem, 4vw, 1.75rem)', position: 'relative', zIndex: 10 }}>
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            width: 'clamp(42px, 11vw, 48px)',
            height: 'clamp(42px, 11vw, 48px)',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--primary-container) 0%, var(--electric-purple) 100%)',
            boxShadow: 'var(--glow-active)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--on-primary-container)',
            marginBottom: '0.65rem'
          }}>
            <Zap size={22} />
          </div>

          <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(1.35rem, 5.5vw, 1.75rem)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Loady
          </h1>
          <p className="font-label-caps" style={{ color: 'var(--primary)', marginTop: '0.2rem', fontSize: '9px' }}>
            PH PREPAID COMPANION • LOCAL PROFILE
          </p>
        </div>

        {/* PROFILE INPUT FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Full Name / Nickname */}
          <div>
            <label style={{ fontSize: 'clamp(0.7rem, 2.3vw, 0.75rem)', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
              <User size={12} /> YOUR NAME / NICKNAME
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              style={{
                width: '100%',
                background: 'var(--surface-container-low)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                fontSize: 'clamp(0.85rem, 3.2vw, 0.95rem)',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Mobile Number */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: 'clamp(0.7rem, 2.3vw, 0.75rem)', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={12} /> MOBILE NUMBER
              </label>
              {phoneNumber && (
                <span className={`badge badge-${detectedTelco.toLowerCase()}`}>
                  {detectedTelco}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {/* PH Flag / Code Pill */}
              <div style={{
                background: 'var(--surface-container-high)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.65rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: 'clamp(0.75rem, 2.5vw, 0.82rem)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: '#ffffff'
              }}>
                <span>🇵🇭</span>
                <span>+63</span>
              </div>

              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0919 123 4567"
                style={{
                  flex: 1,
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.65rem 0.85rem',
                  color: '#ffffff',
                  fontSize: 'clamp(0.85rem, 3.2vw, 0.95rem)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  outline: 'none',
                  minWidth: 0
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--cyber-pink)', fontSize: '0.72rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {/* Fast Quick Presets */}
          <div>
            <div className="font-label-caps" style={{ color: 'var(--on-surface-variant)', marginBottom: '0.35rem', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Sparkles size={11} color="var(--primary)" /> FAST TEST PRESETS:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => handleSelectPreset('Juan (Smart)', '0919 123 4567')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 'clamp(0.62rem, 2vw, 0.68rem)', padding: '0.35rem 0.4rem' }}
              >
                🟢 Smart
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('Maria (Globe)', '0917 888 5678')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 'clamp(0.62rem, 2vw, 0.68rem)', padding: '0.35rem 0.4rem' }}
              >
                🔵 Globe
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('Alex (DITO)', '0991 555 9999')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 'clamp(0.62rem, 2vw, 0.68rem)', padding: '0.35rem 0.4rem' }}
              >
                🔴 DITO
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: 'clamp(0.82rem, 2.8vw, 0.9rem)',
              borderRadius: 'var(--radius-xl)',
              marginTop: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            Continue to Loady <ArrowRight size={15} />
          </button>
        </form>

        {/* Skip / Continue as Guest */}
        {IS_DEMO_ENABLED && (
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <button
              onClick={onSkipGuest}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--on-surface-variant)',
                fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px'
              }}
            >
              Skip for Testing • Explore Demo →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
