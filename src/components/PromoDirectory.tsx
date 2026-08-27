import React, { useState, useEffect } from 'react';
import { PHILIPPINE_PROMOS, recommendPromos, DATASET_LAST_VERIFIED_DATE } from '../services/promoData';
import { PromoItem, SimCard } from '../types';
import { calculateForecast } from '../services/burnRateEngine';
import { Search, Sparkles, Check, Copy, ExternalLink, Info, ShieldCheck } from 'lucide-react';

interface PromoDirectoryProps {
  activeSim: SimCard;
  sims?: SimCard[];
  onUpdateSim?: (updatedSim: SimCard) => void;
}

export const PromoDirectory: React.FC<PromoDirectoryProps> = ({
  activeSim,
  sims,
  onUpdateSim
}) => {
  const simList = sims && sims.length > 0 ? sims : [activeSim];
  const [selectedSimId, setSelectedSimId] = useState<string>(activeSim.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [calibratingPromo, setCalibratingPromo] = useState<PromoItem | null>(null);

  // Sync selectedSimId if the activeSim changes externally and previous selection is invalid
  useEffect(() => {
    if (!simList.some(s => s.id === selectedSimId)) {
      setSelectedSimId(activeSim.id);
    }
  }, [activeSim.id, simList, selectedSimId]);

  // Local view selection: does not change the global dashboard activeSim
  const selectedSim = simList.find(s => s.id === selectedSimId) || activeSim;

  const forecast = calculateForecast(selectedSim);
  const recommendation = recommendPromos(forecast.burnRateGbPerDay, selectedSim.telco);

  // Filter promos strictly matching the selected SIM's telco (with Sun migrated to Smart/TNT)
  const filteredPromos = PHILIPPINE_PROMOS.filter(promo => {
    const matchesTelco = selectedSim.telco === 'Sun'
      ? (promo.telco === 'Smart' || promo.telco === 'TNT')
      : promo.telco.toLowerCase() === selectedSim.telco.toLowerCase();

    let matchesCategory = true;
    if (selectedCategory === 'popular') {
      matchesCategory = promo.category === 'popular';
    } else if (selectedCategory === 'no_expiry') {
      matchesCategory = promo.isNoExpiry;
    } else if (selectedCategory === 'budget') {
      matchesCategory = promo.pricePhp <= 50;
    } else if (selectedCategory === 'heavy_data') {
      matchesCategory = promo.dataAllowanceMb >= 12 * 1024 || promo.validityDays >= 15;
    } else if (selectedCategory === 'unli') {
      matchesCategory = promo.category === 'unli' || promo.dataAllowanceMb >= 500 * 1024;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = q === '' ||
      promo.name.toLowerCase().includes(q) ||
      promo.telco.toLowerCase().includes(q) ||
      (promo.inclusions && promo.inclusions.toLowerCase().includes(q)) ||
      (promo.freebieDetails && promo.freebieDetails.toLowerCase().includes(q)) ||
      (promo.smsKeyword && promo.smsKeyword.toLowerCase().includes(q)) ||
      promo.highlights.some(h => h.toLowerCase().includes(q));

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

  const openGCashApp = (promo: PromoItem) => {
    const gcashUri = 'gcash://';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const storeUrl = isIOS
      ? 'https://apps.apple.com/ph/app/gcash/id520018961'
      : 'https://play.google.com/store/apps/details?id=com.globe.gcash.android';

    const startTime = Date.now();
    let appOpened = false;

    const handleBlurOrHide = () => {
      appOpened = true;
    };

    window.addEventListener('visibilitychange', handleBlurOrHide);
    window.addEventListener('blur', handleBlurOrHide);

    // Best-effort convenience launch of the base GCash app
    window.location.href = gcashUri;

    // If app fails to resolve / browser stays active after ~1.5s, fallback to store listing
    setTimeout(() => {
      window.removeEventListener('visibilitychange', handleBlurOrHide);
      window.removeEventListener('blur', handleBlurOrHide);

      const elapsed = Date.now() - startTime;
      if (!appOpened && !document.hidden && elapsed < 2500) {
        window.location.href = storeUrl;
      }
    }, 1500);

    // Provide secondary optional manual calibration step
    if (onUpdateSim) {
      setCalibratingPromo(promo);
    }
  };

  const handleConfirmCalibration = () => {
    if (!calibratingPromo || !onUpdateSim) return;
    const updated: SimCard = {
      ...selectedSim,
      activePromo: calibratingPromo.name,
      totalDataMb: calibratingPromo.dataAllowanceMb,
      remainingDataMb: calibratingPromo.dataAllowanceMb,
      expiryDate: calibratingPromo.isNoExpiry ? 'NO_EXPIRY' : new Date(Date.now() + calibratingPromo.validityDays * 24 * 60 * 60 * 1000).toISOString(),
      isNoExpiry: calibratingPromo.isNoExpiry,
      lastSyncAt: new Date().toISOString(),
      usageHistory: [
        ...(selectedSim.usageHistory || []),
        {
          id: 'promo-manual-' + Date.now(),
          timestamp: new Date().toISOString(),
          usedMb: 0,
          source: 'manual' as const,
          description: `Promo Calibrated: ${calibratingPromo.name} (${(calibratingPromo.dataAllowanceMb / 1024).toFixed(1)} GB)`
        }
      ].slice(-50)
    };
    onUpdateSim(updated);
    setCalibratingPromo(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Multi-SIM Local View Selector (Shown only when user has >1 SIM configured) */}
      {simList.length > 1 && (
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-label-caps" style={{ color: 'var(--on-surface-variant)', fontSize: '0.68rem' }}>
              PROMOS FOR SIM:
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              {selectedSim.telco} Network
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
            {simList.map(sim => {
              const isSelected = sim.id === selectedSim.id;
              return (
                <button
                  key={sim.id}
                  onClick={() => setSelectedSimId(sim.id)}
                  className="btn btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: isSelected ? 'var(--primary-container)' : 'var(--surface-container-low)',
                    color: isSelected ? 'var(--on-primary-container)' : 'var(--on-surface)',
                    border: isSelected ? '1px solid var(--electric-purple)' : '1px solid var(--glass-border)',
                    boxShadow: isSelected ? 'var(--glow-active)' : 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span className={`badge badge-${sim.telco.toLowerCase()}`} style={{ padding: '0.1rem 0.35rem', fontSize: '9px' }}>
                    {sim.telco}
                  </span>
                  <span>{sim.name}</span>
                  {isSelected && <Check size={12} color="var(--primary)" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sun Cellular Migration Informational Notice */}
      {selectedSim.telco === 'Sun' && (
        <div className="glass-panel" style={{
          padding: '0.85rem 1rem',
          background: 'rgba(251, 191, 36, 0.08)',
          border: '1px solid rgba(251, 191, 36, 0.25)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem'
        }}>
          <Info size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.78rem', color: 'var(--on-surface)', lineHeight: 1.45 }}>
            <strong style={{ color: '#fbbf24' }}>Sun Cellular Migration Notice:</strong> Sun Cellular has been fully integrated into Smart Prepaid & TNT. Sun SIM cards register using Smart & TNT promo packages via <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>*123#</code> or the Smart App.
          </div>
        </div>
      )}

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
          flexDirection: 'column',
          gap: '0.75rem',
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
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
                {recommendation.bestOverall.isNoExpiry ? 'No Expiry' : `${recommendation.bestOverall.validityDays} Days`} • {(recommendation.bestOverall.dataAllowanceMb / 1024).toFixed(0)} GB • ₱{recommendation.bestOverall.pricePhp}
              </div>
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '0.95rem',
              color: '#38bdf8'
            }}>
              ₱{recommendation.bestOverall.pricePhp} — {recommendation.bestOverall.telco}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
              Opens GCash — select {recommendation.bestOverall.telco} Load, ₱{recommendation.bestOverall.pricePhp}
            </div>

            <button
              onClick={() => openGCashApp(recommendation.bestOverall)}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.45rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'linear-gradient(135deg, #007DFC 0%, #0056b3 100%)',
                borderColor: '#007DFC',
                color: '#ffffff',
                boxShadow: '0 0 12px rgba(0, 125, 252, 0.35)'
              }}
            >
              <ExternalLink size={13} />
              Buy in GCash
            </button>
          </div>
        </div>
      </div>

      {/* Search, Category Filters & Freshness Banner */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Dataset Verification Header Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.75rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.7rem',
          color: 'var(--on-surface-variant)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} color="#4ade80" />
            Official Telco Catalog Snapshot
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--on-surface)' }}>
            Verified: {DATASET_LAST_VERIFIED_DATE}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={17} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${selectedSim.telco === 'Sun' ? 'Smart / TNT' : selectedSim.telco} promos (e.g. Magic Data, Level Up, Go+)...`}
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

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none' }}>
          {[
            { id: 'ALL', label: 'All Types' },
            { id: 'popular', label: '⭐ Popular' },
            { id: 'no_expiry', label: '♾️ No Expiry' },
            { id: 'budget', label: '🪙 Budget (≤₱50)' },
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
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
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
          SHOWING {filteredPromos.length} {selectedSim.telco === 'Sun' ? 'SMART / TNT' : selectedSim.telco.toUpperCase()} PROMOS
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
                gap: '0.75rem'
              }}
            >
              {/* Header row: Telco, Promo Name, Price & Allowance */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
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
                    {promo.dataAllowanceMb >= 500 * 1024 ? 'UNLIMITED' : `${(promo.dataAllowanceMb / 1024).toFixed(1)} GB`}
                  </div>
                </div>
              </div>

              {/* Confidence & Verified Date Badge row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {promo.confidence === 'high' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: '#4ade80',
                      background: 'rgba(74, 222, 128, 0.08)',
                      border: '1px solid rgba(74, 222, 128, 0.25)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-full)'
                    }}
                    title={`Verified against live official telco store listings on ${promo.lastVerifiedDate}`}
                  >
                    <Check size={11} color="#4ade80" /> Official Store Verified • {promo.lastVerifiedDate}
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: '#fbbf24',
                      background: 'rgba(251, 191, 36, 0.08)',
                      border: '1px solid rgba(251, 191, 36, 0.25)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                      cursor: 'help'
                    }}
                    title="App-exclusive / targeted menu promo (*123# or official telco app). Check menu before purchasing."
                  >
                    <Info size={11} color="#fbbf24" /> App / Targeted Promo • {promo.lastVerifiedDate}
                  </span>
                )}

                {promo.inclusions && (
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'var(--on-surface-variant)',
                    background: 'var(--surface-container-high)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--glass-border)'
                  }}>
                    ⚡ {promo.inclusions}
                  </span>
                )}
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

              {/* Prominent Telco & Amount Target for GCash Buy Load Flow */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 125, 252, 0.08)',
                border: '1px solid rgba(0, 125, 252, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem 0.75rem'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                  GCash Load Target:
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  color: '#38bdf8',
                  letterSpacing: '0.02em'
                }}>
                  ₱{promo.pricePhp} — {promo.telco}
                </span>
              </div>

              {/* Action row & Helper caption */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                marginTop: '0.2rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleCopyCode(promo)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.45rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
                  >
                    {isCopied ? <Check size={13} color="var(--neon-lime)" /> : <Copy size={13} />}
                    {isCopied ? 'Code Copied!' : promo.smsKeyword ? `SMS: ${promo.smsKeyword}` : promo.ussdCode || 'Register'}
                  </button>

                  <button
                    onClick={() => openGCashApp(promo)}
                    className="btn btn-primary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.45rem 0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'linear-gradient(135deg, #007DFC 0%, #0056b3 100%)',
                      borderColor: '#007DFC',
                      color: '#ffffff',
                      boxShadow: '0 0 12px rgba(0, 125, 252, 0.35)'
                    }}
                  >
                    <ExternalLink size={13} />
                    Buy in GCash
                  </button>
                </div>

                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--on-surface-variant)',
                  textAlign: 'right',
                  fontStyle: 'italic',
                  lineHeight: 1.3
                }}>
                  Opens GCash — select {promo.telco} Load, ₱{promo.pricePhp} to match this promo
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Calibration Confirmation Modal */}
      {calibratingPromo && (
        <div className="modal-backdrop" onClick={() => setCalibratingPromo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Sparkles size={20} color="var(--primary)" />
              <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                Calibrate SIM Balance
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Purchasing in GCash? Would you like to mark <strong style={{ color: '#ffffff' }}>{calibratingPromo.name}</strong> as active on <strong style={{ color: '#ffffff' }}>{selectedSim.name}</strong>?
            </p>

            <div style={{
              background: 'var(--surface-container-low)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Target SIM:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{selectedSim.name} ({selectedSim.telco})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Promo Quota:</span>
                <span style={{ color: 'var(--neon-lime)', fontWeight: 600 }}>
                  {calibratingPromo.dataAllowanceMb >= 500 * 1024 ? 'Unlimited' : `${(calibratingPromo.dataAllowanceMb / 1024).toFixed(1)} GB`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>Validity:</span>
                <span style={{ color: '#ffffff' }}>{calibratingPromo.isNoExpiry ? 'No Expiry' : `${calibratingPromo.validityDays} Days`}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCalibratingPromo(null)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
              >
                Skip / Keep Balance
              </button>
              <button
                onClick={handleConfirmCalibration}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
              >
                Calibrate SIM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
