import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Search, 
  Shield, 
  FileText, 
  CreditCard,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Mail,
  Lock,
  Camera,
  CheckCircle,
  Flag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Help & Support Page - Help Center
 * Mirrored structure of major classifieds platforms (VivaStreet/Gumtree style)
 */
export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const categories = [
    { id: 'safety', name: 'Safety & Security', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'account', name: 'My Account', icon: Lock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'ads', name: 'Posting Ads', icon: Camera, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { id: 'payments', name: 'Pricing & Billing', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'verification', name: 'Verification', icon: CheckCircle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { id: 'policies', name: 'Rules & Policies', icon: Flag, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  ];

  const allFaqs = [
    // Safety
    {
      id: 'safety-1',
      category: 'safety',
      question: 'How do I stay safe when meeting someone?',
      answer: `Always meet in a public place first. Let a friend know where you are going and who you are meeting. Trust your instincts - if something feels off, leave immediately. Never carry large amounts of cash. Verify the person's identity if possible before meeting.`
    },
    {
      id: 'safety-2',
      category: 'safety',
      question: 'How do I spot a scammer?',
      answer: `Be wary of users who ask to move conversations to other platforms (WhatsApp, Email) immediately. Never send money in advance for deposits or "verification fees" via irreversible methods like crypto or gift cards. If an offer sounds too good to be true, it probably is.`
    },
    
    // Account
    {
      id: 'account-1',
      category: 'account',
      question: 'I forgot my password, how do I reset it?',
      answer: `Click on "Log In" and select "Forgot Password". Enter your registered email address, and we will send you a link to reset your password. Check your spam folder if you don't see it within a few minutes.`
    },
    {
      id: 'account-2',
      category: 'account',
      question: 'How do I change my email address?',
      answer: `Go to your Dashboard > Settings > Account to update your email address. You will need to verify the new email before the change takes effect.`
    },

    // Ads
    {
      id: 'ads-1',
      category: 'ads',
      question: 'Why was my ad rejected?',
      answer: `Ads are usually rejected for violating our content policies. Common reasons include: prohibited content, duplicate ads, invalid photos, or misleading descriptions. Check your email for the specific reason and edit your ad to comply.`
    },
    {
      id: 'ads-2',
      category: 'ads',
      question: 'How do I boost my ad?',
      answer: `Go to "My Ads", find the ad you want to promote, and click the "Boost" button. You can choose from various tiers like Featured, Priority Plus, Priority, or Standard. Pricing is in GBP and shown at the time of purchase.`
    },

    // Payments / Pricing
    {
      id: 'payments-1',
      category: 'payments',
      question: 'How do I pay for a boost?',
      answer: `Go to "My Ads", click "Boost" on any approved ad, and select the tier you want. Pricing is shown in GBP (£) at the time of purchase. Payment is processed directly — no pre-funding or wallet required.`
    },
    {
      id: 'payments-2',
      category: 'payments',
      question: 'How long does my boost last?',
      answer: `Boost duration depends on the plan you choose — options include 1 week, 2 weeks, 1 month, or 3 months. Your ad will remain at the selected tier until the boost expires.`
    },

    // Verification
    {
      id: 'verif-1',
      category: 'verification',
      question: 'What is Photo Verification?',
      answer: `Photo verification adds a "Verified" badge to your profile, increasing trust. To verify, you'll need to upload a photo of yourself holding a piece of paper with your username and today's date, or use our automated selfie check tool in your dashboard.`
    },
    
    // Policies
    {
      id: 'pol-1',
      category: 'policies',
      question: 'What content is prohibited?',
      answer: `We do not allow content involving minors, non-consensual content, violence, illegal items, or promotion of human trafficking. Please read our full Terms of Service for a complete list of prohibited content.`
    }
  ];

  const filteredFaqs = allFaqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Helmet><title>Help | ReachRipple</title></Helmet>
      <Navbar />
      
      {/* Hero Search Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 pt-20 pb-24 px-4 text-center text-white relative overflow-hidden">
        {/* Abstract shapes/decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
          <div className="absolute top-20 right-10 w-40 h-40 rounded-full bg-blue-400 blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold mb-6">How can we help you?</h1>
          <p className="text-blue-100 text-lg mb-8">Search our help center for answers to common questions</p>
          
          <div className="relative max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search e.g. 'verification', 'payment', 'banned'..."
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 placeholder-gray-500 shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-12 w-full -mt-16 relative z-20">
        
        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? 'all' : cat.id)}
              className={`p-6 rounded-2xl shadow-sm transition-all text-center flex flex-col items-center gap-3 border ${
                activeCategory === cat.id 
                  ? 'bg-white dark:bg-gray-800 ring-2 ring-blue-500 border-transparent transform -translate-y-1' 
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.bg} ${cat.color}`}>
                <cat.icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{cat.name}</span>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - FAQs */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {activeCategory === 'all' ? 'Popular Questions' : categories.find(c => c.id === activeCategory)?.name}
            </h2>

            <div className="space-y-4">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => (
                  <div 
                    key={faq.id} 
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-sm"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between font-medium text-gray-900 dark:text-white"
                    >
                      <span className="pr-4">{faq.question}</span>
                      {expandedFaq === faq.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFaq === faq.id && (
                      <div className="px-6 pb-4 text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4 bg-gray-50/50 dark:bg-gray-800/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                  <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No results found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Try searching for something else or browse categories.</p>
                </div>
              )}
            </div>

            {/* Contact Section */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-8 mt-12 flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-100 dark:border-indigo-800/30">
              <div>
                <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">Still need help?</h3>
                <p className="text-indigo-700 dark:text-indigo-300">Our support team is available Mon-Fri, 9am - 6pm</p>
              </div>
              <div className="flex gap-4">
                <a 
                  href="mailto:support@reachripple.com" 
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  <Mail className="w-5 h-5" />
                  Email Us
                </a>
              </div>
            </div>
          </div>

          {/* Sidebar - Safety Notices */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Safety Alert</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                <strong>NEVER</strong> send money for "booking fees" or "deposits" before meeting. Legitimate advertisers will not ask for prepaid cards, crypto, or irreversible payments.
              </p>
              <Link to="/safety" className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1">
                Read our full safety guide <ChevronDown className="w-4 h-4 rotate-270" />
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Links</h3>
              <ul className="space-y-3">
                 <li>
                  <Link to="/pricing" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                    <CreditCard className="w-4 h-4" />
                    Ad Pricing & Boosts
                  </Link>
                </li>
                <li>
                  <Link to="/forgot-password" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                    <Lock className="w-4 h-4" />
                    Reset Password
                  </Link>
                </li>
                 <li>
                  <Link to="/create-ad" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                    <FileText className="w-4 h-4" />
                    Post an Ad
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
