/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Share2, 
  MoreVertical, 
  Mic, 
  ArrowUp,
  Bot,
  Sparkles,
  Play,
  CheckCircle2,
  FileText,
  ChevronRight,
  Download,
  Copy,
  RotateCcw,
  PlusCircle,
  Link as LinkIcon,
  Bolt,
  BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { sendMessageStream } from './lib/gemini.ts';

type ViewMode = 'chat' | 'executing' | 'result' | 'agent-setup';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: { type: 'file' | 'link'; name: string }[];
  isAgentCard?: boolean;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<{ type: 'file' | 'link'; name: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Agent Execution Simulation
  const [execPhase, setExecPhase] = useState(0);
  const phases = [
    "Analyzing job description...",
    "Extracting key requirements...",
    "Matching your skills...",
    "Rewriting resume..."
  ];

  useEffect(() => {
    if (viewMode === 'executing') {
      const interval = setInterval(() => {
        setExecPhase(prev => {
          if (prev < phases.length - 1) return prev + 1;
          clearInterval(interval);
          setTimeout(() => setViewMode('result'), 2000);
          return prev;
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [viewMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, viewMode]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAttachments(prev => [...prev, { type: 'file', name: file.name }]);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isTyping) return;
    if (viewMode !== 'chat') return;

    // Detect if user is sending the "magic" message
    const isMagicMessage = (input.toLowerCase().includes('resume') || input.toLowerCase().includes('cv')) && 
                          (input.toLowerCase().includes('help') || input.toLowerCase().includes('optimize') || input.toLowerCase().includes('customize') || input.toLowerCase().includes('match'));

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: [...pendingAttachments]
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentAttachments = [...pendingAttachments];
    
    setInput('');
    setPendingAttachments([]);
    setIsTyping(true);

    const assistantId = (Date.now() + 1).toString();
    
    // Construct rich context including attachments
    const attachmentContext = currentAttachments.length > 0 
      ? `\n\n[Context: The user has uploaded files: ${currentAttachments.map(a => a.name).join(', ')}. Please acknowledge these and incorporate their information into your response.]`
      : '';
    
    const promptWithContext = currentInput + attachmentContext;

    const history = messages.map(m => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: m.content }]
    }));

    try {
      let fullContent = '';
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      if (isMagicMessage) {
        // Special guided response
        const response = "I've analyzed your request. To make this resume perfectly compatible with the target role, I should run my specialized **Resume Optimizer Agent**. It will perform a deep semantic gap analysis between your background and the job requirements.\n\nWould you like me to start the agent for you? It'll guide you through attaching your Resume and the Job Description if you haven't already.";
        setIsTyping(false);
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: response } : m));
        
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Resume Optimization Agent',
            timestamp: new Date(),
            isAgentCard: true
          }]);
        }, 1000);
        return;
      }

      for await (const chunk of sendMessageStream(promptWithContext, history)) {
        fullContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: fullContent } : m
        ));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const startAgent = () => {
    // Check if we have both Resume and JD in messages or pending
    const hasResume = [...messages, { attachments: pendingAttachments }].some(m => 
      m.attachments?.some(a => a.name.toLowerCase().includes('resume') || a.name.toLowerCase().includes('cv'))
    );
    const hasJD = [...messages, { attachments: pendingAttachments }].some(m => 
      m.attachments?.some(a => a.name.toLowerCase().includes('jd') || a.name.toLowerCase().includes('description') || a.name.toLowerCase().includes('job'))
    );

    if (!hasResume || !hasJD) {
      setViewMode('agent-setup');
    } else {
      setViewMode('executing');
      setExecPhase(0);
    }
  };

  return (
    <div className="flex h-screen bg-background text-on-background">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      {/* Sidebar */}
      <aside className="w-sidebar-width hidden md:flex flex-col bg-[#f9f9f8] border-r border-[#e5e5e2] p-6 shrink-0 overflow-hidden">
        <div className="mb-10 px-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[24px] font-black text-[#111] tracking-tight">Claude</h1>
            <span className="text-[11px] bg-[#d97757] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">3.5</span>
          </div>
          <p className="text-[10px] text-[#999] uppercase tracking-[0.25em] font-bold">Intelligence</p>
        </div>

        <nav className="flex-1 flex flex-col min-h-0">
          <button 
             onClick={() => { setViewMode('chat'); setMessages([]); }}
             className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-[#e5e5e2] text-[#111] font-bold rounded-2xl transition-all hover:bg-white hover:border-[#d97757]/40 hover:shadow-sm active:scale-[0.98] mb-8"
          >
            <Plus size={18} className="text-[#d97757]" />
            <span className="text-[14px]">New Chat</span>
          </button>
          
          <div className="px-1 mb-4 flex items-center justify-between">
             <span className="text-[10px] font-bold uppercase tracking-widest text-[#bbb]">Recent Threads</span>
             <Settings size={12} className="text-[#ccc]" />
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            {['Resume TechFlow v2', 'Design System Docs', 'Portfolio Review', 'Code Refactor'].map(chat => (
              <button key={chat} className="w-full flex items-center gap-3 px-3 py-2.5 text-[#666] hover:bg-white hover:text-[#111] hover:shadow-sm rounded-xl transition-all text-left group">
                <FileText size={15} className="text-[#ccc] group-hover:text-[#d97757] transition-colors" />
                <span className="text-[14px] truncate font-medium">{chat}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="mt-auto pt-6 space-y-5">
          <div className="p-5 bg-white border border-[#e5e5e2] rounded-[24px] shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#d97757]/30 transition-all">
             <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#d97757]/5 rounded-xl">
                   <Sparkles size={16} className="text-[#d97757]" strokeWidth={2.5} />
                </div>
                <ChevronRight size={14} className="text-[#ccc]" />
             </div>
             <p className="text-[14px] font-bold text-[#111] mb-1">Upgrade to Pro</p>
             <p className="text-[11px] text-[#999] leading-tight">Get Claude 3.5 Sonnet & higher limits</p>
          </div>
          
          <div className="flex items-center gap-3 px-2 py-2 hover:bg-white rounded-2xl cursor-pointer transition-all border border-transparent hover:border-[#e5e5e2] group">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-[#e5e5e2]">
               <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop" alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col truncate flex-1">
              <span className="text-[14px] font-bold text-[#111] truncate group-hover:text-[#d97757] transition-colors">Alex Rivera</span>
              <span className="text-[10px] text-[#aaa] font-bold uppercase tracking-tight italic">Member since 2024</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#e5e5e2] flex justify-between items-center w-full px-8 py-5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 bg-[#f9f9f8] border border-[#e5e5e2] rounded-xl">
               <div className="w-2 h-2 rounded-full bg-[#d97757] animate-pulse"></div>
               <span className="text-[14px] font-bold text-[#111]">Claude 3.5 Sonnet</span>
            </div>
            {messages.length > 0 && (
              <div className="flex items-center gap-4">
                <ChevronRight size={16} className="text-[#ccc]" />
                <span className="text-[#999] text-[14px] font-medium tracking-tight truncate max-w-[320px]">
                  {viewMode === 'chat' ? 'Session Optimization' : (viewMode === 'executing' ? 'Agent Processing' : 'Optimized Profile')}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 text-[#999] hover:text-[#111] transition-all rounded-full hover:bg-[#f9f9f8] border border-transparent hover:border-[#e5e5e2]">
              <Share2 size={18} />
            </button>
            <button className="p-2.5 text-[#999] hover:text-[#111] transition-all rounded-full hover:bg-[#f9f9f8] border border-transparent hover:border-[#e5e5e2]">
              <MoreVertical size={18} />
            </button>
          </div>
        </header>

        {/* Dynamic Views */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto no-scrollbar pt-12 pb-32"
        >
          <div className="max-w-[800px] mx-auto px-8 w-full min-h-full">
            {messages.length === 0 && viewMode === 'chat' && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#e5e5e2] flex items-center justify-center mb-10 shadow-sm">
                  <Bot size={32} className="text-[#d97757]" />
                </div>
                <h2 className="text-[36px] font-black text-[#111] mb-4 tracking-tight">How can I help you?</h2>
                <p className="text-[17px] text-[#777] mb-8 max-w-sm leading-relaxed">Ask me to optimize your resume, write a cover letter, or summarize requirements.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {['Optimize my resume', 'Target keywords', 'Executive summary'].map(s => (
                    <button key={s} onClick={() => setInput(s)} className="px-6 py-3 rounded-2xl border border-[#e5e5e2] bg-white text-[15px] font-semibold text-[#666] hover:border-[#d97757]/50 hover:text-[#111] hover:shadow-sm transition-all active:scale-95">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <AnimatePresence mode="wait">
              {viewMode === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12"
                >
                  {messages.map((message) => (
                    <motion.div 
                      key={message.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {message.role === 'assistant' && !message.isAgentCard && (
                        <div className="flex items-center gap-2.5 mb-4 ml-1">
                          <div className="w-7 h-7 rounded-lg bg-[#111] flex items-center justify-center shadow-lg">
                            <Bot size={16} className="text-white" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#bbb]">Claude</span>
                        </div>
                      )}

                      {message.isAgentCard ? (
                        <div className="w-full my-8 bg-white border border-[#e5e5e2] rounded-[32px] p-12 flex flex-col items-center text-center gap-10 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.08)] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 text-[#d97757]/10 group-hover:scale-110 transition-transform -rotate-12">
                             <Sparkles size={160} strokeWidth={1} />
                          </div>
                          <div className="w-24 h-24 rounded-[28px] bg-[#d97757] text-white flex items-center justify-center shadow-2xl shadow-[#d97757]/30 z-10">
                             <Bot size={48} />
                          </div>
                          <div className="z-10">
                            <h3 className="font-black text-3xl text-[#111] mb-4 tracking-tight">Resume Optimization Agent</h3>
                            <p className="text-[18px] text-[#777] leading-relaxed max-w-md mx-auto">
                              Launch our specialized intelligence agent to conduct a semantic gap analysis and recalibrate your profile for the target role.
                            </p>
                          </div>
                          <button 
                            onClick={startAgent}
                            className="flex items-center gap-5 px-14 py-5.5 bg-[#111] text-white font-black rounded-2xl hover:bg-[#222] transition-all shadow-2xl active:scale-[0.98] z-10 group"
                          >
                             <div className="p-1.5 bg-white/10 rounded-xl group-hover:bg-[#d97757] transition-colors">
                                <Play size={20} fill="currentColor" />
                             </div>
                             <span className="text-xl">Execute Analysis</span>
                          </button>
                        </div>
                      ) : (
                        <div className={`${
                          message.role === 'user' 
                            ? 'max-w-[80%] px-7 py-5 bg-[#f9f9f8] border border-[#e5e5e2] rounded-[28px] text-[17px] text-[#111] font-medium leading-relaxed' 
                            : 'w-full text-[#111] leading-loose text-[18px] prose prose-slate max-w-none font-normal'
                        }`}>
                          {message.role === 'assistant' ? (
                            <div className="markdown-body">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                          
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-8 flex flex-wrap gap-3">
                              {message.attachments.map((att, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-2.5 bg-white border border-[#e5e5e2] rounded-xl shadow-sm group hover:border-[#d97757]/40 transition-colors">
                                  <FileText size={18} className="text-[#ccc] group-hover:text-[#d97757] transition-colors" />
                                  <span className="text-[14px] font-bold text-[#111]">{att.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {isTyping && (
                    <motion.div className="flex items-center gap-4 text-[#aaa] italic text-[15px] ml-1">
                      <div className="flex gap-2">
                        <span className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 bg-[#d97757] rounded-full animate-bounce" />
                      </div>
                      Claude is thinking...
                    </motion.div>
                  )}
                </motion.div>
              )}

              {viewMode === 'agent-setup' && (
                <motion.div
                  key="agent-setup"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="flex flex-col items-center justify-center pt-8"
                >
                  <div className="w-full max-w-[480px] bg-white border border-[#e5e5e2] rounded-[32px] p-12 shadow-2xl shadow-[#000]/5">
                     <div className="text-center mb-10">
                        <div className="w-20 h-20 rounded-[24px] bg-[#d97757]/5 text-[#d97757] flex items-center justify-center mx-auto mb-6 shadow-inner">
                           <Bot size={44} />
                        </div>
                        <h2 className="text-3xl font-bold text-[#111] mb-2 tracking-tight">Agent Preparation</h2>
                        <p className="text-[#777] text-[16px] leading-relaxed">Let's refine your credentials for the target role.</p>
                     </div>
                     
                     <div className="space-y-4">
                        <div 
                          className={`p-6 border border-[#e5e5e2] rounded-[24px] transition-all cursor-pointer flex items-center gap-5 group ${
                            (pendingAttachments.some(a => a.name.toLowerCase().includes('resume') || a.name.toLowerCase().includes('cv')) || messages.some(m => m.attachments?.some(a => a.name.toLowerCase().includes('resume'))))
                            ? 'bg-[#f9f9f8] border-[#d97757]/30' 
                            : 'hover:bg-[#fcf8f6] hover:border-[#d97757]/20 bg-white'
                          }`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                           <div className={`p-3.5 rounded-2xl transition-colors ${
                              (pendingAttachments.some(a => a.name.toLowerCase().includes('resume') || a.name.toLowerCase().includes('cv')) || messages.some(m => m.attachments?.some(a => a.name.toLowerCase().includes('resume'))))
                              ? 'bg-white text-[#d97757]'
                              : 'bg-[#f9f9f8] text-[#999] group-hover:bg-white group-hover:text-[#d97757]'
                           }`}>
                              <FileText size={24} />
                           </div>
                           <div className="flex-1">
                              <p className="text-[15px] font-bold text-[#111]">Upload Resume / CV</p>
                              {(pendingAttachments.some(a => a.name.toLowerCase().includes('resume') || a.name.toLowerCase().includes('cv')) || messages.some(m => m.attachments?.some(a => a.name.toLowerCase().includes('resume')))) ? (
                                <span className="text-[12px] text-[#d97757] flex items-center gap-1 font-bold mt-1">
                                  <CheckCircle2 size={12} strokeWidth={3} /> Document Ready
                                </span>
                              ) : (
                                <span className="text-[12px] text-[#999] mt-1">PDF, DOCX supported</span>
                              )}
                           </div>
                        </div>

                        <div 
                          className={`p-6 border border-[#e5e5e2] rounded-[24px] transition-all cursor-pointer flex items-center gap-5 group ${
                            (pendingAttachments.some(a => a.name.toLowerCase().includes('jd') || a.name.toLowerCase().includes('job')) || messages.some(m => m.attachments?.some(a => a.name.toLowerCase().includes('jd'))))
                            ? 'bg-[#f9f9f8] border-[#d97757]/30' 
                            : 'hover:bg-[#fcf8f6] hover:border-[#d97757]/20 bg-white'
                          }`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                           <div className={`p-3.5 rounded-2xl transition-colors ${
                              (pendingAttachments.some(a => a.name.toLowerCase().includes('jd') || a.name.toLowerCase().includes('job')) || messages.some(m => m.attachments?.some(a => a.name.toLowerCase().includes('jd'))))
                              ? 'bg-white text-[#d97757]'
                              : 'bg-[#f9f9f8] text-[#999] group-hover:bg-white group-hover:text-[#d97757]'
                           }`}>
                              <PlusCircle size={24} />
                           </div>
                           <div className="flex-1">
                              <p className="text-[15px] font-bold text-[#111]">Job Description</p>
                              {(pendingAttachments.some(a => a.name.toLowerCase().includes('jd') || a.name.toLowerCase().includes('job')) || messages.some(m => m.attachments?.some(a => a.name.toLowerCase().includes('jd')))) ? (
                                <span className="text-[12px] text-[#d97757] flex items-center gap-1 font-bold mt-1">
                                  <CheckCircle2 size={12} strokeWidth={3} /> Requirements Ready
                                </span>
                              ) : (
                                <span className="text-[12px] text-[#999] mt-1">Paste or upload JD</span>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="mt-10 space-y-3">
                       <button 
                          onClick={() => {
                            setMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              role: 'user',
                              content: 'Analyzed both documents. We are ready to begin the optimization process.',
                              timestamp: new Date(),
                              attachments: [...pendingAttachments]
                            }]);
                            setPendingAttachments([]);
                            setViewMode('executing');
                            setExecPhase(0);
                          }}
                          className="w-full py-4.5 bg-[#111] text-white font-bold rounded-2xl shadow-xl shadow-black/10 hover:bg-[#222] transition-all flex items-center justify-center gap-3 group"
                       >
                          <span>Execute Agent</span>
                          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                       </button>
                       <button 
                          onClick={() => setViewMode('chat')}
                          className="w-full py-3.5 text-[#666] font-semibold hover:text-[#111] transition-colors rounded-2xl hover:bg-[#f9f9f8]"
                       >
                          Return to Chat
                       </button>
                     </div>
                  </div>
                </motion.div>
              )}

              {viewMode === 'executing' && (
               <motion.div
                  key="executing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12 max-w-3xl mx-auto pt-16"
                >
                  <div className="text-center relative">
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-[#d97757]/5 text-[#d97757] rounded-full text-[12px] font-bold uppercase tracking-widest mb-6 border border-[#d97757]/10">
                      <Sparkles size={14} />
                      Agent Active
                    </div>
                    <h2 className="text-4xl font-bold text-[#111] mb-4 tracking-tight">Refining your profile...</h2>
                    <p className="text-[#777] text-lg max-w-md mx-auto leading-relaxed">Claude is conducting a semantic gap analysis and generating optimized phrasing.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {phases.map((phase, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: idx <= execPhase ? 1 : 0.3, y: 0 }}
                        className={`flex items-center justify-between gap-6 p-6 rounded-3xl border transition-all duration-500 ${idx === execPhase ? 'bg-white border-[#d97757] shadow-xl shadow-[#d97757]/5' : 'bg-transparent border-[#e5e5e2]'}`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${idx < execPhase ? 'bg-[#d97757] text-white' : (idx === execPhase ? 'bg-[#111] text-white animate-pulse' : 'bg-[#f5f5f4] text-[#999]')}`}>
                            {idx < execPhase ? <CheckCircle2 size={18} strokeWidth={3} /> : <Bot size={18} />}
                          </div>
                          <div>
                            <p className={`text-[17px] ${idx === execPhase ? 'font-bold text-[#111]' : 'text-[#666] font-medium'}`}>{phase}</p>
                            {idx === execPhase && <p className="text-[12px] text-[#888] mt-0.5">Performing deep matching...</p>}
                          </div>
                        </div>
                        {idx === execPhase && (
                          <div className="w-24 bg-[#f5f5f4] h-2 rounded-full overflow-hidden shrink-0">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: '100%' }}
                               transition={{ duration: 1.5, ease: "linear" }}
                               className="h-full bg-[#d97757]"
                             />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {viewMode === 'result' && (
               <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="space-y-12 pb-32"
                >
                  <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 bg-[#d97757]/5 text-[#d97757] rounded-full text-[12px] font-bold uppercase tracking-widest border border-[#d97757]/10">
                        Process Complete
                      </div>
                      <span className="text-[#ccc]">/</span>
                      <span className="text-[#999] text-[13px] font-medium">94% Semantic Match</span>
                    </div>
                    <h1 className="text-4xl font-bold text-[#111] mb-3 tracking-tight">Final Resume Refinement</h1>
                    <p className="text-[16px] text-[#666] leading-relaxed max-w-2xl">We've recalibrated your experience pillars to foreground the specific impact metrics requested in the Senior Product Designer JD.</p>
                  </div>

                  <section className="max-w-4xl mx-auto border border-[#e5e5e2] rounded-[32px] overflow-hidden bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
                    <div className="bg-[#f9f9f8] border-b border-[#e5e5e2] px-10 py-6 flex flex-wrap items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[#e5e5e2] flex items-center justify-center p-2.5 shadow-sm">
                           <FileText size={24} className="text-[#d97757]" />
                        </div>
                        <div>
                           <p className="text-[13px] text-[#888] font-medium mb-0.5">Targeted Resume</p>
                           <p className="text-[15px] font-bold text-[#111]">Alex_Rivera_Optimized.pdf</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-white border border-[#e5e5e2] text-[14px] font-bold text-[#333] hover:border-[#d97757]/30 transition-all shadow-sm">
                          <Copy size={16} />
                          Copy
                        </button>
                        <button className="flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-[#111] text-white text-[14px] font-bold hover:bg-[#222] transition-all shadow-lg active:scale-95">
                          <Download size={16} />
                          Download PDF
                        </button>
                      </div>
                    </div>

                    <div className="p-12 md:p-16 space-y-12 bg-white">
                      <div className="border-b border-[#eee] pb-10">
                        <h2 className="text-4xl uppercase tracking-[0.15em] text-[#111] font-black leading-none mb-4">ALEX RIVERA</h2>
                        <p className="text-lg text-[#666] font-medium">Senior Product Designer & Design Systems Specialist</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        <div className="md:col-span-4 flex flex-col gap-8">
                           <div>
                              <p className="text-[11px] font-bold text-[#d97757] uppercase tracking-[0.2em] mb-4">Pillar Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {['Strategic UX', 'Design Systems', 'Team Mentorship', 'A/B Testing', 'Growth'].map(s => (
                                  <span key={s} className="px-3 py-1.5 bg-[#f9f9f8] border border-[#e5e5e2] rounded-xl text-[12px] font-bold text-[#333]">{s}</span>
                                ))}
                              </div>
                           </div>
                           <div>
                              <p className="text-[11px] font-bold text-[#999] uppercase tracking-[0.2em] mb-4">Contact Info</p>
                              <div className="space-y-1 text-[13px] text-[#666]">
                                 <p>alex.rivera@design.com</p>
                                 <p>San Francisco, CA</p>
                                 <p>linkedin.com/in/arivera</p>
                              </div>
                           </div>
                        </div>

                        <div className="md:col-span-8 flex flex-col gap-12">
                          <div className="space-y-6">
                            <h3 className="text-[12px] font-bold text-[#d97757] uppercase tracking-[0.3em]">Professional Summary</h3>
                            <div className="relative">
                               <div className="absolute left-[-20px] top-0 bottom-0 w-1 bg-[#d97757] rounded-full" />
                               <p className="text-[18px] leading-relaxed text-[#111] font-medium italic">
                                 "Strategic Product Designer with 8+ years of experience bridging the gap between user needs and technical constraints. Expert in scaling design systems for enterprise SaaS, resulting in a 40% improvement in designer-to-developer transition efficiency."
                               </p>
                            </div>
                          </div>

                          <div className="space-y-8">
                            <h3 className="text-[12px] font-bold text-[#999] uppercase tracking-[0.3em]">Core Experience</h3>
                            <div className="space-y-10">
                               <div className="group">
                                  <div className="flex justify-between items-baseline mb-2">
                                     <h4 className="text-[17px] font-bold text-[#111]">FinTech Solutions</h4>
                                     <span className="text-[13px] text-[#999] font-medium">2020 — Present</span>
                                  </div>
                                  <p className="text-[14px] font-bold text-[#d97757] mb-4 uppercase tracking-[0.05em]">Lead Product Designer</p>
                                  <ul className="space-y-4">
                                     {[
                                       "Spearheaded the redesign of the core transaction dashboard, increasing daily active users by 22% within the first quarter.",
                                       "Architected a multi-brand design system that reduced front-end production time by 35% across four distinct product lines.",
                                       "Mentored a team of 4 junior designers, establishing new standards for accessibility and design documentation."
                                     ].map((bullet, i) => (
                                       <li key={i} className="flex gap-4">
                                          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[#eee] group-hover:bg-[#d97757] transition-colors shrink-0" />
                                          <p className="text-[15px] text-[#444] leading-relaxed">{bullet}</p>
                                       </li>
                                     ))}
                                  </ul>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="flex flex-col items-center gap-6 pt-12 pb-24">
                    <button 
                      onClick={() => setViewMode('chat')}
                      className="group flex items-center gap-3 bg-[#111] text-white font-bold px-12 py-5 rounded-[20px] shadow-2xl shadow-black/20 hover:bg-[#222] transition-all active:scale-[0.98]"
                    >
                      <RotateCcw size={20} />
                      Refine for another JD
                    </button>
                    <div className="flex items-center gap-2 text-[#999] text-[13px]">
                      <Bot size={15} />
                      <p>Claude learned your style. Future edits will be faster.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Bar */}
        <div className={`fixed bottom-0 left-0 right-0 md:left-sidebar-width bg-gradient-to-t from-white via-white to-transparent pt-12 pb-6 px-10 ${viewMode !== 'chat' ? 'hidden' : ''}`}>
          <div className="max-w-[800px] mx-auto relative">
             {/* Pending Attachments */}
             {pendingAttachments.length > 0 && (
               <div className="flex flex-wrap gap-2.5 mb-5 ml-2">
                 {pendingAttachments.map((att, i) => (
                   <motion.div 
                     key={i} 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex items-center gap-2.5 px-4 py-2 bg-white border border-[#e5e5e2] rounded-2xl group shadow-sm"
                   >
                     <FileText size={16} className="text-[#d97757]" />
                     <span className="text-[13px] font-bold text-[#333] truncate max-w-[140px]">{att.name}</span>
                     <button 
                       onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                       className="p-1 hover:bg-[#f5f5f4] rounded-full text-[#999] hover:text-[#d97757] transition-all"
                     >
                       <Plus size={16} className="rotate-45" />
                     </button>
                   </motion.div>
                 ))}
               </div>
             )}

             <div className="flex gap-2.5 mb-4 px-2 overflow-x-auto no-scrollbar">
                {['Shorten bio', 'Target keywords', 'Executive summary'].map(opt => (
                  <button 
                    key={opt} 
                    onClick={() => setInput(opt)}
                    className="shrink-0 px-4 py-1.5 rounded-xl border border-[#e5e5e2] bg-white text-[#888] text-[12px] font-bold hover:border-[#d97757]/50 hover:text-[#333] hover:shadow-sm transition-all shadow-sm"
                  >
                    {opt}
                  </button>
                ))}
             </div>
            
            <div className="relative flex flex-col bg-white border border-[#e5e5e2] rounded-[28px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] focus-within:border-[#d97757]/50 focus-within:shadow-[0_15px_50px_-10px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="flex items-end px-3 py-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 text-[#999] hover:text-[#d97757] transition-colors rounded-2xl hover:bg-[#f9f9f8] mb-1"
                >
                  <PlusCircle size={24} />
                </button>
                
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] py-3.5 px-2 resize-none max-h-[200px] leading-[1.6] text-[#111] placeholder:text-[#aaa]"
                  placeholder="Ask Claude to analyze your resume..."
                  rows={1}
                />

                <div className="flex items-center gap-1.5 mb-1 px-2">
                  <button className="p-3 text-[#999] hover:text-[#d97757] transition-colors rounded-2xl hover:bg-[#f9f9f8]">
                    <Mic size={22} />
                  </button>
                  <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && pendingAttachments.length === 0) || isTyping}
                    className={`w-11 h-11 bg-[#111] text-white rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-10 disabled:grayscale disabled:shadow-none ${
                        isTyping ? 'animate-pulse' : ''
                    }`}
                  >
                    <ArrowUp size={22} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-center">
              <p className="text-[11px] text-[#bbb] font-bold uppercase tracking-[0.1em]">
                Claude 3.5 Sonnet
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
