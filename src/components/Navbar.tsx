import React, { useState, useEffect } from 'react';
import { SimCard } from '../types';
import { Zap, ChevronDown, Plus, Moon, Sun, Settings, Radio, Wifi } from 'lucide-react';
import { getLiveNetworkStatus } from '../services/networkMonitor';

interface NavbarProps {
  sims: SimCard[];
  activeSim: SimCard;
  onSelectSim: (simId: string) => void;
  onOpenMultiSim: () => void;
  onOpenSettings: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sims,
  activeSim,
  onSelectSim,
  onOpenMultiSim,
  onOpenSettings,
  theme,
  onToggleTheme
}) => {
  const [isSimDropdownOpen, setIsSimDropdownOpen] = useState(false);
  const [netStatus, setNetStatus] = useState(getLiveNetworkStatus());

  useEffect(() => {
    const update = () => setNetStatus(getLiveNetworkStatus());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const interval = setInterval(update, 10000);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      clearInterval(interval);
    };
  }, []);

  const isWifi = netStatus.wifiShieldActive || netStatus.isWifi;

  return (
    <header
      className="safe-top-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 0.75rem) clamp(0.75rem, 3vw, 1.25rem) 0.65rem',
        backgroundColor: 'rgba(16, 19, 28, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Brand & SIM Selector Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.4rem, 2vw, 0.75rem)' }}>
        {/* Brand Icon */}
        <div style={{
          width: 'clamp(34px, 8.5vw, 40px)',
          height: 'clamp(34px, 8.5vw, 40px)',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, var(--primary-container) 0%, var(--electric-purple) 100%)',
          boxShadow: 'var(--glow-active)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--on-primary-container)',
          flexShrink: 0
        }}>
          <Zap size={20} />
        </div>

        {/* Brand Title (Loady - Larger) */}
        <span style={{
          fontFamily: 'var(--font-headline)',
          fontSize: 'clamp(1.2rem, 4.5vw, 1.45rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#ffffff',
          lineHeight: 1
        }}>
          Loady
        </span>

        {/* Active SIM Dropdown Trigger (Larger) */}
        <div style={{ position: 'relative', marginLeft: '0.35rem' }}>
          <button
            onClick={() => setIsSimDropdownOpen(!isSimDropdownOpen)}
            className="btn btn-secondary"
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-container-high)',
              fontSize: 'clamp(0.78rem, 2.6vw, 0.88rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.15)'
            }}
          >
            <span className={`badge badge-${activeSim.telco.toLowerCase()}`} style={{ padding: '0.18rem 0.55rem', fontSize: '11px', fontWeight: 700 }}>
              {activeSim.telco}
            </span>
            <ChevronDown size={14} />
          </button>

          {/* SIM Selector Dropdown Menu */}
          {isSimDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '210px',
                background: 'var(--surface-container-high)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--glow-active)',
                backdropFilter: 'blur(20px)',
                zIndex: 100,
                padding: '0.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div className="font-label-caps" style={{ padding: '0.25rem 0.5rem', color: 'var(--on-surface-variant)', fontSize: '9px' }}>
                SWITCH ACTIVE SIM:
              </div>
              {sims.map(sim => (
                <button
                  key={sim.id}
                  onClick={() => {
                    onSelectSim(sim.id);
                    setIsSimDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.6rem',
                    background: sim.id === activeSim.id ? 'var(--primary-container)' : 'transparent',
                    color: sim.id === activeSim.id ? 'var(--on-primary-container)' : 'var(--on-surface)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className={`badge badge-${sim.telco.toLowerCase()}`} style={{ padding: '0.1rem 0.35rem', fontSize: '9px' }}>
                      {sim.telco}
                    </span>
                    <span>{sim.name}</span>
                  </div>
                  {sim.id === activeSim.id && <span style={{ fontSize: '10px' }}>✓</span>}
                </button>
              ))}

              <button
                onClick={() => {
                  setIsSimDropdownOpen(false);
                  onOpenMultiSim();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.6rem',
                  marginTop: '0.2rem',
                  borderTop: '1px solid var(--glass-border)',
                  background: 'transparent',
                  color: 'var(--primary)',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <Plus size={12} /> Manage SIMs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {/* Network Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-full)',
          background: isWifi ? 'rgba(74, 222, 128, 0.15)' : 'rgba(168, 85, 247, 0.15)',
          border: isWifi ? '1px solid rgba(74, 222, 128, 0.35)' : '1px solid rgba(168, 85, 247, 0.35)',
          color: isWifi ? 'var(--neon-lime)' : 'var(--primary)',
          fontSize: '0.68rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)'
        }}
        title={isWifi ? "Connected to Wi-Fi: Data Decay is Paused" : "Connected to Mobile Data: Live Tracking"}
        >
          {isWifi ? <Wifi size={12} /> : <Radio size={12} className="animate-pulse" />}
          <span>{isWifi ? 'Wi-Fi' : 'Cellular'}</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="btn-icon"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--on-surface-variant)',
            cursor: 'pointer'
          }}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="btn-icon"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--on-surface-variant)',
            cursor: 'pointer'
          }}
          title="Settings"
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
};
