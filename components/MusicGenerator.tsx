'use client';

import React, { useState } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { 
  Music, FileText, Radio, Scissors, Compass, LayoutTemplate, 
  DollarSign, Upload, Plus, Play, Pause, Sparkles, Loader2, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
      lyrics: { type: Type.STRING, description: "The lyrics of the song. Leave empty if it's an instrumental background loop." },
      instrumentation: { type: Type.STRING, description: "The instruments used in the track" },
      singer: { type: Type.STRING, description: "The vocal style or specific singer requested for the track" },
      duration: { type: Type.STRING, description: "The duration of the track" },
      isLoop: { type: Type.BOOLEAN, description: "Whether the track is a seamless background loop" }
    },
    required: ["title", "genre", "topic"]
  }
};

export default function MusicGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSong, setGeneratedSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  const [selectedGenre, setSelectedGenre] = useState<string>("Ambient");
  const [selectedSubGenre, setSelectedSubGenre] = useState<string>("");
  const [selectedSinger, setSelectedSinger] = useState<string>("");
  const [selectedMood, setSelectedMood] = useState<string>("Chill");
  const [selectedDuration, setSelectedDuration] = useState<string>("30s");
  const [isLoop, setIsLoop] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("VEGA_2 (Updated)");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");

  const models = ["VEGA_1", "VEGA_2 (Updated)", "Meta MusicGen (Free)", "Google Lyria"];

  const industries = [
    "Hollywood (English)", "Bollywood (Hindi)", "Tollywood (Telugu/Bengali)", 
    "Kollywood (Tamil)", "Sandalwood (Kannada)", "Mollywood (Malayalam)", 
    "Gollywood (Gujarati)", "Pollywood (Punjabi)", "Bhojpuri", 
    "K-Pop (Korean)", "J-Pop (Japanese)", "Latin (Spanish)", "Global/Any"
  ];

  const instruments = [
    "Acoustic Guitar", "Electric Guitar", "Piano", "Synthesizer", 
    "Drums", "Bass", "Violin", "Cello", "Flute", "Saxophone"
  ];

  const genres = [
    "Ambient", "Drum 'n' Bass", "EDM", "Epic Score", "Hip Hop", "House", 
    "Lo Fi", "Reggaeton", "Synthwave", "Techno", "Trap Double Tempo", 
    "Trap Half Tempo", "Downtempo", "Rock", "Zen"
  ];

  const subGenres = [
    "Cinematic Atmospheres", "Cinematic", "Dark Synth"
  ];

  const singers = [
    "Lata Mangeshkar", "Alka Yagnik", "Sukhwinder Singh", 
    "AR Rahman", "Michael Jackson", "Aretha Franklin", "Whitney Houston", 
    "Freddie Mercury", "Arijit Singh", "Hansraj Raghuwanshi",
    "Shreya Ghoshal", "Kishore Kumar", "Sonu Nigam"
  ];

  const moods = [
    "Energetic", "Chill", "Dark", "Happy", "Sad", "Romantic", "Suspenseful", "Uplifting"
  ];

  const durations = [
    "15s", "30s", "1m", "2m", "3m", "5m", "10m", "15m"
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedSong(null);
    
    try {
      if (selectedModel === "Meta MusicGen (Free)") {
        // Use Hugging Face Inference API for Meta MusicGen
        const response = await fetch("/api/hf/music", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt }),
        });

        if (!response.ok) {
          const detail = await response.json();
          throw new Error(detail.error || "Failed to generate music.");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Setup mock metadata for the result view
        setGeneratedSong({
          title: customPrompt.substring(0, 20) || "Generated Track",
          genre: selectedGenre,
          mood: selectedMood,
          instrumentation: selectedInstruments.join(', ') || "Synthesized",
          duration: selectedDuration,
          audioUrl: audioUrl // Custom field to handle direct audio playback
        });
        
      } else {
        // Use Google Gemini for metadata generation
        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
        const prompt = `Generate a music track with the following parameters:
        Model: ${selectedModel}
        Custom Prompt: ${customPrompt || 'None'}
        Industry/Language: ${selectedIndustry || 'Any'}
        Genre: ${selectedGenre}
        Sub Genre: ${selectedSubGenre || 'Any'}
        Singer: ${selectedSinger || 'Any'}
        Mood: ${selectedMood}
        Instrumentation: ${selectedInstruments.length > 0 ? selectedInstruments.join(', ') : 'Any'}
        Duration: ${selectedDuration}
        Is Loop: ${isLoop ? 'Yes, make it a seamless background loop' : 'No'}
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
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
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
                <div className="relative inline-flex items-center w-full">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full appearance-none bg-zinc-800/50 px-4 py-2 pr-10 rounded-lg border border-zinc-700/50 text-sm font-semibold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00ff9d] cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    {models.map(m => (
                      <option key={m} value={m} className="bg-zinc-900">{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Text to Music Prompt */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Text to Music</span>
                  <span className="text-xs font-medium bg-zinc-800/50 px-2 py-0.5 rounded text-zinc-500">Optional</span>
                </div>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe the song you want to generate... (e.g., 'A fast-paced synthwave track for a cyberpunk car chase')"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#00ff9d] focus:border-transparent resize-none h-24 transition-all"
                />
              </div>

              {/* Industry / Language */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Industry / Language</span>
                  <span className="text-xs font-medium bg-zinc-800/50 px-2 py-0.5 rounded text-zinc-500">Optional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {industries.map(ind => (
                    <button
                      key={ind}
                      onClick={() => setSelectedIndustry(selectedIndustry === ind ? "" : ind)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        selectedIndustry === ind 
                          ? 'bg-zinc-200 text-black border-zinc-200' 
                          : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
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

              {/* Mood */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Mood</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {moods.map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedMood(m)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        selectedMood === m 
                          ? 'bg-zinc-200 text-black border-zinc-200' 
                          : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instrumentation */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Instrumentation</span>
                  <span className="text-xs font-medium bg-zinc-800/50 px-2 py-0.5 rounded text-zinc-500">Optional</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {instruments.map(inst => {
                    const isSelected = selectedInstruments.includes(inst);
                    return (
                      <button
                        key={inst}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedInstruments(selectedInstruments.filter(i => i !== inst));
                          } else {
                            setSelectedInstruments([...selectedInstruments, inst]);
                          }
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                          isSelected 
                            ? 'bg-zinc-200 text-black border-zinc-200' 
                            : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                        }`}
                      >
                        {inst}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration & Loop */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Duration & Loop</span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative inline-flex items-center">
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(e.target.value)}
                      className="appearance-none bg-zinc-800/50 px-4 py-2 pr-10 rounded-lg border border-zinc-700/50 text-sm font-semibold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#00ff9d] cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                      {durations.map(d => (
                        <option key={d} value={d} className="bg-zinc-900">{d}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${isLoop ? 'bg-[#00ff9d]' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isLoop ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={isLoop} 
                    onChange={(e) => setIsLoop(e.target.checked)} 
                  />
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                    Seamless Background Loop
                  </span>
                </label>
              </div>

              {/* Grid Buttons */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                {[
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
                        {generatedSong.duration && <span className="bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700">⏱ {generatedSong.duration}</span>}
                        {generatedSong.isLoop && <span className="bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700 text-[#00ff9d]">🔁 Seamless Loop</span>}
                        {generatedSong.singer && <span className="bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700 text-[#00ff9d]">🎤 {generatedSong.singer}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (generatedSong.audioUrl) {
                          if (!audioRef.current) {
                            audioRef.current = new Audio(generatedSong.audioUrl);
                            audioRef.current.onended = () => setIsPlaying(false);
                          }
                          
                          if (isPlaying) {
                            audioRef.current.pause();
                            setIsPlaying(false);
                          } else {
                            audioRef.current.play();
                            setIsPlaying(true);
                          }
                        } else if (generatedSong.lyrics) {
                          // Fallback to TTS if no audio file
                          if (isPlaying) {
                            window.speechSynthesis.cancel();
                            setIsPlaying(false);
                          } else {
                            const utterance = new SpeechSynthesisUtterance(generatedSong.lyrics);
                            utterance.onend = () => setIsPlaying(false);
                            window.speechSynthesis.speak(utterance);
                            setIsPlaying(true);
                          }
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

                  {generatedSong.lyrics && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Lyrics</h4>
                      <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800">
                        <p className="text-sm text-zinc-300 font-serif italic whitespace-pre-wrap leading-loose">
                          {generatedSong.lyrics}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>
  );
}
