'use client';

import React, { useState, useEffect } from 'react';
import { 
  Music, FileText, Radio, Scissors, Compass, LayoutTemplate, 
  DollarSign, Upload, Plus, Play, Pause, Sparkles, Loader2, ChevronDown,
  Image as ImageIcon, Video, MessageSquare, Map, Search, Zap, LogOut, User, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MusicGenerator from './MusicGenerator';
import ImageStudio from './ImageStudio';
import VideoStudio from './VideoStudio';
import ChatAssistant from './ChatAssistant';
import StemSplitter from './StemSplitter';
import VoiceAssistant from './VoiceAssistant';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('music');
  const [user, setUser] = useState<{ displayName: string, email: string, photoURL: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Mock login for firebase-less setup
  const handleLogin = async () => {
    setIsAuthLoading(true);
    setTimeout(() => {
      setUser({
        displayName: 'Guest User',
        email: 'guest@example.com',
        photoURL: ''
      });
      setIsAuthLoading(false);
    }, 800);
  };

  const handleLogout = async () => {
    setUser(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'music': return <MusicGenerator />;
      case 'image': return <ImageStudio />;
      case 'video': return <VideoStudio />;
      case 'chat': return <ChatAssistant />;
      case 'splitter': return <StemSplitter />;
      case 'voice': return <VoiceAssistant />;
      default: return <MusicGenerator />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#0f0f0f] border-r border-zinc-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6">
            <h1 className="text-2xl font-black tracking-tighter">Tanariri</h1>
          </div>
          
          <nav className="space-y-1 px-3">
            <button 
              onClick={() => setActiveTab('music')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'music' ? 'text-[#00ff9d] bg-zinc-800/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              <Radio className="w-4 h-4" /> AI Music Generator
            </button>
            <button 
              onClick={() => setActiveTab('splitter')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'splitter' ? 'text-[#00ff9d] bg-zinc-800/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              <Scissors className="w-4 h-4" /> Stem Splitter
            </button>
            <button 
              onClick={() => setActiveTab('image')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'image' ? 'text-[#00ff9d] bg-zinc-800/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              <ImageIcon className="w-4 h-4" /> AI Image Studio
            </button>
            <button 
              onClick={() => setActiveTab('video')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'video' ? 'text-[#00ff9d] bg-zinc-800/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              <Video className="w-4 h-4" /> AI Video Studio
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'chat' ? 'text-[#00ff9d] bg-zinc-800/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              <MessageSquare className="w-4 h-4" /> AI Chat & Search
            </button>
            <button 
              onClick={() => setActiveTab('voice')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'voice' ? 'text-[#00ff9d] bg-zinc-800/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
            >
              <Bot className="w-4 h-4" /> AI Voice Expert
            </button>
            
            <div className="my-4 border-t border-zinc-800/50 mx-3"></div>
            
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
              <Compass className="w-4 h-4" /> Discover
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
              <LayoutTemplate className="w-4 h-4" /> Templates
            </a>
          </nav>
        </div>
        
        <div className="p-4 space-y-3">
          {isAuthLoading ? (
            <div className="flex justify-center p-2"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
          ) : user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 py-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><User className="w-4 h-4 text-zinc-400" /></div>
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{user.displayName || 'User'}</span>
                  <span className="text-[10px] text-zinc-500 truncate">{user.email}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full border border-zinc-700 text-sm font-semibold hover:bg-zinc-800 transition-colors text-zinc-400">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          ) : (
            <>
              <button onClick={handleLogin} className="w-full py-2.5 px-4 rounded-full border border-zinc-700 text-sm font-semibold hover:bg-zinc-800 transition-colors">
                Log In with Google
              </button>
              <button onClick={handleLogin} className="w-full py-2.5 px-4 rounded-full bg-[#00ff9d] text-black text-sm font-bold hover:bg-[#00cc7d] transition-colors">
                Start Free Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
