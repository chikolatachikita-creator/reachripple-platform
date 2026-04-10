import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet><title>Terms of Service | ReachRipple</title></Helmet>
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900 dark:text-white">Terms of Service</h1>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <h3>1. Acceptance of Terms</h3>
            <p>
              By accessing and using ReachRipple ("the Platform"), you agree to comply with and be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>

            <h3>2. User Eligibility</h3>
            <p>
              You must be at least 18 years of age to use this Platform. By using the Platform, you represent and warrant that 
              you constitute a "Major" according to the laws of your jurisdiction.
            </p>

            <h3>3. Content Policies</h3>
            <p>
              Users are solely responsible for the content they post. We strictly prohibit:
            </p>
            <ul>
              <li>Content involving minors (under 18)</li>
              <li>Non-consensual content</li>
              <li>Promotion of human trafficking or coercion</li>
              <li>Illegal substances or weapons</li>
              <li>Violence or hate speech</li>
            </ul>

            <h3>4. Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately 
              of any unauthorized use of your account.
            </p>

            <h3>5. Payment & Refunds</h3>
            <p>
              Credits purchased for ad promotion are non-refundable generally, except where required by law. 
              We reserve the right to change our pricing structure at any time.
            </p>

            <h3>6. Limitation of Liability</h3>
            <p>
              ReachRipple is a platform for advertisers and users to connect. We generally do not screen or background check users 
              (though we offer verification tools). We are not responsible for the conduct of any user on or off the platform.
            </p>

            <h3>7. Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account at our sole discretion if we believe you have violated these Terms.
            </p>

            <h3>8. Contacts</h3>
            <p>
              For legal inquiries, please contact legal@reachripple.com.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
