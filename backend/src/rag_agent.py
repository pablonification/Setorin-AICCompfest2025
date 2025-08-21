"""
Robin AI Agent – RAG app bootstrap

Builds a simple Retrieval-Augmented Generation pipeline over the provided
markdown knowledge base, exposing an `app.invoke({"messages": [...]}, config)
API that returns a state containing the conversation messages. Designed to be
imported by FastAPI router at backend/src/backend/routers/rag.py
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI


KB_FILE_NAME = "Markdown For RAG 25235539e3b580e39241d3dddf194c64.md"
KB_PATHS = [
    Path("/app/docs") / KB_FILE_NAME,  # container path (docker-compose mounts ./docs)
    Path(__file__).resolve().parents[2] / "docs" / KB_FILE_NAME,  # local dev
]


def _load_kb_text() -> str:
    for p in KB_PATHS:
        if p.exists():
            return p.read_text(encoding="utf-8")
    # Fallback to empty if not found
    return ""


def _build_retriever() -> Chroma:
    kb_text = _load_kb_text()
    splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150)
    docs = splitter.create_documents([kb_text]) if kb_text else []

    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vs = Chroma.from_documents(docs, embeddings, collection_name="Setorin_rag")
    return vs.as_retriever(search_kwargs={"k": 4})


SYSTEM_PROMPT = (
    "You are Robin AI, an Setorin AI Agent, an expert assistant for recycling and waste management.\n"
    "You have knowledge about recycling, waste management, environmental topics, and Setorin features.\n\n"
    "Answering Strategy:\n"
    "1. For Setorin-specific questions: Use the provided context when available\n"
    "2. For general recycling/waste management questions: Use your base knowledge to provide helpful answers\n"
    "3. For completely unrelated topics (e.g., cooking, sports, politics): Politely decline and redirect to recycling topics\n\n"
    "Guidelines:\n"
    "- Always answer in clear, concise Bahasa Indonesia\n"
    "- Use markdown formatting for better readability:\n"
    "  - **Bold** for important points and headings\n"
    "  - *Italic* for emphasis\n"
    "  - `code` for technical terms or app features\n"
    "  - - Bullet points for lists\n"
    "  - 1. Numbered lists for steps\n"
    "  - > Blockquotes for tips or warnings\n"
    "- Provide actionable guidance when possible\n"
    "- Use concrete numbers and simple lists when relevant\n"
    "- For Setorin features, explain based on context or general app knowledge\n"
    "- For recycling topics, share best practices even without specific context\n"
    "- Only reject questions completely unrelated to environment, waste, or Setorin\n"
    "- Be helpful and educational, not restrictive\n"
)


class SimpleRAGApp:
    def __init__(self) -> None:
        self.retriever = _build_retriever()
        # Gemini 2.0 Flash (or fallback if env not set)
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.2)

    def _is_related_to_domain(self, query: str) -> bool:
        """Check if query is related to recycling, waste, environment, or Setorin."""
        related_keywords = [
            'sampah', 'daur ulang', 'recycling', 'waste', 'environment', 'lingkungan',
            'plastik', 'botol', '3r', '5r', 'Setorin', 'setorin', 'tukar', 'poin',
            'kebersihan', 'pemilahan', 'organik', 'anorganik', 'sustainability',
            'green', 'eco', 'bumi', 'planet', 'polusi', 'polution', 'karbon',
            'emisi', 'energy', 'energi', 'conservation', 'pelestarian', 'robin', 'Robin'
        ]
        
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in related_keywords)

    def invoke(self, state: Dict[str, Any], config: Dict[str, Any] | None = None) -> Dict[str, Any]:
        messages: List[Any] = state.get("messages", [])
        # Find last human query
        user_query = None
        for m in reversed(messages):
            if isinstance(m, HumanMessage):
                user_query = m.content
                break
            if isinstance(m, dict) and m.get("type") == "human":
                user_query = m.get("content")
                break

        if not user_query:
            user_query = "Jelaskan ringkas tentang Setorin dan 3R."

        # Check if query is related to our domain
        if not self._is_related_to_domain(user_query):
            rejection_message = (
                "Maaf, saya adalah asisten khusus untuk topik sampah, daur ulang, lingkungan, dan fitur Setorin. "
                "Untuk pertanyaan di luar topik tersebut, saya tidak bisa membantu. "
                "Silakan tanyakan tentang cara memilah sampah, fitur aplikasi Setorin, atau topik lingkungan lainnya."
            )
            out_messages = list(messages) + [AIMessage(content=rejection_message)]
            return {"messages": out_messages}

        # Retrieve context for Setorin-specific questions
        contexts = []
        try:
            docs = self.retriever.get_relevant_documents(user_query)
            contexts = [d.page_content for d in docs]
        except Exception:
            contexts = []

        # Build context-aware prompt
        if contexts:
            context_block = "\n\n".join(contexts[:4])
            prompt = (
                "Konteks berikut berasal dari dokumen internal Setorin. Gunakan seperlunya untuk pertanyaan spesifik.\n\n"
                f"{context_block}\n\n"
                f"Pertanyaan: {user_query}\n"
                "Jawab dengan informasi dari konteks jika tersedia, atau gunakan pengetahuan umum tentang daur ulang dan waste management."
            )
        else:
            # No specific context, but still answer using general knowledge
            prompt = (
                f"Pertanyaan: {user_query}\n"
                "Jawab menggunakan pengetahuan umum tentang daur ulang, waste management, dan best practices lingkungan. "
                "Meskipun tidak ada konteks spesifik Setorin, berikan jawaban yang bermanfaat dan edukatif."
            )

        # Call LLM
        ai_msg = self.llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])

        # Return message list as expected
        out_messages = list(messages) + [AIMessage(content=getattr(ai_msg, "content", str(ai_msg)))]
        return {"messages": out_messages}


# Public app instance
app = SimpleRAGApp()
