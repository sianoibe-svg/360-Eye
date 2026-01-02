
import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`group flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
      <div className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-md ${
          isUser 
            ? 'bg-slate-700 text-slate-300' 
            : 'bg-blue-600 text-white shadow-blue-600/20'
        }`}>
          {isUser ? 'OP' : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl ${
            isUser 
              ? 'bg-blue-700/20 text-blue-50 border border-blue-600/30' 
              : 'bg-slate-900 text-slate-100 border border-slate-800'
          }`}>
            {message.image && (
              <img 
                src={message.image} 
                alt="Intel Capture" 
                className="rounded-lg mb-3 max-w-full h-auto border border-white/10 shadow-lg"
              />
            )}
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                {message.content}
              </p>
            </div>
          </div>
          
          {message.groundingLinks && message.groundingLinks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.groundingLinks.map((link, idx) => (
                link.web && (
                  <a 
                    key={idx}
                    href={link.web.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] bg-blue-950/40 hover:bg-blue-900/40 text-blue-400 px-2 py-1 rounded-full transition-colors flex items-center gap-1.5 border border-blue-900/50 uppercase tracking-tighter font-bold"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {link.web.title || 'Data Source'}
                  </a>
                )
              ))}
            </div>
          )}
          
          <span className="text-[9px] text-slate-600 mt-2 font-mono uppercase tracking-widest group-hover:text-slate-500 transition-colors">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
