
import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession, UserProfile } from './types';
import { chatWithGemini } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const App: React.FC = () => {
  // --- URL Detection Logic ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      // If we arrived via the magic link, set auth to true
      localStorage.setItem('360eye_authed', 'true');
      // Clear the URL params without refreshing for a cleaner look
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload(); // Reload to trigger initial state from localStorage
    }
  }, []);

  // --- Auth State ---
  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    return localStorage.getItem('360eye_authed') === 'true';
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('360eye_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authStep, setAuthStep] = useState<'signup' | 'check_email'>('signup');
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    birthDate: '',
  });

  // --- Chat State ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('360eye_sessions');
    if (saved) return JSON.parse(saved);
    const initialId = Date.now().toString();
    return [{
      id: initialId,
      title: 'New Chat',
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: 'Verification successful. Welcome back, Operator. System scan complete. Account authenticated. I am 360 Eye, your tactical gaming intelligence. How can I assist your mission today?',
        timestamp: Date.now()
      }],
      createdAt: Date.now()
    }];
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessions[0]?.id || '');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [useSearch, setUseSearch] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  // --- Persistence ---
  useEffect(() => {
    if (isAuthed) {
      localStorage.setItem('360eye_sessions', JSON.stringify(sessions));
      localStorage.setItem('360eye_authed', 'true');
      if (userProfile) localStorage.setItem('360eye_user', JSON.stringify(userProfile));
    }
  }, [sessions, isAuthed, userProfile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isLoading]);

  // --- Auth Logic ---
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.birthDate) return;
    
    // Save profile tentatively
    const tempProfile: UserProfile = {
      firstName: formData.firstName,
      email: formData.email,
      birthDate: formData.birthDate
    };
    setUserProfile(tempProfile);
    localStorage.setItem('360eye_user', JSON.stringify(tempProfile));
    
    setAuthStep('check_email');
  };

  const sendVerificationEmail = () => {
    const baseUrl = window.location.href.split('?')[0];
    const magicLink = `${baseUrl}?verified=true`;
    const subject = encodeURIComponent("360 Eye Identity Verification");
    const body = encodeURIComponent(
      `Hello ${formData.firstName},\n\nClick the link below to verify your account and gain access to the 360 Eye Interface:\n\n${magicLink}\n\nThis is a secure system transmission.`
    );
    
    // Open the user's local email app
    window.location.href = `mailto:${formData.email}?subject=${subject}&body=${body}`;
  };

  // --- Chat Logic ---
  const startNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: [{
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Neural link established. Ready for gaming intel or analysis.',
        timestamp: Date.now()
      }],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
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
    if (updatedTitle === 'New Chat' && input.trim()) {
      updatedTitle = input.trim().substring(0, 30) + (input.length > 30 ? '...' : '');
    }

    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, messages: updatedMessages, title: updatedTitle } : s
    ));

    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await chatWithGemini(input || "Analyze this image.", currentSession.messages, userMsg.image, useSearch);
      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "Connection error.",
        timestamp: Date.now(),
        groundingLinks: grounding
      };
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...updatedMessages, botMsg] } : s
      ));
    } catch (error) {
      console.error(error);
      setIsLoading(false);
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

  // --- Auth Render ---
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-inter">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>

            {authStep === 'signup' ? (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Initialize 360 Eye</h2>
                  <p className="text-slate-400 text-sm mt-1">Please create your account to begin</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">First Name</label>
                    <input required type="text" placeholder="e.g. MasterChief" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Email Address</label>
                    <input required type="email" placeholder="operator@system.net" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Birth Date</label>
                    <input required type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
                  </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] mt-2 uppercase tracking-widest text-xs">
                  Next: Verify Email
                </button>
              </form>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white">Check Your Inbox</h2>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    To deliver a <b>real email</b> to your inbox without a backend, click the button below to send the verification link to yourself.
                  </p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center space-y-5">
                   <div className="w-16 h-16 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center mx-auto">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                   </div>
                   
                   <div className="space-y-3">
                     <button 
                       onClick={sendVerificationEmail}
                       className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.95] flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                     >
                       Send Email to Myself
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                       </svg>
                     </button>
                     <p className="text-[10px] text-slate-500 italic">
                       1. Click button (Opens Gmail/Mail app)<br/>
                       2. Hit "Send" in your email app<br/>
                       3. Open your inbox & click the link
                     </p>
                   </div>
                </div>

                <div className="text-center">
                  <button onClick={() => setAuthStep('signup')} className="text-slate-500 hover:text-slate-300 text-xs font-medium transition-colors">
                    Wait, I used the wrong email
                  </button>
                </div>
              </div>
            )}
            
            <p className="text-[10px] text-center text-slate-600 mt-8 uppercase tracking-[0.2em] font-bold">
              Secure Interface &bull; 360 Eye Protocol
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Chat Render ---
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-inter">
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 bg-slate-900 transition-all duration-300 flex flex-col border-r border-slate-800 overflow-hidden relative z-20`}>
        <div className="p-4">
          <button onClick={startNewChat} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-sm font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Session
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
          <p className="px-3 pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Investigations</p>
          {sessions.map(s => (
            <div key={s.id} onClick={() => { setCurrentSessionId(s.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${s.id === currentSessionId ? 'bg-slate-800 text-blue-400' : 'hover:bg-slate-800/50 text-slate-400'}`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              <span className="flex-1 truncate text-sm">{s.title}</span>
              <button onClick={(e) => deleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-400">{userProfile?.firstName.slice(0,2).toUpperCase() || 'OP'}</span>
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-semibold truncate text-white">{userProfile?.firstName || 'Operator'}</p>
               <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Verified Identity</p>
             </div>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="flex items-center justify-between h-14 px-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <h1 className="text-sm font-semibold text-slate-300 md:block hidden">{currentSession?.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setUseSearch(!useSearch)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${useSearch ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}><div className={`w-2 h-2 rounded-full ${useSearch ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></div>WEB GROUNDING</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
          <div className="max-w-4xl mx-auto py-10 px-4 md:px-8">
            {currentSession?.messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            {isLoading && (
              <div className="flex justify-start mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-4 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-500/20"><svg className="w-4 h-4 text-white animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>
                  <div className="space-y-2 pt-1"><div className="h-4 bg-slate-800 rounded w-48 animate-pulse"></div><div className="h-4 bg-slate-800 rounded w-64 animate-pulse"></div></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </main>

        <div className="p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="max-w-4xl mx-auto relative">
            {selectedImage && (
              <div className="absolute -top-24 left-0 flex items-center gap-3 p-3 bg-slate-900/90 border border-blue-500/50 rounded-xl backdrop-blur-md animate-in slide-in-from-bottom-2">
                <img src={selectedImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-700 shadow-xl" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-2 pl-4 pr-3 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 shadow-2xl transition-all">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-400 transition-colors mb-1"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Ask about gaming lore, hardware, or analyze a screenshot..." className="flex-1 bg-transparent border-none text-slate-100 py-3 focus:ring-0 outline-none resize-none min-h-[44px] max-h-40 placeholder:text-slate-600 text-sm md:text-base" rows={1} />
              <button type="submit" disabled={(!input.trim() && !selectedImage) || isLoading} className={`p-2.5 rounded-xl transition-all mb-0.5 ${(!input.trim() && !selectedImage) || isLoading ? 'text-slate-700 bg-slate-800/50' : 'text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
            </form>
            <p className="text-[10px] text-center text-slate-600 mt-2 uppercase tracking-widest font-bold">360 Eye // Operating as {userProfile?.firstName || 'Operator'} // Gemini 3.0 Pro Core</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
