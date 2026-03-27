'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Music, Mic, Speaker, Activity, Play, Pause, 
  Volume2, VolumeX, Loader2, Download, Scissors
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Stem {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
}

export default function StemSplitter() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [stems, setStems] = useState<Stem[]>([
    { id: 'vocals', name: 'Vocals', icon: Mic, color: '#00ff9d', volume: 80, isMuted: false, isSolo: false },
    { id: 'drums', name: 'Drums', icon: Activity, color: '#ff0055', volume: 80, isMuted: false, isSolo: false },
    { id: 'bass', name: 'Bass', icon: Speaker, color: '#00aaff', volume: 80, isMuted: false, isSolo: false },
    { id: 'other', name: 'Other', icon: Music, color: '#ffaa00', volume: 80, isMuted: false, isSolo: false },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setIsDone(false);
    }
  };

  const handleSplit = () => {
    if (!file) return;
    setIsProcessing(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      setIsProcessing(false);
      setIsDone(true);
    }, 4000);
  };

  const toggleMute = (id: string) => {
    setStems(stems.map(stem => 
      stem.id === id ? { ...stem, isMuted: !stem.isMuted } : stem
    ));
  };

  const toggleSolo = (id: string) => {
    const isCurrentlySolo = stems.find(s => s.id === id)?.isSolo;
    
    setStems(stems.map(stem => {
      if (stem.id === id) {
        return { ...stem, isSolo: !isCurrentlySolo };
      }
      return { ...stem, isSolo: false }; // Only one solo at a time for simplicity, or allow multiple
    }));
  };

  const handleVolumeChange = (id: string, newVolume: number) => {
    setStems(stems.map(stem => 
      stem.id === id ? { ...stem, volume: newVolume } : stem
    ));
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Top Header */}
      <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 shrink-0 bg-[#0a0a0a]">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">AI Stem Splitter</h2>
          <p className="text-sm text-zinc-500 mt-1">Isolate vocals, drums, bass, and instruments instantly.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          
          {!isDone && !isProcessing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center"
            >
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-zinc-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Upload an Audio File</h3>
              <p className="text-zinc-500 mb-8 max-w-md">
                Drop your MP3, WAV, or FLAC file here. Our AI will analyze the track and separate it into 4 high-quality stems.
              </p>
              
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              
              <div className="flex gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-full transition-colors"
                >
                  {file ? file.name : "Select File"}
                </button>
                
                {file && (
                  <button 
                    onClick={handleSplit}
                    className="px-6 py-3 bg-[#00ff9d] hover:bg-[#00cc7d] text-black font-bold rounded-full transition-colors flex items-center gap-2"
                  >
                    <Scissors className="w-5 h-5" /> Split Stems
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#00ff9d] rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Scissors className="w-8 h-8 text-[#00ff9d]" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">Analyzing Audio...</h3>
              <p className="text-zinc-500">Using deep learning to isolate instruments.</p>
            </div>
          )}

          {isDone && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{file?.name || "Track.mp3"}</h3>
                  <p className="text-sm text-zinc-500">4 Stems • 44.1kHz • AI Separated</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-14 h-14 bg-[#00ff9d] hover:bg-[#00cc7d] text-black rounded-full flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(0,255,157,0.2)]"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                  <button className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-full transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download All
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {stems.map((stem) => {
                  // Determine if this track is effectively muted
                  const anySolo = stems.some(s => s.isSolo);
                  const isEffectivelyMuted = stem.isMuted || (anySolo && !stem.isSolo);
                  
                  return (
                    <div 
                      key={stem.id} 
                      className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-6 transition-opacity duration-300 ${isEffectivelyMuted ? 'opacity-50' : 'opacity-100'}`}
                    >
                      {/* Icon & Name */}
                      <div className="w-32 flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center" style={{ color: stem.color }}>
                          <stem.icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm tracking-wide">{stem.name}</span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => toggleMute(stem.id)}
                          className={`w-10 h-10 rounded-lg font-bold text-xs transition-colors ${stem.isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >
                          M
                        </button>
                        <button 
                          onClick={() => toggleSolo(stem.id)}
                          className={`w-10 h-10 rounded-lg font-bold text-xs transition-colors ${stem.isSolo ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >
                          S
                        </button>
                      </div>

                      {/* Fake Waveform */}
                      <div className="flex-1 h-12 flex items-center gap-[2px] overflow-hidden opacity-80">
                        {Array.from({ length: 60 }).map((_, i) => {
                          // Generate a pseudo-random height based on index and stem id
                          const height = Math.max(10, Math.sin(i * 0.5 + stem.name.length) * 50 + Math.cos(i * 0.2) * 30 + 50);
                          const isActive = isPlaying && !isEffectivelyMuted;
                          return (
                            <div 
                              key={i} 
                              className="flex-1 rounded-full transition-all duration-200"
                              style={{ 
                                height: `${height}%`, 
                                backgroundColor: isActive ? stem.color : '#3f3f46',
                                opacity: isActive ? 0.8 + Math.random() * 0.2 : 0.5
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Volume Slider */}
                      <div className="w-32 flex items-center gap-3 shrink-0">
                        {stem.volume === 0 ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={stem.volume}
                          onChange={(e) => handleVolumeChange(stem.id, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-300"
                        />
                      </div>
                      
                      {/* Download Single */}
                      <button className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition-colors shrink-0">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-center mt-8">
                <button 
                  onClick={() => {
                    setFile(null);
                    setIsDone(false);
                  }}
                  className="text-sm text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
                >
                  Split another track
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
