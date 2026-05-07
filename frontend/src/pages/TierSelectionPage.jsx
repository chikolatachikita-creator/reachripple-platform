import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Crown,
  Star,
  Zap,
  Sparkles,
  Check,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Shield,
  Eye,
  Image,
  Video,
  Clock,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  getTierPlans,
  getMySubscription,
  upgradeTier,
  cancelSubscription,
  toggleAutoRenewal,
} from "../api/tiers";
import { useToastContext } from "../context/ToastContextGlobal";
import { useAuth } from "../context/AuthContext";
import { useConfirmModal } from "../components/ConfirmModal";

// ===== TIER VISUAL CONFIG =====
const TIER_STYLES = {
  free: {
    gradient: "from-zinc-100 to-zinc-200",
    border: "border-zinc-300",
    badge: "bg-zinc-100 text-zinc-700",
    icon: Shield,
    accent: "text-zinc-600",
    ring: "ring-zinc-300",
  },
  standard: {
    gradient: "from-blue-50 to-indigo-100",
    border: "border-blue-300",
    badge: "bg-blue-100 text-blue-700",
    icon: Star,
    accent: "text-blue-600",
    ring: "ring-blue-300",
  },
  prime: {
    gradient: "from-purple-50 to-fuchsia-100",
    border: "border-purple-400",
    badge: "bg-purple-100 text-purple-700",
    icon: Zap,
    accent: "text-purple-600",
    ring: "ring-purple-400",
  },
  spotlight: {
    gradient: "from-amber-50 to-orange-100",
    border: "border-amber-400",
    badge: "bg-amber-100 text-amber-700",
    icon: Crown,
    accent: "text-amber-600",
    ring: "ring-amber-400",
  },
  agency_starter: {
    gradient: "from-teal-50 to-cyan-100",
    border: "border-teal-300",
    badge: "bg-teal-100 text-teal-700",
    icon: Sparkles,
    accent: "text-teal-600",
    ring: "ring-teal-300",
  },
  agency_pro: {
    gradient: "from-violet-50 to-purple-100",
    border: "border-violet-400",
    badge: "bg-violet-100 text-violet-700",
    icon: Zap,
    accent: "text-violet-600",
    ring: "ring-violet-400",
  },
  agency_elite: {
    gradient: "from-rose-50 to-pink-100",
    border: "border-rose-400",
    badge: "bg-rose-100 text-rose-700",
    icon: Crown,
    accent: "text-rose-600",
    ring: "ring-rose-400",
  },
};

// ===== FEATURE ICONS =====
function FeatureIcon({ feature }) {
  if (feature.includes("image")) return <Image className="w-4 h-4 text-zinc-400" />;
  if (feature.includes("video")) return <Video className="w-4 h-4 text-zinc-400" />;
  if (feature.includes("bump") || feature.includes("cooldown"))
    return <Clock className="w-4 h-4 text-zinc-400" />;
  if (feature.includes("visibility") || feature.includes("placement"))
    return <Eye className="w-4 h-4 text-zinc-400" />;
  if (feature.includes("Dashboard")) return <BarChart3 className="w-4 h-4 text-zinc-400" />;
  if (feature.includes("boost") || feature.includes("discount"))
    return <Zap className="w-4 h-4 text-zinc-400" />;
  return <Check className="w-4 h-4 text-emerald-500" />;
}

export default function TierSelectionPage() {
  const { showSuccess, showError } = useToastContext();
  const { user } = useAuth();
  const { confirm, ConfirmModal } = useConfirmModal();

  // State
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [currentTier, setCurrentTier] = useState("free");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null); // slug being upgraded
  const [cancelling, setCancelling] = useState(false);
  const [showCategory, setShowCategory] = useState("individual");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [plansData, subData] = await Promise.all([
        getTierPlans(),
        getMySubscription().catch(() => ({ subscription: null, currentTier: "free" })),
      ]);
      setPlans(plansData);
      setSubscription(subData.subscription);
      setCurrentTier(subData.currentTier);
    } catch {
      showError("Failed to load tier plans");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(slug) {
    if (upgrading) return;
    setUpgrading(slug);
    try {
      const result = await upgradeTier(slug, billingCycle);
      showSuccess(result.message);
      setSubscription(result.subscription);
      setCurrentTier(result.newTier);
      await loadData(); // refresh data
    } catch (err) {
      const msg = err?.response?.data?.message || "Upgrade failed";
      showError(msg);
    } finally {
      setUpgrading(null);
    }
  }

  async function handleCancel() {
    if (cancelling) return;
    const ok = await confirm({
      title: "Cancel subscription?",
      message: subscription?.currentPeriodEnd
        ? `Your plan will remain active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()} and won’t renew. You can resubscribe at any time.`
        : "Your plan will be cancelled and won’t renew. You can resubscribe at any time.",
      type: "warning",
      confirmText: "Cancel plan",
      cancelText: "Keep plan",
    });
    if (!ok) return;
    setCancelling(true);
    try {
      const result = await cancelSubscription();
      showSuccess(result.message);
      await loadData();
    } catch (err) {
      showError(err?.response?.data?.message || "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  async function handleToggleRenewal() {
    try {
      const result = await toggleAutoRenewal();
      showSuccess(result.message);
      await loadData();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to toggle renewal");
    }
  }

  // Filter plans by category
  const filteredPlans = plans.filter((p) => p.category === showCategory);
  const hasAgencyAccess = user?.accountType === "agency";

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <ConfirmModal />
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Choose Your Plan</h1>
          <p className="text-zinc-500 mt-1">
            Upgrade to unlock more escort ads, better visibility, and premium features.
          </p>
          <p className="text-sm text-emerald-600 font-medium mt-2">
            💡 Non-escort categories (massage, dating, jobs, etc.) are completely free to post.
          </p>

        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Active subscription banner */}
        {subscription && (
          <div className="mb-8 bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500 uppercase tracking-wide font-medium">
                  Current Plan
                </p>
                <p className="text-xl font-bold text-zinc-900 mt-0.5">
                  {subscription.tierName}
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    ({subscription.billingCycle})
                  </span>
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  {subscription.status === "cancelled" ? (
                    <span className="text-amber-600">
                      Cancels on{" "}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  ) : (
                    <>
                      Renews{" "}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      {subscription.autoRenew ? "" : " (auto-renew off)"}
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {subscription.status === "active" && (
                  <>
                    <button
                      onClick={handleToggleRenewal}
                      className="px-4 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {subscription.autoRenew ? "Turn off auto-renew" : "Turn on auto-renew"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancelling ? "Cancelling..." : "Cancel Plan"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 border border-zinc-200 inline-flex">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "yearly"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-emerald-500 font-bold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Category tabs (only show if agency access) */}
        {hasAgencyAccess && (
          <div className="flex justify-center mb-6 gap-2">
            <button
              onClick={() => setShowCategory("individual")}
              className={`px-5 py-2 rounded-lg text-sm font-medium border transition-all ${
                showCategory === "individual"
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              Individual Plans
            </button>
            <button
              onClick={() => setShowCategory("agency")}
              className={`px-5 py-2 rounded-lg text-sm font-medium border transition-all ${
                showCategory === "agency"
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              Agency Plans
            </button>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPlans.map((plan) => {
            const style = TIER_STYLES[plan.slug] || TIER_STYLES.free;
            const Icon = style.icon;
            const isCurrent = currentTier === plan.slug || 
              (plan.slug === "free" && currentTier === "free" && !subscription);
            const monthlyEquivalent =
              billingCycle === "yearly"
                ? ((plan.priceYearly || plan.priceMonthly * 12) / 12).toFixed(2)
                : null;

            return (
              <div
                key={plan.slug}
                className={`relative bg-gradient-to-br ${style.gradient} rounded-2xl border-2 ${
                  isCurrent ? `${style.border} ${style.ring} ring-2` : "border-zinc-200"
                } p-6 flex flex-col transition-all hover:shadow-lg`}
              >
                {/* Current badge */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`${style.badge} text-xs font-bold uppercase px-3 py-1 rounded-full`}
                    >
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Popular badge */}
                {plan.slug === "prime" && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-bold uppercase px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="text-center mb-4 mt-2">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${style.badge} mb-3`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="text-center mb-5">
                  {plan.priceMonthly === 0 ? (
                    <p className="text-3xl font-bold text-zinc-900">Free</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-zinc-900">
                        £{billingCycle === "yearly" ? monthlyEquivalent : plan.priceMonthly.toFixed(2)}
                        <span className="text-sm font-normal text-zinc-500">/mo</span>
                      </p>
                      {billingCycle === "yearly" && (
                        <p className="text-xs text-zinc-500 mt-1">
                          £{(plan.priceYearly || plan.priceMonthly * 12).toFixed(2)} billed yearly
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/60 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-zinc-900">{plan.maxAds}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Active Ads</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-zinc-900">{plan.maxImages}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Images/Ad</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-zinc-900">{plan.maxVideos}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Videos/Ad</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-zinc-900">
                      {plan.visibilityMultiplier}×
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Visibility</p>
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-2 mb-5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-700">
                      <FeatureIcon feature={f} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-white/50 text-zinc-500 text-sm font-medium cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : plan.priceMonthly === 0 ? (
                  <p className="text-center text-xs text-zinc-400 py-3">
                    Available by default
                  </p>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.slug)}
                    disabled={!!upgrading}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      upgrading === plan.slug
                        ? "bg-zinc-300 text-zinc-600"
                        : `bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]`
                    } disabled:opacity-60`}
                  >
                    {upgrading === plan.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Upgrade
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-zinc-900 mb-4 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "What happens when I upgrade?",
                a: "Your new tier takes effect immediately. If upgrading, you receive a pro-rata credit for unused time on your current plan.",
              },
              {
                q: "What happens when I downgrade?",
                a: "If your new tier allows fewer ads, excess ads will be hidden (not deleted). You can re-activate them later.",
              },
              {
                q: "How does billing work?",
                a: "Tiers are paid directly in GBP (£). Your plan activates immediately on upgrade and auto-renews at the end of each billing period.",
              },
              {
                q: "Can I cancel my subscription?",
                a: "Yes, you can cancel anytime. You'll retain access to your tier features until the end of your current billing period.",
              },
            ].map(({ q, a }, i) => (
              <details key={i} className="bg-white rounded-lg border border-zinc-200 group">
                <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-zinc-800 flex items-center justify-between list-none">
                  {q}
                  <ChevronRight className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-4 text-sm text-zinc-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
