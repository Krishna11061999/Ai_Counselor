import os
import glob
import pandas as pd
from pypdf import PdfReader
import chromadb
from chromadb.utils import embedding_functions

# Define paths
DATA_DIR = "./data"
DB_DIR = "./db"
COLLECTION_NAME = "college_admissions"

def get_embedding_function():
    # Use a lightweight, open-source sentence-transformer model
    return embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        content = page.extract_text()
        if content:
            text += content + "\n"
    return text

def chunk_text(text, chunk_size=800, chunk_overlap=150):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - chunk_overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

def ingest_documents():
    print("Initializing ChromaDB client...")
    client = chromadb.PersistentClient(path=DB_DIR)
    
    # Get or create collection
    emb_fn = get_embedding_function()
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=emb_fn
    )
    
    # Process text files
    txt_files = glob.glob(os.path.join(DATA_DIR, "*.txt"))
    for file_path in txt_files:
        print(f"Processing TXT: {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        chunks = chunk_text(content)
        for idx, chunk in enumerate(chunks):
            doc_id = f"{os.path.basename(file_path)}_chunk_{idx}"
            collection.upsert(
                documents=[chunk],
                metadatas=[{"source": file_path}],
                ids=[doc_id]
            )
            
    # Process PDF files
    pdf_files = glob.glob(os.path.join(DATA_DIR, "*.pdf"))
    for file_path in pdf_files:
        print(f"Processing PDF: {file_path}")
        content = extract_text_from_pdf(file_path)
        chunks = chunk_text(content)
        for idx, chunk in enumerate(chunks):
            doc_id = f"{os.path.basename(file_path)}_chunk_{idx}"
            collection.upsert(
                documents=[chunk],
                metadatas=[{"source": file_path}],
                ids=[doc_id]
            )

    # Process Excel/CSV files
    sheet_files = glob.glob(os.path.join(DATA_DIR, "*.xlsx")) + glob.glob(os.path.join(DATA_DIR, "*.csv"))
    for file_path in sheet_files:
        print(f"Processing Spreadsheet: {file_path}")
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        content = df.to_string()
        chunks = chunk_text(content)
        for idx, chunk in enumerate(chunks):
            doc_id = f"{os.path.basename(file_path)}_chunk_{idx}"
            collection.upsert(
                documents=[chunk],
                metadatas=[{"source": file_path}],
                ids=[doc_id]
            )
            
    print(f"Ingestion complete. Total documents in collection: {collection.count()}")

if __name__ == "__main__":
    ingest_documents()
