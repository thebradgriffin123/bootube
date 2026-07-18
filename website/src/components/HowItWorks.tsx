'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTime, setVideoTime] = useState(0);
  const [lastStep, setLastStep] = useState(1);
  const [demoTime, setDemoTime] = useState(0);
  
  const isWalkthroughActive = scrollProgress >= 0.25;

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Callback ref to guarantee browser autoplay is permitted on mount
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      node.muted = true;
    }
  }, []);

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

  // Master timer to drive the walkthrough demo state automatically on screen enter
  useEffect(() => {
    if (isMobile || !isWalkthroughActive) {
      setDemoTime(0);
      return;
    }

    const interval = setInterval(() => {
      setDemoTime((prev) => {
        const next = prev + 0.05;
        return next >= 21.0 ? 0 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isWalkthroughActive, isMobile]);

  // Step calculations for triggers (driven automatically by demoTime)
  const currentStep = demoTime < 9.2 ? 1 : demoTime < 14.0 ? 2 : 3;
  const isCensoringOn = demoTime >= 10.5;
  const isHideCaptionsOn = demoTime >= 11.5;

  // Synchronize video play state with master currentStep changes
  useEffect(() => {
    if (isMobile) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;

    if (isWalkthroughActive) {
      if (currentStep === 1) {
        if (video.currentTime !== 0) {
          video.currentTime = 0;
        }
        if (video.paused) {
          video.play().catch(() => {});
        }
      } else if (currentStep === 2) {
        if (!video.paused) {
          video.pause();
        }
      } else if (currentStep === 3) {
        if (video.currentTime !== 0) {
          video.currentTime = 0;
        }
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    } else {
      if (!video.paused) video.pause();
    }
  }, [currentStep, isWalkthroughActive, isMobile]);

  // Unlock audio/video playback on first user gesture anywhere on the page
  useEffect(() => {
    if (isMobile) return;

    const unlockPlayback = () => {
      const video = videoRef.current;
      if (video && video.paused && isWalkthroughActive && currentStep !== 2) {
        video.play().catch(() => {});
      }
      
      // Clean up event listeners immediately after first gesture
      document.removeEventListener('click', unlockPlayback);
      document.removeEventListener('touchstart', unlockPlayback);
      document.removeEventListener('scroll', unlockPlayback);
    };

    document.addEventListener('click', unlockPlayback);
    document.addEventListener('touchstart', unlockPlayback);
    document.addEventListener('scroll', unlockPlayback);

    return () => {
      document.removeEventListener('click', unlockPlayback);
      document.removeEventListener('touchstart', unlockPlayback);
      document.removeEventListener('scroll', unlockPlayback);
    };
  }, [isWalkthroughActive, currentStep, isMobile]);

  // Programmatic muting based on timestamps in Step 3
  useEffect(() => {
    if (isMobile) return;
    const video = videoRef.current;
    if (!video) return;

    if (currentStep === 3) {
      const shouldMute = 
        (videoTime >= 1.0 && videoTime <= 2.0) || 
        (videoTime >= 3.3 && videoTime <= 4.3) || 
        (videoTime >= 4.8 && videoTime <= 5.6);
      
      video.muted = shouldMute;
    } else {
      video.muted = false;
    }
  }, [videoTime, currentStep, isMobile]);

  // Mobile layout fallback
  if (isMobile) {
    return (
      <section className="bg-gradient-to-b from-[#08080a] via-[#050505] to-[#030304] py-20 px-6 text-gray-100 relative border-t border-white/5 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-cyan-950/10 blur-[80px] pointer-events-none" />
        <div className="max-w-xl mx-auto space-y-12 relative z-10">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full">
              Setup Walkthrough
            </span>
            <h2 className="text-3xl font-black text-white mt-4">Simple Setup</h2>
            <p className="text-sm text-gray-400 mt-2">Filter your streams in three quick steps.</p>
          </div>

          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">1</span>
              <h3 className="font-extrabold text-white">Click the BooTube Icon</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Locate and click the BooTube ghost icon directly in your Chrome browser toolbar to open the active settings console.
            </p>
            <div className="border border-white/5 rounded-xl overflow-hidden bg-black/40 p-4 flex items-center justify-between text-xs text-gray-500">
              <span>Extensions</span>
              <img src="/boo-tube-ghost-icon.svg" alt="BooTube Icon" className="h-5 w-auto" />
            </div>
          </div>

          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">2</span>
              <h3 className="font-extrabold text-white">Turn On Censoring & Hide Captions</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Toggle **Censoring** to ON (Spaghetti Western) and toggle **Hide Captions** to ON. These settings apply immediately to clean the stream.
            </p>
            <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0d0e12] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Censoring</p>
                  <p className="text-[10px] text-gray-500">Spaghetti Western</p>
                </div>
                <span className="w-8 h-4.5 bg-cyan-500 rounded-full flex items-center px-0.5 justify-end">
                  <span className="w-3.5 h-3.5 bg-white rounded-full" />
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <p className="text-xs font-bold text-white">Hide Captions</p>
                <span className="w-8 h-4.5 bg-cyan-500 rounded-full flex items-center px-0.5 justify-end">
                  <span className="w-3.5 h-3.5 bg-white rounded-full" />
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">3</span>
              <h3 className="font-extrabold text-white">Censored Playback</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              The video automatically plays with audio seamlessly muted at the exact moments of profanity, and the captions are completely hidden.
            </p>
            <div className="border border-cyan-500/20 bg-cyan-950/10 rounded-xl p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">Stream Cleaned</span>
              <span className="text-xs font-bold text-gray-400">🔇 Muted Real-Time</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Calculate scrolling ranges to drive mock states
  const zoomProgress = Math.min(1, scrollProgress / 0.40);
  const scale = 1 + zoomProgress * 3.8;
  const bgOpacity = Math.max(0, 1 - Math.max(0, (scrollProgress - 0.25) / 0.08));
  const bgOverlayOpacity = Math.max(0.1, 0.65 - zoomProgress * 0.55);

  const heroOpacity = Math.max(0, 1 - Math.min(1, scrollProgress / 0.20));

  const browserOpacity = scrollProgress < 0.25 ? 0 : Math.min(1, Math.max(0, (scrollProgress - 0.25) / 0.08));
  const browserScale = scrollProgress < 0.25 ? 0.9 : 0.9 + Math.min(1, (scrollProgress - 0.25) / 0.08) * 0.1;

  // 3. Right-side Copy Transitions (instant transition, no overlap)
  const step1Active = currentStep === 1;
  const step1Opacity = step1Active ? 1 : 0;

  const step2Active = currentStep === 2;
  const step2Opacity = step2Active ? 1 : 0;

  const step3Active = currentStep === 3;
  const step3Opacity = step3Active ? 1 : 0;

  // 4. Interactive pointer/mouse coordinates (driven by automated demoTime)
  let cursorX = 75; 
  let cursorY = 85; 
  let cursorOpacity = 0;
  let isClicking = false;

  const isPopupOpen = demoTime >= 8.8 && demoTime < 13.3;

  if (demoTime >= 7.0 && demoTime < 8.5) {
    cursorOpacity = 1;
    const t = (demoTime - 7.0) / 1.5; 
    cursorX = 75 + t * (94.5 - 75);
    cursorY = 85 + t * (5.5 - 85);
  } else if (demoTime >= 8.5 && demoTime < 8.8) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 5.5;
    isClicking = true;
  } else if (demoTime >= 8.8 && demoTime < 9.2) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 5.5;
  } else if (demoTime >= 9.2 && demoTime < 10.2) {
    cursorOpacity = 1;
    const t = (demoTime - 9.2) / 1.0;
    cursorX = 94.5;
    cursorY = 5.5 + t * (31.5 - 5.5);
  } else if (demoTime >= 10.2 && demoTime < 10.5) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 31.5;
    isClicking = true;
  } else if (demoTime >= 10.5 && demoTime < 11.2) {
    cursorOpacity = 1;
    const t = (demoTime - 10.5) / 0.7;
    cursorX = 94.5;
    cursorY = 31.5 + t * (41.5 - 31.5);
  } else if (demoTime >= 11.2 && demoTime < 11.5) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 41.5;
    isClicking = true;
  } else if (demoTime >= 11.5 && demoTime < 12.0) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 41.5;
  } else if (demoTime >= 12.0 && demoTime < 13.0) {
    cursorOpacity = 1;
    const t = (demoTime - 12.0) / 1.0;
    cursorX = 94.5;
    cursorY = 41.5 + t * (5.5 - 41.5);
  } else if (demoTime >= 13.0 && demoTime < 13.3) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 5.5;
    isClicking = true;
  } else if (demoTime >= 13.3 && demoTime < 14.0) {
    cursorOpacity = 1;
    const t = (demoTime - 13.3) / 0.7;
    cursorX = 94.5 + t * (3.5 - 94.5);
    cursorY = 5.5 + t * (96.0 - 5.5);
  } else if (demoTime >= 14.0 && demoTime < 14.3) {
    cursorOpacity = 1;
    cursorX = 3.5;
    cursorY = 96.0;
    isClicking = true;
  }

  const getCaptionText = () => {
    if (isHideCaptionsOn) return null;

    if (videoTime >= 0 && videoTime < 3.0) {
      if (isCensoringOn) {
        return (
          <>
            You are a <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-extrabold uppercase text-[10px] md:text-[11px] animate-pulse font-sans">🚫 MUTED</span> liar,
          </>
        );
      }
      return <>You are a dang liar,</>;
    }
    
    if (videoTime >= 3.0 && videoTime < 4.8) {
      if (isCensoringOn) {
        return (
          <>
            and I will see you in <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-extrabold uppercase text-[10px] md:text-[11px] animate-pulse font-sans">🚫 MUTED</span>!
          </>
        );
      }
      return <>and I will see you in heck!</>;
    }

    if (videoTime >= 4.8 && videoTime < 7.0) {
      if (isCensoringOn) {
        return (
          <>
            <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-extrabold uppercase text-[10px] md:text-[11px] animate-pulse font-sans">🚫 MUTED</span> you!
          </>
        );
      }
      return <>Forget you!</>;
    }

    return null;
  };

  const videoMuted = currentStep === 3 && (
    (videoTime >= 1.0 && videoTime <= 2.0) || 
    (videoTime >= 3.3 && videoTime <= 4.3) || 
    (videoTime >= 4.8 && videoTime <= 5.6)
  );

  return (
    <div ref={containerRef} className="relative min-h-[400vh] bg-black text-gray-100 selection:bg-cyan-500 selection:text-black">
      
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#08080a] via-[#050505] to-[#030304]">
        
        {/* Ambient background glows */}
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-cyan-950/15 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-blue-950/10 blur-[120px] pointer-events-none z-0" />
        
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none transition-transform will-change-transform"
          style={{ 
            backgroundImage: "url('/gemini-hero.jpeg')",
            opacity: bgOpacity,
            transform: `scale(${scale})`,
            transformOrigin: '50% 37.0%',
          }}
        />

        <div 
          className="absolute inset-0 bg-black pointer-events-none z-10" 
          style={{ opacity: bgOverlayOpacity }}
        />

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

        {scrollProgress >= 0.25 && (
          <div 
            className="absolute left-0 right-0 w-full flex items-center justify-between pl-0 pr-12 md:pr-24 lg:pr-32 gap-10 md:gap-16 z-20"
            style={{ height: 'calc(100vh - 80px)', marginTop: '80px' }}
          >
            <div 
              className="w-[60vw] aspect-[16/9] max-w-[1150px] transition-all duration-300 will-change-transform relative"
              style={{ 
                transform: `scale(${browserScale})`,
                opacity: browserOpacity,
                transformOrigin: 'left center',
              }}
            >
              <div className="w-full h-full bg-black overflow-hidden relative rounded-r-xl border-y border-r border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col">
                
                <div className="absolute inset-0 bg-[#0c0d12] flex flex-col z-0">
                  
                  <div className="h-10 bg-[#181920] border-b border-white/5 flex items-center px-4 justify-between select-none flex-shrink-0">
                    
                    <div className="flex gap-1.5 items-center w-20">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                    
                    <div className="bg-[#0f1016] border border-white/5 rounded-md px-3 py-1 text-[10px] text-gray-500 w-80 text-center truncate flex items-center justify-center gap-1.5">
                      <span className="text-cyan-500 text-[8px]">🔒</span> youtube.com/watch?v=spaghettiwestern
                    </div>

                    <div className="flex gap-3 items-center justify-end w-24 relative">
                      
                      <img 
                        src="/boo-tube-ghost-icon.svg" 
                        alt="BooTube Extension" 
                        className={`h-5 w-auto cursor-pointer p-0.5 rounded transition-all duration-200 ${
                          isPopupOpen
                            ? 'bg-white/10 filter drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] scale-110' 
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                      />

                      <div className="w-4 h-4 rounded-full bg-gray-600 flex-shrink-0" />
                    </div>

                  </div>

                  <div className="flex-grow w-full h-0 relative">
                    
                    <div className="w-full h-full bg-black/60 relative overflow-hidden flex items-center justify-center">
                      
                      <video
                        ref={setVideoRef}
                        src="/cowboys.mp4"
                        autoPlay
                        preload="auto"
                        muted
                        playsInline
                        onCanPlay={(e) => {
                          if (scrollProgress >= 0.25 && currentStep === 1) {
                            e.currentTarget.play().catch(() => {});
                          }
                        }}
                        onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                          scrollProgress >= 0.25 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      />

                      {getCaptionText() && (
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 w-full px-6 text-center pointer-events-none select-none">
                          <div className="bg-black/80 px-4 py-2 rounded border border-white/10 max-w-[85%] mx-auto inline-block">
                            <p className="text-[12px] md:text-[14px] text-white leading-relaxed font-semibold">
                              {getCaptionText()}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 to-transparent p-3 flex items-center justify-between text-white text-[10px] md:text-[11px] select-none">
                        <div className="flex gap-3 items-center">
                          <span>⏸</span>
                          <span>{videoMuted ? '🔇' : '🔊'}</span>
                          <span className="w-20 h-1 bg-gray-600 rounded relative">
                            <span 
                              className="absolute left-0 top-0 bottom-0 bg-cyan-400 transition-all duration-300"
                              style={{ width: videoMuted ? '0%' : '65%' }} 
                            />
                          </span>
                          <span>{formatTime(videoTime)} / 0:07</span>
                        </div>
                        <div className="flex gap-3 items-center text-gray-400">
                          <span className={isHideCaptionsOn ? 'line-through opacity-40' : 'text-cyan-400 font-extrabold'}>CC</span>
                          <span>⚙️</span>
                          <span>⛶</span>
                        </div>
                      </div>

                    </div>

                    {isPopupOpen && (
                      <div 
                        className="absolute top-11 right-6 w-60 bg-[#0d0e12]/95 border border-white/10 backdrop-blur-md rounded-xl p-4 shadow-2xl z-50 select-none animate-in fade-in slide-in-from-top-2 duration-300"
                        style={{ 
                          boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(6,182,212,0.05)',
                        }}
                      >
                        
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                          <div className="flex items-center gap-1.5">
                            <img src="/boo-tube-ghost-icon.svg" alt="Logo" className="h-4.5 w-auto" />
                            <span className="text-[11px] font-extrabold text-white">BooTube</span>
                          </div>
                          <span className="text-[9px] text-gray-500 uppercase font-black bg-white/5 px-1.5 py-0.5 rounded border border-white/5">v1.26</span>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-white/5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded flex items-center justify-center bg-red-950/20 border border-red-500/30 text-[12px] flex-shrink-0">
                              📺
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[11px] font-extrabold text-white leading-tight">Censoring</h4>
                              <p className="text-[9px] text-gray-400 truncate">Spaghetti Western</p>
                            </div>
                          </div>
                          
                          <button 
                            className="w-10 h-5.5 rounded-full flex items-center px-0.5 transition-all duration-300 relative border-none cursor-pointer outline-none"
                            style={{
                              background: isCensoringOn
                                ? 'linear-gradient(135deg, #4789F0, #3AA5C2)' 
                                : 'linear-gradient(135deg, #D7361F, #FD533B)'
                            }}
                          >
                            <span 
                              className={`w-4.5 h-4.5 rounded-full bg-white transition-all duration-300 transform shadow-md ${
                                isCensoringOn ? 'translate-x-4.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded flex items-center justify-center bg-cyan-950/20 border border-cyan-500/30 text-[12px] flex-shrink-0">
                              CC
                            </div>
                            <div>
                              <h4 className="text-[11px] font-extrabold text-white leading-tight">Hide Captions</h4>
                            </div>
                          </div>
                          
                          <button 
                            className="w-10 h-5.5 rounded-full flex items-center px-0.5 transition-all duration-300 relative border-none cursor-pointer outline-none"
                            style={{
                              background: isHideCaptionsOn
                                ? 'linear-gradient(135deg, #4789F0, #3AA5C2)' 
                                : 'linear-gradient(135deg, #D7361F, #FD533B)'
                            }}
                          >
                            <span 
                              className={`w-4.5 h-4.5 rounded-full bg-white transition-all duration-300 transform shadow-md ${
                                isHideCaptionsOn ? 'translate-x-4.5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                </div>

                <div 
                  className="absolute w-4 h-4 z-50 pointer-events-none transition-all duration-75"
                  style={{ 
                    left: `${cursorX}%`, 
                    top: `${cursorY}%`,
                    opacity: cursorOpacity,
                    transform: `translate(-50%, -50%) ${isClicking ? 'scale(0.8)' : 'scale(1)'}`,
                  }}
                >
                  <svg className="w-full h-full fill-white stroke-black stroke-[1.5px]" viewBox="0 0 100 100">
                    <polygon points="0,0 95,35 55,55 35,95" />
                  </svg>
                  {isClicking && (
                    <span className="absolute inset-0 rounded-full border border-cyan-500 animate-ping opacity-75" style={{ margin: '-4px' }} />
                  )}
                </div>

              </div>

            </div>

            <div className="w-[30vw] max-w-[420px] relative h-[400px]">
              
              <div 
                className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-out"
                style={{ 
                  opacity: step1Opacity,
                  transform: step1Active ? 'translateY(0)' : (currentStep > 1 ? 'translateY(-20px)' : 'translateY(20px)'),
                  pointerEvents: step1Active ? 'auto' : 'none',
                }}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
                  Step 1
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  Click the BooTube Icon
                </h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-medium">
                  Locate and click the BooTube ghost icon directly in your Chrome browser toolbar to open the active settings console.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-500 font-semibold">
                  <li className="flex items-center gap-2">👻 Access settings instantly</li>
                  <li className="flex items-center gap-2">🔒 Privacy-first local filtering</li>
                </ul>
              </div>

              <div 
                className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-out"
                style={{ 
                  opacity: step2Opacity,
                  transform: step2Active ? 'translateY(0)' : (currentStep > 2 ? 'translateY(-20px)' : 'translateY(20px)'),
                  pointerEvents: step2Active ? 'auto' : 'none',
                }}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
                  Step 2
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  Turn On Censoring & Hide Captions
                </h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-medium">
                  Toggle **Censoring** to ON (Spaghetti Western) and toggle **Hide Captions** to ON. These settings apply immediately to clean the stream.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-500 font-semibold">
                  <li className="flex items-center gap-2">⚡ Real-time client-side scanning</li>
                  <li className="flex items-center gap-2">💬 Hide subtitles dynamically</li>
                </ul>
              </div>

              <div 
                className="space-y-4 absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-out"
                style={{ 
                  opacity: step3Opacity,
                  transform: step3Active ? 'translateY(0)' : (currentStep > 3 ? 'translateY(-20px)' : 'translateY(20px)'),
                  pointerEvents: step3Active ? 'auto' : 'none',
                }}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full self-start">
                  Step 3
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  Censored Playback
                </h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-medium">
                  The video automatically rewinds and plays again. The audio is seamlessly muted at 1.5s (*dang*), 3.7s (*heck*), and 5.0s (*forget*), and the captions are hidden.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-500 font-semibold">
                  <li className="flex items-center gap-2">🔇 Mutes audio, never cuts video</li>
                  <li className="flex items-center gap-2">🤠 Cohesive demo experience</li>
                </ul>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
