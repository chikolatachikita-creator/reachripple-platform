// src/components/BoostModal.jsx
import React, { useState, useEffect } from 'react';
import { getBoostPricing, purchaseBoost } from '../api/boost';
import { useToastContext } from '../context/ToastContextGlobal';

const TIER_INFO = {
  FEATURED: {
    name: 'Featured',
    color: 'from-amber-500 to-orange-500',
    icon: '⭐',
    description: 'Top carousel position with maximum visibility',
    features: [
      'Featured in top carousel',
      'Priority in search results',
      'Gold badge on profile',
      'Maximum exposure'
    ]
  },
  PRIORITY_PLUS: {
    name: 'Priority Plus',
    color: 'from-purple-500 to-pink-500',
    icon: '💎',
    description: 'Premium placement above standard and priority',
    features: [
      'Higher search ranking',
      'Premium badge on profile',
      'Above priority listings',
      'Increased visibility'
    ]
  },
  PRIORITY: {
    name: 'Priority',
    color: 'from-blue-500 to-indigo-500',
    icon: '🚀',
    description: 'Higher placement above standard listings',
    features: [
      'Boosted search ranking',
      'Priority badge',
      'Above standard listings'
    ]
  },
  STANDARD: {
    name: 'Standard',
    color: 'from-slate-500 to-slate-600',
    icon: '📋',
    description: 'Basic paid listing for escort ads',
    features: [
      'Listed in escort section',
      'Standard visibility',
      'Basic listing'
    ]
  },
};

const ADDON_INFO = {
  HIGHLIGHT: {
    name: 'Highlight',
    color: 'from-yellow-500 to-amber-500',
    icon: '✨',
    description: 'Visual highlight border for extra attention',
    features: [
      'Eye-catching highlight border',
      'Stand out in listings'
    ]
  },
  EXTERNAL_LINK: {
    name: 'External Link',
    color: 'from-emerald-500 to-teal-500',
    icon: '🔗',
    description: 'Add external website link to your profile',
    features: [
      'Link to your website',
      'Drive external traffic'
    ]
  }
};

const DURATION_OPTIONS = [
  { days: 1, label: '1 Day' },
  { days: 3, label: '3 Days' },
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' }
];

export default function BoostModal({ isOpen, onClose, ad }) {
  const { showSuccess, showError } = useToastContext();
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [error, setError] = useState('');

  // Fetch pricing when modal opens
  useEffect(() => {
    if (isOpen && ad) {
      fetchPricing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ad]);

  const fetchPricing = async () => {
    setLoading(true);
    setError('');
    try {
      const location = ad.location || 'gb';
      const data = await getBoostPricing(location, selectedDuration);
      setPricing(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setError('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  // Refetch when duration changes
  useEffect(() => {
    if (isOpen && ad && !loading) {
      fetchPricing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDuration]);

  const handlePurchase = async () => {
    if (!selectedTier) {
      showError?.('Please select a tier');
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchaseBoost(ad._id, selectedTier, selectedDuration);
      showSuccess?.(result.message || 'Boost purchased successfully!');
      onClose();
    } catch (err) {
      console.error('Purchase failed:', err);
      const errorData = err.response?.data;
      if (errorData?.code === 'FEATURED_SOLD_OUT' || errorData?.code === 'PRIORITY_PLUS_SOLD_OUT') {
        showError?.(errorData.error || 'This tier is currently sold out in your area');
        if (errorData.suggested?.tier) {
          setSelectedTier(errorData.suggested.tier);
        }
      } else {
        showError?.(errorData?.error || 'Failed to purchase boost');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const getPrice = (tierName) => {
    const tier = (pricing || []).find(p => p.tier === tierName);
    return tier?.finalPriceGBP || 0;
  };

  const getAvailableSlots = (tierName) => {
    const tier = (pricing || []).find(p => p.tier === tierName);
    return tier?.availableSlots;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Boost Your Ad</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {ad?.title} • {ad?.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchPricing}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Duration Selector */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Duration</h3>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.days}
                      onClick={() => setSelectedDuration(opt.days)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedDuration === opt.days
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Listing Tiers */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {/* Featured */}
                <TierCard
                  tier="FEATURED"
                  info={TIER_INFO.FEATURED}
                  price={getPrice('FEATURED')}
                  availableSlots={getAvailableSlots('FEATURED')}
                  selected={selectedTier === 'FEATURED'}
                  onSelect={() => setSelectedTier('FEATURED')}
                  duration={selectedDuration}
                />
                
                {/* Priority Plus */}
                <TierCard
                  tier="PRIORITY_PLUS"
                  info={TIER_INFO.PRIORITY_PLUS}
                  price={getPrice('PRIORITY_PLUS')}
                  availableSlots={getAvailableSlots('PRIORITY_PLUS')}
                  selected={selectedTier === 'PRIORITY_PLUS'}
                  onSelect={() => setSelectedTier('PRIORITY_PLUS')}
                  duration={selectedDuration}
                />
                
                {/* Priority */}
                <TierCard
                  tier="PRIORITY"
                  info={TIER_INFO.PRIORITY}
                  price={getPrice('PRIORITY')}
                  availableSlots={getAvailableSlots('PRIORITY')}
                  selected={selectedTier === 'PRIORITY'}
                  onSelect={() => setSelectedTier('PRIORITY')}
                  duration={selectedDuration}
                />

                {/* Standard */}
                <TierCard
                  tier="STANDARD"
                  info={TIER_INFO.STANDARD}
                  price={getPrice('STANDARD')}
                  availableSlots={getAvailableSlots('STANDARD')}
                  selected={selectedTier === 'STANDARD'}
                  onSelect={() => setSelectedTier('STANDARD')}
                  duration={selectedDuration}
                />
              </div>

              {/* Add-ons */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Add-ons</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <TierCard
                    tier="HIGHLIGHT"
                    info={ADDON_INFO.HIGHLIGHT}
                    price={getPrice('HIGHLIGHT')}
                    selected={selectedTier === 'HIGHLIGHT'}
                    onSelect={() => setSelectedTier('HIGHLIGHT')}
                    duration={selectedDuration}
                    compact
                  />
                  <TierCard
                    tier="EXTERNAL_LINK"
                    info={ADDON_INFO.EXTERNAL_LINK}
                    price={getPrice('EXTERNAL_LINK')}
                    selected={selectedTier === 'EXTERNAL_LINK'}
                    onSelect={() => setSelectedTier('EXTERNAL_LINK')}
                    duration={selectedDuration}
                    compact
                  />
                </div>
              </div>

              {/* Purchase Button */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
                <div>
                  {selectedTier && (
                    <p className="text-slate-600 dark:text-slate-400">
                      Selected: <span className="font-semibold text-slate-900 dark:text-white">{(TIER_INFO[selectedTier] || ADDON_INFO[selectedTier])?.name}</span>
                      {' for '}
                      <span className="font-bold text-emerald-600">£{getPrice(selectedTier).toFixed(2)}</span>
                      <span className="text-xs text-slate-500 ml-1">/ {selectedDuration} days</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={!selectedTier || purchasing}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30"
                  >
                    {purchasing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      'Purchase Boost'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Tier Card Component
function TierCard({ tier, info, price, availableSlots, selected, onSelect, duration, compact = false }) {
  const hasFiniteCap = Number.isFinite(availableSlots);
  const soldOut = hasFiniteCap && availableSlots <= 0;
  const lowStock = hasFiniteCap && availableSlots > 0 && availableSlots <= 5;
  
  return (
    <button
      onClick={onSelect}
      disabled={soldOut}
      className={`relative p-5 rounded-2xl text-left transition-all ${
        selected
          ? `ring-2 ring-offset-2 ring-purple-500 bg-gradient-to-br ${info.color} text-white shadow-xl`
          : soldOut
            ? 'bg-slate-100 dark:bg-slate-700/50 opacity-60 cursor-not-allowed'
            : 'bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500'
      } ${compact ? '' : 'h-full'}`}
    >
      {soldOut && (
        <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">
          SOLD OUT
        </span>
      )}
      
      {lowStock && (
        <span className={`absolute top-3 right-3 px-2 py-1 text-xs font-bold rounded-lg ${
          selected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
        }`}>
          {availableSlots} left
        </span>
      )}
      
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{info.icon}</span>
        <h4 className={`font-bold ${compact ? 'text-base' : 'text-lg'} ${selected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {info.name}
        </h4>
      </div>
      
      {!compact && (
        <p className={`text-sm mb-4 ${selected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
          {info.description}
        </p>
      )}
      
      {!compact && (
        <ul className={`space-y-2 mb-4 ${selected ? 'text-white/90' : 'text-slate-600 dark:text-slate-300'}`}>
          {info.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <svg className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-white' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      )}
      
      <div className={`${compact ? 'mt-2' : 'pt-4 border-t'} ${selected ? 'border-white/20' : 'border-slate-200 dark:border-slate-600'}`}>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black ${selected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            £{price.toFixed(2)}
          </span>
          <span className={`text-sm ${selected ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
            / {duration} days
          </span>
        </div>
      </div>
    </button>
  );
}
