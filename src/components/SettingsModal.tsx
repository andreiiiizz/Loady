import React, { useState } from 'react';
import { SimCard, TelcoProvider, AuthUser } from '../types';
import { UserStats } from '../services/storage';
import { Sliders, Plus, Trash2, Download, LogOut, UserCheck, Sun, Moon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sims: SimCard[];
  activeSim: SimCard;
  onSelectSim?: (simId: string) => void;
  onUpdateSim?: (updatedSim: SimCard) => void;
  onAddSim: (newSim: SimCard) => void;
  onDeleteSim: (simId: string) => void;
  userStats: UserStats;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  authUser: AuthUser | null;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sims,
  activeSim,
  onSelectSim,
  onAddSim,
  onDeleteSim,
  userStats,
  theme,
  onToggleTheme,
  authUser,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'sims' | 'badges' | 'account'>('sims');
  const [newSimName, setNewSimName] = useState('');
  const [newSimTelco, setNewSimTelco] = useState<TelcoProvider>('Smart');
  const [newSimGb, setNewSimGb] = useState('8.0');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const handleCreateSim = (e: React.FormEvent) => {
    e.preventDefault();
    const gb = parseFloat(newSimGb) || 5.0;
    const newSim: SimCard = {
      id: 'sim-' + Date.now(),
      name: newSimName.trim() || `${newSimTelco} SIM`,
      telco: newSimTelco,
      activePromo: `${newSimTelco} Promo`,
      totalDataMb: gb * 1024,
      remainingDataMb: gb * 1024,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isNoExpiry: false,
      registeredAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      autoTrackingEnabled: true,
      usageProfile: 'moderate',
      regularBalancePhp: 0.0,
      usageHistory: []
    };

    onAddSim(newSim);
    setNewSimName('');
    setShowAddForm(false);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ sims, userStats, authUser }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loady_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={20} color="var(--primary)" />
            <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
              Settings & Manage
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          background: 'var(--surface-container-high)',
          padding: '0.3rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.25rem',
          gap: '0.2rem'
        }}>
          <button
            onClick={() => setActiveTab('sims')}
            style={{
              background: activeTab === 'sims' ? 'var(--primary-container)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.2rem',
              color: activeTab === 'sims' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'sims' ? 'var(--glow-active)' : 'none'
            }}
          >
            SIM Cards ({sims.length})
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            style={{
              background: activeTab === 'badges' ? 'var(--primary-container)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.2rem',
              color: activeTab === 'badges' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'badges' ? 'var(--glow-active)' : 'none'
            }}
          >
            Badges
          </button>
          <button
            onClick={() => setActiveTab('account')}
            style={{
              background: activeTab === 'account' ? 'var(--primary-container)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.2rem',
              color: activeTab === 'account' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'account' ? 'var(--glow-active)' : 'none'
            }}
          >
            Account & App
          </button>
        </div>

        {/* TAB 1: MULTI-SIM MANAGER */}
        {activeTab === 'sims' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
                Track multiple Philippine SIM cards:
              </span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
              >
                <Plus size={13} /> {showAddForm ? 'Cancel' : 'Add New SIM'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleCreateSim} style={{ background: 'var(--surface-container-low)', padding: '1rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>TELCO</label>
                    <select
                      value={newSimTelco}
                      onChange={(e) => setNewSimTelco(e.target.value as TelcoProvider)}
                      style={{ width: '100%', background: 'var(--surface-container-high)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.55rem', color: 'var(--on-surface)', fontSize: '0.8rem' }}
                    >
                      <option value="Smart">Smart</option>
                      <option value="Globe">Globe</option>
                      <option value="DITO">DITO</option>
                      <option value="GOMO">GOMO</option>
                      <option value="TM">TM</option>
                      <option value="TNT">TNT</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>DATA (GB)</label>
                    <input
                      type="number"
                      step="any"
                      value={newSimGb}
                      onChange={(e) => setNewSimGb(e.target.value)}
                      placeholder="e.g. 8.0"
                      style={{ width: '100%', background: 'var(--surface-container-high)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.55rem', color: 'var(--on-surface)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>SIM NICKNAME</label>
                  <input
                    type="text"
                    value={newSimName}
                    onChange={(e) => setNewSimName(e.target.value)}
                    placeholder="e.g. Pocket WiFi / Backup SIM"
                    style={{ width: '100%', background: 'var(--surface-container-high)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.55rem', color: 'var(--on-surface)', fontSize: '0.8rem' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.35rem' }}>
                  Save New SIM
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {sims.map(sim => (
                <div
                  key={sim.id}
                  style={{
                    background: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: sim.id === activeSim.id ? '1px solid var(--electric-purple)' : '1px solid var(--glass-border)',
                    boxShadow: sim.id === activeSim.id ? 'var(--glow-active)' : 'none'
                  }}
                >
                  <div
                    onClick={() => onSelectSim && onSelectSim(sim.id)}
                    style={{ flex: 1, cursor: onSelectSim && sim.id !== activeSim.id ? 'pointer' : 'default' }}
                    title={sim.id !== activeSim.id ? 'Click to switch active SIM' : 'Currently active SIM'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className={`badge badge-${sim.telco.toLowerCase()}`}>
                        {sim.telco}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                        {sim.name}
                      </span>
                      {sim.id === activeSim.id && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-mono)', background: 'rgba(168, 85, 247, 0.15)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                      {(sim.remainingDataMb / 1024).toFixed(2)} GB left of {(sim.totalDataMb / 1024).toFixed(1)} GB
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {sim.id !== activeSim.id && onSelectSim && (
                      <button
                        onClick={() => onSelectSim(sim.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem' }}
                      >
                        Set Active
                      </button>
                    )}

                    {sims.length > 1 && (
                      <button
                        onClick={() => onDeleteSim(sim.id)}
                        className="btn-icon"
                        style={{ padding: '0.4rem', color: 'var(--cyber-pink)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        title="Remove SIM"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: GAMIFIED SCOUT BADGES */}
        {activeTab === 'badges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15), rgba(5, 150, 105, 0.08))',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>TOTAL SCOUT POINTS</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--neon-lime)', fontFamily: 'var(--font-mono)' }}>
                  {userStats.points} PTS
                </div>
              </div>
              <div style={{
                background: 'rgba(74, 222, 128, 0.25)',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                fontSize: '0.75rem',
                color: 'var(--neon-lime)',
                fontFamily: 'var(--font-mono)'
              }}>
                TOP 5% CONTRIBUTOR
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { name: 'Promo Optimizer', desc: 'Calibrated prepaid promo pacing with accurate check-ins', unlocked: true, icon: '⚡' },
                { name: 'Pacing Pro', desc: 'Maintained optimal burn-rate within daily data quota', unlocked: true, icon: '🎯' },
                { name: 'Wi-Fi Shield Master', desc: 'Preserved cellular balance by enabling Wi-Fi Shield', unlocked: true, icon: '🛡️' },
                { name: 'Smart Saver', desc: 'Switched to a cost-efficient Philippine telco promo', unlocked: false, icon: '🏆' }
              ].map((badge, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    opacity: badge.unlocked ? 1 : 0.45,
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <div style={{ fontSize: '1.6rem' }}>{badge.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: badge.unlocked ? '#ffffff' : 'var(--on-surface-variant)' }}>
                      {badge.name} {badge.unlocked ? '✓' : '🔒'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--on-surface-variant)' }}>
                      {badge.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ACCOUNT / AUTH & APP PREFERENCES */}
        {activeTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="glass-panel glow-active" style={{ padding: '1.15rem', background: 'var(--surface-container-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                    {authUser ? (authUser.name ? `${authUser.name} (${authUser.phoneNumber})` : authUser.phoneNumber) : 'Guest Mode'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--neon-lime)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {authUser?.isLoggedIn ? '● LOCAL PROFILE' : 'DEMO MODE'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.45 }}>
                {authUser?.isLoggedIn
                  ? `Local device profile connected to ${authUser.telco} network.`
                  : 'You are currently using Loady in test/demo mode.'}
              </div>
            </div>

            {/* Quick App Preferences (Theme & Backup) */}
            <div style={{
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.85rem 1rem',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>Color Theme</div>
                <button
                  onClick={onToggleTheme}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                >
                  {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>Backup Local Data</div>
                <button
                  onClick={handleExportData}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                >
                  <Download size={13} /> Backup (JSON)
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderColor: 'rgba(244, 114, 182, 0.4)',
                color: 'var(--cyber-pink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.25rem'
              }}
            >
              <LogOut size={16} /> Switch Account / Re-test OTP Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
