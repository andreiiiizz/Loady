import React, { useState, useEffect, Suspense } from 'react';
import { SimCard, AuthUser, PromoItem } from './types';
import {
  loadSims,
  saveSims,
  getActiveSimId,
  setActiveSimId,
  loadUserStats,
  UserStats,
  loadAuthUser,
  saveAuthUser,
  clearAuthUser
} from './services/storage';
import { applyAutoDecay, calculateForecast } from './services/burnRateEngine';
import { getLiveNetworkStatus } from './services/networkMonitor';

// Critical Instant Components (First Contentful Paint)
import { PhoneAuthView } from './components/PhoneAuthView';
import { Navbar } from './components/Navbar';
import { BottomNav, NavTab } from './components/BottomNav';
import { BurnRateCard } from './components/BurnRateCard';

// Lazy Loaded Secondary Modules
const AutoBalanceTracker = React.lazy(() =>
  import('./components/AutoBalanceTracker').then(m => ({ default: m.AutoBalanceTracker }))
);
const PromoDirectory = React.lazy(() =>
  import('./components/PromoDirectory').then(m => ({ default: m.PromoDirectory }))
);
const SettingsModal = React.lazy(() =>
  import('./components/SettingsModal').then(m => ({ default: m.SettingsModal }))
);

const TabLoadingFallback = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px', flexDirection: 'column', gap: '0.75rem' }}>
    <div style={{
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      border: '2px solid rgba(168, 85, 247, 0.2)',
      borderTopColor: 'var(--primary)',
      animation: 'spin 0.7s linear infinite'
    }} />
    <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
      Loading module...
    </span>
  </div>
);

export const App: React.FC = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(loadAuthUser());
  const [sims, setSims] = useState<SimCard[]>(loadSims());
  const [activeSimId, setActiveSimIdState] = useState<string>(getActiveSimId());
  const [userStats] = useState<UserStats>(loadUserStats());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active SIM pointer
  const activeSim = sims.find(s => s.id === activeSimId) || sims[0] || {
    id: 'default',
    name: 'Smart SIM',
    telco: 'Smart',
    activePromo: 'Power All 99',
    totalDataMb: 8192,
    remainingDataMb: 5120,
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    isNoExpiry: false,
    registeredAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    autoTrackingEnabled: true,
    usageProfile: 'moderate',
    regularBalancePhp: 20.0,
    usageHistory: []
  };

  // Sync theme attribute to document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Periodic real-time background decay calculation (every 30 seconds)
  useEffect(() => {
    if (!authUser) return;
    const timer = setInterval(() => {
      const liveNet = getLiveNetworkStatus();
      const isWifi = liveNet.wifiShieldActive || liveNet.isWifi;

      setSims(prevSims => {
        const updated = prevSims.map(sim => {
          if (!sim.autoTrackingEnabled) return sim;
          const { updatedSim } = applyAutoDecay(sim, {
            isWifiActive: isWifi,
            measuredSpeedMbps: liveNet.downlinkMbps
          });
          return updatedSim;
        });
        saveSims(updated);
        return updated;
      });
    }, 30000);

    return () => clearInterval(timer);
  }, [authUser]);

  // Handle Phone Auth Success
  const handleLoginSuccess = (user: AuthUser) => {
    saveAuthUser(user);
    setAuthUser(user);

    // If logging in with a specific carrier, sync primary SIM
    const updated = [...sims];
    if (updated[0]) {
      updated[0] = {
        ...updated[0],
        telco: user.telco,
        phoneNumber: user.phoneNumber,
        name: `Primary (${user.telco} 5G)`
      };
      setSims(updated);
      saveSims(updated);
    }
  };

  // Handle Guest / Skip for Testing
  const handleSkipGuest = () => {
    const guestUser: AuthUser = {
      name: 'Guest Tester',
      phoneNumber: '0919 123 4567',
      telco: 'Smart',
      isLoggedIn: false,
      isGuest: true,
      registeredAt: new Date().toISOString()
    };
    saveAuthUser(guestUser);
    setAuthUser(guestUser);
  };

  // Handle Logout
  const handleLogout = () => {
    clearAuthUser();
    setAuthUser(null);
  };

  // Update active SIM
  const handleUpdateActiveSim = (updatedSim: SimCard) => {
    const updated = sims.map(s => s.id === updatedSim.id ? updatedSim : s);
    setSims(updated);
    saveSims(updated);
  };

  // Select SIM
  const handleSelectSim = (simId: string) => {
    setActiveSimIdState(simId);
    setActiveSimId(simId);
  };

  // Add SIM
  const handleAddSim = (newSim: SimCard) => {
    const updated = [...sims, newSim];
    setSims(updated);
    saveSims(updated);
  };

  // Delete SIM
  const handleDeleteSim = (simId: string) => {
    if (sims.length <= 1) return;
    const updated = sims.filter(s => s.id !== simId);
    setSims(updated);
    saveSims(updated);
    if (activeSimId === simId) {
      handleSelectSim(updated[0].id);
    }
  };

  // Apply Selected Promo to Active SIM
  const handleSelectPromoForSim = (promo: PromoItem) => {
    const updated = sims.map(s => {
      if (s.id === activeSim.id) {
        return {
          ...s,
          activePromo: promo.name,
          totalDataMb: promo.dataAllowanceMb,
          remainingDataMb: promo.dataAllowanceMb,
          expiryDate: promo.isNoExpiry ? 'NO_EXPIRY' : new Date(Date.now() + promo.validityDays * 24 * 60 * 60 * 1000).toISOString(),
          isNoExpiry: promo.isNoExpiry,
          lastSyncAt: new Date().toISOString()
        };
      }
      return s;
    });
    setSims(updated);
    saveSims(updated);
    setCurrentTab('dashboard');
  };

  // If incoming Web Share Target is detected, ensure active tab is Dashboard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('share-target') || params.get('text')) {
        setCurrentTab('dashboard');
      }
    }
  }, []);

  // If not authenticated, show Phone Auth Screen
  if (!authUser) {
    return (
      <div className="app-container">
        <PhoneAuthView
          onLoginSuccess={handleLoginSuccess}
          onSkipGuest={handleSkipGuest}
        />
      </div>
    );
  }

  const forecast = calculateForecast(activeSim);
  const hasWarning = forecast.urgencyStatus === 'warning_24h' || forecast.urgencyStatus === 'critical_6h';

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <Navbar
        sims={sims}
        activeSim={activeSim}
        onSelectSim={handleSelectSim}
        onOpenMultiSim={() => setIsSettingsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Content Area */}
      <main style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentTab === 'dashboard' && (
          <BurnRateCard
            sim={activeSim}
          />
        )}

        {currentTab === 'autosync' && (
          <Suspense fallback={<TabLoadingFallback />}>
            <AutoBalanceTracker
              sim={activeSim}
              onUpdateSim={handleUpdateActiveSim}
            />
          </Suspense>
        )}

        {currentTab === 'promos' && (
          <Suspense fallback={<TabLoadingFallback />}>
            <PromoDirectory
              activeSim={activeSim}
              onSelectPromoForSim={handleSelectPromoForSim}
            />
          </Suspense>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        hasWarning={hasWarning}
      />

      {/* Settings & Multi-SIM Modal */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            sims={sims}
            activeSim={activeSim}
            onSelectSim={handleSelectSim}
            onUpdateSim={handleUpdateActiveSim}
            onAddSim={handleAddSim}
            onDeleteSim={handleDeleteSim}
            userStats={userStats}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            authUser={authUser}
            onLogout={handleLogout}
          />
        </Suspense>
      )}
    </div>
  );
};
export default App;

