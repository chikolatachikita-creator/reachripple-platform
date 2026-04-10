// src/components/trust/PlatformDisclaimer.jsx
import React from "react";

/**
 * PlatformDisclaimer — Compact legal disclaimer shown at the bottom of ad pages.
 */
export default function PlatformDisclaimer() {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-500 leading-relaxed">
      <p className="font-semibold text-zinc-600 mb-1">Platform Disclaimer</p>
      <p>
        ReachRipple is a classifieds platform that hosts user-generated content.
        We do not directly participate in, endorse, or facilitate any
        transactions between users. All listings are created by independent
        users or agencies and are subject to our{" "}
        <a href="/terms" className="underline hover:text-zinc-800">
          Terms of Service
        </a>
        . Users are responsible for ensuring their content complies with
        applicable laws. If you believe content violates our policies, please{" "}
        <a href="/contact" className="underline hover:text-zinc-800">
          report it
        </a>
        .
      </p>
    </div>
  );
}
