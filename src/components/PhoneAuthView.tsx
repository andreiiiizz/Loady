import React, { useState, useEffect } from 'react';
import { AuthUser, TelcoProvider } from '../types';
import { sendSupabasePhoneOtp, verifySupabasePhoneOtp, isSupabaseConfigured } from '../services/supabase';
import { Zap, ShieldCheck, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';

interface PhoneAuthViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  onSkipGuest: () => void;
}

// Build-time gate for Quick Demo bypass (structurally excluded from production builds unless VITE_DEMO_MODE is true)
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
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('0919 123 4567');
  const [detectedTelco, setDetectedTelco] = useState<TelcoProvider>('Smart');
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('582194');
  const [showSimulatedSms, setShowSimulatedSms] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update carrier detection on phone change
  useEffect(() => {
    setDetectedTelco(detectPhCarrier(phoneNumber));
  }, [phoneNumber]);

  // Resend OTP countdown
  useEffect(() => {
    if (step === 'otp' && resendTimer > 0) {
      const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, resendTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setErrorMsg('Please enter a valid 11-digit Philippine mobile number');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    if (isSupabaseConfigured) {
      const res = await sendSupabasePhoneOtp(phoneNumber);
      setIsLoading(false);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
        return;
      }
      setStep('otp');
      setResendTimer(60);
    } else {
      // Demo / Local development mode
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      setSimulatedOtp(generated);

      setTimeout(() => {
        setIsLoading(false);
        setStep('otp');
        if (IS_DEMO_ENABLED) setShowSimulatedSms(true);
        setResendTimer(60);
      }, 500);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpCode.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    if (isSupabaseConfigured) {
      const res = await verifySupabasePhoneOtp(phoneNumber, otpCode);
      setIsLoading(false);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
        return;
      }
      const user: AuthUser = {
        phoneNumber: phoneNumber.trim(),
        telco: detectedTelco,
        isLoggedIn: true,
        verifiedAt: new Date().toISOString()
      };
      onLoginSuccess(user);
    } else {
      // Demo / Local development mode check
      setTimeout(() => {
        setIsLoading(false);
        const user: AuthUser = {
          phoneNumber: phoneNumber.trim(),
          telco: detectedTelco,
          isLoggedIn: true,
          verifiedAt: new Date().toISOString()
        };
        onLoginSuccess(user);
      }, 400);
    }
  };

  const handleAutoFillTestOtp = () => {
    if (!IS_DEMO_ENABLED) return;
    setOtpCode(simulatedOtp);
    setTimeout(() => {
      const user: AuthUser = {
        phoneNumber: phoneNumber.trim(),
        telco: detectedTelco,
        isLoggedIn: true,
        verifiedAt: new Date().toISOString()
      };
      onLoginSuccess(user);
    }, 250);
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
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, transparent 70%)',
        filter: 'blur(35px)',
        pointerEvents: 'none'
      }} />

      {/* Simulated SMS Notification Banner */}
      {showSimulatedSms && step === 'otp' && (
        <div style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          left: '12px',
          right: '12px',
          maxWidth: '420px',
          margin: '0 auto',
          background: 'rgba(24, 27, 37, 0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--primary)',
          boxShadow: 'var(--glow-active)',
          borderRadius: 'var(--radius-xl)',
          padding: '0.65rem 0.85rem',
          zIndex: 1000,
          animation: 'slideUp 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={14} />
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                SMS VIA SEMAPHORE
              </div>
              <div style={{ fontSize: 'clamp(0.72rem, 2.4vw, 0.78rem)', fontWeight: 700, color: '#ffffff' }}>
                Loady OTP: <span style={{ color: 'var(--neon-lime)', fontFamily: 'var(--font-mono)' }}>{simulatedOtp}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAutoFillTestOtp}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.68rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)' }}
          >
            Auto-fill
          </button>
        </div>
      )}

      {/* Auth Main Card */}
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
            PH PREPAID COMPANION
          </p>
        </div>

        {/* STEP 1: PHONE NUMBER INPUT */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: 'clamp(0.7rem, 2.3vw, 0.75rem)', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                  MOBILE NUMBER
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

            {/* Quick Test Presets */}
            <div>
              <div className="font-label-caps" style={{ color: 'var(--on-surface-variant)', marginBottom: '0.35rem', fontSize: '9px' }}>
                FAST TEST PRESETS:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setPhoneNumber('0919 123 4567')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 'clamp(0.62rem, 2vw, 0.68rem)', padding: '0.3rem 0.4rem' }}
                >
                  🟢 Smart
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneNumber('0917 888 5678')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 'clamp(0.62rem, 2vw, 0.68rem)', padding: '0.3rem 0.4rem' }}
                >
                  🔵 Globe
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneNumber('0991 555 9999')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 'clamp(0.62rem, 2vw, 0.68rem)', padding: '0.3rem 0.4rem' }}
                >
                  🔴 DITO
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: 'clamp(0.82rem, 2.8vw, 0.9rem)',
                borderRadius: 'var(--radius-xl)',
                marginTop: '0.35rem'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Sending SMS...
                </>
              ) : (
                <>
                  Send OTP Code <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: 'clamp(0.7rem, 2.3vw, 0.75rem)', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                  ENTER 6-DIGIT CODE
                </label>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Edit Number
                </button>
              </div>

              <input
                type="text"
                maxLength={6}
                autoFocus
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                style={{
                  width: '100%',
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--electric-purple)',
                  boxShadow: 'var(--glow-active)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.65rem 0.75rem',
                  color: '#ffffff',
                  fontSize: 'clamp(1.15rem, 4.5vw, 1.35rem)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
            </div>

            {/* Quick 1-tap Auto-fill button (Only present in dev/demo builds) */}
            {IS_DEMO_ENABLED && (
              <div style={{
                background: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.6rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ fontSize: 'clamp(0.68rem, 2.2vw, 0.72rem)', color: 'var(--on-surface-variant)' }}>
                  OTP: <span style={{ color: 'var(--neon-lime)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{simulatedOtp}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillTestOtp}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                >
                  <Sparkles size={11} color="var(--primary)" /> Fill
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: 'clamp(0.82rem, 2.8vw, 0.9rem)',
                borderRadius: 'var(--radius-xl)'
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Verify & Enter
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>
              {resendTimer > 0 ? (
                <span>Resend in <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{resendTimer}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* Skip / Continue as Guest (Only present in dev/demo builds) */}
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
