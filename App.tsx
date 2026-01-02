
import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession, UserProfile, ChatMode, GroundingChunk } from './types';
import { chatWithGemini, generateImageWithGemini } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const App: React.FC = () => {
  const STORAGE_KEY = '360eye_sessions_v8';

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Neural link corrupted.", e);
    }
    
    const initialId = Date.now().toString();
    return [{
      id: initialId,
      title: 'Neural Command',
      mode: 'lua',
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: `360 Eye operational. Active Link: LUA. 
I am calibrated for Roblox Engineering and Full-Stack App/Game builds.

Select operation mode in the terminal header.`,
        timestamp: Date.now()
      }],
      createdAt: Date.now()
    }];
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessions[0]?.id || '');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Engaging Core...');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isLoading]);

  const startNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Operation',
      mode: 'lua',
      messages: [{
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Neural link established. Mode initialized to LUA.',
        timestamp: Date.now()
      }],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const setChatMode = (mode: ChatMode) => {
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, mode } : s
    ));
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === 0) {
      startNewChat();
    } else {
      setSessions(filtered);
      if (currentSessionId === id) setCurrentSessionId(filtered[0].id);
    }
  };

  const startEditing = (e: React.MouseEvent, s: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditTitleValue(s.title);
  };

  const saveTitle = (id: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, title: editTitleValue.trim() || 'Untitled Session' } : s
    ));
    setEditingSessionId(null);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };

    const updatedMessages = [...currentSession.messages, userMsg];
    let updatedTitle = currentSession.title;
    if (updatedTitle === 'New Operation' && input.trim()) {
      updatedTitle = input.trim().substring(0, 30) + (input.length > 30 ? '...' : '');
    }

    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, messages: updatedMessages, title: updatedTitle } : s
    ));

    const promptText = input;
    const activeMode = currentSession.mode;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);
    setLoadingMessage(`Engaging ${activeMode.toUpperCase()} Core...`);

    try {
      let botMsg: Message;

      const explicitImageRequest = /generate (an )?image|create (a )?picture|draw /i.test(promptText);
      const isImageMode = activeMode === 'image';

      if ((isImageMode || explicitImageRequest) && !selectedImage) {
        try {
          const { imageUrl, text } = await generateImageWithGemini(promptText, activeMode);
          botMsg = {
            id: Date.now().toString(),
            role: 'assistant',
            content: text || `Visual synthesis complete.`,
            timestamp: Date.now(),
            image: imageUrl || undefined
          };
        } catch (imgError: any) {
          const response = await chatWithGemini(promptText, currentSession.messages, activeMode, undefined, false);
          botMsg = {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.text || "Image generation failed. Switching to textual analysis.",
            timestamp: Date.now()
          };
        }
      } else {
        const response = await chatWithGemini(promptText || "Analyze input.", currentSession.messages, activeMode, userMsg.image, false);
        botMsg = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.text || "Interface disruption: Stream terminated.",
          timestamp: Date.now(),
          // Fix: Explicitly cast grounding chunks to local type to resolve incompatibility error on line 171
          groundingLinks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any as GroundingChunk[]) || []
        };
      }

      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...updatedMessages, botMsg] } : s
      ));
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-inter select-none">
      <aside className={`${isSidebarOpen ? 'w-72 md:w-80' : 'w-0'} flex-shrink-0 bg-[#0a0f1d] transition-all duration-300 flex flex-col border-r border-slate-800/60 overflow-hidden relative z-20 shadow-2xl`}>
        <div className="p-5 border-b border-slate-800/40">
          <button onClick={startNewChat} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-blue-500/20 bg-blue-600/5 hover:bg-blue-600/10 hover:border-blue-500/50 transition-all text-xs font-bold tracking-widest text-blue-400 group uppercase">
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 space-y-1.5 custom-scrollbar py-4">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-3 mb-2">Operation Logs</p>
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => { if (editingSessionId !== s.id) setCurrentSessionId(s.id); }} 
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${s.id === currentSessionId ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-900/10' : 'hover:bg-slate-800/40 border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${s.id === currentSessionId ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`}></div>
              {editingSessionId === s.id ? (
                <input 
                  autoFocus className="flex-1 bg-slate-900 border border-blue-500/50 rounded-lg px-2 py-1 text-xs text-white outline-none"
                  value={editTitleValue} onChange={(e) => setEditTitleValue(e.target.value)}
                  onBlur={() => saveTitle(s.id)} onKeyDown={(e) => e.key === 'Enter' && saveTitle(s.id)}
                />
              ) : (
                <span className="flex-1 truncate text-xs font-bold tracking-tight uppercase tracking-wider">{s.title}</span>
              )}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all gap-1">
                <button onClick={(e) => startEditing(e, s)} className="p-1 hover:text-white rounded transition-all"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                <button onClick={(e) => deleteSession(e, s.id)} className="p-1 hover:text-red-400 rounded transition-all"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-800/60 bg-[#080c16]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <span className="text-xs font-black text-blue-500">360</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-black tracking-widest text-white uppercase truncate">Operator Prime</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_green]"></div>
                <span className="text-[9px] text-slate-500 font-bold uppercase">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative min-w-0 bg-[#020617]">
        <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 md:h-16 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-2xl z-10 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 text-slate-400 hover:text-white transition-all bg-slate-900/50 rounded-xl border border-slate-800 shadow-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <div className="flex flex-col">
              <h1 className="text-xs font-black text-slate-300 uppercase tracking-widest truncate max-w-[150px]">{currentSession?.title}</h1>
              <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">Interface Status: Active</span>
            </div>
          </div>
          
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800/50 shadow-2xl">
            {['lua', 'html', 'image'].map((mode) => (
              <button 
                key={mode}
                onClick={() => setChatMode(mode as ChatMode)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${currentSession.mode === mode ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:6rem_6rem] opacity-[0.03] pointer-events-none"></div>
          <div className="max-w-4xl mx-auto py-12 px-6 md:px-10 relative z-10">
            {currentSession?.messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            {isLoading && (
              <div className="flex justify-start mb-12 animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="flex gap-5 max-w-[85%]">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex-shrink-0 flex items-center justify-center border border-blue-400/40 shadow-blue-500/40 shadow-lg">
                    <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase animate-pulse">{loadingMessage}</span>
                    <div className="h-1.5 bg-slate-800/80 rounded-full w-48 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </main>

        <div className="p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent relative z-10">
          <div className="max-w-4xl mx-auto relative">
            {selectedImage && (
              <div className="absolute -top-24 left-0 flex items-center gap-4 p-3 bg-slate-900/95 border border-blue-500/40 rounded-xl backdrop-blur-2xl shadow-2xl">
                <img src={selectedImage} alt="Input" className="w-16 h-16 object-cover rounded-lg border border-slate-700" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="relative flex items-end gap-3 bg-[#0f172a]/95 border border-slate-800/80 rounded-2xl p-3 pl-4 focus-within:border-blue-500/50 shadow-2xl transition-all shadow-blue-900/10">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-500 hover:text-blue-400 transition-all mb-1 rounded-xl hover:bg-slate-800/50">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <textarea 
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} 
                placeholder={`Engage ${currentSession.mode.toUpperCase()} Link...`} 
                className="flex-1 bg-transparent border-none text-slate-100 py-3.5 focus:ring-0 outline-none resize-none min-h-[48px] max-h-48 text-sm md:text-base font-medium placeholder:text-slate-600" rows={1} 
              />
              <button type="submit" disabled={(!input.trim() && !selectedImage) || isLoading} className={`p-3 rounded-xl transition-all mb-1 ${(!input.trim() && !selectedImage) || isLoading ? 'text-slate-700 bg-slate-800/50' : 'text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-500/30 active:scale-95'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
            <div className="flex justify-center mt-3">
              <p className="text-[10px] text-slate-800 uppercase tracking-[0.4em] font-black">360 Eye // Neural Terminal // Deployment Mode: {currentSession.mode.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
