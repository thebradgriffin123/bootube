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
  const isLockedVolumePlayer = isNetflix || isFacebook || isDisney || isHulu || isMax || isParamount;

  if (isNetflix || isPrimeVideo) {
     console.log("🦊 [Censor] Bypassing network interceptor overrides on Netflix/Amazon to avoid DRM conflicts.");
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

  window.addEventListener('message', (e) => {
    if (e && e.data && e.data.type === 'BOOTUBE_MUTE_STATE_CHANGED') {
      applyMainWorldMute(e.data.isMuted);
    }
  });

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
      const events = lines.map((line, index) => {
        const startMs = parseInt(line.startTimeMs);
        const nextLine = lines[index + 1];
        const endMs = nextLine ? parseInt(nextLine.startTimeMs) : startMs + 4000;
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
          const p = timeStr.split(':');
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
        if (cleanText) {
          currentEvent.segs.push({ utf8: cleanText + ' ' });
        }
      } else if (line === '') {
        currentEvent = null;
      }
    }
    return { events };
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
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      const paragraphs = doc.getElementsByTagName('p');
      
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const beginAttr = p.getAttribute('begin');
        const endAttr = p.getAttribute('end');
        const durAttr = p.getAttribute('dur');
        if (!beginAttr) continue;
        
        const parseTime = (timeStr) => {
          if (!timeStr) return 0;
          if (timeStr.endsWith('t')) {
            const rawVal = parseFloat(timeStr.slice(0, -1));
            if (rawVal > 100000000) {
              return (rawVal / 10000000) * 1000;
            }
            return (rawVal / 10000) * 1000;
          }
          if (timeStr.endsWith('s')) {
            return parseFloat(timeStr.slice(0, -1)) * 1000;
          }
          const parts = timeStr.replace(',', '.').split(':');
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
          return (parseFloat(timeStr) * 1000) || 0;
        };

        const startMs = parseTime(beginAttr);
        let endMs = endAttr ? parseTime(endAttr) : (durAttr ? startMs + parseTime(durAttr) : startMs + 3000);
        
        const subText = p.textContent.trim().replace(/\s+/g, ' ');
        if (subText) {
          events.push({
            tStartMs: Math.round(startMs),
            dDurationMs: Math.round(endMs - startMs),
            segs: [{ utf8: subText + ' ' }]
          });
        }
      }
    } catch(e) {
      console.error("🤬 [Censor] XML Subtitle Parsing Error:", e);
    }
    return { events };
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

  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
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
    const isPlex = window.location.hostname.includes('plex.tv') || window.location.hostname.includes('plex.direct') || window.location.port === '32400' || topHost.includes('plex.tv') || topHost.includes('plex.direct');
    const isFandango = window.location.hostname.includes('fandango.com') || window.location.hostname.includes('vudu.com') || topHost.includes('fandango.com') || topHost.includes('vudu.com');
    const isTwitter = window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com') || topHost.includes('twitter.com') || topHost.includes('x.com');
    if (url && (isDisney || isHulu || isPlex || isFandango || isNetflix || isTwitter || isFacebook || isMax || isParamount)) {
      const urlStr = url.toString().toLowerCase();
      if (!urlStr.includes('.jpg') && !urlStr.includes('.png') && !urlStr.includes('thumbnails') && !urlStr.includes('graphql') && !urlStr.includes('/api/')) {
         if (urlStr.includes('.vtt') || urlStr.includes('.srt') || urlStr.includes('/subtitles') || urlStr.includes('caption_file') || urlStr.includes('seg') || urlStr.includes('bamgrid') || urlStr.includes('/library/streams/') || urlStr.includes('ttml')) {
            try {
              const clone = response.clone();
              clone.text().then(text => {
                  if (text && text.includes('WEBVTT')) {
                    console.log("🐭 [Plex/Hulu/Disney+/Facebook] Parsing WebVTT payload!");
                    const parsedData = parseWebVTT(text);
                    broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
                  } else if (text && (text.includes('<tt') || text.includes('xmlns') || text.includes('<p begin='))) {
                    console.log("🐭 [Netflix/Facebook] Parsing XML/TTML payload!");
                    const parsedData = parseXMLSubtitles(text);
                    broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
                  } else if (text && (text.includes('-->') || urlStr.includes('.srt') || urlStr.includes('subtitles'))) {
                    if (text.includes('-->')) {
                       console.log("🐭 [Plex] Parsing SRT payload!");
                       const parsedData = parseSRT(text);
                       broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
                    }
                  }
              }).catch(e => {});
            } catch(e) {}
         }
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
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._interceptUrl = url;
    return originalXHROpen.call(this, method, url, ...rest);
  };

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
      const isPlex = window.location.hostname.includes('plex.tv') || window.location.hostname.includes('plex.direct') || window.location.port === '32400' || topHost.includes('plex.tv') || topHost.includes('plex.direct');
      const isFandango = window.location.hostname.includes('fandango.com') || window.location.hostname.includes('vudu.com') || topHost.includes('fandango.com') || topHost.includes('vudu.com');
      const isTwitter = window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com') || topHost.includes('twitter.com') || topHost.includes('x.com');
      if (this._interceptUrl && this._interceptUrl.includes('/color-lyrics/v2/track/')) {
        try {
          const converted = convertSpotifyLyricsToBooTube(this.responseText);
          if (converted) {
            console.log("🟢 [Spotify] Intercepted and converted Spotify lyrics via XHR!");
            broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: converted, isTranslated: false });
          }
        } catch(e) {}
      }

      if (this._interceptUrl && (isDisney || isHulu || isPlex || isFandango || isNetflix || isTwitter || isFacebook || isMax || isParamount)) {
        const urlStr = this._interceptUrl.toString().toLowerCase();
        if (!urlStr.includes('.jpg') && !urlStr.includes('.png') && !urlStr.includes('thumbnails') && !urlStr.includes('graphql') && !urlStr.includes('/api/')) {
          if (urlStr.includes('.vtt') || urlStr.includes('.srt') || urlStr.includes('/subtitles') || urlStr.includes('caption_file') || urlStr.includes('seg') || urlStr.includes('bamgrid') || urlStr.includes('/library/streams/') || urlStr.includes('ttml')) {
             try {
                const text = this.responseText;
                if (text && text.includes('WEBVTT')) {
                 console.log("🐭 [Plex/Hulu/Disney+/Facebook] Parsing WebVTT payload from XHR!");
                 const parsedData = parseWebVTT(text);
                 broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
               } else if (text && (text.includes('<tt') || text.includes('xmlns') || text.includes('<p begin='))) {
                 console.log("🐭 [Netflix/Facebook] Parsing XML/TTML payload from XHR!");
                 const parsedData = parseXMLSubtitles(text);
                 broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
               } else if (text && (text.includes('-->') || urlStr.includes('.srt') || urlStr.includes('subtitles'))) {
                 if (text.includes('-->')) {
                    console.log("🐭 [Plex] Parsing SRT payload from XHR!");
                    const parsedData = parseSRT(text);
                    broadcastMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: parsedData, isTranslated: false });
                 }
               }
             } catch(e) {}
          }
        }
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
