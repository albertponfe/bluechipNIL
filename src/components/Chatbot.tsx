import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MessageSquare, Mic, Send, X, Loader2, Bot, User as UserIcon, MicOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Tab } from '../App';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Chatbot({ setActiveTab }: { setActiveTab: (tab: Tab) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your AthleteBank guide. How can I help you manage your taxes, contracts, or wealth today?' }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const topics = [
    { id: 'tax', label: 'Tax Autopilot', prompt: 'Tell me about Tax Autopilot' },
    { id: 'contracts', label: 'Contract AI', prompt: 'How does Contract AI work?' },
    { id: 'valuation', label: 'NIL Valuation', prompt: 'How is my NIL value calculated?' },
    { id: 'literacy', label: 'Financial Literacy', prompt: 'What can I learn here?' },
    { id: 'deals', label: 'Brand Deals', prompt: 'How do I manage brand deals?' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { role: 'user', content: text } as Message];
    setMessages(newMessages);
    setInput('');
    setIsProcessing(true);

    try {
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: `You are an expert financial assistant for college athletes at AthleteBank. 
          Your goal is to guide them through the "Financial OS" platform and answer questions about NIL, taxes, and wealth building.
          
          Platform Features:
          1. Tax Autopilot: Track NIL income, estimate quarterly taxes, and set savings goals.
          2. Contract AI: Analyze contracts for predatory clauses, eligibility risks, and tax implications.
          3. NIL Valuation: Get AI-powered market valuation reports for your personal brand.
          4. Financial Literacy: Bite-sized modules on budgeting, credit, and investing.
          5. Brand Deals: Manage sponsorships and generate professional legal agreements.
          6. My Profile: Update your athlete profile and social media handles.
          
          IMPORTANT:
          If the user's question can be answered by visiting a specific section of the platform, 
          provide a brief summary and then direct them to that section using a markdown link in the format: [Section Name](#section-id).
          
          Section IDs:
          - tax (Tax Autopilot)
          - contracts (Contract AI)
          - valuation (NIL Valuation)
          - literacy (Financial Literacy)
          - deals (Brand Deals)
          - profile (My Profile)
          
          Example: "You can track your taxes in the [Tax Autopilot](#tax) section."
          
          Tone: Professional, expert, financial, yet approachable and athlete-first. Keep responses concise and use markdown for formatting.`
        }
      });

      // Simple history management
      const response = await chat.sendMessage({ message: text });
      setMessages([...newMessages, { role: 'assistant', content: response.text || 'I\'m sorry, I couldn\'t process that.' }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone error:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: 'audio/webm'
                }
              },
              { text: 'Transcribe this audio into text. Only return the transcription, nothing else.' }
            ]
          }
        });

        const transcription = response.text?.trim();
        if (transcription) {
          handleSend(transcription);
        }
      };
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[400px] h-[600px] bg-navy/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 bg-gold text-navy flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">AthleteBank AI</h3>
                  <p className="text-[10px] text-navy/60 uppercase tracking-widest font-bold">Financial Guide</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-navy/5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-navy/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gold text-navy rounded-tr-none shadow-lg shadow-gold/10 font-medium' 
                      : 'bg-white/5 text-white rounded-tl-none border border-white/10 shadow-sm'
                  }`}>
                    <div className={`prose prose-sm max-w-none prose-p:my-0 prose-headings:text-inherit ${
                      msg.role === 'user' ? 'prose-a:text-navy' : 'prose-invert prose-a:text-gold'
                    } prose-a:font-bold prose-a:no-underline hover:prose-a:underline`}>
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => {
                            const href = props.href;
                            if (href?.startsWith('#')) {
                              const tabId = href.substring(1) as Tab;
                              return (
                                <button
                                  onClick={() => setActiveTab(tabId)}
                                  className={`${msg.role === 'user' ? 'text-navy' : 'text-gold'} font-bold hover:underline`}
                                >
                                  {props.children}
                                </button>
                              );
                            }
                            return <a {...props} />;
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Topics & Input */}
            <div className="p-5 bg-navy border-t border-white/10 space-y-4">
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleSend(topic.prompt)}
                    className="text-[10px] font-bold uppercase tracking-wider bg-white/5 text-neutral-400 px-3 py-2 rounded-xl hover:bg-gold hover:text-navy transition-all border border-white/5 flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    {topic.label}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                    placeholder="Ask about taxes, contracts..."
                    className="w-full bg-white/5 border-white/10 text-white rounded-xl px-4 py-4 text-sm focus:ring-2 focus:ring-gold/20 pr-12 placeholder:text-neutral-600"
                  />
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                      isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-neutral-500 hover:text-gold'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isProcessing}
                  className="p-4 bg-gold text-navy rounded-xl hover:bg-gold-light transition-all disabled:opacity-50 shadow-lg shadow-gold/10"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-95 group ${
          isOpen ? 'bg-white text-navy rotate-90' : 'bg-gold text-navy hover:scale-110'
        }`}
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8 group-hover:scale-110 transition-transform" />}
      </button>
    </div>
  );
}
