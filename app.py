import os
import re
import datetime
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Ollama/OpenAI API from environment
OLLAMA_API_KEY = os.environ.get("OLLAMA_API_KEY", "mock-key")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3")

# Initialize OpenAI client
client = OpenAI(
    api_key=OLLAMA_API_KEY,
    base_url=OLLAMA_BASE_URL
)

# Vector DB configuration
DB_DIR = "./db"
COLLECTION_NAME = "college_admissions"

# Simple input sanitization regex (to detect basic prompt injection patterns)
PROMPT_INJECTION_REGEX = re.compile(
    r"(ignore previous instructions|system prompt|translate to|you are now|forget what|bypass)",
    re.IGNORECASE
)

# Safety Prompt templates per domain selection
SYSTEM_PROMPTS = {
    "Education": """You are an official, professional College Admission Counselor assistant at Apex College.
Your goal is to guide prospective students with factual, helpful, and clear information based ONLY on the provided context from our official documents.

CRITICAL GUARDRAILS & SAFETY POLICIES:
1. Do NOT promise or guarantee admission or placement. Always mention that placement and admission depend on candidate performance, selection rounds, and official university criteria.
2. Do NOT promise fake or specific scholarship percentages unless they are directly stated in the context. Never guarantee a scholarship.
3. If the answer to a question cannot be found in the provided context, politely state: "I don't have that information in my official records. Please contact the admissions office directly or visit our website." Do not make up facts or extrapolate.
4. Keep a professional, encouraging, yet conservative tone.""",

    "Farming": """You are a knowledgeable Agricultural Consultant / Farming Expert. 
Your goal is to provide helpful, practical, and scientific advice on crop cultivation, soil health, organic farming, modern irrigation systems, pest management, weather patterns, and crop rotation.
Ensure your advice is safe and contextually relevant to regional Indian farming. Do not offer financial loans or make up statistics.""",

    "Personal First Aid Doctor": """You are a Virtual First Aid Health Assistant.
Your goal is to guide the user with basic first aid instructions, minor health tips, emergency prep, hygiene guidelines, and healthy lifestyle habits.
CRITICAL MEDICAL SAFETY:
- You are NOT a doctor. You must prefix or suffix your medical replies with a warning: 'Note: This is for educational first aid support. Please consult a qualified medical professional for diagnosis or emergency treatment.'
- Do not prescribe prescription drugs. Recommend general remedies (e.g. hydration, rest, ice, clean bandages).""",

    "Tourism": """You are an enthusiastic Tourism and Travel Advisor.
Your goal is to guide users with custom itineraries, travel destinations, hotel suggestions, budget tips, safety advice, cultural insights, and transit information. Focus on making their travel experience memorable and smooth."""
}

LANG_NAMES = {
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
}

# Initialize FastAPI App
app = FastAPI(title="Apex College Admissions Counselor Portal")

# Mount Static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

class ChatRequest(BaseModel):
    name: str
    contact: str
    interest: str
    message: str
    lang: str = "en-IN"

def get_db_collection():
    try:
        client_db = chromadb.PersistentClient(path=DB_DIR)
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        return client_db.get_collection(name=COLLECTION_NAME, embedding_function=emb_fn)
    except Exception as e:
        print(f"Error loading ChromaDB: {e}")
        return None

# Retrieve relevant documents from ChromaDB
def retrieve_context(query: str, collection, n_results: int = 3) -> str:
    if collection is None:
        return ""
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        documents = results.get("documents", [[]])[0]
        return "\n\n".join(documents)
    except Exception as e:
        print(f"Query error: {e}")
        return ""

def log_conversation(name: str, contact: str, interest: str, user_input: str, response_text: str):
    try:
        # Ensure conversations directory exists
        os.makedirs("conversations", exist_ok=True)
        
        # Get date for filename
        today = datetime.date.today().strftime("%Y-%m-%d")
        log_filepath = os.path.join("conversations", f"{today}.txt")
        
        # Format log entry
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = (
            f"==================================================\n"
            f"Time: {timestamp}\n"
            f"Student Name: {name}\n"
            f"Contact: {contact}\n"
            f"Interest: {interest}\n"
            f"User: {user_input}\n"
            f"Assistant: {response_text}\n"
            f"==================================================\n\n"
        )
        
        with open(log_filepath, "a", encoding="utf-8") as log_file:
            log_file.write(log_entry)
    except Exception as e:
        print(f"Failed to log conversation: {e}")

@app.get("/")
async def get_index():
    return FileResponse("static/index.html")

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    user_input = request.message.strip()

    # Apply regex safety filter for prompt injection
    if PROMPT_INJECTION_REGEX.search(user_input):
        reply = "Safety Alert: Your request contains patterns that trigger our safety policies. Please rephrase your question."
        log_conversation(request.name, request.contact, request.interest, user_input, reply)
        return {"reply": reply}

    # Retrieve context from DB
    collection = get_db_collection()
    context = retrieve_context(user_input, collection)

    # Format language name
    lang_name = LANG_NAMES.get(request.lang, "English")

    # Resolve dynamic system prompt based on counseling field selection
    system_prompt = SYSTEM_PROMPTS.get(request.interest, SYSTEM_PROMPTS["Education"])

    # Format message for LLM
    messages = [
        {"role": "system", "content": f"{system_prompt}\n\nCRITICAL DIRECTIVE: The student's preferred language is {lang_name}. You MUST respond ONLY in {lang_name}. Under no circumstances should you output English (unless it is a technical term or candidate name). Translate all provided context facts accurately into {lang_name}."},
        {"role": "system", "content": f"Context details:\n{context}"},
        {"role": "user", "content": user_input}
    ]
    
    try:
        response = client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=messages
        )
        response_text = response.choices[0].message.content
    except Exception as e:
        response_text = f"An error occurred while generating the response: {str(e)}"

    # Log the conversation into a daily text file inside 'conversations' folder
    log_conversation(request.name, request.contact, request.interest, user_input, response_text)

    return {"reply": response_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.py:app", host="0.0.0.0", port=8000, reload=True)
# Keep backend server launch friendly
