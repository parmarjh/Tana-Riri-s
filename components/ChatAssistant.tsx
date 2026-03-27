'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  MessageSquare, Send, Loader2, Search, Map, Zap, Sparkles, Bot, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  grounding?: any[];
}

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chat Settings
  const [mode, setMode] = useState<'general' | 'search' | 'maps' | 'fast' | 'hf-mistral'>('general');
  const [systemInstruction, setSystemInstruction] = useState('You are a helpful AI assistant.');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset chat when mode or instruction changes
  useEffect(() => {
    setMessages([]);
    chatRef.current = null;
  }, [mode, systemInstruction]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'hf-mistral') {
        const response = await fetch("/api/hf/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemInstruction, input }),
        });

        if (!response.ok) {
          const detail = await response.json();
          throw new Error(detail.error || "Failed to generate response.");
        }

        const result = await response.json();
        const generatedText = Array.isArray(result) ? result[0].generated_text : result.generated_text;
        const cleanText = generatedText.split('[/INST]').pop().trim();

        const modelMessage: Message = { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: cleanText || "No response generated."
        };
        setMessages(prev => [...prev, modelMessage]);
      } else {
        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
        
        let modelName = 'gemini-3.1-pro-preview';
        let tools: any[] = [];
        let toolConfig: any = undefined;

        if (mode === 'search') {
          modelName = 'gemini-3-flash-preview';
          tools = [{ googleSearch: {} }];
        } else if (mode === 'maps') {
          modelName = 'gemini-3-flash-preview';
          tools = [{ googleMaps: {} }];
        } else if (mode === 'fast') {
          modelName = 'gemini-3.1-flash-lite-preview';
        }

        if (!chatRef.current) {
          chatRef.current = ai.chats.create({
            model: modelName,
            config: {
              systemInstruction: systemInstruction,
              tools: tools.length > 0 ? tools : undefined,
              toolConfig: toolConfig
            }
          });
        }

        const response = await chatRef.current.sendMessage({ message: userMessage.text });
        
        let grounding: any[] = [];
        if (mode === 'search' || mode === 'maps') {
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            grounding = chunks;
          }
        }

        const modelMessage: Message = { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: response.text || "No response generated.",
          grounding: grounding.length > 0 ? grounding : undefined
        };
        
        setMessages(prev => [...prev, modelMessage]);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "An error occurred while generating the response.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Top Header */}
      <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 shrink-0 bg-[#0a0a0a]">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">AI Chat & Search</h2>
          <p className="text-sm text-zinc-500 mt-1">Multi-turn conversations with Google Grounding</p>
        </div>
        <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
          <button 
            onClick={() => setMode('general')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${mode === 'general' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Sparkles className="w-4 h-4" /> Pro
          </button>
          <button 
            onClick={() => setMode('fast')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${mode === 'fast' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Zap className="w-4 h-4" /> Fast
          </button>
          <button 
            onClick={() => setMode('search')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${mode === 'search' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Search className="w-4 h-4" /> Search
          </button>
          <button 
            onClick={() => setMode('maps')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${mode === 'maps' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Map className="w-4 h-4" /> Maps
          </button>
          <button 
            onClick={() => setMode('hf-mistral')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${mode === 'hf-mistral' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Bot className="w-4 h-4" /> Mistral
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Config Panel */}
        <div className="w-[320px] border-r border-zinc-800 flex flex-col bg-[#121212] shrink-0">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            <div className="mb-6">
              <h3 className="text-sm font-bold text-zinc-300 mb-2">System Instruction</h3>
              <p className="text-xs text-zinc-500 mb-3">Define the persona or rules for the AI assistant.</p>
              <textarea
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00ff9d] resize-none transition-colors"
                placeholder="You are a helpful assistant..."
              />
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Current Mode</h4>
              <div className="space-y-3">
                {mode === 'general' && (
                  <p className="text-sm text-zinc-300"><strong className="text-white">Pro Mode:</strong> Uses Gemini 3.1 Pro for complex reasoning and coding tasks.</p>
                )}
                {mode === 'fast' && (
                  <p className="text-sm text-zinc-300"><strong className="text-white">Fast Mode:</strong> Uses Gemini 3.1 Flash Lite for low-latency, quick responses.</p>
                )}
                {mode === 'search' && (
                  <p className="text-sm text-zinc-300"><strong className="text-white">Search Grounding:</strong> Uses Gemini 3 Flash connected to Google Search for up-to-date web information.</p>
                )}
                {mode === 'maps' && (
                  <p className="text-sm text-zinc-300"><strong className="text-white">Maps Grounding:</strong> Uses Gemini 3 Flash connected to Google Maps for location and place data.</p>
                )}
                {mode === 'hf-mistral' && (
                  <p className="text-sm text-zinc-300"><strong className="text-white">Mistral 7B:</strong> Open-source instruction-tuned model running on Hugging Face Inference API.</p>
                )}
              </div>
            </div>
            
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="flex-1 bg-[#0a0a0a] relative flex flex-col">
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium text-lg">Start a conversation</p>
                <p className="text-sm mt-2">Messages will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-[#00ff9d]/20 text-[#00ff9d]'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-300" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                      <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-tr-sm' : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                        <div className="prose prose-invert max-w-none text-sm">
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      </div>
                      
                      {/* Grounding Sources */}
                      {msg.grounding && msg.grounding.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.grounding.map((chunk, idx) => {
                            if (chunk.web?.uri) {
                              return (
                                <a key={idx} href={chunk.web.uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded border border-zinc-700 text-zinc-300 transition-colors">
                                  <Search className="w-3 h-3" /> {chunk.web.title || new URL(chunk.web.uri).hostname}
                                </a>
                              );
                            }
                            if (chunk.maps?.uri) {
                              return (
                                <a key={idx} href={chunk.maps.uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded border border-zinc-700 text-zinc-300 transition-colors">
                                  <Map className="w-3 h-3" /> {chunk.maps.title || "View on Maps"}
                                </a>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#00ff9d]" />
                      <span className="text-sm text-zinc-400">Thinking...</span>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="text-center text-red-400 text-sm p-4 bg-red-400/10 rounded-xl">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-[#0a0a0a] border-t border-zinc-800">
            <div className="max-w-3xl mx-auto relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message... (Press Enter to send)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl pl-4 pr-14 py-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00ff9d] resize-none h-[60px] custom-scrollbar"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-[#00ff9d] hover:bg-[#00cc7d] text-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
