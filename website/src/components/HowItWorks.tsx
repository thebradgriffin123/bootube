'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // Mobile/Tablet layout
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll listener to calculate progress
  useEffect(() => {
    if (isMobile) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalHeight = container.clientHeight - viewportHeight;
      
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalHeight));
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Synchronize video play state with scroll trigger
  useEffect(() => {
    if (isMobile) return;
    const video = videoRef.current;
    if (!video) return;

    if (scrollProgress >= 0.38) {
      if (video.paused) {
        video.play().catch((err) => console.log('Video play interrupted:', err));
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [scrollProgress, isMobile]);

  // Mobile layout fallback
  if (isMobile) {
    return (
      <section className="bg-black py-20 px-6 text-gray-100 relative border-t border-white/5">
        <div className="max-w-xl mx-auto space-y-12">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full">
              Setup Walkthrough
            </span>
            <h2 className="text-3xl font-black text-white mt-4">Simple Setup</h2>
            <p className="text-sm text-gray-400 mt-2">Filter your streams in three quick steps.</p>
          </div>

          {/* Mobile Step 1 */}
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">1</span>
              <h3 className="font-extrabold text-white">Click the Extensions Icon</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Click the jigsaw puzzle icon (🧩) in the top-right corner of your Chrome browser toolbar to manage your active browser extensions.
            </p>
            <div className="border border-white/5 rounded-xl overflow-hidden bg-black/40 p-4 flex items-center justify-between text-xs text-gray-500">
              <span>Extensions</span>
              <span className="text-base">🧩</span>
            </div>
          </div>

          {/* Mobile Step 2 */}
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">2</span>
              <h3 className="font-extrabold text-white">Open the Control Panel</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Select **BooTube** from the dropdown list to slide open the custom control panel directly on top of your active streaming site.
            </p>
            <div className="border border-white/5 rounded-xl overflow-hidden bg-black/60 p-4 flex items-center gap-3">
              <img src="/boo-tube-icon.svg" alt="BooTube Logo" className="h-6 w-auto" />
              <div className="text-left">
                <p className="text-xs font-bold text-white">BooTube Controller</p>
                <p className="text-[10px] text-gray-500">Click to slide open overlay</p>
              </div>
            </div>
          </div>

          {/* Mobile Step 3 */}
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">3</span>
              <h3 className="font-extrabold text-white">Enable Censoring</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Toggle the filter switch to **ON**. Blasphemy filtering activates immediately. Customize blocklists to filter additional profane phrases instantly.
            </p>
            <div className="border border-cyan-500/20 bg-cyan-950/10 rounded-xl p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">BooTube Censoring</span>
              <span className="w-10 h-6 bg-cyan-500 rounded-full flex items-center px-1 justify-end">
                <span className="w-4 h-4 bg-black rounded-full" />
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Calculate scrolling ranges to drive mock states
  // 1. Zoom TV Phase: progress 0.0 to 0.40
  const zoomProgress = Math.min(1, scrollProgress / 0.40);
  const scale = 1 + zoomProgress * 3.8; // Scales background image up (from 1 to 4.8)
  const bgOpacity = Math.max(0, 1 - Math.max(0, (scrollProgress - 0.35) / 0.08)); // Fades out background room image on transition
  const bgOverlayOpacity = Math.max(0.1, 0.65 - zoomProgress * 0.55); // Fades dark overlay to bright/warm as camera zooms in

  // Hero Copy Fades
  const heroOpacity = Math.max(0, 1 - Math.min(1, scrollProgress / 0.20));

  // 2. Slide Browser Left: progress 0.40 to 0.52
  let translateX = 0;
  if (scrollProgress >= 0.40) {
    const t = Math.min(1, (scrollProgress - 0.40) / 0.12);
    translateX = -t * 18; 
  }

  // Chrome Browser Window fades in
  const browserOpacity = scrollProgress < 0.35 ? 0 : Math.min(1, Math.max(0, (scrollProgress - 0.35) / 0.08));
  const browserScale = scrollProgress < 0.35 ? 0.9 : 0.9 + Math.min(1, (scrollProgress - 0.35) / 0.08) * 0.1; // scale from 0.9 to 1.0

  // 3. Right-side Copy Fades
  // Step 1: progress 0.50 to 0.70
  const step1Active = scrollProgress >= 0.50 && scrollProgress < 0.70;
  const step1Opacity = scrollProgress >= 0.48 && scrollProgress < 0.72 ? 1 : 0;

  // Step 2: progress 0.70 to 0.85
  const step2Active = scrollProgress >= 0.70 && scrollProgress < 0.85;
  const step2Opacity = scrollProgress >= 0.68 && scrollProgress < 0.87 ? 1 : 0;

  // Step 3: progress 0.85 to 1.00
  const step3Active = scrollProgress >= 0.85;
  const step3Opacity = scrollProgress >= 0.83 ? 1 : 0;

  // 4. Interactive pointer/mouse coordinates
  let cursorX = 75; 
  let cursorY = 85; 
  let cursorOpacity = 0;

  if (scrollProgress >= 0.48 && scrollProgress < 0.64) {
    cursorOpacity = 1;
    const t = (scrollProgress - 0.48) / 0.16; 
    cursorX = 75 - t * 28; 
    cursorY = 85 - t * 81; 
  } else if (scrollProgress >= 0.64 && scrollProgress < 0.80) {
    cursorOpacity = 1;
    const t = (scrollProgress - 0.64) / 0.16;
    cursorX = 47 + t * 41; 
    cursorY = 4 + t * 20; 
  } else if (scrollProgress >= 0.80 && scrollProgress < 0.94) {
    cursorOpacity = 1;
    const t = (scrollProgress - 0.80) / 0.14;
    cursorX = 88 - t * 18; 
    cursorY = 24 + t * 24; 
  }

  return (
    <div ref={containerRef} className="relative min-h-[400vh] bg-black text-gray-100 selection:bg-cyan-500 selection:text-black">
      
      {/* Sticky view box */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        
        {/* Living Room Background Image (Fully unblurred, scales up on scroll) */}
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none transition-transform will-change-transform"
          style={{ 
            backgroundImage: "url('/gemini-hero.jpeg')",
            opacity: bgOpacity,
            transform: `scale(${scale})`,
            transformOrigin: '50% 46.8%', // Center of the TV screen in the image
          }}
        />

        {/* Ambient Overlay Layer (fades out as we zoom in) */}
        <div 
          className="absolute inset-0 bg-black pointer-events-none z-10" 
          style={{ opacity: bgOverlayOpacity }}
        />

        {/* Centered Hero Copy Overlay (Fades out quickly at start of scroll) */}
        <div 
          className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
          style={{ opacity: heroOpacity }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-6 max-w-3xl leading-none">
            Keep your streams clean.
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed mb-10">
            BooTube automatically ghosts profanity and blasphemy in real-time. Muting the language, never the video.
          </p>
          <div className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-extrabold rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm">
            Get BooTube — It&apos;s Free
          </div>
          <div className="text-xs text-gray-400 mt-6 animate-pulse">
            ↓ Scroll down to zoom in
          </div>
        </div>

        {/* RIGHT SIDE: Interactive Copy Steps */}
        {scrollProgress >= 0.35 && (
          <div className="absolute right-10 md:right-24 top-1/2 -translate-y-1/2 w-80 md:w-[400px] z-30 pointer-events-none">
            
            {/* Step 1 */}
            <div 
              className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-500 transform"
              style={{ 
                opacity: step1Opacity,
                transform: `translateY(${step1Active ? '0' : '20px'})`
              }}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
                Step 1
              </span>
              <h3 className="text-3xl font-black text-white leading-tight">
                Click the Extensions Icon
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                Click the jigsaw puzzle icon in the top-right corner of your Chrome browser toolbar. This displays your active extensions.
              </p>
              <ul className="space-y-2 text-xs text-gray-500 font-semibold">
                <li className="flex items-center gap-2">🧩 View installed tools</li>
                <li className="flex items-center gap-2">🔍 Pin shortcuts for easy access</li>
              </ul>
            </div>

            {/* Step 2 */}
            <div 
              className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-500 transform"
              style={{ 
                opacity: step2Opacity,
                transform: `translateY(${step2Active ? '0' : '20px'})`
              }}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
                Step 2
              </span>
              <h3 className="text-3xl font-black text-white leading-tight">
                Open the Control Panel
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                Locate **BooTube** in the dropdown list and click it. This slides open your custom settings console right on the page.
              </p>
              <ul className="space-y-2 text-xs text-gray-500 font-semibold">
                <li className="flex items-center gap-2">👻 Launches the overlay dashboard</li>
                <li className="flex items-center gap-2">⚙️ Direct access to filter preferences</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div 
              className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-500 transform"
              style={{ 
                opacity: step3Opacity,
                transform: `translateY(${step3Active ? '0' : '20px'})`
              }}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
                Step 3
              </span>
              <h3 className="text-3xl font-black text-white leading-tight">
                Turn On Censoring
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                Toggle the master switch to **ON**. Blasphemy filtering activates immediately. Audio will automatically mute and video will blur when blocked words are detected.
              </p>
              <ul className="space-y-2 text-xs text-gray-500 font-semibold">
                <li className="flex items-center gap-2">⚡ Real-time client-side scanning</li>
                <li className="flex items-center gap-2">🔒 Privacy-first: No tracking, no latency</li>
              </ul>
            </div>

          </div>
        )}

        {/* LEFT / CENTER: Chrome Web Browser Mockup */}
        <div 
          className="relative z-20 flex items-center justify-center transition-all duration-300 will-change-transform"
          style={{ 
            transform: `scale(${browserScale}) translateX(${translateX}px)`,
            opacity: browserOpacity,
          }}
        >
          {/* SCREEN CONTAINER (Chrome Browser Window) */}
          <div className="w-[500px] h-[281px] bg-black overflow-hidden relative rounded-xl border border-white/10 z-20 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
            
            {/* MOCK CHROME BROWSER WINDOW LAYOUT */}
            <div className="absolute inset-0 bg-[#0c0d12] flex flex-col z-0">
              
              {/* Chrome Browser Address Bar Header */}
              <div className="h-9 bg-[#181920] border-b border-white/5 flex items-center px-3 justify-between select-none">
                
                {/* OS Controls */}
                <div className="flex gap-1.5 items-center w-16">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                </div>
                
                {/* URL Input Bar */}
                <div className="bg-[#0f1016] border border-white/5 rounded-md px-3 py-0.5 text-[8px] text-gray-500 w-60 text-center truncate flex items-center justify-center gap-1">
                  <span className="text-cyan-500 text-[6px]">🔒</span> youtube.com/watch?v=powerfuljre
                </div>

                {/* Chrome Extensions bar */}
                <div className="flex gap-2.5 items-center justify-end w-16 relative">
                  
                  {/* Jigsaw Extensions puzzle icon */}
                  <div 
                    className={`text-[9px] p-0.5 rounded cursor-pointer transition-colors ${
                      scrollProgress >= 0.55 && scrollProgress < 0.74 
                        ? 'bg-white/10 text-cyan-400' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🧩
                  </div>

                  {/* Active BooTube shortcut logo in chrome navbar */}
                  {scrollProgress >= 0.74 && (
                    <img 
                      src="/boo-tube-icon.svg" 
                      alt="Icon" 
                      className="h-3.5 w-auto animate-fade-in filter drop-shadow-[0_0_3px_rgba(6,182,212,0.65)]"
                    />
                  )}
                  
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-600" />
                </div>

              </div>

              {/* Web Page Body */}
              <div className="flex-grow relative p-2 flex flex-col justify-between">
                
                {/* Video Player Box */}
                <div className="w-full h-[180px] bg-black/60 rounded-lg relative overflow-hidden border border-white/5 flex items-center justify-center">
                  
                  {/* Looping video stream */}
                  {scrollProgress >= 0.35 && (
                    <video
                      ref={videoRef}
                      src="/powerfuljre-adam.mov"
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}

                  {/* Realtime Caption overlays */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full px-4 text-center">
                    <div className="bg-black/80 px-3 py-1 rounded border border-white/10 max-w-[280px] mx-auto inline-block">
                      <p className="text-[8px] text-white leading-relaxed font-medium">
                        {scrollProgress >= 0.88 ? (
                          <>
                            ... maintainable and then / o that&apos;s the <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1 py-0.5 rounded font-extrabold uppercase text-[7px] animate-pulse">🚫 MUTED</span> so
                          </>
                        ) : (
                          <>
                            ... maintainable and then / o that&apos;s the <span className="text-red-400 font-bold underline">key</span> so
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* HTML5 Player Bar Controls */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 to-transparent p-2 flex items-center justify-between text-white text-[7px] select-none">
                    <div className="flex gap-2 items-center">
                      <span>⏸</span>
                      <span>{scrollProgress >= 0.88 ? '🔇' : '🔊'}</span>
                      <span className="w-12 h-0.5 bg-gray-600 rounded relative">
                        <span 
                          className="absolute left-0 top-0 bottom-0 bg-cyan-400 transition-all duration-300"
                          style={{ width: scrollProgress >= 0.88 ? '0%' : '65%' }} 
                        />
                      </span>
                      <span>0:42 / 10:15</span>
                    </div>
                    <div className="flex gap-2 items-center text-gray-400">
                      <span>CC</span>
                      <span>⚙️</span>
                      <span>⛶</span>
                    </div>
                  </div>

                  {/* Mute Visual Notification Overlay */}
                  {scrollProgress >= 0.88 && (
                    <div className="absolute top-2 right-2 bg-cyan-950/85 border border-cyan-500/30 px-2 py-0.5 rounded text-cyan-400 text-[6.5px] font-black tracking-wider animate-bounce shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                      🔇 AUDIO AUTO-MUTED
                    </div>
                  )}

                </div>

                {/* EXTENSIONS LIST DROPDOWN */}
                {scrollProgress >= 0.55 && scrollProgress < 0.74 && (
                  <div className="absolute top-8 right-8 w-44 bg-[#14151c] border border-white/10 rounded-lg p-1.5 shadow-2xl z-40 select-none animate-in fade-in slide-in-from-top-1 duration-150">
                    <p className="text-[6.5px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 px-1">Extensions</p>
                    
                    <div className={`flex items-center justify-between p-1 rounded ${scrollProgress >= 0.66 ? 'bg-white/5' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <img src="/boo-tube-icon.svg" alt="Icon" className="h-3 w-auto filter brightness-90" />
                        <span className="text-[7.5px] font-bold text-white">BooTube Controller</span>
                      </div>
                      <span className="text-[6px] text-gray-400">📌</span>
                    </div>

                    <div className="flex items-center justify-between p-1 rounded mt-0.5 text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px]">🛡️</span>
                        <span className="text-[7.5px]">Ad Blocker Plus</span>
                      </div>
                      <span className="text-[6px] opacity-15">📌</span>
                    </div>
                  </div>
                )}

                {/* MOCK BOOTUBE GLASSMORPHIC POPUP PANEL */}
                {scrollProgress >= 0.70 && (
                  <div 
                    className="absolute top-8 right-4 w-44 bg-[#0d0e12]/95 border border-white/10 backdrop-blur-md rounded-xl p-3 shadow-2xl z-50 select-none animate-in fade-in slide-in-from-top-2 duration-300"
                    style={{ 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(6,182,212,0.05)',
                    }}
                  >
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                      <div className="flex items-center gap-1">
                        <img src="/boo-tube-icon.svg" alt="Logo" className="h-3 w-auto" />
                        <span className="text-[8px] font-extrabold text-white">BooTube</span>
                      </div>
                      <span className="text-[6px] text-gray-500 uppercase font-black bg-white/5 px-1 py-0.5 rounded border border-white/5">v1.26</span>
                    </div>

                    {/* Filter Toggle Row */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[7.5px] font-bold text-gray-300">Enable Filters</span>
                      
                      {/* Switch Toggle */}
                      <button 
                        className={`w-6 h-3.5 rounded-full flex items-center px-0.5 transition-all duration-300 ${
                          scrollProgress >= 0.88
                            ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' 
                            : 'bg-white/10'
                        }`}
                      >
                        <span 
                          className={`w-2.5 h-2.5 rounded-full bg-black transition-all duration-300 transform ${
                            scrollProgress >= 0.88 ? 'translate-x-2.5 bg-white' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Presets List */}
                    <div className="mt-2.5 pt-2.5 border-t border-white/5 flex gap-1.5 justify-center">
                      <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded border ${scrollProgress >= 0.88 ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/30' : 'bg-white/5 text-gray-400 border-white/5'}`}>Blasphemy</span>
                      <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded border ${scrollProgress >= 0.88 ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/30 font-extrabold' : 'bg-white/5 text-gray-400 border-white/5'}`}>Profanity</span>
                    </div>

                  </div>
                )}

              </div>
            </div>

            {/* CURSOR MOUSE POINTER */}
            <div 
              className="absolute w-3.5 h-3.5 z-50 pointer-events-none transition-all duration-75"
              style={{ 
                left: `${cursorX}%`, 
                top: `${cursorY}%`,
                opacity: cursorOpacity,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <svg className="w-full h-full fill-white stroke-black stroke-[1.5px]" viewBox="0 0 100 100">
                <polygon points="0,0 95,35 55,55 35,95" />
              </svg>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
