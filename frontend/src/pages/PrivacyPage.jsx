import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet><title>Privacy Policy | ReachRipple</title></Helmet>
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900 dark:text-white">Privacy Policy</h1>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <h3>1. Introduction</h3>
            <p>
              We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you 
              as to how we look after your personal data when you visit our website and tell you about your privacy rights.
            </p>

            <h3>2. Data We Collect</h3>
            <p>
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
            </p>
            <ul>
              <li><strong>Identity Data:</strong> Username, date of birth.</li>
              <li><strong>Contact Data:</strong> Email address.</li>
              <li><strong>Technical Data:</strong> IP address, browser type and version, time zone setting and location.</li>
              <li><strong>Usage Data:</strong> Information about how you use our website, products and services.</li>
            </ul>

            <h3>3. How We Use Your Data</h3>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul>
              <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
              <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal or regulatory obligation.</li>
            </ul>

            <h3>4. Data Security</h3>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
            </p>

            <h3>5. Data Retention</h3>
            <p>
              We will only retain your personal data for as long as necessary to fulfil the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
            </p>

            <h3>6. Your Legal Rights</h3>
            <p>
              Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
            </p>

            <h3>7. Contact Us</h3>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact us at privacy@reachripple.com.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
