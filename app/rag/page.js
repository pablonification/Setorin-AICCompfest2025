'use client';

import { useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

export default function RagPage() {
  return (
    <ProtectedRoute userOnly={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto py-10 px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">💬 RAG Chat</h1>
          <RagChat />
        </div>
      </div>
    </ProtectedRoute>
  );
}

function RagChat() {
  const auth = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('Jelaskan 3R dan cara memilah botol PET.');
  const [threadId, setThreadId] = useState('default');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!auth?.token || !input.trim()) return;
    const userMsg = { role: 'user', content: input, ts: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const resp = await fetch('/api/rag/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: input, thread_id: threadId })
      });
      const data = await resp.json();
      if (resp.ok) {
        const aiMsg = { role: 'assistant', content: data.answer || '', ts: new Date().toISOString() };
        setMessages((m) => [...m, aiMsg]);
        setInput('');
      } else {
        const errMsg = { role: 'assistant', content: data.error || 'Gagal memproses', ts: new Date().toISOString() };
        setMessages((m) => [...m, errMsg]);
      }
    } catch (e) {
      const errMsg = { role: 'assistant', content: 'Terjadi kesalahan jaringan', ts: new Date().toISOString() };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-gray-600">Thread:</label>
        <input
          value={threadId}
          onChange={(e) => setThreadId(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="h-80 overflow-y-auto border rounded p-3 bg-gray-50 mb-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-sm">Mulai percakapan dengan bertanya.</div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border text-gray-800'}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Tulis pertanyaan..."
        />
        <button onClick={send} disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded">
          {loading ? '...' : 'Kirim'}
        </button>
      </div>
    </div>
  );
}
