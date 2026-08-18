import React, { useState } from 'react';
import { PHILIPPINE_PROMOS, recommendPromos } from '../services/promoData';
import { PromoItem, SimCard } from '../types';
import { calculateForecast } from '../services/burnRateEngine';
import { Search, Sparkles, Check, Copy } from 'lucide-react';

interface PromoDirectoryProps {
  activeSim: SimCard;
  onSelectPromoForSim: (promo: PromoItem) => void;
}

export const PromoDirectory: React.FC<PromoDirectoryProps> = ({
  activeSim,
  onSelectPromoForSim
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTelco, setSelectedTelco] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const forecast = calculateForecast(activeSim);
  const recommendation = recommendPromos(forecast.burnRateGbPerDay, activeSim.telco);

  // Filter promos
  const filteredPromos = PHILIPPINE_PROMOS.filter(promo => {
    const matchesTelco = selectedTelco === 'ALL' || promo.telco === selectedTelco;
    const matchesCategory = selectedCategory === 'ALL' || promo.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      promo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.telco.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (promo.freebieDetails && promo.freebieDetails.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTelco && matchesCategory && matchesSearch;
  });

  const handleCopyCode = (promo: PromoItem) => {
    const code = promo.smsKeyword ? `Send ${promo.smsKeyword} to ${promo.smsSendTo}` : promo.ussdCode || 'Dial *143#';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(promo.id);
      setTimeout(() => setCopiedCodeId(null), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Smart Switch Optimizer Card */}
      <div className="glass-panel glow-active" style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(183, 109, 255, 0.05))',
        border: '1px solid rgba(221, 183, 255, 0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={20} color="var(--primary)" />
          <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
            Smart Promo Switch Optimizer
          </h3>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', lineHeight: 1.45, marginBottom: '1rem' }}>
          {recommendation.savingsInsight}
        </p>

        {/* Recommended Promo Highlight Box */}
        <div style={{
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--glass-border)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className={`badge badge-${recommendation.bestOverall.telco.toLowerCase()}`}>
                {recommendation.bestOverall.telco}
              </span>
              <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                {recommendation.bestOverall.name}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              {(recommendation.bestOverall.dataAllowanceMb / 1024).toFixed(0)} GB • ₱{recommendation.bestOverall.pricePhp} • {recommendation.bestOverall.validityDays} Days
            </div>
          </div>

          <button
            onClick={() => onSelectPromoForSim(recommendation.bestOverall)}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
          >
            Apply Promo
          </button>
        </div>
      </div>

      {/* Search & Carrier Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={17} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search promos (e.g. Magic Data, GoEXTRA, Unli TikTok)..."
            style={{
              width: '100%',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem 0.75rem 0.75rem 2.4rem',
              color: 'var(--on-surface)',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Carrier Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
          {['ALL', 'Smart', 'Globe', 'DITO', 'GOMO', 'TM', 'TNT'].map(t => (
            <button
              key={t}
              onClick={() => setSelectedTelco(t)}
              className="btn btn-sm"
              style={{
                background: selectedTelco === t ? 'var(--primary-container)' : 'var(--glass-surface)',
                color: selectedTelco === t ? 'var(--on-primary-container)' : 'var(--on-surface)',
                border: selectedTelco === t ? '1px solid var(--electric-purple)' : '1px solid var(--glass-border)',
                boxShadow: selectedTelco === t ? 'var(--glow-active)' : 'none',
                fontWeight: 700,
                fontSize: '0.72rem',
                padding: '0.35rem 0.7rem',
                borderRadius: 'var(--radius-full)'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
          {[
            { id: 'ALL', label: 'All Types' },
            { id: 'popular', label: '⭐ Popular' },
            { id: 'no_expiry', label: '♾️ No Expiry' },
            { id: 'budget', label: '🪙 Budget (₱30-₱50)' },
            { id: 'heavy_data', label: '🚀 Heavy Data' },
            { id: 'unli', label: '⚡ Unlimited' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="btn btn-sm"
              style={{
                background: selectedCategory === cat.id ? 'var(--surface-container-highest)' : 'transparent',
                color: selectedCategory === cat.id ? 'var(--primary)' : 'var(--on-surface-variant)',
                border: selectedCategory === cat.id ? '1px solid var(--electric-purple)' : '1px solid transparent',
                fontSize: '0.72rem',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-full)'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Promos Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div className="font-label-caps" style={{ color: 'var(--on-surface-variant)' }}>
          SHOWING {filteredPromos.length} PHILIPPINE PROMOS
        </div>

        {filteredPromos.map(promo => {
          const isCopied = copiedCodeId === promo.id;

          return (
            <div
              key={promo.id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span className={`badge badge-${promo.telco.toLowerCase()}`}>
                      {promo.telco}
                    </span>
                    <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>
                      {promo.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                    {promo.isNoExpiry ? 'No Expiry Data' : `${promo.validityDays} Days Validity`} • ₱{promo.costPerGb.toFixed(2)}/GB
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    ₱{promo.pricePhp}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                    {promo.dataAllowanceMb >= 100 * 1024 ? 'UNLIMITED' : `${(promo.dataAllowanceMb / 1024).toFixed(1)} GB`}
                  </div>
                </div>
              </div>

              {promo.freebieDetails && (
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--on-surface-variant)',
                  background: 'var(--surface-container-low)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)'
                }}>
                  🎁 {promo.freebieDetails}
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '0.4rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid var(--glass-border)'
              }}>
                <button
                  onClick={() => handleCopyCode(promo)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {isCopied ? <Check size={13} color="var(--neon-lime)" /> : <Copy size={13} />}
                  {isCopied ? 'Code Copied!' : promo.smsKeyword ? `SMS: ${promo.smsKeyword}` : promo.ussdCode || 'Register'}
                </button>

                <button
                  onClick={() => onSelectPromoForSim(promo)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.85rem' }}
                >
                  Set Active
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
