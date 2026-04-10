import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function OnlineSafetyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet><title>Online Safety | ReachRipple</title></Helmet>
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12 border border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Online Safety</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Our commitment to the UK Online Safety Act 2023 and user protection
          </p>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mt-0">Our Commitment</h2>
              <p className="text-green-700 dark:text-green-300">
                ReachRipple is committed to the safety of all users and compliance with the UK Online Safety 
                Act 2023. We implement robust measures to prevent the publication and spread of illegal content 
                and to protect children from harmful content.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">1. Illegal Content Risk Assessment</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We have identified the following categories of illegal content as risks relevant to our platform 
                and implemented specific measures for each:
              </p>

              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4">Child Sexual Exploitation and Abuse (CSEA)</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Strict age gate requiring 18+ confirmation before accessing the platform</li>
                <li>Minimum age of 18 enforced on all advertisements</li>
                <li>Automated detection of underage-indicative language (10+ pattern variants)</li>
                <li>Immediate removal and reporting to NCA for any suspected CSEA content</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4">Human Trafficking and Modern Slavery</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>23+ automated trafficking indicators monitored across all listings</li>
                <li>Network analysis detecting organised exploitation patterns</li>
                <li>Phone number and image reuse detection</li>
                <li>Proactive reporting to the National Crime Agency</li>
                <li>Staff training on recognising trafficking indicators</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4">Fraud and Scams</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Anti-fraud detection monitoring suspicious patterns</li>
                <li>User reporting mechanism for scam indicators</li>
                <li>Account verification system for advertisers</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4">Terrorism and Extremism</h3>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Content moderation pipeline reviews all user-generated content</li>
                <li>Immediate removal and law enforcement referral for any extremist content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">2. Child Safety Measures</h2>
              <p className="text-gray-600 dark:text-gray-300">
                ReachRipple is an adults-only platform. We implement multiple barriers to prevent access 
                by children:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>
                  <strong>Age Gate:</strong> A full-screen age verification modal must be completed before 
                  any content is accessible. Users must confirm they are 18 or over.
                </li>
                <li>
                  <strong>Registration Controls:</strong> Account creation requires acceptance of terms 
                  which state the platform is for users aged 18 and over only.
                </li>
                <li>
                  <strong>Content Controls:</strong> All advertisements enforce a minimum age of 18 and 
                  are screened for underage-indicative language.
                </li>
                <li>
                  <strong>Future Age Verification:</strong> We are monitoring Ofcom's evolving guidance 
                  on age verification technology and are prepared to integrate third-party age verification 
                  providers (such as Yoti or AgeChecked) if required by regulation.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">3. Content Moderation</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Our content moderation system operates at three levels:
              </p>
              <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-300 space-y-3">
                <li>
                  <strong>Automated Pre-Publication Screening:</strong> Every advertisement is analysed 
                  by our automated moderation pipeline before publication. Content is checked against 
                  trafficking indicators, exploitation patterns, underage language, and policy violations. 
                  High-risk content is held for human review.
                </li>
                <li>
                  <strong>Human Moderation:</strong> A dedicated moderation team reviews flagged content, 
                  user reports, and high-risk advertisements. Moderators have tools to approve, reject, 
                  suspend, or escalate content. All decisions are logged.
                </li>
                <li>
                  <strong>User Reporting:</strong> Every advertisement has a visible "Report" button 
                  allowing users to flag content for 8 categories of concern: underage activity, 
                  exploitation/trafficking, harassment, fraud, impersonation, illegal activity, spam, 
                  and other.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">4. Complaints Process</h2>
              <p className="text-gray-600 dark:text-gray-300">
                If you have a complaint about content on ReachRipple or how we handle a safety concern:
              </p>
              <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Use the <strong>Report</strong> button on any advertisement for content concerns</li>
                <li>Email <a href="mailto:compliance@reachripple.com" className="text-purple-600 hover:underline">compliance@reachripple.com</a> for formal complaints</li>
                <li>We will acknowledge your complaint within 48 hours</li>
                <li>We will provide a substantive response within 10 working days</li>
                <li>If you are dissatisfied with our response, you may escalate to Ofcom</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">5. Transparency</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We are committed to transparency about our moderation practices. Key statistics:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>All moderation decisions are recorded with full audit trails</li>
                <li>Moderation action logs are retained for a minimum of 12 months</li>
                <li>We plan to publish periodic transparency reports detailing content removed, 
                    accounts suspended, and law enforcement requests received</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">6. Prohibited Content</h2>
              <p className="text-gray-600 dark:text-gray-300">
                The following content is strictly prohibited and will be immediately removed:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-1">
                <li>Content depicting, promoting, or facilitating child sexual abuse or exploitation</li>
                <li>Content promoting human trafficking, forced labour, or modern slavery</li>
                <li>Extreme pornographic images (Criminal Justice and Immigration Act 2008)</li>
                <li>Intimate images shared without consent (revenge/intimate image abuse)</li>
                <li>Content inciting terrorism or promoting extremist ideologies</li>
                <li>Content inciting racial, religious, or other hatred</li>
                <li>Fraud, scams, or deliberately misleading advertisements</li>
                <li>Content promoting illegal drugs or controlled substances</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">7. Regulatory Contact</h2>
              <p className="text-gray-600 dark:text-gray-300">
                For Ofcom or other regulatory correspondence regarding the Online Safety Act:
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Compliance Department</strong><br />
                Email: <a href="mailto:compliance@reachripple.com" className="text-purple-600 hover:underline">compliance@reachripple.com</a>
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                See also: <Link to="/modern-slavery" className="text-purple-600 hover:underline">Modern Slavery Statement</Link> |{' '}
                <Link to="/law-enforcement" className="text-purple-600 hover:underline">Law Enforcement Guidelines</Link> |{' '}
                <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link> |{' '}
                <Link to="/terms" className="text-purple-600 hover:underline">Terms of Service</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
