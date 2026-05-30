import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageSquareCode, Copy, Check } from 'lucide-react';

/* ── Isolated copy-button component with its own "copied" state ── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback for non-secure contexts */
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      className={`
        absolute top-2 right-2 p-1 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100
        ${copied
          ? 'bg-emerald-100 text-emerald-600'
          : 'bg-indigo-100/60 text-indigo-400 hover:bg-indigo-200/80 hover:text-indigo-600'}
      `}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── AI answer bubble with embedded copy button ── */
function AnswerBubble({ answer }) {
  return (
    <div className="relative group bg-indigo-50/70 border border-indigo-100/30 text-slate-800 p-3 pr-8 rounded-2xl rounded-tl-none text-sm font-medium whitespace-pre-wrap">
      {answer}
      <CopyButton text={answer} />
    </div>
  );
}

function QAPanel({ qaList, onSendQuestion, isLoading }) {
  const [question, setQuestion] = useState('');
  const chatEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    onSendQuestion(question.trim());
    setQuestion('');
  };

  // Scroll to bottom whenever QA list changes or loading state changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaList, isLoading]);

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
        <MessageSquareCode className="w-5 h-5 text-primary-500" />
        <div>
          <h3 className="font-bold text-slate-700 text-sm">Application Q&A Assistant</h3>
          <p className="text-xs text-slate-400 font-medium">Type screening questions to get tailored responses</p>
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {qaList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-4 bg-indigo-50 text-indigo-500 rounded-2xl">
              <Bot className="w-8 h-8" />
            </div>
            <div className="max-w-xs space-y-1">
              <h4 className="font-bold text-slate-700 text-sm">No Q&As yet</h4>
              <p className="text-xs text-slate-400 font-medium">
                Paste a Job Description and ask questions like:
              </p>
              <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 p-2 rounded-lg italic">
                "Why are you interested in this role? (max 500 characters)"
              </p>
            </div>
          </div>
        ) : (
          qaList.map((item, index) => (
            <div key={index} className="space-y-3">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="max-w-[85%] flex items-start space-x-2">
                  <div className="bg-slate-100 text-slate-800 p-3 rounded-2xl rounded-tr-none text-sm font-medium">
                    {item.question}
                  </div>
                  <div className="p-1.5 bg-slate-100 text-slate-500 rounded-full flex-shrink-0 mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* AI Response */}
              <div className="flex justify-start">
                <div className="max-w-[85%] flex items-start space-x-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-full flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <AnswerBubble answer={item.answer} />
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] flex items-start space-x-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-full flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-indigo-50/50 text-slate-400 p-3 rounded-2xl rounded-tl-none text-sm font-medium flex items-center space-x-1.5">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form at Bottom */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 bg-slate-50 flex items-center space-x-2">
        <input
          type="text"
          disabled={isLoading}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a screening question (word/char limits auto-detected)..."
          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-slate-800 font-medium placeholder-slate-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!question.trim() || isLoading}
          className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-sm transition-all duration-200 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}

export default QAPanel;
