
import React, { useState } from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code-block my-4">
      <div className="absolute top-2 right-2 opacity-0 group-hover/code-block:opacity-100 transition-opacity z-10">
        <button
          onClick={copyToClipboard}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${
            copied
              ? 'bg-green-600/20 border-green-500/50 text-green-400'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Code
            </>
          )}
        </button>
      </div>
      <pre className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-blue-300 shadow-inner">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
        return <CodeBlock key={i} code={code} />;
      }
      return <p key={i} className="whitespace-pre-wrap leading-relaxed text-sm md:text-base mb-2 last:mb-0">{part}</p>;
    });
  };
  
  return (
    <div className={`group flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start animate-in fade-in slide-in-from-bottom-2 duration-500'}`}>
      <div className={`flex gap-4 max-w-[95%] md:max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-xl transition-transform group-hover:scale-110 ${
          isUser 
            ? 'bg-slate-800 text-slate-400 border border-slate-700' 
            : 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-blue-900/40 border border-blue-400/30'
        }`}>
          {isUser ? 'OP' : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} relative min-w-0`}>
          <div className={`px-5 py-4 rounded-2xl relative shadow-2xl overflow-hidden ${
            isUser 
              ? 'bg-blue-600/10 text-blue-50 border border-blue-500/30' 
              : 'bg-slate-900/80 backdrop-blur-sm text-slate-100 border border-slate-800'
          }`}>
            {!isUser && (
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(59,130,246,1)_50%),linear-gradient(90deg,rgba(18,24,38,0)_50%,rgba(59,130,246,1)_50%)] bg-[length:4px_4px]"></div>
            )}

            {message.image && (
              <img 
                src={message.image} 
                alt="Intel Capture" 
                className="rounded-xl mb-4 max-w-full h-auto border border-blue-500/20 shadow-2xl"
              />
            )}

            <div className="prose prose-invert prose-sm max-w-none">
              {renderContent(message.content)}
            </div>
          </div>
          
          {message.groundingLinks && message.groundingLinks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Fix: Render links for both Search and Maps grounding with fallback titles */}
              {message.groundingLinks.map((link, idx) => {
                const info = link.web || link.maps;
                if (!info || !info.uri) return null;
                
                return (
                  <a 
                    key={idx}
                    href={info.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] bg-blue-900/20 hover:bg-blue-800/40 text-blue-400 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-blue-800/40 uppercase tracking-tight font-bold group/link"
                  >
                    <svg className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {info.title || (link.maps ? 'Map Location' : 'Source Verified')}
                  </a>
                );
              })}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2 opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] text-slate-500 font-mono uppercase tracking-[0.2em]">
              TS: {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
            {!isUser && (
              <>
                <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                <span className="text-[8px] text-blue-600 font-mono uppercase tracking-widest font-black">Verified_Intel</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
