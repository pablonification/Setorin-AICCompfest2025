'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TopBar from '../components/TopBar';

export default function RagPage() {
  const router = useRouter();
  return (
    <ProtectedRoute userOnly={true}>
      <div className="w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
        <TopBar title="Robin" backHref="/" />

        {/* Chat Container */}
        <div className="flex-1 flex flex-col h-[calc(100vh-120px)]">
          <RagChat />
        </div>
      </div>
    </ProtectedRoute>
  );
}

function RagChat() {
  const router = useRouter();
  const auth = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Halo! Aku Robin, asisten cerdas Setorin. Aku bisa membantu menjawab pertanyaan seputar fitur aplikasi, cara setor & tukar poin, edukasi daur ulang, serta informasi sampah dan lingkungan. Tanyakan saja apa yang ingin kamu ketahui!',
      ts: new Date().toISOString()
    },
    {
      role: 'suggestions',
      suggestions: [
        'Apa itu Robin?',
        'Bagaimana cara menyetorkan sampah?',
        'Apa saja yang bisa dilakukan di Setorin?',
        'Bagaimana cara menukar poin?',
        'Apa itu 3R?',
        'Jenis sampah apa yang bernilai tinggi?'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async (content = null, retryCount = 0) => {
    const messageContent = content || input.trim();
    if (!auth?.token || !messageContent || loading) return;
    
    const userMsg = { role: 'user', content: messageContent, ts: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const resp = await fetch('/api/rag/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: userMsg.content }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      let data;
      try {
        data = await resp.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response format from server');
      }
      
      if (resp.ok && data.answer) {
        const aiMsg = { role: 'assistant', content: data.answer, ts: new Date().toISOString() };
        setMessages((m) => [...m, aiMsg]);
      } else {
        // Handle different error scenarios
        let errorMessage = 'Gagal memproses pertanyaan. Silakan coba lagi.';
        
        if (resp.status === 401) {
          errorMessage = 'Sesi Anda telah berakhir. Silakan login ulang.';
        } else if (resp.status === 403) {
          errorMessage = 'Anda tidak memiliki akses ke fitur ini.';
        } else if (resp.status === 404) {
          errorMessage = 'Layanan RAG tidak tersedia saat ini.';
        } else if (resp.status === 500) {
          errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
        } else if (resp.status === 503) {
          errorMessage = 'Layanan RAG sedang dalam pemeliharaan.';
        } else if (data?.error) {
          errorMessage = data.error;
        } else if (data?.detail) {
          errorMessage = data.detail;
        }
        
        const errMsg = { role: 'assistant', content: errorMessage, ts: new Date().toISOString() };
        setMessages((m) => [...m, errMsg]);
        
        // Log error for debugging
        console.error('RAG API Error:', {
          status: resp.status,
          statusText: resp.statusText,
          data: data,
          query: messageContent
        });
        
        // Retry for certain errors (max 2 retries)
        if (retryCount < 2 && (resp.status >= 500 || resp.status === 503)) {
          console.log(`Retrying RAG query (attempt ${retryCount + 1})`);
          setRetrying(true);
          setTimeout(() => send(messageContent, retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
      }
    } catch (e) {
      console.error('RAG Chat Error:', e);
      
      let errorMessage = 'Terjadi kesalahan jaringan. Silakan coba lagi.';
      
      if (e.name === 'AbortError') {
        errorMessage = 'Permintaan terlalu lama. Silakan coba lagi.';
      } else if (e.name === 'TypeError' && e.message.includes('fetch')) {
        errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (e.message.includes('Invalid response format')) {
        errorMessage = 'Server mengembalikan respons yang tidak valid. Silakan coba lagi.';
      }
      
      const errMsg = { role: 'assistant', content: errorMessage, ts: new Date().toISOString() };
      setMessages((m) => [...m, errMsg]);
      
      // Retry for network errors (max 2 retries)
      if (retryCount < 2 && (e.name === 'TypeError' || e.name === 'AbortError')) {
        console.log(`Retrying RAG query due to network error (attempt ${retryCount + 1})`);
        setRetrying(true);
        setTimeout(() => send(messageContent, retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, idx) => (
          <div key={idx}>
            {message.role === 'suggestions' ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {message.suggestions.map((suggestion, suggestionIdx) => (
                  <button
                    key={suggestionIdx}
                    onClick={() => send(suggestion)}
                    className="px-3 py-2 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded-[var(--radius-md)] text-xs leading-4 font-medium hover:bg-[var(--color-primary-200)] active:opacity-80 transition-colors border border-[var(--color-primary-200)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : (
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary-600)] flex items-center justify-center mr-2 flex-shrink-0">
                    <img src="/robin.svg" alt="Robin" className="w-5 h-5" />
                  </div>
                )}
                
                <div className={`max-w-[80%] px-3 py-2 rounded-[var(--radius-md)] ${
                  message.role === 'user' 
                    ? 'bg-[var(--color-accent-amber)] text-[var(--foreground)] ml-auto' 
                    : 'bg-white text-[var(--foreground)] border border-gray-200'
                }`}>
                  <div className="text-sm leading-5">
                    {message.role === 'assistant' ? (
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Custom styling for markdown elements
                            h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-[var(--color-primary-700)]">{children}</h1>,
                            h2: ({children}) => <h2 className="text-base font-bold mb-2 text-[var(--color-primary-700)]">{children}</h2>,
                            h3: ({children}) => <h3 className="text-sm font-bold mb-1 text-[var(--color-primary-700)]">{children}</h3>,
                            p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="text-sm leading-5">{children}</li>,
                            strong: ({children}) => <strong className="font-semibold text-[var(--color-primary-700)]">{children}</strong>,
                            em: ({children}) => <em className="italic">{children}</em>,
                            code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                            blockquote: ({children}) => <blockquote className="border-l-4 border-[var(--color-primary-500)] pl-3 py-1 bg-[var(--color-primary-50)] italic text-gray-700">{children}</blockquote>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary-600)] flex items-center justify-center mr-2 flex-shrink-0">
              <img src="/robin.svg" alt="Robin" className="w-5 h-5" />
            </div>
            <div className="bg-white border border-gray-200 rounded-[var(--radius-md)] px-3 py-2">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                {retrying && (
                  <span className="text-xs text-gray-500">Mencoba lagi...</span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 border border-gray-300 rounded-[var(--radius-pill)] px-4 py-3 text-sm leading-5 focus:outline-none focus:border-[var(--color-primary-600)]"
            placeholder="Tanyakan apapun ke Robin..."
            disabled={loading}
          />
          <button 
            onClick={send} 
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-full bg-[var(--color-primary-700)] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80"
          >
            <img src="/send.svg" alt="Send" className="w-10 h-10" />
          </button>
        </div>
      </div>
    </div>
  );
}
