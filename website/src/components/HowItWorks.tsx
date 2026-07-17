'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
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
      
      // Calculate how far down the container is scrolled relative to viewport top
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalHeight));
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    // Trigger initial calculation
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Mobile layout
  if (isMobile) {
    return (
      <section className="bg-black py-20 px-6 text-gray-100 relative">
        <div className="max-w-xl mx-auto space-y-12">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full">
              How it works
            </span>
            <h2 className="text-3xl font-black text-white mt-4">Simple Setup</h2>
            <p className="text-sm text-gray-400 mt-2">Filter your streams in three quick steps.</p>
          </div>

          {/* Mobile Step 1 */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">1</span>
              <h3 className="font-extrabold text-white">Open Chrome Extensions</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Click the jigsaw puzzle icon at the top right of your browser toolbar to open your extensions list.
            </p>
            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40 p-4 flex items-center justify-between text-xs text-gray-400">
              <span>Extensions</span>
              <span className="text-base">🧩</span>
            </div>
          </div>

          {/* Mobile Step 2 */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">2</span>
              <h3 className="font-extrabold text-white">Launch the Controller</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Find and click on **BooTube** in the dropdown list to open the native control panel overlay.
            </p>
            <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0d0e12] p-4 flex items-center gap-3">
              <img src="/boo-tube-icon.svg" alt="BooTube Logo" className="h-6 w-auto" />
              <div className="text-left">
                <p className="text-xs font-bold text-white">BooTube Controller</p>
                <p className="text-[10px] text-gray-500">Ready to filter</p>
              </div>
            </div>
          </div>

          {/* Mobile Step 3 */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">3</span>
              <h3 className="font-extrabold text-white">Enable Censoring</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Flip the main toggle switch to **ON**. Blasphemy filtering activates immediately. Audio will mute and video will blur automatically for custom/profane words.
            </p>
            <div className="border border-cyan-500/20 bg-cyan-950/10 rounded-xl p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">BooTube Filters</span>
              <span className="w-10 h-6 bg-cyan-500 rounded-full flex items-center px-1 justify-end">
                <span className="w-4 h-4 bg-black rounded-full" />
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Animation values mapped to scroll progress
  // Phase 1: Zooming in on the TV (progress 0.0 to 0.4)
  const zoomProgress = Math.min(1, scrollProgress / 0.4);
  const scale = 1 + zoomProgress * 4.8; // scale from 1 to 5.8
  const bgOpacity = Math.max(0, 1 - zoomProgress * 1.5); // Fades living room out
  const tvBezelOpacity = Math.max(0, 1 - Math.max(0, (scrollProgress - 0.25) / 0.15)); // Fades TV bezel when zoomed in close

  // Phase 2: Staging transitions (progress 0.4 to 1.0)
  // Step 1: Extensions menu (progress 0.4 to 0.6)
  const step1Active = scrollProgress >= 0.4 && scrollProgress < 0.6;
  const step1Opacity = scrollProgress >= 0.38 && scrollProgress < 0.62 ? 1 : 0;
  
  // Step 2: Open Popup (progress 0.6 to 0.8)
  const step2Active = scrollProgress >= 0.6 && scrollProgress < 0.8;
  const step2Opacity = scrollProgress >= 0.58 && scrollProgress < 0.82 ? 1 : 0;

  // Step 3: Enable Censoring (progress 0.8 to 1.0)
  const step3Active = scrollProgress >= 0.8;
  const step3Opacity = scrollProgress >= 0.78 ? 1 : 0;

  // Cursor coordinates
  let cursorX = 75; // percentage of browser screen width
  let cursorY = 80; // percentage of browser screen height
  let cursorOpacity = 0;

  if (scrollProgress >= 0.42 && scrollProgress < 0.58) {
    // Cursor moves towards the extensions icon (top right)
    cursorOpacity = 1;
    const t = (scrollProgress - 0.42) / 0.16; // 0 to 1
    cursorX = 75 - t * 27; // Moves from center-right to toolbar puzzle icon at ~92%
    cursorY = 80 - t * 76; // Moves to the toolbar ~4%
  } else if (scrollProgress >= 0.58 && scrollProgress < 0.75) {
    // Cursor clicks and moves down to BooTube item in the extensions list
    cursorOpacity = 1;
    const t = (scrollProgress - 0.58) / 0.17; // 0 to 1
    cursorX = 48 + t * 40; // Moves to ~88% (the BooTube row click)
    cursorY = 4 + t * 24;  // Moves down the list
  } else if (scrollProgress >= 0.75 && scrollProgress < 0.90) {
    // Cursor moves to toggle button in the popup panel
    cursorOpacity = 1;
    const t = (scrollProgress - 0.75) / 0.15; // 0 to 1
    cursorX = 88 - t * 18; // Moves towards toggle inside active popup
    cursorY = 28 + t * 25; // Moves down to toggle row
  }

  return (
    <div ref={containerRef} className="relative min-h-[400vh] bg-black text-gray-100">
      
      {/* Sticky view frame */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        
        {/* Living Room Cozy Ambient Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-300 pointer-events-none"
          style={{ 
            backgroundImage: "url('/login-background.jpeg')",
            opacity: bgOpacity,
            transform: `scale(${1 + zoomProgress * 0.4})`,
            filter: 'brightness(0.25) contrast(1.1) blur(4px)',
          }}
        />

        {/* Ambient radial vignette mapping light towards TV */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black pointer-events-none z-1" style={{ opacity: bgOpacity }} />

        {/* Left Side: Dynamic Instruction Slide Copy */}
        <div className="absolute left-10 md:left-24 top-1/2 -translate-y-1/2 w-80 md:w-96 space-y-8 z-30 pointer-events-none">
          
          {/* Zoom Stage Hint */}
          {scrollProgress < 0.35 && (
            <div className="space-y-4 animate-fade-in transition-opacity duration-500">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                Setup walkthrough
              </span>
              <h3 className="text-3xl font-black text-white leading-tight">
                Watch how simple it is to activate.
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Scroll down to zoom into the TV screen and explore the steps to install and enable BooTube filters.
              </p>
              <div className="flex items-center gap-2 text-xs text-cyan-500 font-bold animate-pulse">
                <span>↓ Scroll down to start</span>
              </div>
            </div>
          )}

          {/* Step 1 */}
          <div 
            className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-500 transform"
            style={{ 
              opacity: step1Opacity,
              transform: `translateY(${step1Active ? '0' : '15px'})`
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
              Step 1
            </span>
            <h3 className="text-3xl font-black text-white leading-tight">
              Open Chrome Extensions
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Install the extension from the Chrome Web Store, then click the **Extensions** puzzle icon in the top-right corner of your browser toolbar.
            </p>
          </div>

          {/* Step 2 */}
          <div 
            className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-500 transform"
            style={{ 
              opacity: step2Opacity,
              transform: `translateY(${step2Active ? '0' : '15px'})`
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
              Step 2
            </span>
            <h3 className="text-3xl font-black text-white leading-tight">
              Launch the controller
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Find **BooTube** in the dropdown list and click it. This opens the dark glassmorphic popup panel directly on your streaming page.
            </p>
          </div>

          {/* Step 3 */}
          <div 
            className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-500 transform"
            style={{ 
              opacity: step3Opacity,
              transform: `translateY(${step3Active ? '0' : '15px'})`
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
              Step 3
            </span>
            <h3 className="text-3xl font-black text-white leading-tight">
              Enable Censoring
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Toggle the filter switch to **ON**. Blasphemy filtering is automatically active. Add custom words to mute audio and blur the video screen instantly when those words appear in the captions.
            </p>
          </div>

        </div>

        {/* Right Side / Centered: Zooming TV / Browser container */}
        <div 
          className="relative z-20 flex items-center justify-center transition-transform will-change-transform"
          style={{ 
            transform: `scale(${scale})`,
            // When fully zoomed, adjust horizontal position slightly to make room for text on left
            left: scrollProgress > 0.35 ? '18%' : '0%',
            transition: 'left 0.5s ease-out'
          }}
        >
          {/* TV Stand/Bezel frame */}
          <div 
            className="absolute -inset-x-8 -inset-y-6 border-[12px] border-neutral-800 bg-neutral-900 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 pointer-events-none"
            style={{ 
              opacity: tvBezelOpacity,
              boxShadow: 'inset 0 0 10px rgba(255,255,255,0.08)'
            }}
          />

          {/* TV Base Stand (fades out as camera zooms past) */}
          <div 
            className="absolute bottom-[-45px] w-32 h-10 bg-neutral-800 border-t-2 border-neutral-700 rounded-b-lg z-0 pointer-events-none"
            style={{ opacity: tvBezelOpacity }}
          />

          {/* SCREEN CONTAINER (Matches TV aspect-ratio) */}
          <div className="w-[500px] h-[281px] bg-black overflow-hidden relative rounded-xl border border-white/5 z-20">
            
            {/* TV Image Content (Playing Video on TV before transitioning) */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-500 z-10"
              style={{ 
                backgroundImage: "url('/login-background.jpeg')",
                opacity: scrollProgress < 0.4 ? 1 : 0 
              }}
            >
              {/* Play symbol center of TV screen */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-12 h-12 rounded-full bg-cyan-500/80 flex items-center justify-center text-white pl-1 shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse">
                  ▶
                </div>
              </div>
            </div>

            {/* MOCK CHROME BROWSER SCREEN */}
            <div className="absolute inset-0 bg-[#0c0d12] flex flex-col z-0">
              
              {/* Chrome Browser Toolbar */}
              <div className="h-9 bg-[#181920] border-b border-white/5 flex items-center px-3 justify-between select-none">
                
                {/* Window Controls */}
                <div className="flex gap-1.5 items-center w-16">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                  <div className="w-2 h-2 rounded-full bg-green-500/60" />
                </div>
                
                {/* Mock Address Bar */}
                <div className="bg-[#0f1016] border border-white/5 rounded-md px-3 py-0.5 text-[8px] text-gray-500 w-60 text-center truncate flex items-center justify-center gap-1">
                  <span className="text-cyan-500 text-[6px]">🔒</span> youtube.com/watch?v=bootube
                </div>

                {/* Toolbar Extension Icons */}
                <div className="flex gap-2.5 items-center justify-end w-16 relative">
                  
                  {/* Extension Jigsaw Puzzle Icon */}
                  <div 
                    className={`text-[9px] p-0.5 rounded cursor-pointer transition-colors ${
                      scrollProgress >= 0.50 && scrollProgress < 0.75 
                        ? 'bg-white/10 text-cyan-400' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🧩
                  </div>

                  {/* Tiny active BooTube extension shortcut icon */}
                  {scrollProgress >= 0.75 && (
                    <img 
                      src="/boo-tube-icon.svg" 
                      alt="Icon" 
                      className="h-3 w-auto animate-fade-in filter drop-shadow-[0_0_3px_rgba(6,182,212,0.6)]"
                    />
                  )}
                  
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-600" />
                </div>

              </div>

              {/* Browser Page Contents */}
              <div className="flex-grow relative p-2 flex flex-col justify-between">
                
                {/* Mock Video Player Grid */}
                <div className="w-full h-[180px] bg-black/60 rounded-lg relative overflow-hidden border border-white/5 flex items-center justify-center">
                  
                  {/* Mock Video Stream Background */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-black to-blue-950/20" />

                  {/* MOCK VIDEO CONTENT / SUBTITLE HIGHLIGHTING */}
                  <div className="text-center z-10 px-4 space-y-4">
                    {/* Visual speaker waveform */}
                    <div className="flex justify-center items-end gap-1 h-6">
                      <div className={`w-1 bg-cyan-400 transition-all duration-300 ${scrollProgress >= 0.85 ? 'h-1 rounded-sm' : 'h-4 animate-bounce'}`} />
                      <div className={`w-1 bg-cyan-500 transition-all duration-300 ${scrollProgress >= 0.85 ? 'h-1 rounded-sm' : 'h-6 animate-bounce [animation-delay:0.1s]'}`} />
                      <div className={`w-1 bg-blue-500 transition-all duration-300 ${scrollProgress >= 0.85 ? 'h-1 rounded-sm' : 'h-3 animate-bounce [animation-delay:0.2s]'}`} />
                      <div className={`w-1 bg-cyan-400 transition-all duration-300 ${scrollProgress >= 0.85 ? 'h-1 rounded-sm' : 'h-5 animate-bounce [animation-delay:0.3s]'}`} />
                    </div>

                    {/* Subtitle Caption box */}
                    <div className="bg-black/80 px-4 py-1.5 rounded border border-white/10 max-w-sm mx-auto">
                      <p className="text-[9px] text-gray-300 font-sans tracking-wide">
                        {scrollProgress >= 0.85 ? (
                          <>
                            Oh my <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1 rounded font-bold uppercase tracking-widest text-[8px] animate-pulse">🚫 MUTED</span> and censor the text.
                          </>
                        ) : (
                          <>
                            Oh my <span className="text-red-400 font-bold underline">gosh</span> and censor the text.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Player Video Control Bar */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 flex items-center justify-between text-white text-[7px] select-none">
                    <div className="flex gap-2 items-center">
                      <span>▶</span>
                      <span>🔊</span>
                      <span className="w-12 h-0.5 bg-gray-600 rounded relative">
                        <span 
                          className="absolute left-0 top-0 bottom-0 bg-cyan-400 transition-all duration-300"
                          style={{ width: scrollProgress >= 0.85 ? '0%' : '75%' }} 
                        />
                      </span>
                      <span>0:14 / 2:45</span>
                    </div>
                    <div className="flex gap-2 items-center text-gray-400">
                      <span>CC</span>
                      <span>⚙️</span>
                      <span>⛶</span>
                    </div>
                  </div>

                  {/* Mute Visual Warning Notification Overlay */}
                  {scrollProgress >= 0.85 && (
                    <div className="absolute top-2 right-2 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-1 rounded text-cyan-400 text-[7px] font-black tracking-wider animate-bounce shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                      🔇 AUDIO AUTO-MUTED
                    </div>
                  )}

                </div>

                {/* MOCK EXTENSIONS LIST DROPDOWN */}
                {scrollProgress >= 0.56 && scrollProgress < 0.75 && (
                  <div className="absolute top-8 right-8 w-44 bg-[#14151c] border border-white/10 rounded-lg p-2 shadow-2xl z-40 select-none animate-in fade-in slide-in-from-top-1 duration-150">
                    <p className="text-[7px] font-extrabold text-gray-500 uppercase tracking-wider mb-1.5 px-1">Extensions</p>
                    <div className={`flex items-center justify-between p-1.5 rounded-md ${scrollProgress >= 0.68 ? 'bg-white/5' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <img src="/boo-tube-icon.svg" alt="Icon" className="h-3 w-auto filter brightness-90" />
                        <span className="text-[8px] font-bold text-white">BooTube Controller</span>
                      </div>
                      <span className="text-[6px] text-gray-400">📌</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-md mt-1 hover:bg-white/5 text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">🛡️</span>
                        <span className="text-[8px]">Ad Blocker Plus</span>
                      </div>
                      <span className="text-[6px] opacity-20">📌</span>
                    </div>
                  </div>
                )}

                {/* MOCK BOOTUBE GLASSMORPHIC POPUP PANEL */}
                {scrollProgress >= 0.72 && (
                  <div 
                    className="absolute top-8 right-4 w-44 bg-[#0d0e12]/95 border border-white/10 backdrop-blur-md rounded-xl p-3 shadow-2xl z-50 select-none animate-in fade-in slide-in-from-top-2 duration-300"
                    style={{ 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(6,182,212,0.05)',
                    }}
                  >
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2.5">
                      <div className="flex items-center gap-1">
                        <img src="/boo-tube-icon.svg" alt="Logo" className="h-3 w-auto" />
                        <span className="text-[8px] font-extrabold text-white">BooTube</span>
                      </div>
                      <span className="text-[6px] text-gray-500 uppercase font-black bg-white/5 px-1 py-0.5 rounded border border-white/5">v1.26</span>
                    </div>

                    {/* Filter Toggle Row */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[7.5px] font-bold text-gray-300">Enable Filters</span>
                      
                      {/* Interactive Switch */}
                      <button 
                        className={`w-6 h-3.5 rounded-full flex items-center px-0.5 transition-all duration-300 ${
                          scrollProgress >= 0.85 
                            ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' 
                            : 'bg-white/10'
                        }`}
                      >
                        <span 
                          className={`w-2.5 h-2.5 rounded-full bg-black transition-all duration-300 transform ${
                            scrollProgress >= 0.85 ? 'translate-x-2.5 bg-white' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Preset Badges */}
                    <div className="mt-2.5 pt-2.5 border-t border-white/5 flex gap-1.5 justify-center">
                      <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded border ${scrollProgress >= 0.85 ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/30' : 'bg-white/5 text-gray-400 border-white/5'}`}>Blasphemy</span>
                      <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded border ${scrollProgress >= 0.85 ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/30 font-extrabold' : 'bg-white/5 text-gray-400 border-white/5'}`}>Profanity</span>
                    </div>

                  </div>
                )}

              </div>
            </div>

            {/* CURSOR MOUSE POINTER */}
            <div 
              className="absolute w-3 h-3 z-50 pointer-events-none transition-all duration-75"
              style={{ 
                left: `${cursorX}%`, 
                top: `${cursorY}%`,
                opacity: cursorOpacity,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Custom SVG mouse cursor */}
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
