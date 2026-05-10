import React from 'react';

/**
 * Verification Badge Component
 * Shows trust and verification status with tooltip
 */
export default function VerificationBadges({ profile = {} }) {
  const badges = [];

  // Verified profile — trust teal per palette
  if (profile.isVerified) {
    badges.push({
      id: 'verified',
      icon: '✓',
      label: 'Verified Profile',
      color: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
      borderColor: 'border-teal-200 dark:border-teal-700'
    });
  }

  // Video verification — trust teal (deeper) so it visually groups with Verified
  if (profile.hasVideoVerification) {
    badges.push({
      id: 'video',
      icon: '🎥',
      label: 'Video Verified',
      color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200',
      borderColor: 'border-teal-300 dark:border-teal-700'
    });
  }

  // Premium member
  if (profile.isPremium) {
    badges.push({
      id: 'premium',
      icon: '⭐',
      label: 'Premium Member',
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-700'
    });
  }

  // High rating
  if (profile.averageRating && profile.averageRating >= 4.5) {
    badges.push({
      id: 'rating',
      icon: '⭐',
      label: `${profile.averageRating.toFixed(1)}★ Rating`,
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-700'
    });
  }

  // Response time
  if (profile.responseTime) {
    badges.push({
      id: 'response',
      icon: '⚡',
      label: `Responds in ${profile.responseTime}`,
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      borderColor: 'border-green-200 dark:border-green-700'
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color} ${badge.borderColor} transition-transform hover:scale-105 cursor-help`}
          title={badge.label}
        >
          <span>{badge.icon}</span>
          <span className="hidden sm:inline">{badge.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Trust Score Component
 * Shows overall profile trustworthiness
 */
export function TrustScore({ profile = {} }) {
  let score = 0;

  if (profile.isVerified) score += 25;
  if (profile.hasVideoVerification) score += 25;
  if (profile.averageRating && profile.averageRating >= 4.5) score += 20;
  if (profile.responseTime) score += 15;
  if (profile.profileCompleteness && profile.profileCompleteness > 0.8) score += 15;

  const getTrustLevel = () => {
    if (score >= 80) return { level: 'Excellent', color: 'bg-green-500', textColor: 'text-green-600' };
    if (score >= 60) return { level: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' };
    if (score >= 40) return { level: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    return { level: 'New', color: 'bg-gray-500', textColor: 'text-gray-600' };
  };

  const trust = getTrustLevel();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trust Score</span>
        <span className={`text-sm font-bold ${trust.textColor}`}>{score}%</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${trust.color} transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className={`text-xs font-semibold ${trust.textColor}`}>{trust.level} Trust Level</p>
    </div>
  );
}
