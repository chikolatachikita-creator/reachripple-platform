import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet><title>Cookie Policy | ReachRipple</title></Helmet>
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cookie Policy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: March 2026</p>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">1. What Are Cookies?</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Cookies are small text files stored on your device when you visit a website. They help websites 
                function properly and provide information to site operators.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">2. Cookies We Use</h2>
              <p className="text-gray-600 dark:text-gray-300">
                ReachRipple uses only <strong>strictly necessary cookies</strong> that are essential for the website 
                to function. We do <strong>not</strong> use advertising, analytics, or third-party tracking cookies.
              </p>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b">Cookie Name</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b">Purpose</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b">Type</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">refreshToken</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Keeps you logged in securely (authentication)</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Strictly Necessary (HttpOnly)</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">7 days</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">rr_age_verified</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Remembers your age confirmation so you are not asked again</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Strictly Necessary (localStorage)</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Persistent</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">3. Why We Don't Need a Cookie Consent Banner</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Under the UK Privacy and Electronic Communications Regulations (PECR) and the EU ePrivacy Directive, 
                <strong> strictly necessary cookies do not require user consent</strong>. Since ReachRipple only uses 
                essential cookies required for authentication and site functionality, no consent banner is currently needed.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                If we introduce analytics, advertising, or third-party cookies in the future, we will implement a 
                full consent management platform before activating them.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">4. Managing Cookies</h2>
              <p className="text-gray-600 dark:text-gray-300">
                You can control cookies through your browser settings. Disabling essential cookies may prevent 
                you from logging in or using core features of the platform. Instructions for managing cookies 
                in popular browsers:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Chrome: Settings → Privacy and Security → Cookies</li>
                <li>Firefox: Settings → Privacy & Security → Cookies</li>
                <li>Safari: Preferences → Privacy → Cookies</li>
                <li>Edge: Settings → Privacy → Cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">5. Changes to This Policy</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We may update this Cookie Policy from time to time. Any changes will be posted on this page 
                with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">6. Contact Us</h2>
              <p className="text-gray-600 dark:text-gray-300">
                If you have questions about our use of cookies, contact us at{' '}
                <a href="mailto:privacy@reachripple.com" className="text-purple-600 hover:underline">privacy@reachripple.com</a>.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                See also our <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link> and{' '}
                <Link to="/terms" className="text-purple-600 hover:underline">Terms of Service</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
