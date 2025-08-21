# Setorin RAG Agent Testing Frontend

A simple HTML frontend for testing the Setorin RAG (Retrieval-Augmented Generation) agent that answers questions about waste management, recycling, and Setorin operations using knowledge from the markdown documentation.

## Features

- 🧠 **RAG Agent Integration**: Connect to the backend RAG service
- 🔧 **Configurable API**: Set custom backend URL and auth tokens
- 💡 **Sample Queries**: Pre-built questions to test the system
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔍 **Real-time Responses**: See the RAG agent's answers instantly

## Quick Start

### 1. Start the Backend

```bash
cd backend
export GOOGLE_API_KEY=your_google_api_key_here
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Open the Frontend

Simply open `index.html` in your web browser. No build process required!

### 3. Test the RAG Agent

1. **Configure API**: Set the backend URL (default: `http://localhost:8000`)
2. **Ask Questions**: Type your question or click on sample queries
3. **Get Answers**: The RAG agent will retrieve relevant information from the Setorin knowledge base

## Sample Questions

The frontend includes several pre-built questions to test different aspects:

- **Waste Management**: "Jelaskan hierarki pengelolaan sampah 3R dan 5R"
- **Setorin Overview**: "Apa itu Setorin dan bagaimana cara kerjanya?"
- **Recycling Process**: "Bagaimana proses daur ulang plastik PET?"
- **Benefits**: "Apa saja manfaat daur ulang plastik?"
- **Environmental Impact**: "Jelaskan tentang mikroplastik dan dampaknya"

## API Endpoints

The RAG agent exposes these endpoints:

- `POST /rag/query` - Submit a question and get an answer
- `GET /rag/threads/{thread_id}/history` - Get conversation history
- `GET /rag/health` - Health check for the RAG service

## Configuration

### Backend Requirements

- Python 3.13+
- Google API key for Gemini 2.0 Flash
- Dependencies: `langchain`, `langgraph`, `chromadb`, `langchain-google-genai`

### Environment Variables

```bash
export GOOGLE_API_KEY=your_google_api_key_here
```

## How It Works

1. **Knowledge Base**: The RAG agent indexes the Setorin markdown documentation
2. **Query Processing**: User questions are processed through the LangGraph workflow
3. **Retrieval**: Relevant document chunks are retrieved using vector similarity
4. **Generation**: Google Gemini 2.0 Flash generates contextual answers
5. **Response**: The final answer is returned to the frontend

## Architecture

```
Frontend (HTML) → Backend (FastAPI) → RAG Agent (LangGraph) → Gemini 2.0 Flash
                                    ↓
                              Vector Store (ChromaDB)
                                    ↓
                              Markdown Documents
```

## Troubleshooting

### Common Issues

1. **"Could not reach RAG API"**
   - Ensure the backend is running on the specified port
   - Check the API URL in the frontend configuration

2. **"RAG processing failed"**
   - Verify your Google API key is set correctly
   - Check backend logs for detailed error messages

3. **Empty responses**
   - Ensure the markdown documents are accessible
   - Check that the vector store was built successfully

### Debug Mode

The backend includes debug endpoints:
- `/rag/health` - Check RAG service status
- Backend logs will show detailed processing information

## Future Enhancements

- [ ] Conversation threading with persistent storage
- [ ] User authentication integration
- [ ] Advanced query suggestions
- [ ] Response quality feedback
- [ ] Export conversation history

## Development

This is a standalone testing frontend. When ready for production:

1. Integrate with the main Setorin frontend
2. Add proper authentication
3. Implement conversation persistence
4. Add analytics and monitoring
5. Optimize for production deployment

---

**Note**: This frontend is designed for testing and development. For production use, integrate it with your main application architecture.
