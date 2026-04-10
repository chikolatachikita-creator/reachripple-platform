# UK Legal & Regulatory Compliance Checklist

## ReachRipple — Advertising Platform (Hosted in Cyprus, Serving the UK)

> **Disclaimer:** This checklist is guidance only — not legal advice. Engage a UK solicitor specialising in digital/adult services law before launch.

---

## 1. COMPANY & HOSTING STRUCTURE

### 1.1 Cyprus Company Formation
- [ ] Register a Cyprus Limited Company (LLC) with the Department of Registrar of Companies
- [ ] Obtain a Cyprus Tax Identification Number (TIN)
- [ ] Open a Cyprus business bank account
- [ ] Register for Cyprus VAT (mandatory if turnover >€15,600 or selling digital services to UK consumers)

### 1.2 UK Obligations Despite Cyprus Hosting
- [ ] **UK VAT registration** — If annual UK sales exceed £90,000 (2025/26 threshold), register for UK VAT with HMRC. Digital services to UK consumers are taxed where the customer is located (VAT MOSS / OSS rules)
- [ ] **UK Representative** — Under UK GDPR, if you process UK residents' data without a UK establishment, you MUST appoint a UK Representative (Article 27). Consider services like Prighter, DataRep, etc.
- [ ] Determine whether you need a UK registered office or agent for HMRC correspondence
- [ ] Consider UK Companies House registration if the business has a "significant UK presence"

---

## 2. DATA PROTECTION & PRIVACY (GDPR / UK GDPR)

### 2.1 Registration & Policies
- [ ] **ICO Registration** — Register with the UK Information Commissioner's Office (ico.org.uk) as a data controller. Annual fee £40–£2,900 depending on size. **Mandatory if processing UK personal data.**
- [ ] **EU GDPR Compliance** — Also comply with EU GDPR (since Cyprus is an EU member). Register with the Cyprus Commissioner for Personal Data Protection if required.
- [ ] **Privacy Policy** — Update to include:
  - [ ] Company name, Cyprus registration number, and contact details
  - [ ] UK Representative details (name, address, contact)
  - [ ] Lawful basis for each type of processing (consent, legitimate interest, contract)
  - [ ] Specific third-party data sharing (hosting providers, payment processors, email service)
  - [ ] International data transfer mechanisms (Cyprus → UK and vice versa)
  - [ ] Data retention periods for each data type
  - [ ] Cookie types and purposes (see §2.3)
- [ ] **Data Protection Impact Assessment (DPIA)** — Required because you process:
  - Special category data (adult content, potentially ethnic/racial data in profiles)
  - Data relating to vulnerable individuals (trafficking risk)
  - Large-scale profiling (search, analytics)

### 2.2 Data Subject Rights (⚠️ GAPS IN PLATFORM)
- [ ] **Subject Access Request (SAR)** — Build `/api/user/data-export` endpoint. Users must be able to download ALL their data within 30 days. **Currently missing.**
- [ ] **Right to Erasure** — Already implemented (account deletion). Verify it covers ALL data stores (MongoDB, Redis cache, uploaded images, logs).
- [ ] **Right to Rectification** — Users can edit profiles. ✅
- [ ] **Right to Data Portability** — Overlap with SAR. Provide data in machine-readable format (JSON/CSV). **Currently missing.**
- [ ] **Right to Object** — Allow users to object to processing for direct marketing.
- [ ] **Consent Records** — Store timestamped proof of consent (ToS acceptance, age gate, cookie consent). **Partially done — needs timestamps stored in DB.**

### 2.3 Cookie Compliance (⚠️ NOT IMPLEMENTED)
- [ ] **Cookie Banner / Consent Management** — Required under UK PECR (Privacy and Electronic Communications Regulations) and EU ePrivacy Directive
  - The platform currently uses only essential cookies (JWT refresh token — HttpOnly). These do NOT require consent.
  - If you add ANY analytics (Google Analytics, Mixpanel), advertising pixels, or non-essential cookies, you MUST implement a cookie consent banner BEFORE those cookies are set.
  - Recommended: add a simple banner stating "We only use essential cookies" if no analytics are added.
- [ ] **Cookie Policy Page** — Create a dedicated page explaining what cookies are used, their purpose, and retention period.

---

## 3. ADVERTISING & CONTENT LAW (UK-SPECIFIC)

### 3.1 Adult Services Advertising
- [ ] **Legality** — Escort advertising is **legal** in the UK. Prostitution itself is not illegal, but:
  - ❌ **Controlling prostitution for gain** (Sections 52–53, Sexual Offences Act 2003) — Platform must NOT take a cut of sexual services, only charge for ad space. Your credit system for ad placement is fine.
  - ❌ **Brothel-keeping** (Section 33, Sexual Offences Act 1956) — Do not allow listings that advertise multiple workers at one address.
  - ❌ **Soliciting / kerb-crawling** — Not applicable to online platforms.
  - ❌ **Causing/inciting prostitution** (Section 52 SOA 2003) — Platform must be passive marketplace, not actively recruiting.
- [ ] **Modern Slavery Act 2015** — You are likely a Commercial Organisation under s.54 if turnover exceeds £36m (unlikely at launch). Regardless:
  - [ ] Publish a Modern Slavery Statement on the website
  - [ ] Maintain anti-trafficking detection (already implemented ✅)
  - [ ] Have a process for reporting suspected trafficking to the National Crime Agency (NCA)
  - [ ] Cooperate with law enforcement upon lawful request
- [ ] **Online Safety Act 2023** — Major new law. If your platform allows user-generated content visible in the UK:
  - [ ] Conduct a **risk assessment** for illegal content and content harmful to children
  - [ ] Implement **systems and processes** to prevent, detect, and remove illegal content (your moderation pipeline covers this ✅)
  - [ ] Provide a **complaints mechanism** for users (report system ✅)
  - [ ] Designated a UK contact for Ofcom correspondence
  - [ ] Keep records of moderation decisions for at least 12 months
  - [ ] Age verification before accessing adult content (age gate ✅)
  - [ ] **If classified as a "Category 1" service** (unlikely at launch — requires significant UK user base): additional transparency and user empowerment duties

### 3.2 Prohibited Content — Must Block/Remove
- [ ] Content depicting or advertising services involving minors — **detection in place** ✅
- [ ] Content promoting trafficking or exploitation — **detection in place** ✅
- [ ] Extreme pornographic images (Criminal Justice and Immigration Act 2008)
- [ ] Revenge/intimate image abuse (now criminal under Online Safety Act)
- [ ] Content promoting terrorism
- [ ] Content inciting racial/religious hatred

### 3.3 Non-Adult Categories (Jobs, Buy-Sell, Vehicles, Property, Pets)
- [ ] **Consumer Rights Act 2015** — If professional sellers use the platform, they must comply with distance selling rules
- [ ] **Employment advertising** — Must not discriminate (Equality Act 2010). Job ads must not specify protected characteristics unless a genuine occupational requirement
- [ ] **Pet advertising** — Lucy's Law (2020) bans third-party sales of puppies/kittens under 6 months in England. Platform should show disclaimer.
- [ ] **Property advertising** — Must comply with Property Misdescriptions Act / Consumer Protection from Unfair Trading Regulations. EPC required for property ads in many cases.
- [ ] **Vehicle advertising** — Must comply with Consumer Rights Act for trade sellers. Mileage disclaimers for second-hand vehicles.

---

## 4. AGE VERIFICATION & CHILD SAFETY

### 4.1 Current Implementation
- [x] Age gate modal ("I am 18+") — **implemented** ✅
- [x] Minimum age 18 on ad creation — **implemented** ✅
- [x] Under-age language detection in moderation — **implemented** ✅

### 4.2 Online Safety Act Requirements
- [ ] The age gate self-declaration may NOT be sufficient under the Online Safety Act 2023. Ofcom guidance (expected to evolve) may require:
  - [ ] Age estimation technology (facial age estimation)
  - [ ] Age verification via ID or credit card
  - [ ] Third-party age verification providers (Yoti, AgeChecked, etc.)
  - **Current recommendation:** The self-declaration age gate is acceptable for launch but monitor Ofcom guidance closely. Be prepared to integrate a proper AV provider.
- [ ] User registration does NOT collect date of birth — consider adding DoB field to registration with 18+ validation

---

## 5. PAYMENT & FINANCIAL COMPLIANCE

### 5.1 Current System
- Invoice-based system with bank transfer / crypto / Segpay / Verotel options. No integrated payment gateway yet.

### 5.2 Requirements
- [ ] **PCI DSS** — If you process card payments directly, you must be PCI DSS compliant. Using Stripe/Segpay/Verotel handles this for you.
- [ ] **High-Risk Merchant Account** — Adult-adjacent platforms are classified as "high risk." Standard Stripe may not approve you. Consider:
  - **Segpay** (already in invoice model) — Adult-friendly processor
  - **Verotel** (already in invoice model) — Adult-friendly processor
  - **CCBill** — Market leader for adult
  - **Crypto payments** — Already in model, but add compliance: collect wallet addresses, KYC for large amounts
- [ ] **UK Anti-Money Laundering (AML)** — If accepting >£10,000 in a single transaction or cumulative suspicious amounts, you must:
  - Conduct Customer Due Diligence (CDD) on advertisers
  - Report suspicious activity to the NCA via a Suspicious Activity Report (SAR)
- [ ] **Invoicing** — Invoices must include:
  - [ ] Company name and Cyprus registration number
  - [ ] VAT number (if registered)
  - [ ] Customer details
  - [ ] Description of service (ad placement, not "escort services")
  - [ ] VAT amount if applicable
  - [ ] Currency and total

---

## 6. INTELLECTUAL PROPERTY

- [ ] **Trademark** — Register "ReachRipple" as a UK trademark (UKIPO) and EU trademark (EUIPO)
- [ ] **DMCA / Copyright** — Implement a takedown process for copyrighted images uploaded by users. Add a DMCA/Copyright page with a contact email.
- [ ] **Image ownership disclaimer** — Terms should state that users warrant they own or have rights to uploaded images

---

## 7. LAW ENFORCEMENT COOPERATION

- [ ] **Designated contact** — Establish a compliance@reachripple.com or legal@reachripple.com email monitored 24/7 for law enforcement requests
- [ ] **Data retention for law enforcement** — UK Investigatory Powers Act 2016: you may receive Data Retention Notices. Have a process to respond within legally required timeframes. Retain:
  - [ ] User registration data (email, IP at registration, timestamps) — minimum 12 months
  - [ ] Login/access logs with IP addresses — minimum 12 months
  - [ ] Ad creation/modification logs — minimum 12 months
  - [ ] Moderation action logs — retain permanently
- [ ] **Legal Intercept** — Have legal counsel ready if you receive a Production Order (PACE s.9) or court order
- [ ] **NCA Cooperation** — If the anti-trafficking system flags a high-risk profile, establish a process to file a SAR with the NCA and preserve evidence
- [ ] **Country blocking** — Not required, but have the ability to geo-restrict if ordered by a court

---

## 8. TECHNICAL SECURITY REQUIREMENTS

### 8.1 Current Status
- [x] HTTPS/SSL (configured in production setup) ✅
- [x] JWT authentication with refresh tokens ✅
- [x] Bcrypt password hashing ✅
- [x] Rate limiting (configured in security.ts) ✅
- [x] CORS restrictions ✅
- [x] Input validation with Zod ✅
- [x] Security headers (X-Frame-Options, etc.) ✅
- [x] HttpOnly cookies for tokens ✅

### 8.2 Additional Security To-Dos
- [ ] **Penetration test** — Before launch, hire a certified pen tester (CHECK/CREST certified)
- [ ] **Logging & monitoring** — Ensure all auth events are logged (login, failed login, password reset, account deletion). Already partially done via logger.ts.
- [ ] **Incident response plan** — Document steps for data breach notification:
  - UK ICO: notify within 72 hours of becoming aware
  - Affected users: notify without undue delay if high risk
  - Cyprus DPA: also notify if required
- [ ] **Backups** — Automated MongoDB backups (daily minimum). Test restoration quarterly.
- [ ] **DDoS protection** — Use Cloudflare (free tier available) as CDN/proxy. Especially important for adult-adjacent sites.

---

## 9. INSURANCE

- [ ] **Cyber Insurance** — Covers data breach costs, regulatory fines, legal defence
- [ ] **Professional Indemnity Insurance** — Covers claims arising from platform content
- [ ] **Public Liability Insurance** — Standard business coverage

---

## 10. PLATFORM POLICIES TO CREATE/UPDATE

### Pages already built:
- [x] Terms of Service (TermsPage.jsx) ✅
- [x] Privacy Policy (PrivacyPage.jsx) ✅
- [x] Help/FAQ (HelpPage.jsx) ✅
- [x] Platform Disclaimer (PlatformDisclaimer.jsx) ✅

### Pages/sections to ADD before launch:
- [ ] **Cookie Policy** — Even if only essential cookies, document it
- [ ] **Modern Slavery Statement** — Public commitment to anti-trafficking
- [ ] **DMCA/Copyright Takedown Page** — Contact details and process
- [ ] **Law Enforcement Guidelines Page** — How LE can submit requests (common on adult platforms)
- [ ] **Advertising Standards** — What is and isn't allowed per category
- [ ] **Complaints Procedure** — Required under Online Safety Act. Could be part of FAQ or separate page.
- [ ] **Transparency Report** — Not legally required at launch but best practice: quarterly stats on content removed, accounts banned, LE requests received.

---

## 11. PRE-LAUNCH FINAL CHECKLIST

| # | Item | Status | Priority |
|---|------|--------|----------|
| 1 | Cyprus company registered | ⬜ | CRITICAL |
| 2 | UK ICO registration | ⬜ | CRITICAL |
| 3 | UK GDPR Representative appointed | ⬜ | CRITICAL |
| 4 | Privacy Policy updated with company details | ⬜ | CRITICAL |
| 5 | Cookie banner (even minimal) | ⬜ | HIGH |
| 6 | Data export/SAR endpoint built | ⬜ | HIGH |
| 7 | Modern Slavery Statement published | ⬜ | HIGH |
| 8 | Payment processor integrated (Segpay/Verotel) | ⬜ | CRITICAL |
| 9 | SSL certificates live | ⬜ | CRITICAL |
| 10 | Penetration test completed | ⬜ | HIGH |
| 11 | SMTP email working (verification, password reset) | ⬜ | CRITICAL |
| 12 | Admin account created and moderation tested | ⬜ | CRITICAL |
| 13 | Law enforcement contact page/email | ⬜ | HIGH |
| 14 | Backup system configured | ⬜ | CRITICAL |
| 15 | Cloudflare or DDoS protection | ⬜ | HIGH |
| 16 | UK VAT assessment (register if needed) | ⬜ | MEDIUM |
| 17 | Trademark filed (UK + EU) | ⬜ | MEDIUM |
| 18 | Cyber insurance obtained | ⬜ | MEDIUM |
| 19 | Legal counsel retained (UK solicitor) | ⬜ | HIGH |
| 20 | Online Safety Act risk assessment documented | ⬜ | HIGH |

---

## 12. ONGOING OBLIGATIONS (POST-LAUNCH)

- [ ] **ICO fee** — Renew annually
- [ ] **Moderation review** — Review flagged content daily
- [ ] **SAR responses** — Respond within 30 days of receipt
- [ ] **Data breach notifications** — Within 72 hours to ICO
- [ ] **Terms/Privacy updates** — Review quarterly, notify users of material changes
- [ ] **Ofcom compliance** — Monitor for new Online Safety Act codes of practice
- [ ] **VAT returns** — Quarterly (UK) or as required (Cyprus)
- [ ] **Annual accounts** — File in Cyprus
- [ ] **Transparency report** — Publish quarterly/annually
- [ ] **Security updates** — Keep Docker images, Node.js, and dependencies updated monthly

---

*Document version: 1.0 — March 2026*
*This is NOT legal advice. Consult a qualified UK solicitor before launch.*
