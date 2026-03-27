'use client';

import React, { useState } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { 
  Music, FileText, Radio, Scissors, Compass, LayoutTemplate, 
  DollarSign, Upload, Plus, Play, Pause, Sparkles, Loader2, ChevronDown,
  Download, Cloud, Share2, Copy, Check, LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, googleProvider } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';

const generateMusicDeclaration: FunctionDeclaration = {
  name: "generateMusicTrack",
  description: "Generates a music track based on the user's request.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A catchy title for the song" },
      genre: { type: Type.STRING, description: "The musical genre" },
      mood: { type: Type.STRING, description: "The mood of the song" },
      topic: { type: Type.STRING, description: "The main topic or theme of the song" },
      lyrics: { type: Type.STRING, description: "The lyrics of the song. Write at least a verse and a chorus." },
      instrumentation: { type: Type.STRING, description: "The instruments used in the track" },
      singer: { type: Type.STRING, description: "The vocal style or specific singer requested for the track" }
    },
    required: ["title", "genre", "topic", "lyrics"]
  }
};

export default function VoiceAssistant() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSong, setGeneratedSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [selectedGenre, setSelectedGenre] = useState<string>("Ambient");
  const [selectedSubGenre, setSelectedSubGenre] = useState<string>("");
  const [selectedSinger, setSelectedSinger] = useState<string>("");

  const [user, setUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const speechRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const [speechUtterance, setSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleDownload = () => {
    if (!generatedSong) return;
    const content = `Title: ${generatedSong.title}\nGenre: ${generatedSong.genre}\nMood: ${generatedSong.mood || 'N/A'}\nSinger: ${generatedSong.singer || 'N/A'}\n\nInstrumentation:\n${generatedSong.instrumentation || 'N/A'}\n\nLyrics:\n${generatedSong.lyrics}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedSong.title.replace(/\s+/g, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      setError("Please log in to save to cloud.");
      return;
    }
    if (!generatedSong) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const docRef = await addDoc(collection(db, "tracks"), {
        ...generatedSong,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return docRef.id;
    } catch (err) {
      console.error("Error saving to cloud:", err);
      setError("Failed to save to cloud. Ensure Firebase is configured.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!user) {
      setError("Please log in to share.");
      return;
    }
    
    let trackId = null;
    try {
      trackId = await handleSaveToCloud();
      if (trackId) {
        const link = `${window.location.origin}/track/${trackId}`;
        setShareLink(link);
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const genres = [
    "Ambient", "Drum 'n' Bass", "EDM", "Epic Score", "Hip Hop", "House", 
    "Lo Fi", "Reggaeton", "Synthwave", "Techno", "Trap Double Tempo", 
    "Trap Half Tempo", "Downtempo", "Rock", "Zen"
  ];

  const subGenres = [
    "Cinematic Atmospheres", "Cinematic", "Dark Synth"
  ];

  const singers = [
    "Hansraj Raghuwanshi", "Lata Mangeshkar", "Alka Yagnik", "Sukhwinder Singh", 
    "AR Rahman", "Michael Jackson", "Aretha Franklin", "Whitney Houston", 
    "Freddie Mercury", "Arijit Singh"
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedSong(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `Generate a music track with the following parameters:
      Model: VEGA_1
      Genre: ${selectedGenre}
      Sub Genre: ${selectedSubGenre || 'Any'}
      Singer: ${selectedSinger || 'Any'}
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ functionDeclarations: [generateMusicDeclaration] }],
          systemInstruction: "You are an AI music generator. You must call the generateMusicTrack tool with the requested parameters. Be creative with the title and lyrics."
        }
      });
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls.find(c => c.name === "generateMusicTrack");
        if (call) {
          setGeneratedSong(call.args);
        }
      } else {
         setError("Failed to generate track metadata. Please try again.");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError("An error occurred during generation.");
    } finally {
      setIsGenerating(false);
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
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
              <FileText className="w-4 h-4" /> AI Text to Music
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#00ff9d] bg-zinc-800/30 rounded-lg transition-colors">
              <Radio className="w-4 h-4" /> AI Music Generator
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
              <Music className="w-4 h-4" /> AI Sample Generator
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
              <Scissors className="w-4 h-4" /> Stem Splitter
            </a>
            
            <div className="my-4 border-t border-zinc-800/50 mx-3"></div>
            
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
              <Compass className="w-4 h-4" /> Discover
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
              <LayoutTemplate className="w-4 h-4" /> Templates
            </a>
            
            <div className="my-4 border-t border-zinc-800/50 mx-3"></div>
            
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
              <DollarSign className="w-4 h-4" /> Pricing
            </a>
          </nav>
        </div>
        
        <div className="p-4 space-y-3">
          <button className="w-full py-2.5 px-4 rounded-full border border-zinc-700 text-sm font-semibold hover:bg-zinc-800 transition-colors">
            Log In
          </button>
          <button className="w-full py-2.5 px-4 rounded-full bg-[#00ff9d] text-black text-sm font-bold hover:bg-[#00cc7d] transition-colors">
            Start Free Now
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 shrink-0 bg-[#0a0a0a]">
          <div>
            <h2 className="text-3xl font-bold text-zinc-100">AI Music Generator</h2>
            <p className="text-sm text-zinc-500 mt-1">Make AI-generated music in seconds!</p>
          </div>
          <button className="flex items-center gap-2 bg-[#00ff9d] text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-[#00cc7d] transition-colors">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>

        {/* Split View */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Config Panel */}
          <div className="w-[480px] border-r border-zinc-800 flex flex-col bg-[#121212] shrink-0">
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              
              {/* Model */}
              <div className="mb-8">
                <p className="text-xs font-bold text-zinc-500 mb-2">Model:</p>
                <div className="inline-flex items-center gap-2 bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-700/50 cursor-pointer hover:bg-zinc-800 transition-colors">
                  <span className="text-sm font-semibold text-zinc-200">VEGA_1</span>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </div>
              </div>

              {/* Genre */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Genre</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {genres.map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGenre(g)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        selectedGenre === g 
                          ? 'bg-zinc-200 text-black border-zinc-200' 
                          : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub Genre */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Sub Genre</span>
                  <span className="text-xs font-medium bg-zinc-800/50 px-2 py-0.5 rounded text-zinc-500">Optional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subGenres.map(sg => (
                    <button
                      key={sg}
                      onClick={() => setSelectedSubGenre(selectedSubGenre === sg ? "" : sg)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        selectedSubGenre === sg 
                          ? 'bg-zinc-200 text-black border-zinc-200' 
                          : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {sg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Singer */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Preferred Singer</span>
                  <span className="text-xs font-medium bg-zinc-800/50 px-2 py-0.5 rounded text-zinc-500">Optional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {singers.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSinger(selectedSinger === s ? "" : s)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        selectedSinger === s 
                          ? 'bg-zinc-200 text-black border-zinc-200' 
                          : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Buttons */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                {[
                  { label: "Duration", icon: Plus },
                  { label: "Instruments", icon: Plus },
                  { label: "Genre Blend", icon: Plus },
                  { label: "Energy", icon: Plus },
                  { label: "Structure", icon: Plus },
                  { label: "Tempo", icon: Plus },
                  { label: "Key", icon: Plus },
                  { label: "Audio Clip", icon: Upload }
                ].map((btn, i) => (
                  <button key={i} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-800/50 transition-colors aspect-square">
                    <btn.icon className="w-5 h-5 text-zinc-400" />
                    <span className="text-[10px] font-semibold text-zinc-400 text-center leading-tight">{btn.label}</span>
                  </button>
                ))}
              </div>

            </div>

            {/* Generate Button Sticky Bottom */}
            <div className="p-6 bg-[#121212] border-t border-zinc-800">
              {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 rounded-full bg-[#00ff9d] text-black font-black text-lg tracking-wide hover:bg-[#00cc7d] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> GENERATING...</> : "GENERATE"}
              </button>
            </div>
          </div>

          {/* Right Results Panel */}
          <div className="flex-1 bg-[#0a0a0a] relative overflow-y-auto p-8 custom-scrollbar flex flex-col">
            {!generatedSong && !isGenerating ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-zinc-500 font-medium text-lg">Your generated tracks will appear here</p>
              </div>
            ) : isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#00ff9d] animate-spin" />
                <p className="text-zinc-400 font-medium animate-pulse">Composing your masterpiece...</p>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-[#00ff9d]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#00ff9d]">AI Generated Track</span>
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-3">{generatedSong.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-300">
                        <span className="bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700">{generatedSong.genre}</span>
                        {generatedSong.mood && <span className="bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700">{generatedSong.mood}</span>}
                        {generatedSong.singer && <span className="bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700 text-[#00ff9d]">🎤 {generatedSong.singer}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (isPlaying) {
                          window.speechSynthesis.cancel();
                          setIsPlaying(false);
                        } else if (generatedSong?.lyrics) {
                          const utterance = new SpeechSynthesisUtterance(generatedSong.lyrics);
                          utterance.onend = () => setIsPlaying(false);
                          speechRef.current = utterance;
                          window.speechSynthesis.speak(utterance);
                          setIsPlaying(true);
                        } else {
                          setIsPlaying(!isPlaying);
                        }
                      }}
                      className="w-14 h-14 bg-[#00ff9d] hover:bg-[#00cc7d] text-black rounded-full flex items-center justify-center transition-colors shrink-0"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </button>
                  </div>

                  {generatedSong.instrumentation && (
                    <div className="mb-6 bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Instrumentation</h4>
                      <p className="text-sm text-zinc-300">{generatedSong.instrumentation}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Lyrics</h4>
                    <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800">
                      <p className="text-sm text-zinc-300 font-serif italic whitespace-pre-wrap leading-loose">
                        {generatedSong.lyrics}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-wrap items-center gap-3">
                    <button 
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download Text
                    </button>
                    
                    <button 
                      onClick={user ? handleSaveToCloud : handleLogin}
                      disabled={isSaving || saveSuccess}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        saveSuccess 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      }`}
                    >
                      {isSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                      ) : saveSuccess ? (
                        <><Check className="w-4 h-4" /> Saved</>
                      ) : !user ? (
                        <><LogIn className="w-4 h-4" /> Login to Save</>
                      ) : (
                        <><Cloud className="w-4 h-4" /> Save to Cloud</>
                      )}
                    </button>

                    <button 
                      onClick={user ? handleShare : handleLogin}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm font-medium transition-colors"
                    >
                      {!user ? <LogIn className="w-4 h-4" /> : <Share2 className="w-4 h-4" />} 
                      {!user ? "Login to Share" : "Share"}
                    </button>
                  </div>

                  {shareLink && (
                    <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between gap-4">
                      <span className="text-xs text-zinc-400 truncate flex-1">{shareLink}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-[#00ff9d] hover:text-[#00cc7d] transition-colors shrink-0"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied!" : "Copy Link"}
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
