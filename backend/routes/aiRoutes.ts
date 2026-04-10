// backend/routes/aiRoutes.ts
import express from "express";
import OpenAI from "openai";

const router = express.Router();
import logger from "../utils/logger";

// Check if OpenAI API key is configured
const hasOpenAIKey = process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY !== 'YOUR_REAL_KEY_HERE' &&
  process.env.OPENAI_API_KEY.startsWith('sk-');

const openai = hasOpenAIKey ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
}) : null;

// Fallback templates for when OpenAI is not available
const fallbackDescriptions = {
  classy: [
    "Sophisticated and elegant, I bring warmth and charm to every encounter. Whether it's a dinner date, social event, or private time together, I ensure you feel comfortable and appreciated. Let's create memorable moments.",
    "Refined and genuine, I offer upscale companionship for discerning individuals. I enjoy meaningful conversations, fine dining, and creating an atmosphere of relaxation and connection.",
    "Elegant and attentive, I'm the perfect companion for those who appreciate class and discretion. I take pride in making every moment special and ensuring you leave with wonderful memories.",
  ],
  'girl-next-door': [
    "Hey there! I'm the friendly, down-to-earth companion you've been looking for. Easy to talk to, fun to be around, and always genuine. Let's grab coffee or enjoy a relaxed evening together!",
    "Sweet and approachable, I'm like that cute girl next door who's always up for good times. Whether it's casual hangouts or cozy evenings, I promise great company and lots of laughs.",
    "Bubbly, genuine, and easy-going – that's me! I love meeting new people and making real connections. No pretense, just good vibes and authentic companionship.",
  ],
  luxury: [
    "Exquisite taste meets impeccable style. I'm your ideal companion for high-end events, exclusive dinners, and VIP experiences. Educated, well-traveled, and fluent in the art of sophisticated companionship.",
    "For the distinguished gentleman who expects nothing but the best. I offer elite companionship with grace, intelligence, and unparalleled discretion. Perfect for corporate events or private encounters.",
    "Luxury redefined. I bring elegance, wit, and charm to upscale occasions. Whether you need a stunning plus-one or an intimate escape, I deliver an unforgettable premium experience.",
  ],
};

const fallbackTitles = [
  "Elegant Companion Awaits You",
  "Your Perfect Escape",
  "Charming & Genuine Connection",
  "Unforgettable Moments Together",
  "Class Meets Warmth",
];

const fallbackServices = [
  "Dinner Dates", "Events", "Travel Companion", "GFE", "Massage",
  "Outcall", "Incall", "Overnight", "Weekend Getaways", "Social Events"
];

// POST /api/ai/generate-title
router.post("/generate-title", async (req, res) => {
  try {
    const { city, category, vibe } = req.body;

    // Use fallback if no OpenAI key
    if (!openai) {
      const shuffled = [...fallbackTitles].sort(() => Math.random() - 0.5);
      return res.json({ titles: shuffled.slice(0, 3) });
    }

    const baseSystemPrompt = `
You generate short, classy, non-explicit headlines for companionship / escort ads.
- 4–8 words.
- No explicit sexual content.
- Focus on personality, style, city or vibe.
- Must be safe for mainstream app stores.`;

    const userPrompt = `
Create 3 alternative headlines (each on a new line) for a ${category || "Escort"} ad in ${city || "the city"}.
Vibe keywords: ${vibe || "elegant, friendly"}.
Return only the headlines, one per line, no numbering.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: baseSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 80,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const options = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    res.json({ titles: options });
  } catch (err) {
    logger.error("AI title error:", err);
    res.status(500).json({ message: "Could not generate title" });
  }
});

// POST /api/ai/suggest-services
router.post("/suggest-services", async (req, res) => {
  try {
    const { description } = req.body;

    // Use fallback if no OpenAI key
    if (!openai) {
      const shuffled = [...fallbackServices].sort(() => Math.random() - 0.5);
      return res.json({ services: shuffled.slice(0, 6) });
    }

    const baseSystemPrompt = `
You suggest non-explicit service tags for companionship / escort ads.
- Suggest 5–10 simple tags like "dinner dates", "events", "massage", "GFE", "outcall".
- No explicit sex acts, no fetish, no illegal terms.
- Return a JSON array of strings only.`;

    const userPrompt = `
Based on this profile description, suggest tags:
"${description || ""}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: baseSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 120,
    });

    let content = completion.choices[0]?.message?.content?.trim() || "[]";
    let tags: string[] = [];
    try {
      tags = JSON.parse(content);
    } catch {
      // fallback: try to split lines
      tags = content
        .split("\n")
        .map((t) => t.replace(/^-/, "").trim())
        .filter(Boolean);
    }

    res.json({ services: tags });
  } catch (err) {
    logger.error("AI services error:", err);
    res.status(500).json({ message: "Could not suggest services" });
  }
});

// POST /api/ai/generate-description
router.post("/generate-description", async (req, res) => {
  try {
    const {
      name,        // stage name or title
      city,
      area,
      age,
      category,
      appearance,
      personality,
      services,
      style = "classy", // "classy" | "girl-next-door" | "luxury"
    } = req.body;

    // Use fallback if no OpenAI key
    if (!openai) {
      const styleKey = style as keyof typeof fallbackDescriptions;
      const descriptions = fallbackDescriptions[styleKey] || fallbackDescriptions.classy;
      const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
      return res.json({ description: randomDescription });
    }

    const servicesList = Array.isArray(services)
      ? services.join(", ")
      : (services || "");

    const baseSystemPrompt = `
You write short, classy profile descriptions for adult companionship / escort ads.

Rules:
- Focus on personality, vibe and general looks only (e.g. "slim blonde", "tattooed brunette").
- NO explicit sexual acts, fetish content, pornographic details or illegal activity.
- NO minors, violence, drugs or exploitation.
- Do not mention prices or explicit services.
- Tone: respectful, empowering, confident, non-degrading.
- Length: 60–120 words.
- Write in the first person ("I").
- Text must be safe enough for a mainstream app store.`;

    let stylePrompt = "";
    if (style === "girl-next-door") {
      stylePrompt = "Sound warm, relaxed and like the friendly girl/boy next door.";
    } else if (style === "luxury") {
      stylePrompt = "Sound elegant and high-end, suitable for dinners, corporate events and VIP nights.";
    } else {
      stylePrompt = "Sound classy and approachable.";
    }

    const userPrompt = `
Create a profile description for:

Name / stage name: ${name || "no name provided"}
Base: ${city || "unknown city"} ${area ? "(" + area + ")" : ""}
Age: ${age || "adult"}
Category: ${category || "Escort"}

Appearance keywords: ${appearance || "not specified"}
Personality keywords: ${personality || "not specified"}
Services (general, non-explicit): ${servicesList || "companionship, dinner dates, events"}

${stylePrompt}
Do not mention prices or explicit sexual acts. Emphasise companionship, personality and experience.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: baseSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 220,
    });

    const text =
      completion.choices[0]?.message?.content?.trim() ||
      "I'm a warm and friendly companion who enjoys good conversation and relaxed time together.";

    res.json({ description: text });
  } catch (err) {
    logger.error("AI description error:", err);
    res.status(500).json({ message: "Could not generate description" });
  }
});

// POST /api/ai/support-chat
// AI support assistant restricted to website help only, with admin escalation
router.post("/support-chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }

    const systemPrompt = `You are ReachRipple's website support assistant. You ONLY help with:
- How to use the website (creating ads, editing profiles, searching, managing account)
- Account issues (login, password reset, email verification)
- Payment and subscription questions
- Reporting problems or bugs on the platform
- Understanding platform categories and features
- Ad approval status and moderation policies

STRICT RULES:
- NEVER provide advice on anything unrelated to the ReachRipple platform.
- If the user asks about anything outside website functionality (personal advice, general knowledge, coding help, etc.), politely decline and explain you can only help with ReachRipple website questions.
- If the user's issue requires human assistance, say: "I'd recommend speaking with a human admin for this. Would you like me to connect you to an admin?"
- Keep responses concise (under 150 words).
- Be friendly and professional.
- Do not generate any explicit, harmful, or inappropriate content.`;

    // Use fallback if no OpenAI key
    if (!openai) {
      // Simple keyword-based fallback responses
      const msg = message.toLowerCase();
      let reply = "I can help you with questions about using ReachRipple. Could you tell me more about what you need help with? If you need to speak with a human, I can connect you to an admin.";
      
      if (msg.includes("create") && msg.includes("ad")) {
        reply = "To create an ad: Go to 'Post Ad' from the navigation menu, fill in your details across the steps (title, description, category, location, services, photos), then submit for review. Your ad will be reviewed and approved by our team.";
      } else if (msg.includes("password") || msg.includes("login")) {
        reply = "For login issues: Use the 'Forgot Password' link on the login page to reset your password via email. If you're still having trouble, I can connect you to an admin.";
      } else if (msg.includes("edit") && (msg.includes("ad") || msg.includes("profile"))) {
        reply = "To edit your ad: Go to 'My Ads' from your dashboard, find the ad you want to edit, and click the edit button. You can update your title, description, photos, services, and pricing.";
      } else if (msg.includes("admin") || msg.includes("speak") || msg.includes("human") || msg.includes("help")) {
        reply = "I'd recommend speaking with a human admin for this. Would you like me to connect you to an admin?";
      } else if (msg.includes("search") || msg.includes("find")) {
        reply = "To search for listings: Use the search bar on the homepage or navigate to a category. You can filter by location, distance, price, and other criteria.";
      } else if (msg.includes("payment") || msg.includes("subscription") || msg.includes("tier")) {
        reply = "ReachRipple offers different listing tiers for escort ads: Standard (£4.99/week), Priority (£9.99/week), Priority Plus (£16.99/week), and Featured (£29.99/week). All other categories are completely free to post. Visit your account settings to manage your subscription.";
      } else if (msg.includes("report") || msg.includes("block")) {
        reply = "To report a listing or user: Click the 'Report' button on any ad or profile page. Our moderation team will review the report and take appropriate action.";
      }
      
      return res.json({ reply, needsAdmin: reply.includes("connect you to an admin") });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message.slice(0, 500) }, // Limit input length
      ],
      temperature: 0.5,
      max_tokens: 250,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 
      "I'm sorry, I couldn't process that. Could you rephrase your question about using ReachRipple?";
    
    const needsAdmin = reply.toLowerCase().includes("connect you to an admin") || 
                       reply.toLowerCase().includes("speak with") ||
                       reply.toLowerCase().includes("human admin");

    res.json({ reply, needsAdmin });
  } catch (err) {
    logger.error("AI support chat error:", err);
    res.status(500).json({ message: "Support chat is temporarily unavailable. Please try again later." });
  }
});

export default router;
