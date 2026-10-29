(function() {
  let topHost = '';
  try {
    if (window.top && window.top.location) {
      topHost = window.top.location.hostname || '';
    }
  } catch(e) {}
  
  const isNetflix = window.location.hostname.includes('netflix.com') || topHost.includes('netflix.com');
  const isPrimeVideo = window.location.hostname.includes('amazon.') || window.location.hostname.includes('primevideo.com') || topHost.includes('amazon.') || topHost.includes('primevideo.com');
  const isDisney = window.location.hostname.includes('disneyplus.com') || topHost.includes('disneyplus.com');
  const isHulu = window.location.hostname.includes('hulu.com') || topHost.includes('hulu.com');
  const isFacebook = window.location.hostname.includes('facebook.com') || window.location.hostname.includes('fb.watch') || window.location.hostname.includes('fbcdn.net') || window.location.hostname.includes('messenger.com') || topHost.includes('facebook.com') || topHost.includes('fbcdn.net') || topHost.includes('messenger.com');
  const isMax = window.location.hostname.includes('max.com') || window.location.hostname.includes('hbomax.com') || topHost.includes('max.com') || topHost.includes('hbomax.com');
  const isParamount = window.location.hostname.includes('paramountplus.com') || window.location.hostname.includes('cbs.com') || window.location.hostname.includes('cbsaavideo.com') || window.location.hostname.includes('cbsinteractive.com') || window.location.hostname.includes('theplatform.com') || topHost.includes('paramountplus.com') || topHost.includes('cbs.com') || topHost.includes('cbsaavideo.com') || topHost.includes('cbsinteractive.com') || topHost.includes('theplatform.com');
  const isPeacock = window.location.hostname.includes('peacocktv.com') || window.location.hostname.includes('peacock.com') || topHost.includes('peacocktv.com') || topHost.includes('peacock.com');
  const isPlex = window.location.hostname.includes('plex.tv') || window.location.hostname.includes('plex.direct') || window.location.port === '32400' || topHost.includes('plex.tv') || topHost.includes('plex.direct');
  const isFandango = window.location.hostname.includes('fandango.com') || window.location.hostname.includes('vudu.com') || topHost.includes('fandango.com') || topHost.includes('vudu.com');
  const isTwitter = window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com') || topHost.includes('twitter.com') || topHost.includes('x.com');
  const isYouTube = window.location.hostname.includes('youtube.com') || topHost.includes('youtube.com');
  const isLockedVolumePlayer = isNetflix || isFacebook || isDisney || isHulu || isMax || isParamount || isPeacock || isFandango;

  if (isPrimeVideo || isMax) {
     console.log("🦊 [Censor] Bypassing network interceptor overrides on " + (isPrimeVideo ? "Amazon Prime Video" : "HBO Max") + " to avoid stream timecode desync.");
     return;
  }

  console.log("🤬 [Censor] Network Interceptor injected into MAIN world on:", window.location.hostname);

  const originalFetch = window.fetch;

  function broadcastMessage(msg) {
    try {
      if (window.top && window.top !== window) {
        window.top.postMessage(msg, '*');
      }
    } catch (e) {}
    window.postMessage(msg, '*');
  }

  function notifySpanNavigation() {
    try {
      broadcastMessage({ type: 'BOOTUBE_SPA_NAVIGATED', url: window.location.href });
    } catch(e) {}
  }
  
  try {
    const origPushState = history.pushState;
    history.pushState = function(...args) {
      const res = origPushState.apply(this, args);
      notifySpanNavigation();
      return res;
    };
    
    const origReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      const res = origReplaceState.apply(this, args);
      notifySpanNavigation();
      return res;
    };
    
    window.addEventListener('popstate', notifySpanNavigation);
  } catch(e) {}

  let mainWorldMuted = false;
  const activeGainNodes = new Set();
  const activeAudioContexts = new Set();
  const allMainWorldMedia = new Set();

  try {
    const origAudio = window.Audio;
    if (origAudio) {
      function WrappedAudio(...args) {
        const a = new origAudio(...args);
        allMainWorldMedia.add(a);
        if (mainWorldMuted) {
          try { a.muted = true; a.volume = 0; } catch(e) {}
        }
        return a;
      }
      WrappedAudio.prototype = origAudio.prototype;
      window.Audio = WrappedAudio;
    }
    
    const origCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function(tagName, ...args) {
      const el = origCreateElement.call(this, tagName, ...args);
      if (el && typeof tagName === 'string' && (tagName.toLowerCase() === 'audio' || tagName.toLowerCase() === 'video')) {
        allMainWorldMedia.add(el);
        if (mainWorldMuted) {
          try { el.muted = true; el.volume = 0; } catch(e) {}
        }
      }
      return el;
    };
  } catch(e) {}

  try {
    const origAudioCtx = window.AudioContext || window.webkitAudioContext;
    if (origAudioCtx) {
       function TrackedAudioContext(...args) {
           const ctx = new origAudioCtx(...args);
           activeAudioContexts.add(ctx);
           return ctx;
        }
       TrackedAudioContext.prototype = origAudioCtx.prototype;
       window.AudioContext = TrackedAudioContext;
       window.webkitAudioContext = TrackedAudioContext;
    }
  } catch(e) {}

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx && AudioCtx.prototype && AudioCtx.prototype.createGain) {
      const origCreateGain = AudioCtx.prototype.createGain;
      AudioCtx.prototype.createGain = function(...args) {
        const g = origCreateGain.apply(this, args);
        if (g) activeGainNodes.add(g);
        if (mainWorldMuted && g && g.gain) {
          try { g.gain.value = 0; } catch(e) {}
        }
        return g;
      };
    }
    if (window.AudioNode && window.AudioNode.prototype && window.AudioNode.prototype.connect) {
      const origConnect = window.AudioNode.prototype.connect;
      window.AudioNode.prototype.connect = function(...args) {
        if (this && this.gain) {
          activeGainNodes.add(this);
          if (mainWorldMuted) {
            try { this.gain.value = 0; } catch(e) {}
          }
        }
        return origConnect.apply(this, args);
      };
    }
  } catch(e) {}

  try {
    const realVolumeDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
    const realMutedDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
    if (realVolumeDesc && realVolumeDesc.set) {
       Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
          get: function() {
             if (mainWorldMuted) {
                return (this._btVol !== undefined && this._btVol > 0) ? this._btVol : 1.0;
             }
             return realVolumeDesc.get.call(this);
          },
          set: function(val) {
             if (!mainWorldMuted && val > 0) this._btVol = val;
             realVolumeDesc.set.call(this, mainWorldMuted ? 0 : val);
          },
          configurable: true,
          enumerable: true
       });
    }
    if (realMutedDesc && realMutedDesc.set) {
       Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
          get: function() {
             if (mainWorldMuted) {
                return true;
             }
             return realMutedDesc.get.call(this);
          },
          set: function(val) {
             if (!mainWorldMuted) this._btMuted = val;
             realMutedDesc.set.call(this, mainWorldMuted ? true : val);
          },
          configurable: true,
          enumerable: true
       });
    }
  } catch(e) {}

  function applyMainWorldMute(isMuted) {
    mainWorldMuted = !!isMuted;
    try {
      const domMedia = Array.from(document.querySelectorAll('audio, video'));
      const mediaList = new Set([...allMainWorldMedia, ...domMedia]);
      const realVolDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
      const realMuteDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
      
      mediaList.forEach(m => {
        if (!m) return;
        if (isMuted) {
          if (realMuteDesc && realMuteDesc.set) realMuteDesc.set.call(m, true);
          if (realVolDesc && realVolDesc.set) realVolDesc.set.call(m, 0);
          try { m.muted = true; } catch(e) {}
          try { m.volume = 0; } catch(e) {}
        } else {
          const restoreVol = (m._btVol !== undefined && m._btVol > 0) ? m._btVol : 1;
          const restoreMute = m._btMuted !== undefined ? m._btMuted : false;
          if (realMuteDesc && realMuteDesc.set) realMuteDesc.set.call(m, restoreMute);
          if (realVolDesc && realVolDesc.set) realVolDesc.set.call(m, restoreVol);
          try { m.muted = restoreMute; } catch(e) {}
          try { m.volume = restoreVol; } catch(e) {}
        }
      });
    } catch(e) {}

    activeGainNodes.forEach(g => {
      try {
        if (g && g.gain) {
          const now = (g.context && g.context.currentTime) ? g.context.currentTime : 0;
          try { g.gain.cancelScheduledValues(now); } catch(e) {}
          try { g.gain.setValueAtTime(isMuted ? 0 : 1, now); } catch(e) {}
          g.gain.value = isMuted ? 0 : 1;
        }
      } catch(e) {}
    });


  }

  // MAIN WORLD Zero-Flash Subtitle Mask & Shadow DOM Auto-Injector
  let mainWorldHideCC = false;

  if (isFandango) {
    try {
      const origAppendChild = Element.prototype.appendChild;
      Element.prototype.appendChild = function(child) {
        if (mainWorldHideCC && child && this) {
          try {
            const parentCls = (typeof this.className === 'string' ? this.className : '').toLowerCase();
            const parentId = (typeof this.id === 'string' ? this.id : '').toLowerCase();
            const isShakaTextContainer = parentCls.includes('shaka-text') || parentCls.includes('vudu-subtitle') || parentCls.includes('vudu-cue') || parentId.includes('shaka-text');
            if (isShakaTextContainer) {
              const isUI = child.querySelector && child.querySelector('button, svg, video, input, .shaka-play-button, .shaka-seek-bar, .shaka-bottom-controls, [class*="control"], [class*="seek"]');
              if (!isUI && child && child.style) {
                child.style.setProperty('transform', 'translate(-9999px, -9999px)', 'important');
                child.style.setProperty('position', 'absolute', 'important');
                child.style.setProperty('left', '-9999px', 'important');
                child.style.setProperty('top', '-9999px', 'important');
                child.style.setProperty('margin-left', '-9999px', 'important');
                child.style.setProperty('margin-top', '-9999px', 'important');
                child.style.setProperty('pointer-events', 'none', 'important');
                child.style.setProperty('display', 'none', 'important');
                child.style.setProperty('opacity', '0', 'important');
                child.style.setProperty('visibility', 'hidden', 'important');
                child.style.setProperty('font-size', '0px', 'important');
              }
            }
          } catch(e) {}
        }
        return origAppendChild.apply(this, arguments);
      };
    } catch(e) {}
  }

  function applyMainWorldHideCCStyle(shouldHide) {
    mainWorldHideCC = shouldHide;
    const fandangoCss = (shouldHide && isFandango) ? `
      /* Architect Solution: Auto-Hiding Overlay Mask Controller for Fandango */
      body.bootube-fandango-idle [class*="shaka-controls-overlay"],
      body.bootube-fandango-idle .shaka-controls-container,
      body.bootube-fandango-idle .shaka-bottom-controls,
      body.bootube-fandango-idle .shaka-play-button,
      body.bootube-fandango-idle [class*="shaka-text"],
      body.bootube-fandango-idle [class*="vudu-subtitle"],
      body.bootube-fandango-idle [class*="playback__subtitles"] {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.4s ease-in-out !important;
      }

      body.bootube-fandango-active [class*="shaka-controls-overlay"],
      body.bootube-fandango-active .shaka-controls-container,
      body.bootube-fandango-active .shaka-bottom-controls,
      body.bootube-fandango-active .shaka-play-button,
      body.bootube-fandango-active .shaka-seek-bar-container,
      body.bootube-fandango-active .shaka-volume-bar-container {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        transition: opacity 0.15s ease-out !important;
      }
    ` : '';

    const paramountCss = (shouldHide && isParamount) ? `
      /* Architect Solution: Auto-Hiding Overlay Mask Controller for Paramount+ */
      body.bootube-paramount-idle [class*="avia-caption"],
      body.bootube-paramount-idle [class*="avia-subtitle"],
      body.bootube-paramount-idle [class*="avia-controls"],
      body.bootube-paramount-idle [class*="player-overlay"],
      body.bootube-paramount-idle [class*="vjs-text-track"],
      body.bootube-paramount-idle [class*="subtitle"],
      body.bootube-paramount-idle [class*="caption"] {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.4s ease-in-out !important;
      }

      body.bootube-paramount-active [class*="avia-controls"],
      body.bootube-paramount-active [class*="player-overlay"],
      body.bootube-paramount-active [class*="control-bar"],
      body.bootube-paramount-active [class*="seek-bar"],
      body.bootube-paramount-active [class*="play-button"] {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        transition: opacity 0.15s ease-out !important;
      }
    ` : '';

    let activeCustomCss = '';
    if (shouldHide) {
      if (isFandango) {
        activeCustomCss = fandangoCss;
      } else if (isParamount) {
        activeCustomCss = paramountCss;
      } else {
        activeCustomCss = `
      .shaka-text-container, .shaka-text-container *, .shaka-text-wrapper, .shaka-text-wrapper *, .shaka-text-region, .shaka-text-region *, [class*="shaka-text"], [class*="shaka-text"] *, [class*="shaka-text"] span, [class*="shaka-text"] div, [class*="vudu-subtitle"], [class*="vudu-subtitle"] *, [class*="vudu-subtitle"] span, [class*="vudu-subtitle"] div, [class*="vudu-cue"], [class*="vudu-cue"] *, [class*="vudu-text"], [class*="vudu-text"] *, [class*="vudu-caption"], [class*="vudu-caption"] *, div[class*="subtitle"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="Subtitle"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="subtitles"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="Subtitles"]:not([class*="ytp-"]):not([class*="ytp-button"]), .player-timedtext, .player-timedtext *, [class*="player-timedtext"], [class*="player-timedtext"] *, [class*="timedtext"], [class*="timedtext"] *, [data-uia*="timed-text"], [data-uia*="timed-text"] *, .vjs-text-track-display, .vjs-text-track-display *, .vjs-text-track-cue, .vjs-text-track-cue *, .hive-subtitle-renderer-wrapper, .hive-subtitle-renderer-wrapper *, .hive-subtitle-renderer-cue-window, .hive-subtitle-renderer-cue-window *, .hive-subtitle-renderer-line, .hive-subtitle-renderer-line *, .hive-subtitle-renderer-cue, .hive-subtitle-renderer-cue *, [class*="hive-subtitle"], [class*="hive-subtitle"] *, [class*="cue-window"], [class*="cue-window"] *, [class*="cue-line"], [class*="cue-line"] *, [id*="hive-subtitle"], [id*="hive-subtitle"] * { display: none !important; color: transparent !important; background: transparent !important; background-color: transparent !important; text-shadow: none !important; font-size: 0px !important; line-height: 0px !important; max-height: 0px !important; max-width: 0px !important; min-height: 0px !important; min-width: 0px !important; height: 0px !important; width: 0px !important; opacity: 0 !important; visibility: hidden !important; border: none !important; box-shadow: none !important; outline: none !important; padding: 0px !important; margin: 0px !important; clip-path: inset(100%) !important; overflow: hidden !important; }
      .shaka-controls-overlay:not(.shaka-text-container), .shaka-controls-overlay *:not(.shaka-text-container):not(.shaka-text-container *):not(.shaka-text-wrapper):not(.shaka-text-wrapper *):not(.shaka-text-region):not(.shaka-text-region *):not([class*="shaka-text"]):not([class*="shaka-text"] *):not([class*="vudu-subtitle"]):not([class*="vudu-subtitle"] *):not([class*="vudu-cue"]):not([class*="vudu-cue"] *), .shaka-bottom-controls, .shaka-bottom-controls *, .shaka-seek-bar-container, .shaka-seek-bar-container *, .shaka-seek-bar, .shaka-seek-bar *, .shaka-play-button, .shaka-volume-bar-container, .shaka-volume-bar-container *, [class*="seek-bar"], [class*="scrubber"] { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
      .ytp-subtitles-button, .ytp-subtitles-button *, .ytp-subtitles-button-container, .ytp-subtitles-button-container *, button[class*="ytp-subtitles"], button[class*="ytp-subtitles"] *, div[class*="ytp-subtitles"], div[class*="ytp-subtitles"] * { opacity: 1 !important; visibility: visible !important; display: inline-block !important; color: inherit !important; font-size: inherit !important; line-height: inherit !important; max-height: none !important; max-width: none !important; pointer-events: auto !important; transform: none !important; clip-path: none !important; filter: none !important; }
      video::-webkit-media-text-track-container { opacity: 0 !important; visibility: hidden !important; display: none !important; }
      video::-webkit-media-text-track-display { opacity: 0 !important; visibility: hidden !important; display: none !important; }
      video::-webkit-media-text-track-region { opacity: 0 !important; visibility: hidden !important; display: none !important; }
      ::cue, video::cue { color: transparent !important; background-color: transparent !important; text-shadow: none !important; opacity: 0 !important; visibility: hidden !important; font-size: 0px !important; display: none !important; }
        `;
      }
    }

    const hideCss = activeCustomCss;

    // 1. Light DOM Style
    let style = document.getElementById ? document.getElementById('bootube-mainworld-hidecc') : null;
    if (!style) {
      try {
        style = document.createElement('style');
        if (style) {
          style.id = 'bootube-mainworld-hidecc';
          const target = document.head || document.documentElement || document;
          if (target) target.appendChild(style);
        }
      } catch(e) {}
    }
    if (style && style.textContent !== hideCss) {
      style.textContent = hideCss;
    }

    // 2. Inject style into existing shadow roots (skip on YouTube for performance)
    if (!isYouTube) {
      try {
        const queue = [document.documentElement || document.body];
        while (queue.length > 0) {
          const node = queue.shift();
          if (!node) continue;
          if (node.shadowRoot) {
            let sStyle = node.shadowRoot.getElementById ? node.shadowRoot.getElementById('bootube-mainworld-shadow-hidecc') : null;
            if (!sStyle) {
              try {
                sStyle = document.createElement('style');
                if (sStyle) {
                  sStyle.id = 'bootube-mainworld-shadow-hidecc';
                  node.shadowRoot.appendChild(sStyle);
                }
              } catch(e) {}
            }
            if (sStyle && sStyle.textContent !== hideCss) sStyle.textContent = hideCss;
          }
          if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
              queue.push(node.children[i]);
            }
          }
        }
      } catch(e) {}
    }
  }

  // Hook Shaka Player TextDisplayer in MAIN WORLD
  function hookShakaTextDisplayer() {
    try {
      if (window.shaka && window.shaka.text) {
        if (window.shaka.text.SimpleTextDisplayer && window.shaka.text.SimpleTextDisplayer.prototype && !window.shaka.text.SimpleTextDisplayer.prototype._btHooked) {
          const origAppend = window.shaka.text.SimpleTextDisplayer.prototype.append;
          window.shaka.text.SimpleTextDisplayer.prototype.append = function(cues) {
            if (mainWorldHideCC && !isFandango) return;
            return origAppend.call(this, cues);
          };
          window.shaka.text.SimpleTextDisplayer.prototype._btHooked = true;
        }
        if (window.shaka.text.UITextDisplayer && window.shaka.text.UITextDisplayer.prototype && !window.shaka.text.UITextDisplayer.prototype._btHooked) {
          const origUIAppend = window.shaka.text.UITextDisplayer.prototype.append;
          window.shaka.text.UITextDisplayer.prototype.append = function(cues) {
            if (mainWorldHideCC && !isFandango) return;
            return origUIAppend.call(this, cues);
          };
          window.shaka.text.UITextDisplayer.prototype._btHooked = true;
        }
      }
    } catch(e) {}
  }
  hookShakaTextDisplayer();
  setInterval(hookShakaTextDisplayer, 2000);

  // Hook Node.prototype.textContent setter in MAIN WORLD to intercept cue text updates on existing elements
  try {
    const origTextContentDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (origTextContentDesc && origTextContentDesc.set) {
      Object.defineProperty(Node.prototype, 'textContent', {
        get: function() {
          return origTextContentDesc.get.call(this);
        },
        set: function(val) {
          if (mainWorldHideCC && !isFandango && !isYouTube && !isNetflix && !isHulu && this && this.nodeType === 1) {
            try {
              const cls = (typeof this.className === 'string' ? this.className : '').toLowerCase();
              const id = (typeof this.id === 'string' ? this.id : '').toLowerCase();
              if (
                cls.includes('shaka-text') || cls.includes('vudu-subtitle') || cls.includes('vudu-cue') ||
                cls.includes('subtitle') || cls.includes('caption-cue') || cls.includes('text-container') ||
                cls.includes('text-wrapper') || cls.includes('text-region') || id.includes('shaka-text')
              ) {
                origTextContentDesc.set.call(this, '');
                this.style.setProperty('display', 'none', 'important');
                this.style.setProperty('visibility', 'hidden', 'important');
                this.style.setProperty('opacity', '0', 'important');
                return;
              }
            } catch(e) {}
          }
          origTextContentDesc.set.call(this, val);
        },
        configurable: true,
        enumerable: true
      });
    }
  } catch(e) {}

  // Synchronous TextTrack.prototype.mode lock in MAIN WORLD
  try {
    if (window.TextTrack && window.TextTrack.prototype) {
      const realModeDesc = Object.getOwnPropertyDescriptor(TextTrack.prototype, 'mode');
      if (realModeDesc && realModeDesc.set && realModeDesc.get) {
        Object.defineProperty(TextTrack.prototype, 'mode', {
          get: function() {
            const actual = realModeDesc.get.call(this);
            if (mainWorldHideCC && !isFandango && !isParamount && !isYouTube && !isNetflix && actual === 'hidden') {
              return 'showing';
            }
            return actual;
          },
          set: function(val) {
            if (mainWorldHideCC && !isFandango && !isParamount && !isYouTube && !isNetflix) {
              if (val === 'showing' || val === 'hidden') {
                this._btRequestedMode = val;
                return realModeDesc.set.call(this, 'hidden');
              }
            }
            return realModeDesc.set.call(this, val);
          },
          configurable: true,
          enumerable: true
        });
      }

      if (window.TextTrack.prototype.addCue) {
        const origAddCue = window.TextTrack.prototype.addCue;
        window.TextTrack.prototype.addCue = function(cue) {
          if (mainWorldHideCC && !isFandango && !isParamount && !isYouTube && !isNetflix) {
            try {
              realModeDesc.set.call(this, 'hidden');
            } catch(e) {}
          }
          return origAddCue.call(this, cue);
        };
      }
    }
  } catch(e) {}

  // Auto-inject CSS into Shadow Roots when created in MAIN WORLD
  try {
    const origAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(init) {
      const shadowRoot = origAttachShadow.call(this, init);
      if (shadowRoot && mainWorldHideCC && !isYouTube) {
        try {
          const fandangoCss = isFandango ? `
            /* Architect Solution: Auto-Hiding Overlay Mask Controller for Fandango */
            body.bootube-fandango-idle [class*="shaka-controls-overlay"],
            body.bootube-fandango-idle .shaka-controls-container,
            body.bootube-fandango-idle .shaka-bottom-controls,
            body.bootube-fandango-idle .shaka-play-button,
            body.bootube-fandango-idle [class*="shaka-text"],
            body.bootube-fandango-idle [class*="vudu-subtitle"],
            body.bootube-fandango-idle [class*="playback__subtitles"] {
              opacity: 0 !important;
              pointer-events: none !important;
              transition: opacity 0.4s ease-in-out !important;
            }

            body.bootube-fandango-active [class*="shaka-controls-overlay"],
            body.bootube-fandango-active .shaka-controls-container,
            body.bootube-fandango-active .shaka-bottom-controls,
            body.bootube-fandango-active .shaka-play-button,
            body.bootube-fandango-active .shaka-seek-bar-container,
            body.bootube-fandango-active .shaka-volume-bar-container {
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
              transition: opacity 0.15s ease-out !important;
            }
          ` : '';

          const paramountCss = isParamount ? `
            /* Architect Solution: Auto-Hiding Overlay Mask Controller for Paramount+ */
            body.bootube-paramount-idle [class*="avia-caption"],
            body.bootube-paramount-idle [class*="avia-subtitle"],
            body.bootube-paramount-idle [class*="avia-controls"],
            body.bootube-paramount-idle [class*="player-overlay"],
            body.bootube-paramount-idle [class*="vjs-text-track"],
            body.bootube-paramount-idle [class*="subtitle"],
            body.bootube-paramount-idle [class*="caption"] {
              opacity: 0 !important;
              pointer-events: none !important;
              transition: opacity 0.4s ease-in-out !important;
            }

            body.bootube-paramount-active [class*="avia-controls"],
            body.bootube-paramount-active [class*="player-overlay"],
            body.bootube-paramount-active [class*="control-bar"],
            body.bootube-paramount-active [class*="seek-bar"],
            body.bootube-paramount-active [class*="play-button"] {
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
              transition: opacity 0.15s ease-out !important;
            }
          ` : '';

          let activeShadowCss = '';
          if (isFandango) {
            activeShadowCss = fandangoCss;
          } else if (isParamount) {
            activeShadowCss = paramountCss;
          } else {
            activeShadowCss = `
            .shaka-text-container, .shaka-text-container *, .shaka-text-wrapper, .shaka-text-wrapper *, .shaka-text-region, .shaka-text-region *, [class*="shaka-text"], [class*="shaka-text"] *, [class*="shaka-text"] span, [class*="shaka-text"] div, [class*="vudu-subtitle"], [class*="vudu-subtitle"] *, [class*="vudu-subtitle"] span, [class*="vudu-subtitle"] div, [class*="vudu-cue"], [class*="vudu-cue"] *, [class*="vudu-text"], [class*="vudu-text"] *, [class*="vudu-caption"], [class*="vudu-caption"] *, div[class*="subtitle"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="Subtitle"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="subtitles"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="Subtitles"]:not([class*="ytp-"]):not([class*="ytp-button"]), .player-timedtext, .player-timedtext *, [class*="player-timedtext"], [class*="player-timedtext"] *, [class*="timedtext"], [class*="timedtext"] *, [data-uia*="timed-text"], [data-uia*="timed-text"] *, .vjs-text-track-display, .vjs-text-track-display *, .vjs-text-track-cue, .vjs-text-track-cue * { display: none !important; color: transparent !important; background: transparent !important; background-color: transparent !important; text-shadow: none !important; font-size: 0px !important; line-height: 0px !important; max-height: 0px !important; max-width: 0px !important; height: 0px !important; width: 0px !important; opacity: 0 !important; visibility: hidden !important; border: none !important; box-shadow: none !important; outline: none !important; clip-path: inset(100%) !important; overflow: hidden !important; }
            .shaka-controls-overlay:not(.shaka-text-container), .shaka-controls-overlay *:not(.shaka-text-container):not(.shaka-text-container *):not(.shaka-text-wrapper):not(.shaka-text-wrapper *):not(.shaka-text-region):not(.shaka-text-region *):not([class*="shaka-text"]):not([class*="shaka-text"] *):not([class*="vudu-subtitle"]):not([class*="vudu-subtitle"] *):not([class*="vudu-cue"]):not([class*="vudu-cue"] *), .shaka-bottom-controls, .shaka-bottom-controls *, .shaka-seek-bar-container, .shaka-seek-bar-container *, .shaka-seek-bar, .shaka-seek-bar *, .shaka-play-button, .shaka-volume-bar-container, .shaka-volume-bar-container *, [class*="seek-bar"], [class*="scrubber"] { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
            .ytp-subtitles-button, .ytp-subtitles-button *, .ytp-subtitles-button-container, .ytp-subtitles-button-container *, button[class*="ytp-subtitles"], button[class*="ytp-subtitles"] *, div[class*="ytp-subtitles"], div[class*="ytp-subtitles"] * { opacity: 1 !important; visibility: visible !important; display: inline-block !important; color: inherit !important; font-size: inherit !important; line-height: inherit !important; max-height: none !important; max-width: none !important; pointer-events: auto !important; transform: none !important; clip-path: none !important; filter: none !important; }
            video::-webkit-media-text-track-container { opacity: 0 !important; visibility: hidden !important; display: none !important; }
            video::-webkit-media-text-track-display { opacity: 0 !important; visibility: hidden !important; display: none !important; }
            video::-webkit-media-text-track-region { opacity: 0 !important; visibility: hidden !important; display: none !important; }
            ::cue, video::cue { color: transparent !important; background-color: transparent !important; text-shadow: none !important; opacity: 0 !important; visibility: hidden !important; font-size: 0px !important; display: none !important; }
            `;
          }
          const hideCss = activeShadowCss;
          let sStyle = (shadowRoot && shadowRoot.getElementById) ? shadowRoot.getElementById('bootube-mainworld-shadow-hidecc') : null;
          if (!sStyle && shadowRoot) {
            try {
              sStyle = document.createElement('style');
              if (sStyle) {
                sStyle.id = 'bootube-mainworld-shadow-hidecc';
                shadowRoot.appendChild(sStyle);
              }
            } catch(e) {}
          }
          if (sStyle) sStyle.textContent = hideCss;
        } catch(e) {}
      }
      return shadowRoot;
    };
  } catch(e) {}

  // Hook Shaka SimpleTextDisplayer & UiTextDisplayer prototype in MAIN WORLD
  function hookShakaTextDisplayer() {
    try {
      if (window.shaka && window.shaka.text) {
        ['SimpleTextDisplayer', 'UiTextDisplayer'].forEach(clsName => {
          if (window.shaka.text[clsName] && window.shaka.text[clsName].prototype) {
            const proto = window.shaka.text[clsName].prototype;
            if (!proto._bootubeHooked) {
              proto._bootubeHooked = true;
              const origAppend = proto.append;
              proto.append = function(cues) {
                if (mainWorldHideCC && isFandango) {
                  try {
                    const cont = this.container_ || this.textContainer_ || this.videoContainer_;
                    if (cont && cont.style) {
                      cont.style.setProperty('display', 'none', 'important');
                      cont.style.setProperty('opacity', '0', 'important');
                      cont.style.setProperty('transform', 'translate(-9999px, -9999px)', 'important');
                    }
                  } catch(e) {}
                }
                return origAppend.apply(this, arguments);
              };
            }
          }
        });
      }
    } catch(e) {}
  }
  setInterval(hookShakaTextDisplayer, 500);

  // Synchronous Node.prototype.appendChild & insertBefore in MAIN WORLD
  try {
    const origAppendChild = Node.prototype.appendChild;
    const origInsertBefore = Node.prototype.insertBefore;

    function isSubtitleNode(n, parent) {
      if (!n || n.nodeType !== 1) return false;
      let curr = n;
      let depth = 0;
      while (curr && depth < 5) {
        const c = (typeof curr.className === 'string' ? curr.className : '').toLowerCase();
        const i = (typeof curr.id === 'string' ? curr.id : '').toLowerCase();
        if (
          c.includes('shaka-text') || c.includes('vudu-subtitle') || c.includes('vudu-cue') ||
          c.includes('text-container') || c.includes('text-wrapper') || c.includes('text-region') ||
          c.includes('timedtext') || c.includes('avia-caption') || c.includes('avia-subtitle') || c.includes('hive-subtitle') ||
          c.includes('cue-window') || c.includes('cue-line') || c.includes('cue-box') ||
          i.includes('shaka-text') || i.includes('vudu-subtitle') || i.includes('vudu-cue') || i.includes('hive-subtitle') || i.includes('cue-window')
        ) {
          return true;
        }
        curr = curr.parentElement;
        depth++;
      }
      if (parent) {
        let pCurr = parent;
        let pDepth = 0;
        while (pCurr && pDepth < 5) {
          const c = (typeof pCurr.className === 'string' ? pCurr.className : '').toLowerCase();
          const i = (typeof pCurr.id === 'string' ? pCurr.id : '').toLowerCase();
          if (
            c.includes('shaka-text') || c.includes('vudu-subtitle') || c.includes('vudu-cue') ||
            c.includes('text-container') || c.includes('text-wrapper') || c.includes('text-region') ||
            c.includes('timedtext') || c.includes('avia-caption') || c.includes('avia-subtitle') || c.includes('hive-subtitle') ||
            c.includes('cue-window') || c.includes('cue-line') || c.includes('cue-box') ||
            i.includes('shaka-text') || i.includes('vudu-subtitle') || i.includes('vudu-cue') || i.includes('hive-subtitle') || i.includes('cue-window')
          ) {
            return true;
          }
          if (c.includes('shaka-controls-container') || c.includes('shaka-video-container')) {
            const nodeCls = (typeof n.className === 'string' ? n.className : '').toLowerCase();
            const nodeId = (typeof n.id === 'string' ? n.id : '').toLowerCase();
            const isControlUI = nodeCls.includes('controls-overlay') || nodeCls.includes('bottom-controls') || nodeCls.includes('seek-bar') || nodeCls.includes('scrubber') || nodeCls.includes('play-button') || nodeCls.includes('volume') || nodeId.includes('controls-overlay');
            if (!isControlUI) {
              return true;
            }
          }
          pCurr = pCurr.parentElement;
          pDepth++;
        }
      }
      return false;
    }

    function maskMainWorldNode(node, parent) {
      if (!node || node.nodeType !== 1) return;
      // Skip on Peacock, YouTube, and Hulu: uses network interception / native CC rules, not DOM masking.
      if (!mainWorldHideCC || isFandango || isPeacock || isYouTube || isHulu) return;

      try {
        if (isSubtitleNode(node, parent)) {
          node.setAttribute('data-bootube-hidden', 'true');
          node.style.setProperty('display', 'none', 'important');
          node.style.setProperty('opacity', '0', 'important');
          node.style.setProperty('visibility', 'hidden', 'important');
          node.style.setProperty('font-size', '0px', 'important');
          node.style.setProperty('line-height', '0px', 'important');
          node.style.setProperty('color', 'transparent', 'important');
          node.style.setProperty('background', 'transparent', 'important');
          node.style.setProperty('background-color', 'transparent', 'important');
          node.style.setProperty('box-shadow', 'none', 'important');
          node.style.setProperty('border', 'none', 'important');
          node.style.setProperty('outline', 'none', 'important');
          node.style.setProperty('padding', '0px', 'important');
          node.style.setProperty('margin', '0px', 'important');
          node.style.setProperty('min-width', '0px', 'important');
          node.style.setProperty('min-height', '0px', 'important');
          node.style.setProperty('max-width', '0px', 'important');
          node.style.setProperty('max-height', '0px', 'important');
          node.style.setProperty('width', '0px', 'important');
          node.style.setProperty('height', '0px', 'important');
          node.style.setProperty('text-shadow', 'none', 'important');
          node.style.setProperty('transform', 'translate(-9999px, -9999px) scale(0)', 'important');
          node.style.setProperty('clip-path', 'inset(100%)', 'important');
          node.style.setProperty('pointer-events', 'none', 'important');
          return;
        }
      } catch(e) {}
    }

    Node.prototype.appendChild = function(child) {
      // On Peacock TV, YouTube, and Hulu, skip DOM element append masking entirely to eliminate loading delay and prevent UI menu interference.
      if (!isPeacock && !isYouTube && !isHulu) {
        try {
          maskMainWorldNode(child, this);
        } catch(e) {}
      }
      return origAppendChild.call(this, child);
    };

    Node.prototype.insertBefore = function(newNode, referenceNode) {
      if (!isPeacock && !isYouTube && !isHulu) {
        try {
          maskMainWorldNode(newNode, this);
        } catch(e) {}
      }
      return origInsertBefore.call(this, newNode, referenceNode);
    };
  } catch(e) {}

  window.addEventListener('message', (e) => {
    if (e && e.data) {
      if (e.data.type === 'BOOTUBE_MUTE_STATE_CHANGED') {
        applyMainWorldMute(e.data.isMuted);
      } else if (e.data.type === 'BOOTUBE_SETTINGS_UPDATED') {
        if (typeof e.data.hideCC !== 'undefined') {
          applyMainWorldHideCCStyle(e.data.hideCC && e.data.extensionEnabled !== false);
        }
      }
    }
  });

  // Main world style is driven dynamically by BOOTUBE_SETTINGS_UPDATED message from content script

  setInterval(() => {
    if (window.location.hostname.includes('spotify.com')) {
      try {
        const domMedia = Array.from(document.querySelectorAll('audio, video'));
        const mediaList = new Set([...allMainWorldMedia, ...domMedia]);
        let active = null;
        mediaList.forEach(m => {
           if (m && !m.paused && m.currentTime > 0 && !m.ended) {
              if (!active || m.currentTime > active.currentTime) active = m;
           }
        });
        if (active) {
           broadcastMessage({ type: 'BOOTUBE_SPOTIFY_REAL_TIME', currentTime: active.currentTime });
        }
      } catch(e) {}
    }
  }, 50);

  function scanStorageForSpotifyToken() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const val = localStorage.getItem(key);
        if (val && typeof val === 'string') {
          if (val.startsWith('Bearer ')) {
             window._spotifyToken = val;
             broadcastMessage({ type: 'SPOTIFY_TOKEN_CAPTURED', token: val });
             return;
          }
          if (val.length > 50 && (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('session'))) {
             const token = val.includes('Bearer ') ? val : 'Bearer ' + val;
             window._spotifyToken = token;
             broadcastMessage({ type: 'SPOTIFY_TOKEN_CAPTURED', token: token });
             return;
          }
        }
      }
    } catch(e) {}
  }

  try {
    const origGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      const val = origGetItem.call(this, key);
      if (val && typeof val === 'string') {
        if (val.startsWith('Bearer ')) {
          window._spotifyToken = val;
          broadcastMessage({ type: 'SPOTIFY_TOKEN_CAPTURED', token: val });
        } else if (val.length > 50 && (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('session'))) {
          const token = val.includes('Bearer ') ? val : 'Bearer ' + val;
          window._spotifyToken = token;
          broadcastMessage({ type: 'SPOTIFY_TOKEN_CAPTURED', token: token });
        }
      }
      return val;
    };

    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, val) {
      if (val && typeof val === 'string') {
        if (val.startsWith('Bearer ')) {
          window._spotifyToken = val;
          broadcastMessage({ type: 'SPOTIFY_TOKEN_CAPTURED', token: val });
        } else if (val.length > 50 && (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('session'))) {
          const token = val.includes('Bearer ') ? val : 'Bearer ' + val;
          window._spotifyToken = token;
          broadcastMessage({ type: 'SPOTIFY_TOKEN_CAPTURED', token: token });
        }
      }
      return origSetItem.call(this, key, val);
    };
  } catch(e) {}

  if (window.location.hostname.includes('spotify.com')) {
    scanStorageForSpotifyToken();
    setInterval(scanStorageForSpotifyToken, 3000);
  }

  function convertSpotifyLyricsToBooTube(spotifyJson) {
    try {
      const data = typeof spotifyJson === 'string' ? JSON.parse(spotifyJson) : spotifyJson;
      if (!data || !data.lyrics || !Array.isArray(data.lyrics.lines)) return null;
      
      const lines = data.lyrics.lines;
      console.log("🟢 [Spotify Lyrics Raw] syncType: " + (data.lyrics ? data.lyrics.syncType : 'none') + " | lines count: " + lines.length);

      // If lyrics are UNSYNCED, no timing data exists on Spotify. Return null so dummy 0.00 zones are not created.
      if (data.lyrics.syncType === 'UNSYNCED') {
        console.log("ℹ️ [Spotify] Lyrics for this track are UNSYNCED (static text sheet). Timed mute zones cannot be created.");
        return null;
      }

      // Verify that at least one line has non-zero timing
      const hasTiming = lines.some(l => {
        const raw = l.startTimeMs !== undefined ? l.startTimeMs : l.time;
        const t = parseInt(raw);
        return !isNaN(t) && t > 0;
      });
      if (!hasTiming) {
        console.log("ℹ️ [Spotify] Lyrics lines have no valid non-zero timestamps. Timed mute zones cannot be created.");
        return null;
      }

      const events = lines.map((line, index) => {
        const rawTime = line.startTimeMs !== undefined ? line.startTimeMs : (line.time !== undefined ? line.time : (line.startTime !== undefined ? line.startTime : line.start));
        const startMs = parseInt(rawTime);
        const nextLine = lines[index + 1];
        const nextRawTime = nextLine ? (nextLine.startTimeMs !== undefined ? nextLine.startTimeMs : (nextLine.time !== undefined ? nextLine.time : (nextLine.startTime !== undefined ? nextLine.startTime : nextLine.start))) : null;
        const endMs = nextLine ? parseInt(nextRawTime) : startMs + 4000;
        const duration = endMs - startMs;
        const text = line.words || '';
        
        const words = text.split(/\s+/);
        const segs = [];
        let charCount = 0;
        const totalChars = text.length || 1;
        
        words.forEach((w, i) => {
          const offsetMs = Math.round((charCount / totalChars) * duration);
          segs.push({
            utf8: w + (i < words.length - 1 ? ' ' : ''),
            tOffsetMs: offsetMs
          });
          charCount += w.length + 1;
        });
        
        if (segs.length === 0) {
           segs.push({ utf8: text + ' ', tOffsetMs: 0 });
        }
        
        return {
          tStartMs: startMs,
          dDurationMs: duration,
          segs: segs
        };
      });
      
      return { events };
    } catch (e) {
      console.error("🤬 [Censor] Error converting Spotify lyrics:", e);
      return null;
    }
  }

  function parseWebVTT(text) {
    const events = [];
    const lines = text.split('\n');
    let currentEvent = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('-->')) {
        const parts = line.split('-->');
        const startStr = parts[0].trim();
        const endStr = parts[1].trim().split(' ')[0]; // safely trim first

        const parseTime = (timeStr) => {
          const cleanStr = timeStr.replace(',', '.');
          const p = cleanStr.split(':');
          if (p.length === 2) {
            return (parseFloat(p[0]) * 60 + parseFloat(p[1])) * 1000;
          } else if (p.length === 3) {
            return (parseFloat(p[0]) * 3600 + parseFloat(p[1]) * 60 + parseFloat(p[2])) * 1000;
          }
          return 0;
        };

        const startMs = parseTime(startStr);
        const endMs = parseTime(endStr);

        currentEvent = {
          tStartMs: Math.round(startMs),
          dDurationMs: Math.round(endMs - startMs),
          segs: []
        };
        events.push(currentEvent);
      } else if (currentEvent && line !== '' && !line.includes('STYLE') && !line.includes('::cue()') && !line.startsWith('WEBVTT')) {
        // Remove HTML tags like <i>
        const cleanText = line.replace(/<[^>]*>/g, '').trim();
        // Ignore image sprite / storyboard / thumbnail coordinates (e.g. image.jpg#xywh=0,0,160,90)
        if (cleanText && !cleanText.includes('#xywh=') && !cleanText.match(/\.(jpg|jpeg|png|webp)(\?|#|$)/i)) {
          currentEvent.segs.push({ utf8: cleanText + ' ' });
        }
      } else if (line === '') {
        currentEvent = null;
      }
    }
    return { events: events.filter(e => e.segs && e.segs.length > 0) };
  }
  
  function parseSRT(text) {
    const events = [];
    const blocks = text.split(/\r?\n\r?\n/);
    for (let block of blocks) {
      block = block.trim();
      if (!block) continue;
      const lines = block.split(/\r?\n/);
      if (lines.length >= 2) {
        let timingLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('-->')) {
             timingLineIndex = i;
             break;
          }
        }
        if (timingLineIndex === -1) continue;
        
        const line = lines[timingLineIndex].trim();
        const parts = line.split('-->');
        if (parts.length < 2) continue;
        const startStr = parts[0].trim();
        const endStr = parts[1].trim().split(' ')[0];
        
        const parseTime = (timeStr) => {
           const cleanStr = timeStr.replace(',', '.');
           const p = cleanStr.split(':');
           if (p.length === 2) {
              return (parseFloat(p[0]) * 60 + parseFloat(p[1])) * 1000;
           } else if (p.length === 3) {
              return (parseFloat(p[0]) * 3600 + parseFloat(p[1]) * 60 + parseFloat(p[2])) * 1000;
           }
           return 0;
        };
        
        const startMs = parseTime(startStr);
        const endMs = parseTime(endStr);
        
        const event = {
          tStartMs: Math.round(startMs),
          dDurationMs: Math.round(endMs - startMs),
          segs: []
        };
        
        let subText = "";
        for (let i = timingLineIndex + 1; i < lines.length; i++) {
           subText += lines[i].replace(/<[^>]*>/g, '').trim() + " ";
        }
        subText = subText.trim();
        if (subText) {
           event.segs.push({ utf8: subText + ' ' });
           events.push(event);
        }
      }
    }
    return { events };
  }
  
  function parseXMLSubtitles(text) {
    const events = [];
    try {
      const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        const str = String(timeStr).trim();
        if (str.endsWith('t')) {
          const rawVal = parseFloat(str.slice(0, -1));
          if (rawVal > 100000000) {
            return (rawVal / 10000000) * 1000;
          }
          return (rawVal / 10000) * 1000;
        }
        if (str.endsWith('ms')) {
          return parseFloat(str.slice(0, -2));
        }
        if (str.endsWith('s')) {
          return parseFloat(str.slice(0, -1)) * 1000;
        }
        if (str.endsWith('m')) {
          return parseFloat(str.slice(0, -1)) * 60000;
        }
        if (str.endsWith('h')) {
          return parseFloat(str.slice(0, -1)) * 3600000;
        }
        const parts = str.replace(',', '.').split(':');
        if (parts.length === 4) {
          const hours = parseFloat(parts[0]) * 3600;
          const mins = parseFloat(parts[1]) * 60;
          const secs = parseFloat(parts[2]);
          const frames = parseFloat(parts[3]) / 30;
          return (hours + mins + secs + frames) * 1000;
        } else if (parts.length === 3) {
          const hours = parseFloat(parts[0]) * 3600;
          const mins = parseFloat(parts[1]) * 60;
          const secs = parseFloat(parts[2]);
          return (hours + mins + secs) * 1000;
        } else if (parts.length === 2) {
          const mins = parseFloat(parts[0]) * 60;
          const secs = parseFloat(parts[1]);
          return (mins + secs) * 1000;
        }
        return (parseFloat(str) * 1000) || 0;
      };

      const getAttr = (elem, attrName) => {
        if (!elem) return null;
        try {
          if (elem.getAttribute) {
            const val = elem.getAttribute(attrName) || elem.getAttribute('tt:' + attrName) || elem.getAttribute('xml:' + attrName) || elem.getAttribute('t:' + attrName);
            if (val) return val;
          }
          if (elem.attributes) {
            for (let a = 0; a < elem.attributes.length; a++) {
              const name = elem.attributes[a].name.toLowerCase();
              if (name === attrName.toLowerCase() || name.endsWith(':' + attrName.toLowerCase())) {
                return elem.attributes[a].value;
              }
            }
          }
        } catch(e) {}
        return null;
      };

      const parser = new DOMParser();
      let doc = null;
      try {
        doc = parser.parseFromString(text, 'text/xml');
      } catch(e) {}
      if (!doc || doc.getElementsByTagName('parsererror').length > 0) {
        try {
          if (window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function') {
            try {
              const policy = window.trustedTypes.defaultPolicy || window.trustedTypes.createPolicy('bootube-parser', { createHTML: s => s });
              doc = parser.parseFromString(policy.createHTML(text), 'text/html');
            } catch(policyErr) {
              doc = null;
            }
          } else {
            doc = parser.parseFromString(text, 'text/html');
          }
        } catch(htmlErr) {
          doc = null;
        }
      }

      const allElems = (doc && doc.querySelectorAll) ? doc.querySelectorAll('*') : [];
      for (let i = 0; i < allElems.length; i++) {
        const el = allElems[i];
        const beginAttr = getAttr(el, 'begin');
        if (beginAttr) {
          const endAttr = getAttr(el, 'end');
          const durAttr = getAttr(el, 'dur');
          
          const startMs = parseTime(beginAttr);
          let endMs = endAttr ? parseTime(endAttr) : (durAttr ? startMs + parseTime(durAttr) : startMs + 3000);
          
          const subText = el.textContent.trim().replace(/\s+/g, ' ');
          if (subText) {
            events.push({
              tStartMs: Math.round(startMs),
              dDurationMs: Math.round(endMs - startMs),
              segs: [{ utf8: subText + ' ' }]
            });
          }
        }
      }

      // Universal Regex Fallback Scanner if DOM parsing found no begin-attributed elements
      if (events.length === 0) {
        const regex = /<([a-zA-Z0-9_:]+)\b[^>]*?\b(?:[a-zA-Z0-9_:]*:)?begin=["']([^"']+)["'][^>]*?>([\s\S]*?)<\/\1>/gi;
        let m;
        while ((m = regex.exec(text)) !== null) {
          const beginAttr = m[2];
          const fullMatch = m[0];
          const endM = fullMatch.match(/(?:[a-zA-Z0-9_:]*:)?end=["']([^"']+)["']/i);
          const durM = fullMatch.match(/(?:[a-zA-Z0-9_:]*:)?dur=["']([^"']+)["']/i);
          const endAttr = endM ? endM[1] : null;
          const durAttr = durM ? durM[1] : null;

          const rawContent = m[3].replace(/<[^>]*>?/gm, '').trim();
          if (rawContent) {
            const startMs = parseTime(beginAttr);
            const endMs = endAttr ? parseTime(endAttr) : (durAttr ? startMs + parseTime(durAttr) : startMs + 3000);
            events.push({
              tStartMs: Math.round(startMs),
              dDurationMs: Math.round(endMs - startMs),
              segs: [{ utf8: rawContent + ' ' }]
            });
          }
        }
      }
    } catch(e) {
      console.error("🤬 [Censor] XML Subtitle Parsing Error:", e);
    }
    return { events };
  }

  function parseJSONSubtitles(data) {
    const events = [];
    try {
      if (!data) return { events };
      if (Array.isArray(data.events) && data.events.length > 0) {
        return data;
      }
      const list = Array.isArray(data) ? data : (data.cues || data.paragraphs || data.items || data.timedtext || data.subtitles || data.events || []);
      if (Array.isArray(list) && list.length > 0) {
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!item) continue;

          let startMs = item.tStartMs !== undefined ? item.tStartMs : (item.start !== undefined ? parseFloat(item.start) * (item.start > 100000 ? 1 : 1000) : (item.startTime !== undefined ? parseFloat(item.startTime) * 1000 : 0));
          let endMs = item.dDurationMs !== undefined ? startMs + item.dDurationMs : (item.end !== undefined ? parseFloat(item.end) * (item.end > 100000 ? 1 : 1000) : (item.endTime !== undefined ? parseFloat(item.endTime) * 1000 : startMs + 3000));
          
          let textStr = '';
          if (typeof item.text === 'string') textStr = item.text;
          else if (Array.isArray(item.segs)) textStr = item.segs.map(s => s.utf8 || '').join('');
          else if (typeof item.content === 'string') textStr = item.content;
          else if (Array.isArray(item.lines)) textStr = item.lines.join(' ');

          textStr = textStr.trim().replace(/\s+/g, ' ');
          if (textStr) {
            events.push({
              tStartMs: Math.round(startMs),
              dDurationMs: Math.round(endMs - startMs),
              segs: [{ utf8: textStr + ' ' }]
            });
          }
        }
      }
    } catch(e) {}
    return { events };
  }

  function parseUniversalSubtitles(text) {
    if (!text || typeof text !== 'string') return { events: [] };
    const str = text.trim();

    // 1. WebVTT check
    if (str.toUpperCase().includes('WEBVTT') || (str.includes('-->') && !str.includes('<tt'))) {
      const vttRes = parseWebVTT(str);
      if (vttRes && vttRes.events && vttRes.events.length > 0) return vttRes;
    }

    // 2. JSON check
    if (str.startsWith('{') || str.startsWith('[')) {
      try {
        const json = JSON.parse(str);
        const jsonRes = parseJSONSubtitles(json);
        if (jsonRes && jsonRes.events && jsonRes.events.length > 0) return jsonRes;
        if (json && typeof json === 'object') {
          const rawContent = json.ttml || json.xml || json.vtt || json.text || json.content || json.subtitles;
          if (typeof rawContent === 'string') {
            const innerRes = parseUniversalSubtitles(rawContent);
            if (innerRes && innerRes.events && innerRes.events.length > 0) return innerRes;
          }
        }
      } catch(e) {}
    }

    // 3. XML / TTML check
    const xmlRes = parseXMLSubtitles(str);
    if (xmlRes && xmlRes.events && xmlRes.events.length > 0) return xmlRes;

    // 4. SRT check
    if (str.includes('-->')) {
      const srtRes = parseSRT(str);
      if (srtRes && srtRes.events && srtRes.events.length > 0) return srtRes;
    }

    return { events: [] };
  }
  
  function handleBackgroundTranslation(originalUrl) {
    try {
      const urlObj = new URL(originalUrl, window.location.origin);
      
      const lang = urlObj.searchParams.get('lang');
      const tlang = urlObj.searchParams.get('tlang');
      
      // If the captions are not natively English, and haven't already been translated to English
      if (lang !== 'en' && tlang !== 'en') {
        console.log("🤬 [Censor] Subtitles are not English. Background fetching English translation...");
        
        // Tell YouTube's server to automatically translate these captions to English
        urlObj.searchParams.set('tlang', 'en'); 
        
        originalFetch(urlObj.toString())
          .then(res => res.text())
          .then(text => {
            try {
              const data = JSON.parse(text);
              console.log("🤬 [Censor] Background translation to English fetched successfully!");
              broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: data, isTranslated: true });
            } catch(e) {}
          })
          .catch(err => console.error("🤬 [Censor] Failed to fetch background translation", err));
      }
    } catch(e) {
      console.error("🤬 [Censor] Error doing background translation:", e);
    }
  }

  function stripWebVTTText(vttText) {
    if (!vttText || typeof vttText !== 'string') return vttText;
    try {
      let text = vttText;
      text = text.replace(/::cue\s*\{[\s\S]*?\}/gi, '::cue { display: none !important; opacity: 0 !important; visibility: hidden !important; color: transparent !important; font-size: 0px !important; }');
      const lines = text.split(/\r?\n/);
      const result = [];
      let inCueText = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('-->')) {
          result.push(line);
          inCueText = true;
        } else if (inCueText) {
          if (line.trim() === '') {
            result.push(line);
            inCueText = false;
          } else {
            result.push('\u200B');
          }
        } else {
          result.push(line);
        }
      }
      return result.join('\n');
    } catch(e) {
      return vttText;
    }
  }

  function stripXMLSubtitles(xmlText) {
    if (!xmlText || typeof xmlText !== 'string') return xmlText;
    try {
      // Completely eliminate all <p ...>...</p> cue elements so caption renderers (like Hulu)
      // receive 0 cues and NEVER render empty background boxes or containers!
      let stripped = xmlText.replace(/<([a-zA-Z0-9_:]*p)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
                            .replace(/<[a-zA-Z0-9_:]*p\b[^>]*\/>/gi, '');
      // Also remove any elements with begin/end timing attributes (standard TTML cue blocks)
      stripped = stripped.replace(/<([a-zA-Z0-9_:]+)\b[^>]*?\b(?:[a-zA-Z0-9_:]*:)?begin=["'][^"']*["'][^>]*?>[\s\S]*?<\/\1>/gi, '')
                         .replace(/<([a-zA-Z0-9_:]+)\b[^>]*?\b(?:[a-zA-Z0-9_:]*:)?begin=["'][^"']*["'][^>]*?\/>/gi, '');
      return stripped;
    } catch(e) {
      return xmlText;
    }
  }

  window.fetch = function(...args) {
    let originalPromise;
    try {
      originalPromise = originalFetch.apply(this, args);
    } catch (e) {
      return Promise.reject(e);
    }

    return originalPromise.then(async (response) => {
      if (!response) return response;
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      
      if (url && url.toString().includes('spotify.com') && !url.toString().includes('connect-state') && !url.toString().includes('gabo-receiver')) {
        try {
          let token = null;
          const options = args[1];
          let headers = options && options.headers;
          if (headers && typeof headers === 'object' && !(headers instanceof Request)) {
            if (typeof headers.get === 'function') {
              token = headers.get('authorization') || headers.get('Authorization');
            } else {
              token = headers['Authorization'] || headers['authorization'];
            }
          }
          if (token && token.startsWith('Bearer ')) {
            window._spotifyToken = token;
            broadcastMessage({ type: 'SPOTIFY_TOKEN_CAPTURED', token: token });
          }
        } catch(e) {}
      }

      if (url && url.toString().includes('/color-lyrics/v2/track/')) {
        try {
          const clone = response.clone();
          clone.text().then(text => {
            const converted = convertSpotifyLyricsToBooTube(text);
            if (converted) {
              console.log("🟢 [Spotify] Intercepted and converted Spotify lyrics via fetch!");
              broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: converted, isTranslated: false });
            }
          }).catch(e => {});
        } catch(e) {}
      }
      
      let topHost = '';
      try {
        if (window.top && window.top.location) {
          topHost = window.top.location.hostname || '';
        }
      } catch(e) {}
      if (url && (isDisney || isHulu || isPlex || isFandango || isNetflix || isTwitter || isFacebook || isMax || isParamount || isPeacock)) {
        const urlStr = url.toString().toLowerCase();
        const isSubtitleUrl = urlStr.includes('.vtt') || urlStr.includes('vtt') || urlStr.includes('.srt') || urlStr.includes('/subtitles') || urlStr.includes('caption') || urlStr.includes('timedtext') || urlStr.includes('ttml') || urlStr.includes('nflx') || urlStr.includes('beam') || urlStr.includes('hbo') || urlStr.includes('max') || urlStr.includes('wbd') || urlStr.includes('peacock') || urlStr.includes('bamgrid') || urlStr.includes('netflix') || urlStr.includes('/library/streams/') || (isPlex && (urlStr.includes('stream') || urlStr.includes('sub')));
        
        const isApiExceptSubtitles = urlStr.includes('/api/') && !isSubtitleUrl && !isMax && !isPeacock && !isNetflix;
        const isThumbnailUrl = urlStr.includes('thumb') || urlStr.includes('storyboard') || urlStr.includes('sprite') || urlStr.includes('preview') || urlStr.includes('trickplay') || urlStr.includes('.jpg') || urlStr.includes('.png') || urlStr.includes('.webp') || urlStr.includes('thumbnails') || urlStr.includes('#xywh=');
        if (!isThumbnailUrl && !urlStr.includes('graphql') && !isApiExceptSubtitles) {
          try {
            const clone = response.clone();
            const buffer = await clone.arrayBuffer();
            const text = new TextDecoder('utf-8').decode(buffer);
            if (text && text.length > 20) {
              const parsedData = parseUniversalSubtitles(text);
              if (parsedData && parsedData.events && parsedData.events.length > 0) {
                console.log(`🐭 [BooTube/Network Engine] Intercepted and parsed ${parsedData.events.length} subtitle events from: ${urlStr.slice(0, 80)}`);
                broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
                if (mainWorldHideCC && !isParamount && !isNetflix) {
                  const stripped = stripXMLSubtitles(stripWebVTTText(text));
                  return new Response(stripped, { status: response.status, statusText: response.statusText, headers: response.headers });
                }
              }
            }
          } catch(e) {}
        }
      }
      
      if (url && url.includes('/api/timedtext')) {
        console.log("🤬 [Censor] Intercepted timedtext fetch:", url);
        const clone = response.clone();
        clone.text().then(text => {
          try {
            const data = JSON.parse(text);
            console.log("🤬 [Censor] Parsed timedtext JSON successfully.");
            broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: data, isTranslated: false });
            
            handleBackgroundTranslation(url);
          } catch (e) {
            console.log("🤬 [Censor] Could not parse timedtext as JSON. Might be XML formatting.");
          }
        }).catch(e => console.error("🤬 [Censor] Error reading fetch text:", e));
      }
      return response;
    });
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._interceptUrl = url;
    if (url) {
      try {
        const u = url.toString().toLowerCase();
        const isThumbnailXhr = u.includes('thumb') || u.includes('storyboard') || u.includes('sprite') || u.includes('preview') || u.includes('trickplay') || u.includes('.jpg') || u.includes('.png') || u.includes('.webp') || u.includes('#xywh=');
        if (!isThumbnailXhr && (u.includes('.vtt') || u.includes('vtt') || u.includes('.srt') || u.includes('/subtitles') || u.includes('caption') || u.includes('timedtext') || u.includes('ttml') || u.includes('seg') || u.includes('beam') || u.includes('wbd') || u.includes('nflx') || u.includes('peacock') || u.includes('netflix') || u.includes('manifest') || u.includes('licensing') || u.includes('range') || u.includes('/library/streams/') || (isPlex && (u.includes('stream') || u.includes('sub'))))) {
          this._isSubtitleXhr = true;
        }
      } catch(e) {}
    }
    return originalXHROpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      try {
        if (!this._bootubeParsed) {
          let raw = null;
          try { raw = this.response || this.responseText; } catch(e) {}
          let text = '';
          if (typeof raw === 'string') {
            text = raw;
          } else if (raw instanceof ArrayBuffer) {
            text = new TextDecoder('utf-8').decode(raw);
          } else if (raw && ArrayBuffer.isView(raw)) {
            text = new TextDecoder('utf-8').decode(raw.buffer);
          }
          if (text && text.length > 20) {
            const parsedData = parseUniversalSubtitles(text);
            if (parsedData && parsedData.events && parsedData.events.length > 0) {
              this._bootubeParsed = true;
              console.log(`🐭 [BooTube/XHR Engine] Intercepted and parsed ${parsedData.events.length} subtitle events via XHR load event!`);
              broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
            }
          }
        }
      } catch(e) {}
    });
    return originalXHRSend.apply(this, args);
  };

  const realResponseTextDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
  const realResponseDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');

  if (realResponseTextDesc && realResponseTextDesc.get) {
    Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
      get: function() {
        const raw = realResponseTextDesc.get.call(this);
        if (this._isSubtitleXhr) {
          let text = (typeof raw === 'string') ? raw : '';
          if (!this._bootubeParsed && text && text.length > 20) {
            try {
              const parsedData = parseUniversalSubtitles(text);
              if (parsedData && parsedData.events && parsedData.events.length > 0) {
                this._bootubeParsed = true;
                console.log(`🐭 [BooTube/XHR Engine] Intercepted and parsed ${parsedData.events.length} subtitle events via XHR responseText!`);
                broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
              }
            } catch(e) {}
          }
          if (mainWorldHideCC && !isParamount && !isNetflix && text) {
            return stripXMLSubtitles(stripWebVTTText(text));
          }
        }
        return raw;
      },
      configurable: true,
      enumerable: true
    });
  }

  if (realResponseDesc && realResponseDesc.get) {
    Object.defineProperty(XMLHttpRequest.prototype, 'response', {
      get: function() {
        const raw = realResponseDesc.get.call(this);
        if (this._isSubtitleXhr) {
          let text = '';
          if (typeof raw === 'string') {
            text = raw;
          } else if (raw instanceof ArrayBuffer) {
            text = new TextDecoder('utf-8').decode(raw);
          } else if (raw && ArrayBuffer.isView(raw)) {
            text = new TextDecoder('utf-8').decode(raw.buffer);
          }
          if (!this._bootubeParsed && text && text.length > 20) {
            try {
              const parsedData = parseUniversalSubtitles(text);
              if (parsedData && parsedData.events && parsedData.events.length > 0) {
                this._bootubeParsed = true;
                console.log(`🐭 [BooTube/XHR Engine] Intercepted and parsed ${parsedData.events.length} subtitle events via XHR response!`);
                broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
              }
            } catch(e) {}
          }
          if (mainWorldHideCC && !isParamount && !isNetflix && typeof raw === 'string') {
            return stripXMLSubtitles(stripWebVTTText(raw));
          }
        }
        return raw;
      },
      configurable: true,
      enumerable: true
    });
  }

  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    if (header && header.toLowerCase() === 'authorization' && value && value.startsWith('Bearer ')) {
      window._spotifyToken = value;
      broadcastMessage({ type: 'SPOTIFY_TOKEN_CAPTURED', token: value });
    }
    return originalXHRSetRequestHeader.call(this, header, value);
  };
  
  // Force all closed Shadow DOMs to be OPEN so the extension can read Disney+ UI time and subtitles
  try {
    const originalAttachShadow = HTMLElement.prototype.attachShadow;
    HTMLElement.prototype.attachShadow = function(options) {
      try {
        const forcedOptions = Object.assign({}, options, { mode: 'open' });
        return originalAttachShadow.call(this, forcedOptions);
      } catch(e) {
        return originalAttachShadow.call(this, options);
      }
    };
  } catch(e) {}

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      let topHost = '';
      try {
        if (window.top && window.top.location) {
          topHost = window.top.location.hostname || '';
        }
      } catch(e) {}
      if (this._interceptUrl && this._interceptUrl.includes('/color-lyrics/v2/track/')) {
        try {
          const converted = convertSpotifyLyricsToBooTube(this.responseText);
          if (converted) {
            console.log("🟢 [Spotify] Intercepted and converted Spotify lyrics via XHR!");
            broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: converted, isTranslated: false });
          }
        } catch(e) {}
      }

      if (this._interceptUrl && this._interceptUrl.includes('/api/timedtext')) {
        console.log("🤬 [Censor] Intercepted timedtext XHR:", this._interceptUrl);
        try {
          const data = JSON.parse(this.responseText);
          console.log("🤬 [Censor] Parsed timedtext JSON from XHR successfully.");
          broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: data, isTranslated: false });
          
          handleBackgroundTranslation(this._interceptUrl);
        } catch (e) {
          console.log("🤬 [Censor] Could not parse XHR timedtext as JSON.");
        }
      }
    });
    return originalXHRSend.apply(this, args);
  };
})();
