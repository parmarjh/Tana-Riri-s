'use client';

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Video, Upload, Sparkles, Loader2, Download, 
  Play, Pause, Wand2, Search, FileVideo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function VideoStudio() {
  const [mode, setMode] = useState<'generate' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
  // Generation Settings
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('1080p');
  
  // Uploaded Image/Video
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatios = ['16:9', '9:16'];
  const resolutions = ['720p', '1080p'];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      setUploadedFile(base64String);
      setUploadedMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const pollOperation = async (ai: GoogleGenAI, operation: any) => {
    let currentOp = operation;
    while (!currentOp.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      currentOp = await ai.operations.getVideosOperation({ operation: currentOp });
    }
    return currentOp;
  };

  const handleProcess = async () => {
    if (!prompt && mode === 'generate' && !uploadedFile) return;
    if (!uploadedFile && mode === 'analyze') return;

    setIsProcessing(true);
    setError(null);
    setResultVideo(null);
    setAnalysisResult(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key not found");
      const ai = new GoogleGenAI({ apiKey });

      if (mode === 'generate') {
        const config: any = {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio
        };

        const generateParams: any = {
          model: 'veo-3.1-fast-generate-preview',
          config
        };

        if (prompt) generateParams.prompt = prompt;
        if (uploadedFile) {
          generateParams.image = {
            imageBytes: uploadedFile,
            mimeType: uploadedMimeType!
          };
        }

        let operation = await ai.models.generateVideos(generateParams);
        operation = await pollOperation(ai, operation);

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const response = await fetch(downloadLink, {
            method: 'GET',
            headers: { 'x-goog-api-key': apiKey },
          });
          const blob = await response.blob();
          setResultVideo(URL.createObjectURL(blob));
        } else {
          setError("Video generation failed. Please try again.");
        }
      } else {
        // Analyze Mode
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: {
            parts: [
              { inlineData: { data: uploadedFile!, mimeType: uploadedMimeType! } },
              { text: prompt || "Analyze this video in detail." }
            ]
          }
        });
        setAnalysisResult(response.text || "No analysis generated.");
      }
    } catch (err) {
      console.error("Processing error:", err);
      setError("An error occurred during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Top Header */}
      <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 shrink-0 bg-[#0a0a0a]">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">AI Video Studio</h2>
          <p className="text-sm text-zinc-500 mt-1">Generate videos from text/images and analyze video content</p>
        </div>
        <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
          <button 
            onClick={() => setMode('generate')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${mode === 'generate' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Generate Video
          </button>
          <button 
            onClick={() => setMode('analyze')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${mode === 'analyze' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Analyze Video
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Config Panel */}
        <div className="w-[480px] border-r border-zinc-800 flex flex-col bg-[#121212] shrink-0">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* File Upload for Edit/Analyze */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">
                  {mode === 'analyze' ? 'Video to Analyze' : 'Starting Image (Optional)'}
                </span>
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${uploadedFile ? 'border-[#00ff9d]/50 bg-[#00ff9d]/5' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'}`}
              >
                {uploadedFile ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <FileVideo className="w-10 h-10 text-[#00ff9d] mb-2" />
                    <p className="text-sm font-medium text-white truncate max-w-[200px]">{uploadedFileName}</p>
                    <p className="text-xs text-zinc-500 mt-1">Click to change</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-zinc-500 mb-3" />
                    <p className="text-sm font-medium text-zinc-300">Click to upload {mode === 'analyze' ? 'video' : 'image'}</p>
                    <p className="text-xs text-zinc-500 mt-1">{mode === 'analyze' ? 'MP4, WEBM up to 50MB' : 'PNG, JPG up to 5MB'}</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept={mode === 'analyze' ? "video/*" : "image/*"} 
                  className="hidden" 
                />
              </div>
            </div>

            {mode === 'generate' && (
              <>
                {/* Aspect Ratio */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Aspect Ratio</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aspectRatios.map(ar => (
                      <button
                        key={ar}
                        onClick={() => setAspectRatio(ar)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                          aspectRatio === ar 
                            ? 'bg-zinc-200 text-black border-zinc-200' 
                            : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                        }`}
                      >
                        {ar === '16:9' ? '16:9 Landscape' : '9:16 Portrait'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Resolution</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resolutions.map(r => (
                      <button
                        key={r}
                        onClick={() => setResolution(r)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                          resolution === r 
                            ? 'bg-zinc-200 text-black border-zinc-200' 
                            : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Prompt */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">
                  {mode === 'analyze' ? 'Question / Prompt (Optional)' : 'Prompt'}
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'analyze' ? "What do you want to know about this video?" : "Describe the video you want to generate..."}
                className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00ff9d] resize-none transition-colors"
              />
            </div>

          </div>

          {/* Generate Button Sticky Bottom */}
          <div className="p-6 bg-[#121212] border-t border-zinc-800">
            {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
            <button 
              onClick={handleProcess}
              disabled={isProcessing || (mode === 'analyze' && !uploadedFile) || (mode === 'generate' && !prompt && !uploadedFile)}
              className="w-full py-4 rounded-full bg-[#00ff9d] text-black font-black text-lg tracking-wide hover:bg-[#00cc7d] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> PROCESSING...</>
              ) : mode === 'analyze' ? (
                <><Search className="w-5 h-5" /> ANALYZE VIDEO</>
              ) : (
                <><Wand2 className="w-5 h-5" /> GENERATE VIDEO</>
              )}
            </button>
          </div>
        </div>

        {/* Right Results Panel */}
        <div className="flex-1 bg-[#0a0a0a] relative overflow-y-auto p-8 custom-scrollbar flex flex-col items-center justify-center">
          {!resultVideo && !analysisResult && !isProcessing ? (
            <div className="flex flex-col items-center justify-center text-zinc-500">
              <Video className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg">Your results will appear here</p>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-[#00ff9d] animate-spin" />
              <p className="text-zinc-400 font-medium animate-pulse">
                {mode === 'analyze' ? 'Analyzing video...' : 'Generating video (this may take a few minutes)...'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {resultVideo && (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-3xl flex flex-col items-center"
                >
                  <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
                    <video src={resultVideo} controls autoPlay loop className="w-full h-auto max-h-[70vh]" />
                  </div>
                  <div className="mt-6 flex gap-4">
                    <a 
                      href={resultVideo} 
                      download="generated-video.mp4"
                      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-full text-sm font-bold transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </div>
                </motion.div>
              )}
              
              {analysisResult && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <Search className="w-5 h-5 text-[#00ff9d]" />
                    <h3 className="text-xl font-bold text-white">Analysis Result</h3>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{analysisResult}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  );
}
