import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ModernSlaveryPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet><title>Modern Slavery Statement | ReachRipple</title></Helmet>
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Modern Slavery & Anti-Trafficking Statement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: March 2026</p>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Our Commitment</h2>
              <p className="text-gray-600 dark:text-gray-300">
                ReachRipple is committed to preventing modern slavery, human trafficking, and exploitation 
                in all its forms. We have a zero-tolerance approach to any form of modern slavery. This statement 
                is made pursuant to the UK Modern Slavery Act 2015, Section 54.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">About Our Platform</h2>
              <p className="text-gray-600 dark:text-gray-300">
                ReachRipple operates an online classified advertising platform. We provide a space for individuals 
                to advertise their own independent services. We do not provide, manage, or control any services 
                advertised on the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Risk Assessment</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We acknowledge that platforms hosting adult service advertising carry inherent risks of being 
                misused for trafficking or exploitation. We take this risk extremely seriously and have 
                implemented multiple layers of protection.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">What We Do to Prevent Exploitation</h2>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-3">
                <li>
                  <strong>Automated Content Screening:</strong> Every advertisement is automatically screened 
                  against 23+ trafficking and exploitation indicators before publication, including language 
                  suggesting coercion, underage individuals, or third-party control.
                </li>
                <li>
                  <strong>Pattern Detection:</strong> Our systems analyse cross-listing patterns such as 
                  phone number reuse, image duplication, rapid city-hopping, and network clustering that may 
                  indicate organised exploitation.
                </li>
                <li>
                  <strong>Human Moderation:</strong> All flagged content is reviewed by trained moderators 
                  who assess risk and take appropriate action including removal and reporting.
                </li>
                <li>
                  <strong>User Reporting:</strong> Every advertisement has a prominent "Report" button. Users 
                  can report concerns including exploitation, trafficking, underage activity, and coercion. 
                  All reports are investigated.
                </li>
                <li>
                  <strong>Audit Trail:</strong> All moderation decisions are logged with timestamps and reviewer 
                  identity for accountability and law enforcement cooperation.
                </li>
                <li>
                  <strong>Age Verification:</strong> All users must confirm they are 18 or over. Advertisements 
                  enforce a minimum age of 18. Language detection actively flags content suggesting underage individuals.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Indicators We Screen For</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Our detection system specifically looks for indicators including (but not limited to):
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>References to third-party control ("my girls", "handler", "driver")</li>
                <li>Language suggesting restricted movement or inability to communicate freely</li>
                <li>Indicators of underage individuals or age-inappropriate language</li>
                <li>Advance payment demands to unknown third parties</li>
                <li>Rapid movement between cities (city-hopping patterns)</li>
                <li>Multiple advertisements sharing the same phone number or images</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Cooperation with Authorities</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We cooperate fully with law enforcement and regulatory authorities. Where we identify or 
                receive credible reports of potential trafficking or exploitation, we:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Immediately remove the content and suspend the account</li>
                <li>Preserve all relevant evidence</li>
                <li>Report to the National Crime Agency (NCA) via the Modern Slavery Helpline (08000 121 700)</li>
                <li>Comply with lawful requests for information from UK police and other authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Reporting Concerns</h2>
              <p className="text-gray-600 dark:text-gray-300">
                If you suspect trafficking, exploitation, or modern slavery involving any content on ReachRipple:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Use the <strong>Report</strong> button on any advertisement</li>
                <li>Email us at <a href="mailto:compliance@reachripple.com" className="text-purple-600 hover:underline">compliance@reachripple.com</a></li>
                <li>Contact the <strong>Modern Slavery Helpline</strong>: <a href="tel:08000121700" className="text-purple-600 hover:underline">08000 121 700</a></li>
                <li>Contact the <strong>National Crime Agency</strong>: <a href="https://www.nationalcrimeagency.gov.uk" className="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">www.nationalcrimeagency.gov.uk</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Review</h2>
              <p className="text-gray-600 dark:text-gray-300">
                This statement is reviewed and updated annually. We continuously improve our detection systems 
                and moderation processes in response to emerging threats and best practice guidance.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                See also: <Link to="/terms" className="text-purple-600 hover:underline">Terms of Service</Link> |{' '}
                <Link to="/safety" className="text-purple-600 hover:underline">Safety</Link> |{' '}
                <Link to="/law-enforcement" className="text-purple-600 hover:underline">Law Enforcement Guidelines</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
