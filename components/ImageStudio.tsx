'use client';

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Image as ImageIcon, Upload, Sparkles, Loader2, Download, 
  Maximize, Wand2, Search, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ImageStudio() {
  const [mode, setMode] = useState<'generate' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
  // Generation Settings
  const [model, setModel] = useState<'flash' | 'pro' | 'hf-sd'>('flash');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  
  // Uploaded Image
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
  const sizes = ['512px', '1K', '2K', '4K'];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      setUploadedImage(base64String);
      setUploadedMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!prompt && mode === 'generate' && !uploadedImage) return;
    if (!uploadedImage && mode === 'analyze') return;

    setIsProcessing(true);
    setError(null);
    setResultImage(null);
    setAnalysisResult(null);

    try {
      if (model === 'hf-sd') {
        const response = await fetch("/api/hf/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt }),
        });

        if (!response.ok) {
          const detail = await response.json();
          throw new Error(detail.error || "Failed to generate image.");
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setResultImage(imageUrl);
      } else {
        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

        if (mode === 'generate') {
          const selectedModel = model === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview';
          
          const contents: any = { parts: [] };
          if (uploadedImage) {
            contents.parts.push({
              inlineData: { data: uploadedImage, mimeType: uploadedMimeType! }
            });
          }
          contents.parts.push({ text: prompt });

          const response = await ai.models.generateContent({
            model: selectedModel,
            contents,
            config: {
              imageConfig: {
                aspectRatio: aspectRatio,
                imageSize: imageSize
              }
            }
          });

          let foundImage = false;
          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              setResultImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
              foundImage = true;
              break;
            }
          }
          if (!foundImage) setError("No image was generated. Please try a different prompt.");
        } else {
          // Analyze Mode
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: {
              parts: [
                { inlineData: { data: uploadedImage!, mimeType: uploadedMimeType! } },
                { text: prompt || "Analyze this image in detail." }
              ]
            }
          });
          setAnalysisResult(response.text || "No analysis generated.");
        }
      }
    } catch (err: any) {
      console.error("Processing error:", err);
      setError(err.message || "An error occurred during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Top Header */}
      <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 shrink-0 bg-[#0a0a0a]">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">AI Image Studio</h2>
          <p className="text-sm text-zinc-500 mt-1">Create, edit, and analyze images with Gemini</p>
        </div>
        <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
          <button 
            onClick={() => setMode('generate')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${mode === 'generate' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Generate & Edit
          </button>
          <button 
            onClick={() => setMode('analyze')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${mode === 'analyze' ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Analyze
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Config Panel */}
        <div className="w-[480px] border-r border-zinc-800 flex flex-col bg-[#121212] shrink-0">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* Image Upload for Edit/Analyze */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">
                  {mode === 'analyze' ? 'Image to Analyze' : 'Reference Image (Optional)'}
                </span>
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${uploadedImage ? 'border-[#00ff9d]/50 bg-[#00ff9d]/5' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'}`}
              >
                {uploadedImage ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <img src={`data:${uploadedMimeType};base64,${uploadedImage}`} alt="Uploaded" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm font-medium">Click to change</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-zinc-500 mb-3" />
                    <p className="text-sm font-medium text-zinc-300">Click to upload image</p>
                    <p className="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              </div>
            </div>

            {mode === 'generate' && (
              <>
                {/* Model Selection */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Model Quality</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => setModel('flash')}
                      className={`p-3 rounded-xl border text-left transition-colors ${model === 'flash' ? 'border-[#00ff9d] bg-[#00ff9d]/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className={`w-4 h-4 ${model === 'flash' ? 'text-[#00ff9d]' : 'text-zinc-400'}`} />
                        <span className={`text-sm font-bold ${model === 'flash' ? 'text-white' : 'text-zinc-300'}`}>Flash</span>
                      </div>
                      <p className="text-xs text-zinc-500">Fast</p>
                    </button>
                    <button 
                      onClick={() => setModel('pro')}
                      className={`p-3 rounded-xl border text-left transition-colors ${model === 'pro' ? 'border-[#00ff9d] bg-[#00ff9d]/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className={`w-4 h-4 ${model === 'pro' ? 'text-[#00ff9d]' : 'text-zinc-400'}`} />
                        <span className={`text-sm font-bold ${model === 'pro' ? 'text-white' : 'text-zinc-300'}`}>Pro</span>
                      </div>
                      <p className="text-xs text-zinc-500">Photo</p>
                    </button>
                    <button 
                      onClick={() => setModel('hf-sd')}
                      className={`p-3 rounded-xl border text-left transition-colors ${model === 'hf-sd' ? 'border-[#00ff9d] bg-[#00ff9d]/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ImageIcon className={`w-4 h-4 ${model === 'hf-sd' ? 'text-[#00ff9d]' : 'text-zinc-400'}`} />
                        <span className={`text-sm font-bold ${model === 'hf-sd' ? 'text-white' : 'text-zinc-300'}`}>SDXL</span>
                      </div>
                      <p className="text-xs text-zinc-500">Free</p>
                    </button>
                  </div>
                </div>

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
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          aspectRatio === ar 
                            ? 'bg-zinc-200 text-black border-zinc-200' 
                            : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Size */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">Resolution</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(s => (
                      <button
                        key={s}
                        onClick={() => setImageSize(s)}
                        disabled={model === 'pro' && s === '512px'}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          imageSize === s 
                            ? 'bg-zinc-200 text-black border-zinc-200' 
                            : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {s}
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
                placeholder={mode === 'analyze' ? "What do you want to know about this image?" : "Describe the image you want to create..."}
                className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00ff9d] resize-none transition-colors"
              />
            </div>

          </div>

          {/* Generate Button Sticky Bottom */}
          <div className="p-6 bg-[#121212] border-t border-zinc-800">
            {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
            <button 
              onClick={handleProcess}
              disabled={isProcessing || (mode === 'analyze' && !uploadedImage) || (mode === 'generate' && !prompt && !uploadedImage)}
              className="w-full py-4 rounded-full bg-[#00ff9d] text-black font-black text-lg tracking-wide hover:bg-[#00cc7d] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> PROCESSING...</>
              ) : mode === 'analyze' ? (
                <><Search className="w-5 h-5" /> ANALYZE IMAGE</>
              ) : (
                <><Wand2 className="w-5 h-5" /> GENERATE IMAGE</>
              )}
            </button>
          </div>
        </div>

        {/* Right Results Panel */}
        <div className="flex-1 bg-[#0a0a0a] relative overflow-y-auto p-8 custom-scrollbar flex flex-col items-center justify-center">
          {!resultImage && !analysisResult && !isProcessing ? (
            <div className="flex flex-col items-center justify-center text-zinc-500">
              <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg">Your results will appear here</p>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-[#00ff9d] animate-spin" />
              <p className="text-zinc-400 font-medium animate-pulse">
                {mode === 'analyze' ? 'Analyzing image...' : 'Generating image...'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {resultImage && (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-3xl flex flex-col items-center"
                >
                  <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
                    <img src={resultImage} alt="Generated" className="w-full h-auto object-contain max-h-[70vh]" />
                  </div>
                  <div className="mt-6 flex gap-4">
                    <a 
                      href={resultImage} 
                      download="generated-image.png"
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
