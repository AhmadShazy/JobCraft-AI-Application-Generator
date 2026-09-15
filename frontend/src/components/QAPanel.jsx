import { useState, useRef, useEffect } from 'react';
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
          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-100'}
      `}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── AI answer bubble with embedded copy button ── */
function AnswerBubble({ answer }) {
  return (
    <div className="relative group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 p-3 pr-8 rounded-2xl rounded-tl-none text-sm font-medium whitespace-pre-wrap shadow-sm">
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
    <div className="flex flex-col h-full gap-4 overflow-hidden bg-transparent border-0 shadow-none">
      
      {/* Top Feed Card */}
      <div className="flex-1 flex flex-col overflow-hidden bg-cyan-100/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-accent-200/60 dark:border-slate-800 border-t-4 border-t-accent-500 shadow-md transition-colors duration-200">
        {/* Panel Header */}
        <div className="p-4 border-b border-accent-200/60 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-slate-50 to-cyan-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center space-x-2 flex-shrink-0 transition-colors duration-200">
          <MessageSquareCode className="w-5 h-5 text-primary-500 dark:text-accent-400 animate-pulse" />
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Application Q&A Assistant</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Type screening questions to get tailored responses</p>
          </div>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {qaList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="p-4 bg-white dark:bg-slate-800 text-cyan-600 border border-cyan-100/60 dark:border-slate-700 rounded-2xl shadow-sm">
                <Bot className="w-8 h-8 text-accent-500 animate-pulse" />
              </div>
              <div className="max-w-xs space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Q&As yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Paste a Job Description and ask questions like:
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-cyan-100 dark:border-slate-700 p-2 rounded-lg italic shadow-sm">
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
                    <div className="bg-gradient-to-r from-primary-700 to-accent-500 text-white p-3 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm animate-fade-in border border-primary-800/10">
                      {item.question}
                    </div>
                    <div className="p-1.5 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-full flex-shrink-0 mt-1 shadow-sm">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex items-start space-x-2">
                    <div className="p-1.5 bg-white dark:bg-slate-800 border border-cyan-100/60 dark:border-slate-700 text-accent-500 rounded-full flex-shrink-0 mt-1 shadow-sm">
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
                <div className="p-1.5 bg-white dark:bg-slate-800 border border-cyan-100/60 dark:border-slate-700 text-accent-500 rounded-full flex-shrink-0 mt-1 shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-cyan-100/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 p-3 rounded-2xl rounded-tl-none text-sm font-medium flex items-center space-x-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-accent-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-accent-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-accent-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Form at Bottom */}
      <form onSubmit={handleSubmit} className="px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl flex items-center space-x-3 flex-shrink-0 transition-colors duration-200">
        <input
          type="text"
          disabled={isLoading}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a screening question (word/char limits auto-detected)..."
          className="flex-1 px-4 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-accent-500 focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 transition-all rounded-xl text-sm text-slate-800 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!question.trim() || isLoading}
          className="h-12 w-12 flex items-center justify-center bg-gradient-to-r from-primary-700 to-accent-500 text-white rounded-xl shadow-md transition-all duration-200 flex-shrink-0 border border-primary-800/10 hover:from-primary-600 hover:to-accent-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}

export default QAPanel;
