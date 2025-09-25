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
        # First-pass: cheap keyword match (case-insensitive)
        related_keywords = [
            'sampah', 'daur ulang', 'recycling', 'waste', 'environment', 'lingkungan',
            'plastik', 'botol', '3r', '5r', 'setorin', 'tukar', 'poin',
            'kebersihan', 'pemilahan', 'organik', 'anorganik', 'sustainability',
            'green', 'eco', 'bumi', 'planet', 'polusi', 'polution', 'karbon',
            'emisi', 'energy', 'energi', 'conservation', 'pelestarian', 'robin'
        ]

        query_lower = query.lower()
        if any(keyword in query_lower for keyword in related_keywords):
            return True

        # If no obvious keywords, use an LLM-based relevance check as a second pass.
        # This helps when user phrasing is semantic but does not include the keywords.
        try:
            is_related = self._llm_relevance_check(query)
            return bool(is_related)
        except Exception:
            # Be permissive on classifier failures to avoid false negatives.
            return True

    def _llm_relevance_check(self, query: str) -> bool:
        """Ask the LLM whether the query is related to our domain.

        Returns True if the LLM indicates the query is related, False otherwise.
        The LLM is instructed to reply with a short YES/NO and an optional explanation.
        We do a lightweight parsing of the response to decide.
        """
        # Build a focused prompt for binary classification
        prompt = (
            "Anda adalah classifier yang bertugas menentukan apakah sebuah pertanyaan terkait dengan topik "
            "sampah, daur ulang, lingkungan, atau fitur aplikasi Setorin. \n"
            "Jawab hanya dengan satu kata: 'YES' jika terkait, atau 'NO' jika tidak. Jangan berikan penjelasan.\n\n"
            f"Pertanyaan: {query}\n"
        )

        try:
            resp = self.llm.invoke([
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=prompt),
            ])
            text = getattr(resp, "content", str(resp)).strip().lower()
            # Only consider the very first token to be token-efficient
            first_token = text.split()[:1]
            if first_token and (first_token[0].startswith('yes') or first_token[0].startswith('ya')):
                return True
            if first_token and (first_token[0].startswith('no') or first_token[0].startswith('tidak')):
                return False
            # Conservative default: treat ambiguous output as related
            return True
        except Exception:
            # If LLM fails for any reason, raise to caller so caller can decide fallback
            raise

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

        # First: determine if query is related using the chained classifier (keyword + LLM fallback)
        try:
            is_related = self._is_related_to_domain(user_query)
        except Exception:
            # If the classifier fails, be permissive to avoid blocking related questions
            is_related = True

        if not is_related:
            rejection_message = (
                "Maaf, saya adalah asisten khusus untuk topik sampah, daur ulang, lingkungan, dan fitur Setorin. "
                "Untuk pertanyaan di luar topik tersebut, saya tidak bisa membantu. "
                "Silakan tanyakan tentang cara memilah sampah, fitur aplikasi Setorin, atau topik lingkungan lainnya."
            )
            out_messages = list(messages) + [AIMessage(content=rejection_message)]
            return {"messages": out_messages}

        # Second: retrieve context documents (if any) to augment answer generation
        contexts: List[str] = []
        try:
            docs = self.retriever.get_relevant_documents(user_query)
            contexts = [d.page_content for d in docs]
        except Exception:
            contexts = []

        # Third: generate final answer using a dedicated answer generator (LLM) that consumes contexts
        try:
            answer_text = self._generate_answer(user_query, contexts)
        except Exception:
            # If generation fails, fall back to a safe generic response
            answer_text = (
                "Maaf, terjadi kesalahan saat menghasilkan jawaban. Silakan coba lagi nanti atau tanyakan dengan kata-kata yang lebih sederhana."
            )

        out_messages = list(messages) + [AIMessage(content=answer_text)]
        return {"messages": out_messages}

    def _generate_answer(self, user_query: str, contexts: List[str]) -> str:
        """Generate a full answer using the LLM, optionally with retrieved contexts.

        This is the second agent in the chain: it assumes the query is related and focuses on
        producing a helpful, context-aware response.
        """
        if contexts:
            context_block = "\n\n".join(contexts[:4])
            prompt = (
                "Konteks berikut berasal dari dokumen internal Setorin. Gunakan seperlunya untuk pertanyaan spesifik.\n\n"
                f"{context_block}\n\n"
                f"Pertanyaan: {user_query}\n"
                "Jawab dengan informasi dari konteks jika tersedia, atau gunakan pengetahuan umum tentang daur ulang dan waste management."
            )
        else:
            prompt = (
                f"Pertanyaan: {user_query}\n"
                "Jawab menggunakan pengetahuan umum tentang daur ulang, waste management, dan best practices lingkungan. "
                "Meskipun tidak ada konteks spesifik Setorin, berikan jawaban yang bermanfaat dan edukatif."
            )

        resp = self.llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])

        return getattr(resp, "content", str(resp))


# Public app instance
app = SimpleRAGApp()
