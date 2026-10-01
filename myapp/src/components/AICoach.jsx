import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, faSpinner, faRobot, faUser, 
  faExclamationCircle, faCheck, faHeartbeat, faInfoCircle, faPlus 
} from '@fortawesome/free-solid-svg-icons';

const AICoach = () => {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: "Welcome to the Clinical Wellness & Nutrition portal. I am your health advisor assistant. You can inquire about caloric calculations, metabolic guidelines, dietary symptom recovery plans, or macro planning. How can I assist you today?"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const chatEndRef = useRef(null);
  const userEmail = localStorage.getItem("currentUserEmail") || "guest@example.com";

  // Clinical/Nutrition topic cards
  const clinicalQueries = [
    {
      title: "Symptom Deficiencies",
      desc: "Inquire about symptoms like fatigue, hair fall, or cramping.",
      query: "Which micronutrient deficiencies cause constant fatigue and hair fall, and what foods resolve them?"
    },
    {
      title: "Metabolic Baselines",
      desc: "Understand BMR, TDEE, and activity level adjustments.",
      query: "How does changing my activity level from moderate to athlete impact my TDEE calculations?"
    },
    {
      title: "High Protein Foods",
      desc: "Get options matching your dietary preferences.",
      query: "List the top 5 high-protein vegetarian foods with complete amino acid profiles."
    }
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!textToSend) setInputText('');
    setError('');

    // Append user message
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const response = await axios.post(`http://${window.location.hostname}:5000/api/chat`, {
        email: userEmail,
        message: text
      });

      if (response.data.success) {
        setMessages(prev => [...prev, { role: 'model', text: response.data.reply }]);
      } else {
        setError(response.data.error || "Failed to receive AI coach response.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to metabolic engine. Ensure your backend server is online.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-theme-bg font-sans">
      
      {/* Clinically Designed Header Banner */}
      <header className="bg-theme-card border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-theme-card text-theme-accent rounded-2xl flex items-center justify-center shadow-inner">
            <FontAwesomeIcon icon={faHeartbeat} className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              Clinical Health Assistant
              <span className="text-[10px] bg-theme-primary-light text-theme-primary font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Verified Engine</span>
            </h2>
            <p className="text-xs text-theme-muted font-semibold uppercase tracking-wider">Gemini Metabolic Diagnostic Coach</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-theme-accent"></span>
          </span>
          <span className="text-xs text-theme-primary font-black tracking-wide uppercase">Coach Online</span>
        </div>
      </header>

      {/* Main Chat & Content Section */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Medical Warning Disclaimer (Strictly Slate/Emerald) */}
          <div className="bg-theme-card border-l-4 border-emerald-500 rounded-2xl p-5 shadow-sm text-theme-muted">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon icon={faInfoCircle} className="text-theme-accent text-lg mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-theme-accent">Clinical Disclaimer & Safety Instructions</h4>
                <p className="text-xs font-semibold leading-relaxed mt-1 text-theme-muted">
                  This health assistant delivers evidence-based metabolic and dietary guidelines based on BMR, TDEE, and symptoms. It does not replace medical advice, diagnostics, or treatments. Consult a primary care physician before modifying clinical healthcare regimens.
                </p>
              </div>
            </div>
          </div>

          {/* Clinically Structured Suggestion Cards (Shows only initially) */}
          {messages.length === 1 && !loading && (
            <div className="space-y-4">
              <h3 className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Select a Wellness Diagnostic Topic</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {clinicalQueries.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q.query)}
                    className="bg-theme-card hover:bg-slate-100/50 border border-slate-200 hover:border-emerald-500/50 text-left p-5 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between h-40 group shadow-sm"
                  >
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide group-hover:text-theme-primary transition-colors">
                        {q.title}
                      </h4>
                      <p className="text-xs font-semibold text-theme-muted mt-2 leading-relaxed">
                        {q.desc}
                      </p>
                    </div>
                    <div className="text-[10px] text-theme-primary font-extrabold flex items-center gap-1 mt-4">
                      <FontAwesomeIcon icon={faPlus} /> Ask Assistant
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation History */}
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const isAI = msg.role === 'model';
              return (
                <div 
                  key={index} 
                  className={`flex gap-4 items-start ${isAI ? 'justify-start' : 'justify-end'}`}
                >
                  {isAI && (
                    <div className="w-9 h-9 rounded-xl bg-theme-card text-theme-accent flex items-center justify-center shrink-0 shadow-md">
                      <FontAwesomeIcon icon={faHeartbeat} className="text-sm" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[75%] rounded-2xl p-5 shadow-sm border leading-relaxed ${
                      isAI 
                        ? 'bg-theme-card text-slate-700 border-slate-200/60 rounded-tl-none font-medium' 
                        : 'bg-theme-accent text-slate-950 border-emerald-400/35 rounded-tr-none font-bold'
                    }`}
                  >
                    <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
                      {msg.text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </div>
                  </div>
                  {!isAI && (
                    <div className="w-9 h-9 rounded-xl bg-theme-card text-slate-100 flex items-center justify-center shrink-0 shadow-md">
                      <FontAwesomeIcon icon={faUser} className="text-sm" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Waiting State */}
            {loading && (
              <div className="flex gap-4 items-start justify-start">
                <div className="w-9 h-9 rounded-xl bg-theme-card text-theme-accent flex items-center justify-center shrink-0 shadow-md animate-pulse">
                  <FontAwesomeIcon icon={faHeartbeat} className="text-sm animate-beat" />
                </div>
                <div className="bg-theme-card border border-slate-200/60 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-theme-accent text-lg" />
                  <span className="text-sm text-theme-muted font-bold animate-pulse">Consulting metabolic standards...</span>
                </div>
              </div>
            )}

            {/* Strict Dual-Color styled Error State */}
            {error && (
              <div className="max-w-md mx-auto bg-theme-card border border-emerald-500/20 rounded-2xl p-4 flex gap-3 text-slate-350 shadow-md animate-shake">
                <FontAwesomeIcon icon={faExclamationCircle} className="text-theme-accent text-lg shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-theme-accent">Connection Interrupted</h4>
                  <p className="text-xs font-semibold text-theme-muted mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </div>
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input TextBox Area */}
      <div className="bg-theme-card border-t border-slate-200 px-8 py-5 shrink-0 shadow-inner">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your metabolic, dietary, or symptomatic question..."
            disabled={loading}
            className="flex-1 bg-theme-bg hover:bg-slate-100/50 focus:bg-theme-card text-slate-800 border border-slate-200 focus:border-emerald-500 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all duration-200 placeholder:text-theme-muted shadow-inner"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            className="px-6 rounded-2xl bg-theme-accent hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-black transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {loading ? (
              <FontAwesomeIcon icon={faSpinner} spin className="text-lg" />
            ) : (
              <>
                <span>Submit</span>
                <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
