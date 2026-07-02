// State management
let chatOpen = false;
let leadCaptured = false;
let voiceOutputEnabled = false;
let recognition = null;
let isRecording = false;

// Student details (No name, email, or field of interest)
let studentDetails = {
    interest: "Education", // Domain selected
    lang: "en-IN",
    location: null
};

// Embedded Guidelines for Client-Side RAG
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

// Configuration (Updated to Groq API)
const API_CONFIG = {
    apiKey: "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",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.1-8b-instant"
};

// Input sanitization regex
const PROMPT_INJECTION_REGEX = /(ignore previous instructions|system prompt|translate to|you are now|forget what|bypass)/i;

// Safety Prompt templates per domain selection
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

// Greet messages in Indian languages including Maithili
const GREETINGS = {
    "en-IN": "Welcome! I see you are interested in {interest} counseling. How can I assist you today?",
    "hi-IN": "स्वागत है! मुझे दिख रहा है कि आप {interest} परामर्श में रुचि रखते हैं। आज मैं आपकी किस प्रकार सहायता कर सकता हूँ?",
    "mai-IN": "स्वागत अछि! हम देखि रहल छी जे अहाँ {interest} परामर्श में रुचि राखैत छी। हम अहाँक कोना मदद कऽ सकैत छी?",
    "bn-IN": "স্বাগতম! আমি দেখছি আপনি {interest} পরামর্শে আগ্রহী। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
    "te-IN": "స్వాగతం! మీకు {interest} కౌన్సెలింగ్‌పై ఆసక్తి ఉన్నట్లు కనిపిస్తోంది. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?",
    "mr-IN": "स्वागत आहे! मला दिसत आहे की तुम्हाला {interest} समुपदेशनात रस आहे. आज मी तुम्हाला कशी मदत करू शकतो?",
    "ta-IN": "வரவேற்கிறோம்! நீங்கள் {interest} ஆலோசனையில் ஆர்வமாக உள்ளீர்கள் என்று காண்கிறேன். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?",
    "ur-IN": "خوش آمدید! میں دیکھ رہا ہوں کہ آپ {interest} کونسلنگ میں دلچسپی رکھتے ہیں۔ آج میں آپ کی کیسے مدد کر سکتا ہوں؟",
    "gu-IN": "સ્વાગત છે! હું જોઈ રહ્યો છું કે તમને {interest} કાઉન્સિલિંગમાં રસ છે. આજે હું તમને કેવી રીતે મદદ કરી શકું?",
    "kn-IN": "ಸ್ವಾಗತ! ನೀವು {interest} ಕೌನ್ಸೆಲಿಂಗ್‌ನಲ್ಲಿ ಆಸಕ್ತಿ ಹೊಂದಿದ್ದೀರಿ ಎಂದು ನನಗೆ ಕಾಣಿಸುತ್ತಿದೆ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    "ml-IN": "സ്വാഗതം! നിങ്ങൾക്ക് {interest} കൗൺസിലിംഗിൽ താൽപ്പര്യമുണ്ടെന്ന് ഞാൻ കാണുന്നു. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കണം?",
    "pa-IN": "ਜੀ ਆਇਆਂ ਨੂੰ! ਮੈਂ ਦੇਖ ਰਿਹਾ ਹਾਂ ਕਿ ਤੁਸੀਂ {interest} ਕਾਉਂਸਲਿੰਗ ਵਿੱਚ ਦਿਲਚਸਪੀ ਰੱਖਦੇ ਹੋ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    "or-IN": "ସ୍ୱାഗତ! ମୁଁ ଦେଖୁଛି ଆପଣ {interest} ପରାମର୍ଶରେ ଆଗ୍ରହୀ ଅଟନ୍ତି । ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?"
};

// Initialize Speech Recognition if supported
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = studentDetails.lang;

        recognition.onstart = () => {
            isRecording = true;
            document.getElementById('mic-btn').classList.add('recording');
            document.querySelector('.mic-pulse').classList.remove('hidden');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chat-input').value = transcript;
            sendMessage();
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            stopRecording();
        };

        recognition.onend = () => {
            stopRecording();
        };
    } else {
        document.getElementById('mic-btn').style.display = 'none';
    }
}

function stopRecording() {
    isRecording = false;
    document.getElementById('mic-btn').classList.remove('recording');
    document.querySelector('.mic-pulse').classList.add('hidden');
}

// Request Geolocation automatically on startup
function requestLocation() {
    const statusBadge = document.getElementById('location-status');
    if (!statusBadge) return;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                studentDetails.location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                statusBadge.className = "location-status-badge success";
                statusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Location active`;
                statusBadge.removeAttribute('onclick');
            },
            (error) => {
                console.warn("Location permission denied/failed:", error.message);
                statusBadge.className = "location-status-badge warning";
                statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Location off. Click to enable for better results`;
                statusBadge.setAttribute('onclick', 'requestLocation()');
            }
        );
    } else {
        statusBadge.className = "location-status-badge warning";
        statusBadge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Location unsupported`;
    }
}

// Toggle Chat popup visibility & CLEAR chat history when closing
function toggleChat() {
    chatOpen = !chatOpen;
    const popup = document.getElementById('chat-popup');
    const trigger = document.getElementById('chat-trigger');
    const iconChat = trigger.querySelector('.icon-chat');
    const iconClose = trigger.querySelector('.icon-close');

    if (chatOpen) {
        popup.classList.remove('hidden');
        iconChat.classList.add('hidden');
        iconClose.classList.remove('hidden');
        requestLocation(); // Ask for location when chat widget is opened
    } else {
        popup.classList.add('hidden');
        iconChat.classList.remove('hidden');
        iconClose.classList.add('hidden');
        
        // Clear history & resets state when chatbot closes
        resetChatSession();
    }
}

// Resets chat widget state to original form capture
function resetChatSession() {
    window.speechSynthesis.cancel();
    if (isRecording && recognition) {
        recognition.stop();
    }
    
    leadCaptured = false;
    studentDetails.interest = "Education";
    studentDetails.location = null;
    
    // Reset HTML Form
    document.getElementById('lead-form').reset();
    document.getElementById('location-status').className = "location-status-badge";
    document.getElementById('location-status').innerHTML = `<i class="fa-solid fa-location-dot"></i> Requesting location...`;
    
    // Clear chat bubbles
    document.getElementById('chat-messages').innerHTML = '';
    
    // Transition UI back to Lead Capture Form
    document.getElementById('lead-form-container').classList.remove('hidden');
    document.getElementById('chat-messages-container').classList.add('hidden');
    document.getElementById('chat-footer').classList.add('hidden');
}

// Handle Form Submission
function submitLead(event) {
    event.preventDefault();
    
    studentDetails.interest = document.getElementById('student-interest').value;
    studentDetails.lang = document.getElementById('student-lang').value;
    
    // Re-initialize speech recognition language
    initSpeechRecognition();
    
    leadCaptured = true;
    
    // Hide Form, Show chat messages and input panel
    document.getElementById('lead-form-container').classList.add('hidden');
    document.getElementById('chat-messages-container').classList.remove('hidden');
    document.getElementById('chat-footer').classList.remove('hidden');
    
    // Dynamic Chips based on Domain
    const chipsContainer = document.querySelector('.starter-chips');
    if (studentDetails.interest === "Education") {
        chipsContainer.innerHTML = `
            <button class="chip" onclick="sendStarter('What B.Tech courses do you offer?')">B.Tech Courses</button>
            <button class="chip" onclick="sendStarter('What are the scholarship criteria?')">Scholarships</button>
            <button class="chip" onclick="sendStarter('What is the deadline for applications?')">Deadlines</button>
        `;
    } else if (studentDetails.interest === "Farming") {
        chipsContainer.innerHTML = `
            <button class="chip" onclick="sendStarter('How can I improve soil health?')">Soil Health</button>
            <button class="chip" onclick="sendStarter('What are some pest control tips?')">Pest Control</button>
            <button class="chip" onclick="sendStarter('Tell me about drip irrigation.')">Drip Irrigation</button>
        `;
    } else if (studentDetails.interest === "Personal First Aid Doctor") {
        chipsContainer.innerHTML = `
            <button class="chip" onclick="sendStarter('How to treat a minor burn?')">Minor Burn</button>
            <button class="chip" onclick="sendStarter('What should be in a first aid kit?')">First Aid Kit</button>
            <button class="chip" onclick="sendStarter('How to handle a sprained ankle?')">Sprained Ankle</button>
        `;
    } else if (studentDetails.interest === "Tourism") {
        chipsContainer.innerHTML = `
            <button class="chip" onclick="sendStarter('What are the top places to visit in India?')">Top Places</button>
            <button class="chip" onclick="sendStarter('Give me a travel checklist.')">Travel Checklist</button>
            <button class="chip" onclick="sendStarter('What is the best time to visit Madhya Pradesh?')">Visit MP</button>
        `;
    }

    // Dynamic Greeting based on Language selected
    const greetingMsg = GREETINGS[studentDetails.lang] || GREETINGS['en-IN'];
    
    // Domain labels in greetings
    const interestLabels = {
        "en-IN": studentDetails.interest,
        "hi-IN": studentDetails.interest === "Education" ? "शिक्षा" : (studentDetails.interest === "Farming" ? "कृषि" : (studentDetails.interest === "Tourism" ? "पर्यटन" : "प्राथमिक चिकित्सा")),
        "mai-IN": studentDetails.interest === "Education" ? "शिक्षा" : (studentDetails.interest === "Farming" ? "कृषि" : (studentDetails.interest === "Tourism" ? "पर्यटन" : "प्राथमिक चिकित्सा"))
    };
    const interestLabel = interestLabels[studentDetails.lang] || studentDetails.interest;

    const formattedGreeting = greetingMsg.replace("{interest}", interestLabel);
        
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <p>${formattedGreeting}</p>
        </div>
    `;
    
    // Log start of session
    const locStr = studentDetails.location ? `Coords: ${studentDetails.location.lat}, ${studentDetails.location.lng}` : 'Denied';
    saveLocalLog(`Session started for ${studentDetails.interest}. Lang: ${studentDetails.lang}. Location: ${locStr}`);
}

// Toggle Text-to-Speech output
function toggleTextToSpeech() {
    voiceOutputEnabled = !voiceOutputEnabled;
    const icon = document.getElementById('tts-icon');
    if (voiceOutputEnabled) {
        icon.className = "fa-solid fa-volume-high";
        icon.style.color = "var(--primary)";
    } else {
        icon.className = "fa-solid fa-volume-xmark";
        icon.style.color = "var(--text-muted)";
        window.speechSynthesis.cancel();
    }
}

// Toggle Voice Input (Speech to Text)
function toggleVoiceInput() {
    if (!recognition) return;
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// Send Starter chips
function sendStarter(text) {
    document.getElementById('chat-input').value = text;
    sendMessage();
}

// Keyboard Enter action
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Simple Client-Side keyword matching search (RAG Context Retriever)
function retrieveLocalContext(query) {
    const keywords = query.toLowerCase().split(/\s+/);
    let matchedDocs = [];
    
    // Get guidelines matching current counseling domain
    const activeDocs = GUIDELINES_BY_DOMAIN[studentDetails.interest] || GUIDELINES_BY_DOMAIN["Education"];
    
    activeDocs.forEach(doc => {
        let score = 0;
        keywords.forEach(keyword => {
            if (keyword.length > 2 && doc.toLowerCase().includes(keyword)) {
                score++;
            }
        });
        if (score > 0) {
            matchedDocs.push({ doc, score });
        }
    });
    
    // Sort by score
    matchedDocs.sort((a, b) => b.score - a.score);
    
    if (matchedDocs.length === 0) {
        return activeDocs.slice(0, 2).join("\n\n");
    }
    
    return matchedDocs.slice(0, 3).map(item => item.doc).join("\n\n");
}

// Send Message directly to Ollama API or Mock
async function sendMessage() {
    const inputEl = document.getElementById('chat-input');
    const query = inputEl.value.trim();
    if (!query) return;

    if (PROMPT_INJECTION_REGEX.test(query)) {
        appendMessage(query, 'user-message');
        appendMessage("Safety Alert: Your request contains patterns that trigger our safety policies. Please rephrase your question.", 'bot-message');
        inputEl.value = '';
        return;
    }

    appendMessage(query, 'user-message');
    inputEl.value = '';

    const context = retrieveLocalContext(query);
    const loadingId = appendMessage('<i class="fa-solid fa-spinner fa-spin"></i> Processing...', 'bot-message');

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
    const langName = LANG_NAMES[studentDetails.lang] || "English";
    const activePrompt = SYSTEM_PROMPTS[studentDetails.interest] || SYSTEM_PROMPTS["Education"];

    try {
        // Try Local Server Proxy first (avoids CORS issues, keeps API keys secure)
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: "Anonymous",
                contact: "Anonymous",
                interest: studentDetails.interest,
                message: query,
                lang: studentDetails.lang // Send selected language
            })
        });

        if (!response.ok) throw new Error("Local backend server offline");
        
        const data = await response.json();
        document.getElementById(loadingId).remove();
        appendMessage(data.reply, 'bot-message');
        
        if (voiceOutputEnabled) {
            speakText(data.reply);
        }
        saveLocalLog(`User: ${query}\nAssistant (FastAPI Proxy): ${data.reply}`);

    } catch (proxyError) {
        console.warn("FastAPI Proxy offline, attempting direct local Ollama connection...");
        
        try {
            // Attempt 2: Direct browser-to-Ollama API call
            const directResponse = await fetch(`${API_CONFIG.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_CONFIG.apiKey}`
                },
                body: JSON.stringify({
                    model: API_CONFIG.model,
                    messages: [
                        { role: "system", content: `${activePrompt}\n\nCRITICAL DIRECTIVE: The student's preferred language is ${langName}. You MUST respond ONLY in ${langName}. Under no circumstances should you output English (unless it is a technical term or candidate name). Translate all provided context facts accurately into ${langName}.` },
                        { role: "system", content: `Context:\n${context}` },
                        { role: "user", content: query }
                    ],
                    temperature: 0.3
                })
            });

            if (!directResponse.ok) throw new Error("Direct Ollama connection failed");

            const data = await directResponse.json();
            document.getElementById(loadingId).remove();
            
            const reply = data.choices[0].message.content;
            appendMessage(reply, 'bot-message');
            
            if (voiceOutputEnabled) {
                speakText(reply);
            }
            saveLocalLog(`User: ${query}\nAssistant (Direct Ollama): ${reply}`);

        } catch (directError) {
            document.getElementById(loadingId).remove();
            
            // Localized fallback header
            const FALLBACK_HEADERS = {
                "en-IN": "Based on our official guidelines:",
                "hi-IN": "हमारे आधिकारिक दिशा-निर्देशों के अनुसार:",
                "mai-IN": "हमर आधिकारिक दिशा-निर्देश क अनुसार:",
                "bn-IN": "আমাদের অফিশিয়াল নির্দেশিকা অনুযায়ী:",
                "te-IN": "మా అధికారిక నిబంధనల ప్రకారం:",
                "mr-IN": "आमच्या अधिकृत मार्गदर्शक तत्त्वांनुसार:",
                "ta-IN": "எங்கள் அதிகாரப்பூர்வ வழிகாட்டுதல்களின்படி:",
                "ur-IN": "ہمارے سرکاری رہنما اصولوں کے مطابق:",
                "gu-IN": "અમારા સત્તાવાર માર્ગદર્શિકા મુજબ:",
                "kn-IN": "ನಮ್ಮ ಅಧಿಕೃತ ಮಾರ್ಗಸೂಚಿಗಳ ಪ್ರಕಾರ:",
                "ml-IN": "ഞങ്ങളുടെ ഔദ്യോഗിക മാർഗ്ഗനിർദ്ദേശങ്ങൾ അനുസരിച്ച്:",
                "pa-IN": "ਸਾਡੇ ਅਧਿਕਾਰਤ ਦਿਸ਼ਾ-ਨਿਰਦੇਸ਼ਾਂ ਅਨੁਸਾਰ:",
                "or-IN": "ଆମର ସରକାରୀ ନିର୍ଦ୍ଦେଶାବଳୀ ଅନୁଯାୟୀ:"
            };
            
            const fallbackHeader = FALLBACK_HEADERS[studentDetails.lang] || FALLBACK_HEADERS["en-IN"];
            let cleanContext = context.replace(/\. /g, ".<br>");
            
            let demoReply = `<strong>${fallbackHeader}</strong><br><br>${cleanContext}`;
            
            appendMessage(demoReply, 'bot-message');
            
            if (voiceOutputEnabled) {
                speakText(fallbackHeader + " " + context);
            }
            
            saveLocalLog(`User: ${query}\nAssistant (Fallback): ${context}`);
            console.error("All connection options failed:", directError);
        }
    }
}

// Helper to append messages
let messageCount = 0;
function appendMessage(text, className) {
    const container = document.getElementById('chat-messages');
    const msgId = `msg-${messageCount++}`;
    
    const msgDiv = document.createElement('div');
    msgDiv.id = msgId;
    msgDiv.className = `message ${className}`;
    msgDiv.innerHTML = `<p>${text}</p>`;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    
    return msgId;
}

// TTS Text Speaker
function speakText(text) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/\[[^\]]*\]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set speech synthesis language to match user language selection
    utterance.lang = studentDetails.lang;
    
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(studentDetails.lang.split('-')[0]));
    if (matchedVoice) {
        utterance.voice = matchedVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

// Save Logs to LocalStorage
function saveLocalLog(entryText) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const logKey = `admissions_log_${today}`;
        
        let existingLogs = localStorage.getItem(logKey) || "";
        const timestamp = new Date().toLocaleTimeString();
        
        existingLogs += `[${timestamp}]\n${entryText}\n-----------------------------------\n\n`;
        localStorage.setItem(logKey, existingLogs);
    } catch (e) {
        console.error("LocalStorage logging failed:", e);
    }
}

// Start location query automatically
window.onload = () => {
    initSpeechRecognition();
};
