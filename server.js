const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));

// Main UI route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Helper for dynamic system prompts
const SYSTEM_PROMPTS = {
    "Education": `You are an official, professional College Admission Counselor assistant at Apex College.
Your goal is to guide prospective students with factual, helpful, and clear information based ONLY on the provided context from our official documents.

CRITICAL GUARDRAILS & SAFETY POLICIES:
1. Do NOT promise or guarantee admission or placement. Always mention that placement and admission depend on candidate performance, selection rounds, and official university criteria.
2. Do NOT promise fake or specific scholarship percentages unless they are directly stated in the context. Never guarantee a scholarship.
3. If the answer to a question cannot be found in the provided context, politely state: "I don't have that information in my official records. Please contact the admissions office directly or visit our website." Do not make up facts or extrapolate.
4. Keep a professional, encouraging, yet conservative tone.`,

    "Farming": `You are a knowledgeable Agricultural Consultant / Farming Expert. 
Your goal is to provide helpful, practical, and scientific advice on crop cultivation, soil health, organic farming, modern irrigation systems, pest management, weather patterns, and crop rotation.
Ensure your advice is safe and contextually relevant to regional Indian farming. Do not offer financial loans or make up statistics.`,

    "Personal First Aid Doctor": `You are a Virtual First Aid Health Assistant.
Your goal is to guide the user with basic first aid instructions, minor health tips, emergency prep, hygiene guidelines, and healthy lifestyle habits.
CRITICAL MEDICAL SAFETY:
- You are NOT a doctor. You must prefix or suffix your medical replies with a warning: 'Note: This is for educational first aid support. Please consult a qualified medical professional for diagnosis or emergency treatment.'
- Do not prescribe prescription drugs. Recommend general remedies (e.g. hydration, rest, ice, clean bandages).`,

    "Tourism": `You are an enthusiastic Tourism and Travel Advisor.
Your goal is to guide users with custom itineraries, travel destinations, hotel suggestions, budget tips, safety advice, cultural insights, and transit information. Focus on making their travel experience memorable and smooth.`
};

const LANG_NAMES = {
    "en-IN": "English",
    "hi-IN": "Hindi (हिन्दी)",
    "mai-IN": "Maithili (मैथिली)",
    "bn-IN": "Bengali (বাংলা)",
    "te-IN": "Telugu (తెలుగు)",
    "mr-IN": "Marathi (मराठी)",
    "ta-IN": "Tamil (தமிழ்)",
    "ur-IN": "Urdu (اردو)",
    "gu-IN": "Gujarati (ગુજરાતી)",
    "kn-IN": "Kannada (ಕನ್ನಡ)",
    "ml-IN": "Malayalam (മലയാളം)",
    "pa-IN": "Punjabi (ਪੰਜਾਬੀ)",
    "or-IN": "Odia (ଓଡ଼ିଆ)"
};

// Log conversation helper
function logConversation(interest, userMsg, botReply) {
    try {
        const dir = path.join(__dirname, 'conversations');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(dir, `${today}.txt`);
        const timestamp = new Date().toLocaleString();
        
        const logEntry = `==================================================\nTime: ${timestamp}\nDomain: ${interest}\nUser: ${userMsg}\nAssistant: ${botReply}\n==================================================\n\n`;
        
        fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch (e) {
        console.error("Log error:", e);
    }
}

// In-Memory Search (RAG Context guidelines divided by domain)
const GUIDELINES_BY_DOMAIN = {
    "Education": [
        "Bachelor of Technology (B.Tech) in Computer Science & Engineering (CSE). Duration: 4 Years. Eligibility: Minimum 60% aggregate in 10+2 (Physics, Chemistry, Mathematics). Must have cleared the national entrance exam. Annual Fee: $12,000 per year.",
        "Bachelor of Business Administration (BBA). Duration: 3 Years. Eligibility: Minimum 50% aggregate in 10+2 from any recognized board. Annual Fee: $8,000 per year.",
        "Master of Business Administration (MBA). Duration: 2 Years. Eligibility: Bachelor's degree in any discipline with minimum 50% marks. Valid score in Management Entrance Test. Annual Fee: $15,000 per year.",
        "Merit-based Scholarship: Up to 30% tuition fee waiver for students with >90% aggregate in 10+2. Sports/Extracurricular Scholarship: Up to 15% tuition fee waiver based on national/state-level achievements. Note: Maximum cumulative scholarship is capped at 30%. Placements and scholarship percentages are never 100% guaranteed.",
        "Application Start Date: January 15, 2026. Regular Application Deadline: August 31, 2026. Classes Commencing: September 15, 2026.",
        "Average package for B.Tech CSE is $85,000 per annum. Top recruiters include major global tech and consulting firms. Note: College provides placement assistance and training, but does not guarantee 100% placement.",
        "Apex College of Technology & Management is situated in Indore, Madhya Pradesh, India. It is one of the top engineering and management colleges in Madhya Pradesh."
    ],
    "Farming": [
        "Soil Health: To improve soil health, add organic compost or vermicompost regularly. Test soil pH to balance acidity and alkalinity.",
        "Crop Cultivation: Plan crop rotation by planting nitrogen-fixing legumes (beans, peas) between heavy feeding crops (maize, wheat) to naturally enrich soil.",
        "Pest Control: Use natural neem oil sprays or introduce beneficial insects like ladybugs to control pests without harmful chemical pesticides.",
        "Drip Irrigation: Drip irrigation delivers water directly to plant roots, reducing water wastage by up to 60% compared to flood irrigation."
    ],
    "Personal First Aid Doctor": [
        "Minor Burn: Immediately cool the burn under cold running water for 10-15 minutes. Do not apply ice, butter, or paste. Cover loosely with a sterile bandage.",
        "First Aid Kit: A basic kit should contain sterile gauze pads, adhesive bandages, antiseptic wipes, medical tape, scissors, tweezers, and pain relief tablets.",
        "Sprained Ankle: Rest the ankle, apply ice packs wrapped in a towel for 15 minutes, compress with an elastic bandage, and elevate the leg above heart level."
    ],
    "Tourism": [
        "Top Places: Visit the Taj Mahal in Agra, the historic palaces of Rajasthan, the beaches of Goa, or the serene backwaters of Kerala.",
        "Travel Checklist: Always carry official ID, check weather forecasts, secure hotel bookings, pack appropriate adapters, and keep emergency contact numbers handy.",
        "Visit MP: The best time to visit Madhya Pradesh is from October to March when the weather is pleasant. Top sights include Khajuraho temples, Sanchi Stupa, and Kanha National Park."
    ]
};

function retrieveContext(query, interest) {
    const keywords = query.toLowerCase().split(/\s+/);
    let matched = [];
    
    const activeDocs = GUIDELINES_BY_DOMAIN[interest] || GUIDELINES_BY_DOMAIN["Education"];
    
    activeDocs.forEach(doc => {
        let score = 0;
        keywords.forEach(kw => {
            if (kw.length > 2 && doc.toLowerCase().includes(kw)) score++;
        });
        if (score > 0) matched.push({ doc, score });
    });
    matched.sort((a,b) => b.score - a.score);
    if (matched.length === 0) return activeDocs.slice(0, 2).join("\n\n");
    return matched.slice(0, 3).map(m => m.doc).join("\n\n");
}

// Chat API Route
app.post('/api/chat', async (req, res) => {
    const { interest, message, lang } = req.body;
    const query = message ? message.trim() : '';

    if (!query) {
        return res.status(400).json({ error: "Empty query" });
    }

    const context = retrieveContext(query, interest);
    const langName = LANG_NAMES[lang] || "English";
    const systemPrompt = SYSTEM_PROMPTS[interest] || SYSTEM_PROMPTS["Education"];

    const apiKey = process.env.OLLAMA_API_KEY || '';
    const baseUrl = process.env.OLLAMA_BASE_URL || 'https://api.groq.com/openai/v1';
    const modelName = process.env.OLLAMA_MODEL || 'llama-3.1-8b-instant';

    try {
        const payload = {
            model: modelName,
            messages: [
                { 
                    role: "system", 
                    content: `${systemPrompt}\n\nCRITICAL DIRECTIVE: The student's preferred language is ${langName}. You MUST respond ONLY in ${langName}. Under no circumstances should you output English (unless it is a technical term or candidate name). Translate all provided context facts accurately into ${langName}.\n\nContext details:\n${context}` 
                },
                { role: "user", content: query }
            ],
            temperature: 0.3
        };

        const response = await axios.post(`${baseUrl}/chat/completions`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const reply = response.data.choices[0].message.content;
        logConversation(interest, query, reply);
        res.json({ reply });

    } catch (error) {
        if (error.response) {
            console.error("LLM API request failed:", error.response.data);
        } else {
            console.error("LLM API request failed:", error.message);
        }
        res.status(500).json({ error: "Failed to generate reply from Groq API" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
