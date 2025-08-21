'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function RagPage() {
  const router = useRouter();
  return (
    <ProtectedRoute userOnly={true}>
      <div className="max-w-[430px] mx-auto min-h-screen bg-[var(--background)] text-[var(--foreground)] font-inter">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--color-primary-700)] text-white rounded-b-[var(--radius-lg)] px-4 py-6 [box-shadow:var(--shadow-card)]">
          <div className="flex items-center justify-center relative">
            <button
              onClick={() => router.replace('/')}
              aria-label="Kembali"
              className="w-9 h-9 flex items-center justify-center absolute left-0"
            >
              <img src="/back.svg" alt="Back" className="w-6 h-6" />
            </button>
            <div className="text-xl leading-7 font-semibold">Robin</div>
          </div>
        </div>

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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async (content = null) => {
    const messageContent = content || input.trim();
    if (!auth?.token || !messageContent || loading) return;
    
    const userMsg = { role: 'user', content: messageContent, ts: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch('/api/rag/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: userMsg.content })
      });
      
      const data = await resp.json();
      if (resp.ok) {
        const aiMsg = { role: 'assistant', content: data.answer || 'Maaf, saya tidak bisa memproses pertanyaan Anda saat ini.', ts: new Date().toISOString() };
        setMessages((m) => [...m, aiMsg]);
      } else {
        const errMsg = { role: 'assistant', content: data.error || 'Gagal memproses pertanyaan. Silakan coba lagi.', ts: new Date().toISOString() };
        setMessages((m) => [...m, errMsg]);
      }
    } catch (e) {
      const errMsg = { role: 'assistant', content: 'Terjadi kesalahan jaringan. Silakan coba lagi.', ts: new Date().toISOString() };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
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
                    className="px-3 py-2 bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded-[var(--radius-md)] text-[12px] leading-4 font-medium hover:bg-[var(--color-primary-200)] active:opacity-80 transition-colors border border-[var(--color-primary-200)]"
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
                  <div className="text-[14px] leading-5">
                    {message.role === 'assistant' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="markdown-content"
                        components={{
                          // Custom styling for markdown elements
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-[var(--color-primary-700)]">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mb-2 text-[var(--color-primary-700)]">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-bold mb-1 text-[var(--color-primary-700)]">{children}</h3>,
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-[14px] leading-5">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-[var(--color-primary-700)]">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-[var(--color-primary-500)] pl-3 py-1 bg-[var(--color-primary-50)] italic text-gray-700">{children}</blockquote>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
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
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
            className="flex-1 border border-gray-300 rounded-[var(--radius-pill)] px-4 py-3 text-[14px] leading-5 focus:outline-none focus:border-[var(--color-primary-600)]"
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
