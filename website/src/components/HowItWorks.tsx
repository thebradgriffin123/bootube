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
  const [userUnmuted, setUserUnmuted] = useState(false);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Does BooTube work on Netflix or Hulu?",
      a: "Yes! BooTube currently supports YouTube, Netflix, Disney+, Hulu, Plex, and Fandango at Home (Vudu). Support for Amazon Prime Video is coming soon."
    },
    {
      q: "Will streaming services ban my account for using this?",
      a: "Absolutely not. BooTube does not violate any terms of service, decrypt media, or block ads. It simply reads official subtitle tracks locally inside your browser/app and adjusts the volume slider in real-time."
    },
    {
      q: "Is my personal data sold to third parties?",
      a: "Never. BooTube is built with privacy-first architecture. All parsing, scanning, and muting run 100% locally on your own device. Your custom settings and blocklists stay secure in your own account."
    },
    {
      q: "What is the difference between Blasphemy and Profanity filters?",
      a: "Our free tier includes 100% free filtering for blasphemous and religious exclamations. The Premium Plan unlocks advanced profanity (vulgarity, slurs), custom word blocklists, video player blurring, and cross-device sync."
    }
  ];

  const toggleDemo = () => {
    const nextPlaying = !isDemoPlaying;
    setIsDemoPlaying(nextPlaying);
    if (nextPlaying) {
      setUserUnmuted(true);
    }
  };
  
  const isWalkthroughActive = scrollProgress >= 0.33;

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
    if (!isDemoPlaying) return;

    const interval = setInterval(() => {
      setDemoTime((prev) => {
        const next = prev + 0.05;
        if (next >= 21.0) {
          setIsDemoPlaying(false);
          setUserUnmuted(false);
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isWalkthroughActive, isDemoPlaying, isMobile]);

  // Reset demo state when scrolling away from walkthrough
  useEffect(() => {
    if (!isWalkthroughActive) {
      setIsDemoPlaying(false);
      setDemoTime(0);
    }
  }, [isWalkthroughActive]);

  // Step calculations for triggers (driven automatically by demoTime)
  const currentStep = demoTime < 9.2 ? 1 : demoTime < 14.0 ? 2 : 3;
  const isCensoringOn = demoTime >= 10.5;
  const isHideCaptionsOn = demoTime >= 11.5;

  // Synchronize video play state with master currentStep changes
  useEffect(() => {
    if (isMobile) return;
    const video = videoRef.current;
    if (!video) return;

    if (isWalkthroughActive && isDemoPlaying) {
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
  }, [currentStep, isWalkthroughActive, isDemoPlaying, isMobile]);

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
    };

    document.addEventListener('click', unlockPlayback);
    document.addEventListener('touchstart', unlockPlayback);

    return () => {
      document.removeEventListener('click', unlockPlayback);
      document.removeEventListener('touchstart', unlockPlayback);
    };
  }, [isWalkthroughActive, currentStep, isMobile]);

  // Programmatic muting based on timestamps in Step 3
  useEffect(() => {
    if (isMobile) return;
    const video = videoRef.current;
    if (!video) return;

    if (!userUnmuted) {
      video.muted = true;
    } else {
      if (currentStep === 3) {
        const shouldMute = 
          (videoTime >= 1.0 && videoTime <= 2.0) || 
          (videoTime >= 3.3 && videoTime <= 4.3) || 
          (videoTime >= 4.8 && videoTime <= 5.6);
        
        video.muted = shouldMute;
      } else {
        video.muted = false;
      }
    }
  }, [videoTime, currentStep, userUnmuted, isMobile]);

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
              <img src="/boo-icon-glyph.svg" alt="BooTube Icon" className="h-5 w-auto" />
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
    cursorY = 85 + t * (6.5 - 85);
  } else if (demoTime >= 8.5 && demoTime < 8.8) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 6.5;
    isClicking = true;
  } else if (demoTime >= 8.8 && demoTime < 9.2) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 6.5;
  } else if (demoTime >= 9.2 && demoTime < 10.2) {
    cursorOpacity = 1;
    const t = (demoTime - 9.2) / 1.0;
    cursorX = 94.5;
    cursorY = 6.5 + t * (33.5 - 6.5);
  } else if (demoTime >= 10.2 && demoTime < 10.5) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 33.5;
    isClicking = true;
  } else if (demoTime >= 10.5 && demoTime < 11.2) {
    cursorOpacity = 1;
    const t = (demoTime - 10.5) / 0.7;
    cursorX = 94.5;
    cursorY = 33.5 + t * (43.5 - 33.5);
  } else if (demoTime >= 11.2 && demoTime < 11.5) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 43.5;
    isClicking = true;
  } else if (demoTime >= 11.5 && demoTime < 12.0) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 43.5;
  } else if (demoTime >= 12.0 && demoTime < 13.0) {
    cursorOpacity = 1;
    const t = (demoTime - 12.0) / 1.0;
    cursorX = 94.5;
    cursorY = 43.5 + t * (6.5 - 43.5);
  } else if (demoTime >= 13.0 && demoTime < 13.3) {
    cursorOpacity = 1;
    cursorX = 94.5;
    cursorY = 6.5;
    isClicking = true;
  } else if (demoTime >= 13.3 && demoTime < 14.0) {
    cursorOpacity = 1;
    const t = (demoTime - 13.3) / 0.7;
    cursorX = 94.5 + t * (3.5 - 94.5);
    cursorY = 6.5 + t * (96.5 - 6.5);
  } else if (demoTime >= 14.0 && demoTime < 14.3) {
    cursorOpacity = 1;
    cursorX = 3.5;
    cursorY = 96.5;
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

  const videoMuted = !userUnmuted || (
    currentStep === 3 && (
      (videoTime >= 1.0 && videoTime <= 2.0) || 
      (videoTime >= 3.3 && videoTime <= 4.3) || 
      (videoTime >= 4.8 && videoTime <= 5.6)
    )
  );

  return (
    <div id="top" className="relative bg-black text-gray-100 selection:bg-cyan-500 selection:text-black font-sans">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="#" className="flex items-center group">
            <img 
              src="/boo-tube-icon.svg" 
              alt="BooTube Logo" 
              className="h-8 w-auto transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Why BooTube</Link>
            <Link href="#walkthrough" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">How it works</Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="#faq" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">FAQ</Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold hover:text-white transition-colors px-4 py-2 text-gray-300">Log in</Link>
            <Link 
              href="/signup" 
              className="text-sm font-bold bg-white text-black hover:bg-gray-200 transition-all px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]"
            >
              Sign up
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 text-gray-400 hover:text-white focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg className="h-6 w-6 fill-none stroke-current" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/5 bg-[#050505] px-6 py-6 flex flex-col gap-4 animate-in slide-in-from-top-5 duration-200">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">Why BooTube</Link>
            <Link href="#walkthrough" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">How it works</Link>
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">Pricing</Link>
            <Link href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">FAQ</Link>
            <hr className="border-white/5 my-2" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-300">Log in</Link>
            <Link 
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 bg-white text-black font-bold rounded-full"
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>

      {/* Walkthrough Scrollytelling Container */}
      <div id="walkthrough" ref={containerRef} className="relative h-[400vh] w-full">
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
          className="absolute inset-0 z-20 flex flex-col items-center justify-between text-center px-6 pt-24 pb-8 pointer-events-none"
          style={{ opacity: heroOpacity }}
        >
          {/* Centered Hero Content */}
          <div className="flex-grow flex flex-col items-center justify-center pointer-events-none">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-6 max-w-3xl leading-none">
              Keep your streams clean.
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed mb-10">
              BooTube automatically ghosts profanity and blasphemy in real-time. Muting the language, never the video.
            </p>
            <a 
              href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-extrabold rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm pointer-events-auto transition-all cursor-pointer hover:scale-105"
            >
              Get BooTube — It&apos;s Free
            </a>
          </div>

          {/* Platform compatibility bar (acting like a footer) */}
          <div className="w-full max-w-4xl mx-auto mb-4 pointer-events-auto flex flex-col items-center gap-4">
            <p className="text-center text-[10px] sm:text-[11px] font-extrabold tracking-wider text-cyan-400/80">
              Works seamlessly with
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12 select-none">
              <span className="text-gray-400 hover:text-[#FF0000] font-bold tracking-tight text-lg md:text-xl transition-colors cursor-default">
                YouTube
              </span>
              <span className="text-gray-400 hover:text-[#00d4ff] font-black tracking-tighter text-lg md:text-xl transition-colors cursor-default">
                DISNEY+
              </span>
              <span className="text-gray-400 hover:text-[#1CE783] font-bold tracking-tight text-lg md:text-xl transition-colors cursor-default italic">
                hulu
              </span>
              <span className="text-gray-400 hover:text-[#E5A93B] font-black tracking-normal text-lg md:text-xl transition-colors cursor-default">
                PLEX
              </span>
              <span className="text-gray-400 hover:text-[#F15A24] font-extrabold tracking-wide text-lg md:text-xl transition-colors cursor-default">
                Fandango
              </span>
              <span className="text-gray-400 hover:text-[#E50914] font-bold tracking-tight text-lg md:text-xl transition-colors cursor-default">
                Netflix
              </span>
              <div className="flex items-center gap-1 opacity-55">
                <span className="text-gray-500 font-semibold text-sm line-through tracking-normal cursor-default">
                  Prime Video
                </span>
                <span className="text-[7px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/5">
                  Soon
                </span>
              </div>
            </div>
            
            <div className="text-xs text-gray-400 mt-6 animate-pulse select-none pointer-events-none">
              ↓ Scroll down to zoom in
            </div>
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
                      youtube.com/watch?v=spaghettiwestern
                    </div>

                    <div className="flex gap-3 items-center justify-end w-24 relative">
                      
                      <img 
                        src="/boo-icon-glyph.svg" 
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
                          if (isWalkthroughActive && isDemoPlaying && currentStep === 1) {
                            e.currentTarget.play().catch(() => {});
                          }
                        }}
                        onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
                        onClick={toggleDemo}
                        className={`w-full h-full object-cover transition-opacity duration-300 cursor-pointer ${
                          isWalkthroughActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      />

                      {!userUnmuted && isWalkthroughActive && (
                        <button
                          onClick={() => setUserUnmuted(true)}
                          className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-[#0c0d12]/90 hover:bg-[#181920]/95 text-white border border-cyan-500/30 hover:border-cyan-400/50 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 shadow-[0_4px_15px_rgba(6,182,212,0.15)] hover:scale-105 cursor-pointer select-none"
                        >
                          <span className="animate-pulse">🔊</span> Click for sound
                        </button>
                      )}

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
                          <span className="cursor-pointer hover:text-cyan-400 transition-colors select-none mr-0.5" onClick={toggleDemo}>
                            {isDemoPlaying ? '⏸' : '▶️'}
                          </span>
                          <span className="cursor-pointer hover:text-cyan-400 transition-colors select-none" onClick={() => setUserUnmuted(prev => !prev)}>
                            {videoMuted ? '🔇' : '🔊'}
                          </span>
                          <span className="w-20 h-1 bg-gray-600 rounded relative cursor-pointer" onClick={() => setUserUnmuted(prev => !prev)}>
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
                            <img src="/boo-icon-glyph.svg" alt="Logo" className="h-4.5 w-auto" />
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

            <div className="w-[30vw] max-w-[420px] flex flex-col h-[400px] justify-between relative select-none">
              
              <div className="relative flex-grow h-[320px]">
                
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
                    Click the BooTube icon
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-medium">
                    When you are watching your streaming shows on YouTube and you want to filter out the bad words, here is how you do it. Simply locate and click the BooTube ghost icon directly in your Chrome browser toolbar to open the active settings console.
                  </p>
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
                    Turn on censoring and hide captions
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-medium">
                    Toggle censoring to ON (Spaghetti Western) and toggle hide captions to ON. These settings apply immediately to clean the stream.
                  </p>
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
                    Censored playback
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-medium">
                    The video automatically rewinds and plays again. The audio is seamlessly muted at the exact moments of profanity, and the captions are completely hidden.
                  </p>
                </div>

              </div>

              {/* Persistent Secondary Play Button */}
              <div className="z-30 mt-4 pointer-events-auto">
                <button
                  onClick={toggleDemo}
                  className="flex items-center gap-2 bg-[#0c0d12]/60 hover:bg-[#181920]/80 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-400 font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105 cursor-pointer outline-none select-none border-none"
                >
                  {isDemoPlaying ? (
                    <>
                      <span>⏸</span> Pause demo
                    </>
                  ) : (
                    <>
                      <span>▶️</span> Play demo
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
      </div>

      {/* Standalone Landing Page Sections */}
      <div className="relative bg-black z-30 w-full border-t border-white/5 select-text">
        
        {/* Section 2: Why BooTube is Different */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Censoring done right
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Unlike heavy traditional filtering platforms, BooTube is designed for the modern streaming era.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-cyan-500/10 transition-all group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                🎙️
              </div>
              <h3 className="text-lg font-bold text-white mb-3">
                Built for the modern internet (YouTube)
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Traditional filters only work on Hollywood movies. BooTube cleans up the endless hours of YouTube-hosted podcasts, educational videos, and creators your family actually watches daily.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-red-500/10 transition-all group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-red-950/20 border border-red-500/20 text-red-400 mb-6 group-hover:scale-110 transition-transform">
                ✂️
              </div>
              <h3 className="text-lg font-bold text-white mb-3">
                Zero interrupted playback
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                We don&apos;t violently cut entire scenes or pause your video. We quietly mute the specific audio track in real-time for fractions of a second while the video plays seamlessly.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-cyan-500/10 transition-all group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                ⚖️
              </div>
              <h3 className="text-lg font-bold text-white mb-3">
                Unmatched platform access
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Because we operate via client-side scripts, we can filter services other platforms are legally blocked from—including Disney+, Hulu, and your personal Plex server files.
              </p>
            </div>

          </div>
        </section>

        {/* Section: What Devices are Compatible */}
        <section id="compatibility" className="py-24 px-6 border-t border-white/5 bg-white/[0.005]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
              What devices are compatible?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-12 text-sm sm:text-base leading-relaxed">
              Filter your content wherever you watch. BooTube is available as a Chrome extension for desktop browsers, and an Android app for mobile streaming.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <a 
                href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold rounded-full transition-all hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.05)] pointer-events-auto"
              >
                <img src="/boo-icon-glyph.svg" alt="Chrome Logo" className="h-5 w-auto" />
                <span>Chrome extension</span>
              </a>
              <a 
                href="https://play.google.com/apps/testing/com.bootube.app" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-400 font-extrabold rounded-full transition-all hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.1)] pointer-events-auto"
              >
                <span>🤖</span>
                <span>Android app</span>
              </a>
            </div>
          </div>
        </section>

        {/* Section 3: Simple Pricing Tiers */}
        <section id="pricing" className="py-24 px-6 border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Simple, honest pricing
              </h2>
              <p className="text-gray-400 text-sm sm:text-base">
                Get started with essential filtering for free, or unlock advanced features with a premium plan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
              
              {/* Free Plan */}
              <div className="flex flex-col p-8 rounded-2xl border border-white/5 bg-black/40 relative">
                <h3 className="text-xl font-bold text-white mb-2">Free plan</h3>
                <p className="text-sm text-gray-400 mb-6">Essential blasphemy censoring for everyone.</p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-white">$0</span>
                  <span className="text-xs text-gray-500 font-medium">/ forever</span>
                </div>

                <hr className="border-white/5 mb-8" />

                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> 100% free blasphemy filtering
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> Mutes YouTube & Podcasts
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> Mutes Disney+, Hulu, Plex & Vudu
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> Offline real-time processing
                  </li>
                </ul>

                <a 
                  href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all pointer-events-auto"
                >
                  Add to browser
                </a>
              </div>

              {/* Premium Plan */}
              <div className="flex flex-col p-8 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                  Most popular
                </div>

                <h3 className="text-xl font-bold text-white mb-2">Premium plan</h3>
                <p className="text-sm text-gray-400 mb-6">Full customization and syncing across devices.</p>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-white">$3.99</span>
                  <span className="text-xs text-cyan-400 font-medium">/ month</span>
                </div>

                <hr className="border-cyan-500/10 mb-8" />

                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> <strong>Everything in Free</strong>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> Full profanity & vulgarity filtering
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> Custom word & phrase blocklists
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> Smart screen blurring during alerts
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> Video buffer timer controls
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> <strong>Unified account cloud sync</strong>
                  </li>
                </ul>

                <a 
                  href="/signup" 
                  className="w-full text-center py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] pointer-events-auto"
                >
                  Upgrade to premium
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* Section 4: FAQ Accordion */}
        <section id="faq" className="py-24 px-6 max-w-4xl mx-auto border-t border-white/5">
          <h2 className="text-3xl font-extrabold text-white text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={index} className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden transition-all">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between text-base font-bold text-white hover:bg-white/[0.02] pointer-events-auto border-none outline-none bg-transparent cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="text-gray-500 font-normal">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4 bg-[#050505]/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-16 px-6 bg-[#040406]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img src="/boo-tube-icon.svg" alt="BooTube Logo" className="h-7 w-auto" />
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-xs text-gray-500 pointer-events-auto">
              <Link href="/privacy" className="hover:text-gray-300">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-300">Terms of Use</Link>
              <Link href="/support" className="hover:text-gray-300">Support Desk</Link>
              <a href="https://chromewebstore.google.com/detail/BooTube/bfocenkbkchffgnogonjhmlfpgnhbloa" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Chrome Store</a>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-10 pt-10 border-t border-white/5 text-center text-[10px] text-gray-400 leading-relaxed">
            <p className="mb-4">
              &copy; 2026 BooTube. Built for a cleaner internet.
            </p>
            <p className="max-w-4xl mx-auto italic">
              Disclaimer: BooTube is an independent browser extension and mobile application. It is not affiliated with, sponsored by, or endorsed by Google LLC (YouTube), Disney Enterprises, Inc. (Disney+), Hulu LLC, Plex, Inc., Fandango Media, LLC, Netflix, Inc., Amazon.com, Inc., or any other third-party streaming service mentioned. All trademarks and registered trademarks are the property of their respective owners.
            </p>
          </div>
        </footer>

      </div>

    </div>
  );
}
