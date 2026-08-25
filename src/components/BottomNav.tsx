import React from 'react';
import { Gauge, Zap, Tag } from 'lucide-react';

export type NavTab = 'dashboard' | 'autosync' | 'promos';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  hasWarning?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  hasWarning
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: Gauge, badge: hasWarning ? '!' : null },
    { id: 'autosync' as NavTab, label: 'Auto Sync', icon: Zap },
    { id: 'promos' as NavTab, label: 'Promos', icon: Tag }
  ];

  return (
    <nav className="floating-bottom-nav">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`nav-item-btn ${isActive ? 'active' : ''}`}
            title={tab.label}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {tab.badge && !isActive && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  background: 'var(--cyber-pink)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--glow-pink)'
                }}>
                  {tab.badge}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
};

