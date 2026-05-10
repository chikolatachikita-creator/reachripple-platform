import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  const lastUpdated = 'May 2026';
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet>
        <title>Privacy Policy | ReachRipple</title>
        <meta name="description" content="ReachRipple privacy policy — how we collect, use, store, and protect your personal data under UK GDPR and the Data Protection Act 2018." />
      </Helmet>
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: {lastUpdated}</p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p>
              This policy explains how <strong>ReachRipple</strong> ("we", "us", "our") collects, uses,
              stores and shares your personal data when you use the website
              <em> reachripple-live-web.onrender.com</em> and any related services (the "Platform").
              We are the data controller of your personal data and we comply with the
              UK General Data Protection Regulation ("UK GDPR") and the Data Protection Act 2018.
            </p>

            <h3>1. Who we are &amp; how to contact us</h3>
            <p>
              ReachRipple operates this Platform. For any privacy-related question, to exercise your
              rights, or to raise a concern, contact us at
              {' '}<a href="mailto:privacy@reachripple.com">privacy@reachripple.com</a>.
              If you are not satisfied with our response, you have the right to complain to the
              UK Information Commissioner's Office (ICO) at
              {' '}<a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
            </p>

            <h3>2. Personal data we collect</h3>
            <ul>
              <li><strong>Account data:</strong> name or alias, email address, hashed password, date of birth (for age verification), account type (independent / agency).</li>
              <li><strong>Profile / listing data:</strong> photos, videos, descriptions, location (post-area only), pricing, services offered, contact methods you choose to display.</li>
              <li><strong>Verification data (KYC):</strong> for agency accounts and age/ID verification — government-issued ID images, selfies, business documents. These are stored securely, accessed only by our trust &amp; safety team, and deleted on request once verification is complete or the account is closed.</li>
              <li><strong>Communications:</strong> messages sent via on-platform chat, contact-form submissions, support tickets.</li>
              <li><strong>Transaction data:</strong> records of paid features (boosts, subscriptions). Card details are handled by our payment processor and never touch our servers.</li>
              <li><strong>Technical data:</strong> IP address, device / browser type, operating system, timezone, referrer, and pages viewed.</li>
              <li><strong>Cookies &amp; similar tech:</strong> see our <a href="/cookies">Cookie Policy</a>.</li>
            </ul>

            <h3>3. Why we use your data &amp; legal bases</h3>
            <ul>
              <li><strong>Create and operate your account</strong> — basis: contract.</li>
              <li><strong>Display your listing publicly</strong> (only fields you choose) — basis: contract.</li>
              <li><strong>Trust &amp; safety, fraud prevention, ID/age verification</strong> — basis: legitimate interests &amp; legal obligation.</li>
              <li><strong>Process payments for paid features</strong> — basis: contract.</li>
              <li><strong>Respond to your support requests</strong> — basis: legitimate interests.</li>
              <li><strong>Send service emails</strong> (verification, password reset, security alerts) — basis: contract / legitimate interests.</li>
              <li><strong>Send marketing emails</strong> — basis: consent (you can opt out at any time).</li>
              <li><strong>Comply with law-enforcement requests, court orders, or statutory duties</strong> — basis: legal obligation.</li>
            </ul>
            <p>
              Where we rely on <strong>special category data</strong> (e.g. data concerning sex life that may be inferred from
              certain listings), the legal basis is your <strong>explicit consent</strong>, which you provide when posting such a listing.
              You can withdraw that consent at any time by deleting the listing or your account.
            </p>

            <h3>4. Who we share your data with</h3>
            <p>We do not sell your personal data. We share it only with:</p>
            <ul>
              <li><strong>Hosting &amp; infrastructure:</strong> Render (web hosting, EU region) and MongoDB Atlas (database, EU region).</li>
              <li><strong>Email delivery:</strong> our transactional email provider for verification and security emails.</li>
              <li><strong>Payment processing:</strong> Stripe (or equivalent), which independently controls your card data under their own privacy policy.</li>
              <li><strong>Identity / age verification:</strong> our KYC provider for verified-status checks.</li>
              <li><strong>Anti-abuse:</strong> services such as Google reCAPTCHA to detect bots.</li>
              <li><strong>Law enforcement &amp; regulators:</strong> where we are legally required to disclose data, including under the UK Online Safety Act 2023 and Modern Slavery Act 2015.</li>
              <li><strong>Professional advisers:</strong> lawyers, auditors, and insurers, when strictly necessary.</li>
            </ul>
            <p>
              All processors are bound by written data-processing agreements that meet UK GDPR Article 28 requirements.
            </p>

            <h3>5. International transfers</h3>
            <p>
              Where personal data is transferred outside the UK / EEA, we rely on UK International Data Transfer
              Agreements, the EU Standard Contractual Clauses, or transfers to countries deemed adequate by
              the UK Government. You can request a copy of the safeguards in place by emailing us.
            </p>

            <h3>6. How long we keep your data</h3>
            <ul>
              <li><strong>Active account data:</strong> for as long as your account exists.</li>
              <li><strong>Listings:</strong> until you delete them, or up to 12 months after expiry for moderation evidence.</li>
              <li><strong>KYC / verification documents:</strong> deleted within 30 days of successful verification, unless we are required to retain them by law.</li>
              <li><strong>Transaction records:</strong> 6 years (UK tax law).</li>
              <li><strong>Server &amp; security logs:</strong> up to 90 days.</li>
              <li><strong>Closed-account audit trail:</strong> minimum data retained for up to 24 months for fraud and safety investigations, then deleted.</li>
            </ul>

            <h3>7. How we keep your data secure</h3>
            <ul>
              <li>HTTPS / TLS for all traffic.</li>
              <li>Passwords hashed with bcrypt; access tokens signed with rotated secrets.</li>
              <li>Role-based access controls; staff access to personal data is logged and audited.</li>
              <li>Rate limiting, anti-bot, and brute-force protection on sensitive endpoints.</li>
              <li>Regular dependency scanning and security patching.</li>
            </ul>
            <p>
              No system is 100% secure. If we detect a personal-data breach that is likely to result in a risk
              to your rights and freedoms, we will notify the ICO within 72 hours and you without undue delay.
            </p>

            <h3>8. Your rights</h3>
            <p>Under UK GDPR you have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal data we hold about you.</li>
              <li><strong>Rectify</strong> inaccurate or incomplete data.</li>
              <li><strong>Erase</strong> your data ("right to be forgotten") — you can delete your account from the dashboard.</li>
              <li><strong>Restrict</strong> or <strong>object to</strong> processing.</li>
              <li><strong>Data portability</strong> — receive your data in a machine-readable format.</li>
              <li><strong>Withdraw consent</strong> at any time where processing is based on consent.</li>
              <li><strong>Lodge a complaint</strong> with the ICO.</li>
            </ul>
            <p>
              To exercise any of these rights, email
              {' '}<a href="mailto:privacy@reachripple.com">privacy@reachripple.com</a>.
              We will respond within one month (extendable by two months for complex requests). We may need to verify
              your identity before acting on a request.
            </p>

            <h3>9. Children</h3>
            <p>
              The Platform is for adults aged 18 or over. We do not knowingly collect data from anyone under 18.
              If we become aware that a child has registered, we will delete the account and any associated data immediately.
              If you believe a child has provided us with personal data, please contact us.
            </p>

            <h3>10. Automated decision-making</h3>
            <p>
              We use automated systems to flag suspected fraud, spam, illegal content, and underage users.
              These systems support — but do not solely determine — moderation decisions; a human reviews material
              outcomes that affect your account.
            </p>

            <h3>11. Changes to this policy</h3>
            <p>
              We may update this policy from time to time. Material changes will be notified by email or a prominent
              notice on the Platform. The "Last updated" date at the top tells you when this policy was last revised.
            </p>

            <h3>12. Contact</h3>
            <p>
              Questions, requests, or complaints:
              {' '}<a href="mailto:privacy@reachripple.com">privacy@reachripple.com</a>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
