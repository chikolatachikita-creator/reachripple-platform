import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield, Eye, AlertTriangle, Lock, MapPin, Phone, MessageCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet><title>Safety | ReachRipple</title></Helmet>
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-emerald-600 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <Shield className="w-16 h-16 mx-auto mb-6 text-emerald-100" />
            <h1 className="text-3xl md:text-5xl font-bold mb-6">Stay Safe on ReachRipple</h1>
            <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
              Your safety is our top priority. Read our essential guide to staying safe while connecting with others.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12 -mt-10">
          
          {/* Key Golden Rules */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-t-4 border-emerald-500">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Never Send Money</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Never send money in advance for "deposits", "booking fees", or travel expenses. Honest advertisers will not ask for this.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-t-4 border-blue-500">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">High Profile Locations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Always meet in a busy, public place for the first time. Verify the person's identity before going to private locations.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-t-4 border-purple-500">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-purple-600">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Protect Identity</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Keep your personal financial details private. Use our internal chat system until you trust the person you are communicating with.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Detailed Section 1 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <MessageCircle className="text-pink-500" />
                Communication Safety
              </h2>
              <ul className="space-y-4 text-gray-700 dark:text-gray-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-bold">1</span>
                  <span><strong>Stay on the platform:</strong> Scammers often try to move you immediately to WhatsApp, Telegram, or email to avoid our safety filters. Be cautious of anyone insisting on switching apps instantly.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-bold">2</span>
                  <span><strong>Watch for scripts:</strong> Generic messages that don't reference your profile specifically, or broken English mixed with overly formal language, can be signs of automated scam bots.</span>
                </li>
              </ul>
            </section>

            {/* Detailed Section 2 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <Lock className="text-blue-500" />
                Financial Safety
              </h2>
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 mb-6">
                <p className="text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Warning: Crypto & Gift Cards
                </p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Legitimate advertisers rarely ask for payment via Bitcoin/Crypto, iTunes cards, Amazon Gift Cards, or other untraceable methods. Treat these requests as highly suspicious.
                </p>
              </div>
              <ul className="space-y-4 text-gray-700 dark:text-gray-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                  <span><strong>No Upfront Fees:</strong> Do not pay "insurance fees", "verification fees", or "agency registration fees" to advertisers.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                  <span><strong>Cash is King:</strong> For face-to-face meetings, cash upon arrival is the standard and safest method for both parties.</span>
                </li>
              </ul>
            </section>

             {/* Detailed Section 3 */}
             <section className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <Phone className="text-orange-500" />
                Reporting Issues
              </h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                If you encounter suspicious behavior, please report it immediately so we can keep the community safe.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/contact" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700">
                  Contact Support
                </Link>
                <Link to="/help" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Visit Help Center
                </Link>
              </div>
            </section>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
