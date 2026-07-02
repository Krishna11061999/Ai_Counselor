# Frosted Glass Multilingual Voice AI Assistant (Powered by KaISEnVlog)

An interactive, responsive, and gorgeous circular glassmorphic virtual assistant built for multi-domain counseling (Education, Farming, Health First Aid, and Tourism). Designed with full Indian multilingual voice features (Speech-to-Text and Text-to-Speech), automated location check prompts, and secure backend integration with Groq Cloud API.

---

## Key Features

- 💎 **Premium Glassmorphism & Circular Design**: Beautiful dark mode styled with blurred backdrops (`backdrop-filter: blur(25px)`), pulsing glowing borders, floating blobs, and custom circular trigger animations labeled **"Powered by KaISEnVlog"**.
- 🎤 **Indian Multilingual Voice Assistant**: Fully integrated browser-native Speech-to-Text (microphone input) and Text-to-Speech (audio output) matching 12 major Indian languages (English, Hindi, Maithili, Bengali, Marathi, Telugu, Tamil, Urdu, Kannada, Gujarati, Malayalam, Punjabi, Odia).
- 📍 **Automated Geolocation Tracking**: Detects location coordinate permissions dynamically upon chat initiation to log student location data, providing alerts and warning badges if disabled.
- 🔄 **Dynamic Domain Personas (Multi-Profile)**: Adapts counselor characteristics, greetings, and starter chips instantly based on selected domains:
  - **Education**: Apex College Counselor with strict scholarship/placement safety caps.
  - **Farming**: Scientific agricultural guide for soil, pest control, and crops.
  - **First Aid Doctor**: Educational health guide with emergency call disclaimers.
  - **Tourism**: Local destination traveler advisor.
- 💾 **Daily Conversational Text Logs**: Automatically saves details to a date-wise structured directory (`conversations/YYYY-MM-DD.txt`) recording timestamps, domains, and queries.
- 🛡️ **Regex Guardrails & Input Safety**: Built-in regex sanitizers protect the system against basic prompt injection payloads.
- 🔌 **Secure API Proxy Architecture**: Routes messages through an Express.js backend to bypass browser CORS blocks and protect your secret Groq API key from client exposures.

---

## File Structure

```
├── static/
│   ├── index.html        # Front-end landing page and circular chat pop-up widget
│   ├── style.css         # Custom glassmorphic styles, pulsing mic, and status badges
│   └── script.js         # Geolocation, speech APIs, dynamic greeting, and fetch handlers
├── data/
│   └── admission_details.txt # Text database context guidelines for RAG retrieval
├── conversations/        # Daily session logs folder (automatically created)
├── .env                  # Private API keys and endpoints configuration
├── .env.example          # Public environment variables template
├── .gitignore            # Git exclusion rules (blocks node_modules and .env)
├── server.js             # Node.js Express server acting as RAG router and secure proxy
├── package.json          # Node.js dependencies configuration
└── README.md             # Repository documentation
```

---

## Installation & Setup

### Prerequisites
- Make sure you have **Node.js** installed on your system (includes `npm`).
- Get a free API Key from [Groq Console](https://console.groq.com/).

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install Dependencies
Install all required Node.js libraries:
```bash
npm install
```

### 3. Configure API Key
Create a `.env` file in the root directory by copying the template:
```bash
cp .env.example .env
```
Open `.env` and fill in your active Groq API Key:
```env
OLLAMA_API_KEY=your_groq_api_key_here
OLLAMA_BASE_URL=https://api.groq.com/openai/v1
OLLAMA_MODEL=llama-3.1-8b-instant
```

---

## Running Locally

### 1. Launch the Server
Start the Express.js proxy backend:
```bash
npm start
```
*You will see the console log: `Server is running on http://localhost:8000`*

### 2. Open the Interface
Navigate to your web browser and open:
👉 **[http://localhost:8000](http://localhost:8000)**

> [!IMPORTANT]
> **Do not open `index.html` directly from your hard drive (`file:///` scheme).** Modern browsers block microphone/voice permissions on local file paths. You must access the app via the server URL `http://localhost:8000` for the Voice Assistant to work.
