import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function LawEnforcementPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet><title>Law Enforcement Guidelines | ReachRipple</title></Helmet>
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Law Enforcement Guidelines</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Information for law enforcement agencies and regulatory authorities</p>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mt-0">Emergency Contacts</h2>
              <p className="text-blue-700 dark:text-blue-300 mb-2">
                For urgent matters involving imminent danger or child safety:
              </p>
              <ul className="list-none pl-0 text-blue-700 dark:text-blue-300 space-y-1">
                <li><strong>Emergency Email:</strong> <a href="mailto:compliance@reachripple.com" className="underline">compliance@reachripple.com</a></li>
                <li><strong>Subject Line:</strong> [URGENT-LE] followed by your reference number</li>
              </ul>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                Emergency requests are prioritised and acknowledged within 4 hours.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">1. About ReachRipple</h2>
              <p className="text-gray-600 dark:text-gray-300">
                ReachRipple is an online classified advertising platform. We do not provide, manage, 
                or facilitate any services advertised on the platform. Advertisers are independent users 
                who create their own listings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">2. Data We May Hold</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Subject to lawful requests, the following categories of data may be available:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Account registration details (email address, name, registration date)</li>
                <li>IP addresses associated with registration and login</li>
                <li>Advertisement content (text, images, contact information)</li>
                <li>Advertisement creation and modification timestamps</li>
                <li>Payment and transaction records</li>
                <li>Internal moderation records and risk assessments</li>
                <li>User report submissions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">3. How to Submit a Request</h2>
              <p className="text-gray-600 dark:text-gray-300">
                All data requests must be submitted via official channels. We accept:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>
                  <strong>Production Orders</strong> (Police and Criminal Evidence Act 1984, Section 9 / Schedule 1)
                </li>
                <li>
                  <strong>Court Orders</strong> (including Norwich Pharmacal Orders)
                </li>
                <li>
                  <strong>Mutual Legal Assistance Treaty (MLAT)</strong> requests for international law enforcement
                </li>
                <li>
                  <strong>Voluntary disclosure requests</strong> — We may voluntarily disclose data where there is an immediate threat to life or child safety, without a court order
                </li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                Please include in your request:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Your name, rank/title, agency, and badge/warrant number</li>
                <li>Official email address (we do not respond to personal email accounts)</li>
                <li>Case reference number</li>
                <li>Specific data requested (e.g., user account data, IP logs, ad content)</li>
                <li>Legal basis for the request</li>
                <li>Time period covered</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">4. Response Times</h2>
              <div className="overflow-x-auto mt-2">
                <table className="min-w-full border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b">Request Type</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b">Target Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Emergency (threat to life / child safety)</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Within 4 hours</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Court Order / Production Order</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Within 5 working days</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Content removal (illegal material)</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Within 24 hours</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">General requests</td>
                      <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300">Within 10 working days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">5. Content Preservation</h2>
              <p className="text-gray-600 dark:text-gray-300">
                If you require us to preserve specific user data or content pending a formal legal request, 
                please send a preservation request to{' '}
                <a href="mailto:compliance@reachripple.com" className="text-purple-600 hover:underline">compliance@reachripple.com</a>.
                We will preserve the specified data for 90 days, renewable upon request.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">6. Our Proactive Measures</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We proactively monitor our platform for illegal content and exploitation indicators. 
                Our systems include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Automated red-flag detection (23+ trafficking/exploitation patterns)</li>
                <li>Image hash matching for duplicate/reuse detection</li>
                <li>Phone number cross-referencing</li>
                <li>Network analysis for organised activity</li>
                <li>User reporting system with investigation workflow</li>
                <li>Full moderation audit trail</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Where we identify suspected trafficking or child exploitation, we proactively report to 
                the National Crime Agency.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">7. Jurisdiction</h2>
              <p className="text-gray-600 dark:text-gray-300">
                ReachRipple is operated by a company registered in Cyprus (EU). We serve users in the 
                United Kingdom. We comply with:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>UK Investigatory Powers Act 2016</li>
                <li>Police and Criminal Evidence Act 1984 (PACE)</li>
                <li>UK Data Protection Act 2018 / UK GDPR</li>
                <li>EU General Data Protection Regulation (GDPR)</li>
                <li>EU/UK Mutual Legal Assistance frameworks</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">8. Contact</h2>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Compliance Department</strong><br />
                Email: <a href="mailto:compliance@reachripple.com" className="text-purple-600 hover:underline">compliance@reachripple.com</a>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Non-law-enforcement users should use the Report button on advertisements or contact us 
                via our <Link to="/contact" className="text-purple-600 hover:underline">Contact page</Link>.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                See also: <Link to="/modern-slavery" className="text-purple-600 hover:underline">Modern Slavery Statement</Link> |{' '}
                <Link to="/terms" className="text-purple-600 hover:underline">Terms of Service</Link> |{' '}
                <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
