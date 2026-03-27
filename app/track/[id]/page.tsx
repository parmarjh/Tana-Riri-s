'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Sparkles, Play, Pause, Loader2, Music, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

export default function SharedTrack() {
  const params = useParams();
  const trackId = params.id as string;
  
  const [track, setTrack] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const docRef = doc(db, "tracks", trackId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setTrack(docSnap.data());
        } else {
          setError("Track not found. It may have been deleted or the link is invalid.");
        }
      } catch (err) {
        console.error("Error fetching track:", err);
        setError("Failed to load track. Please check your connection and Firebase configuration.");
      } finally {
        setIsLoading(false);
      }
    };

    if (trackId) {
      fetchTrack();
    }
  }, [trackId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#00ff9d] animate-spin mb-4" />
        <p className="text-zinc-400 font-medium animate-pulse">Loading track...</p>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <Music className="w-16 h-16 text-zinc-700 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Oops!</h2>
        <p className="text-zinc-400 max-w-md mb-8">{error || "Track not found."}</p>
        <Link href="/" className="px-6 py-3 bg-[#00ff9d] text-black font-bold rounded-full hover:bg-[#00cc7d] transition-colors">
          Go to Tanariri
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Generator
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#00ff9d]" />
                <span className="text-sm font-bold uppercase tracking-widest text-[#00ff9d]">Shared AI Track</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{track.title}</h1>
              <div className="flex flex-wrap gap-2 text-sm font-medium text-zinc-300">
                <span className="bg-zinc-800 px-4 py-2 rounded-full border border-zinc-700">{track.genre}</span>
                {track.mood && <span className="bg-zinc-800 px-4 py-2 rounded-full border border-zinc-700">{track.mood}</span>}
                {track.singer && <span className="bg-zinc-800 px-4 py-2 rounded-full border border-zinc-700 text-[#00ff9d]">🎤 {track.singer}</span>}
              </div>
            </div>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-20 h-20 bg-[#00ff9d] hover:bg-[#00cc7d] text-black rounded-full flex items-center justify-center transition-transform hover:scale-105 shrink-0 shadow-[0_0_30px_rgba(0,255,157,0.3)]"
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-2" />}
            </button>
          </div>

          {track.instrumentation && (
            <div className="mb-8 bg-zinc-950 rounded-2xl p-6 border border-zinc-800">
              <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">Instrumentation</h4>
              <p className="text-base text-zinc-300 leading-relaxed">{track.instrumentation}</p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Lyrics</h4>
            <div className="bg-zinc-950 rounded-2xl p-8 border border-zinc-800">
              <p className="text-lg text-zinc-300 font-serif italic whitespace-pre-wrap leading-loose">
                {track.lyrics}
              </p>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-zinc-800 text-center">
            <p className="text-zinc-500 mb-4">Want to create your own AI music?</p>
            <Link href="/" className="inline-flex items-center justify-center px-8 py-4 bg-white text-black font-black rounded-full hover:bg-zinc-200 transition-colors">
              Try Tanariri for Free
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
