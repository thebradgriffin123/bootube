// Synchronous Pre-DOM Render Mask for Zero-Flash Subtitle Hiding
(function setupZeroFlashInterceptor() {
  try {
    const isYT = (window.location.hostname || '').includes('youtube.com') || (window.location.hostname || '').includes('netflix.com') || (window.location.hostname || '').includes('hulu.com') || (document.referrer || '').toLowerCase().includes('youtube.com') || (window.location.href || '').toLowerCase().includes('youtube.com') || (window.location.href || '').toLowerCase().includes('hulu.com');
    if (isYT) return;

    const origAppendChild = Node.prototype.appendChild;
    const origInsertBefore = Node.prototype.insertBefore;

    function maskNodeIfCaption(node, parent) {
      if (!node || node.nodeType !== 1) return;
      if (typeof hideCC === 'undefined' || hideCC !== true || (typeof extensionEnabled !== 'undefined' && extensionEnabled === false)) return;

      try {
        const cls = (typeof node.className === 'string' ? node.className : '').toLowerCase();
        const id = (typeof node.id === 'string' ? node.id : '').toLowerCase();
        const tag = node.tagName ? node.tagName.toLowerCase() : '';
        
        const parentCls = (parent && typeof parent.className === 'string' ? parent.className : '').toLowerCase();
        const parentId = (parent && typeof parent.id === 'string' ? parent.id : '').toLowerCase();

        const isCaptionRelated = 
          cls.includes('shaka-text') || cls.includes('vudu-subtitle') || cls.includes('vudu-cue') ||
          cls.includes('subtitle') || cls.includes('caption') || cls.includes('cue') || cls.includes('timedtext') || cls.includes('vjs-text-track') ||
          id.includes('shaka-text') || id.includes('vudu-subtitle') || id.includes('vudu-cue') || id.includes('subtitle') || id.includes('caption') || id.includes('cue');

        if (isCaptionRelated) {
          node.setAttribute('data-bootube-hidden', 'true');
          node.style.setProperty('display', 'none', 'important');
          node.style.setProperty('opacity', '0', 'important');
          node.style.setProperty('visibility', 'hidden', 'important');
          node.style.setProperty('font-size', '0px', 'important');
          node.style.setProperty('color', 'transparent', 'important');
          node.style.setProperty('background-color', 'transparent', 'important');
          node.style.setProperty('text-shadow', 'none', 'important');
          node.style.setProperty('pointer-events', 'none', 'important');
          return;
        }

        const hasControlOrUIKeyword = 
          cls.includes('control') || cls.includes('button') || cls.includes('seek') || cls.includes('bar') || cls.includes('scrubber') || cls.includes('slider') || cls.includes('play') || cls.includes('pause') || cls.includes('volume') || cls.includes('time') || cls.includes('menu') || cls.includes('overlay') ||
          id.includes('control') || id.includes('button') || id.includes('seek') || id.includes('bar') || id.includes('scrubber') || id.includes('slider') || id.includes('play') || id.includes('pause') || id.includes('volume') || id.includes('time') || id.includes('menu') || id.includes('overlay');

        if (hasControlOrUIKeyword) return;
      } catch(e) {}
    }

    Node.prototype.appendChild = function(child) {
      maskNodeIfCaption(child, this);
      return origAppendChild.call(this, child);
    };

    Node.prototype.insertBefore = function(newNode, referenceNode) {
      maskNodeIfCaption(newNode, this);
      return origInsertBefore.call(this, newNode, referenceNode);
    };
  } catch(e) {}
})();

const DEFAULT_BLOCKLIST = [
  "goddamn", "god damn", "jesus christ", "jesus", "christ", 
  "damn", "hell", "fuck", "fucking", "fucked", "shit", "bullshit", "bitch", "asshole", 
  "motherfucker", "bastard", "[ __ ]", "[__]", "****", "***", "ass", "shitty", "badass",
  "shithole", "shitstorm"
];

let isPremiumUser = true;
var metaInterval = null;

function checkIsPremium(status) {
  if (status === undefined || status === null || status === '') return true;
  const s = String(status).toLowerCase();
  return s === 'active' || s === 'premium' || s === 'pro' || s === 'true' || s === 'trialing' || s === 'trialling';
}

function isContextValid() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage || !chrome.storage.local) return false;
  try {
    return !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

function injectUpgradeBanner() {
  if (isSubFrame) return;
  if (document.getElementById('bootube-upgrade-banner')) return;
  const target = document.body || document.documentElement;
  if (!target) return;

  const banner = document.createElement('div');
  if (!banner) return;
  banner.id = 'bootube-upgrade-banner';
  banner.style.position = 'fixed';
  banner.style.top = '16px';
  banner.style.left = '50%';
  banner.style.transform = 'translateX(-50%)';
  banner.style.zIndex = '999999999';
  banner.style.backgroundColor = 'rgba(5, 5, 5, 0.95)';
  banner.style.border = '1px solid rgba(6, 182, 212, 0.3)';
  banner.style.borderRadius = '12px';
  banner.style.padding = '12px 24px';
  banner.style.display = 'flex';
  banner.style.alignItems = 'center';
  banner.style.gap = '16px';
  banner.style.color = '#fff';
  banner.style.fontFamily = "'Outfit', 'Inter', sans-serif";
  banner.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.8)';
  banner.style.backdropFilter = 'blur(8px)';
  
  const booPremiumUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL('images/ic_boo_premium.png') : 'images/ic_boo_premium.png';

  banner.innerHTML = `
    <img src="${booPremiumUrl}" alt="BooTube Premium Ghost" style="height: 34px; width: auto; max-width: 36px; object-fit: contain; flex-shrink: 0; display: block;">
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.01em;">Upgrade to BooTube Premium</div>
      <div style="font-size: 12px; font-weight: 400; color: rgba(255, 255, 255, 0.75);">Unlock full profanity filters and unlimited custom words.</div>
    </div>
    <a href="https://bootube.app/account" target="_blank" style="background: linear-gradient(90deg, #06b6d4, #3b82f6); color: #FFFFFF; text-decoration: none; padding: 7px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; transition: all 0.2s; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3); white-space: nowrap; margin-left: 8px;">Upgrade</a>
    <button id="bootube-close-banner-btn" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px; font-weight: bold; margin-left: 4px; padding: 4px; line-height: 1;">×</button>
  `;
  target.appendChild(banner);
  
  const closeBtn = document.getElementById('bootube-close-banner-btn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      banner.remove();
    };
  }
}

let isSubFrame = false;

function runBootube() {
  try {
    if (window.top && window.top !== window) {
      isSubFrame = true;
    }
  } catch (e) {
    isSubFrame = true;
  }

  // SSO Auth capture logic if user is on bootube.app
  if (window.location.hostname.includes('bootube.app')) {
    if (isSubFrame) return; // Don't run inside iframe on the main site
    
    let lastKnownAccessToken = undefined;
    
    // Periodically poll localStorage for the Supabase auth token
    const pollInterval = setInterval(() => {
      try {
        if (!isContextValid()) {
          clearInterval(pollInterval);
          return;
        }
        
        if (typeof navigator !== 'undefined' && navigator.cookieEnabled === false) {
          clearInterval(pollInterval);
          return;
        }
        
        let storageAccessible = false;
        try {
          if (typeof window !== 'undefined') {
            const origin = window.origin || (window.location && window.location.origin);
            if (origin !== 'null') {
              storageAccessible = !!window.localStorage;
            }
          }
        } catch (e) {}
        
        if (!storageAccessible) {
          clearInterval(pollInterval);
          return;
        }
        
        let session = null;
        try {
          const tokenKey = 'sb-fwqybddfbkxqezxgrwsi-auth-token';
          const rawToken = localStorage.getItem(tokenKey);
          if (rawToken) {
            session = JSON.parse(rawToken);
          }
        } catch (e) {
          // Ignore local storage parsing errors
        }

        const newAccessToken = (session && typeof session === 'object' && session.access_token) || null;
        
        // Only send a message if the auth session changed!
        if (newAccessToken !== lastKnownAccessToken) {
          try {
            if (!isContextValid()) {
              clearInterval(pollInterval);
              return;
            }
            const msg = newAccessToken
              ? { action: 'SAVE_SUPABASE_SESSION', session: session }
              : { action: 'CLEAR_SUPABASE_SESSION' };
            const p = chrome?.runtime?.sendMessage?.(msg);
            if (p && typeof p.catch === 'function') {
              p.catch(() => {
                clearInterval(pollInterval);
              });
            }
            lastKnownAccessToken = newAccessToken; // Update cache on successful send
          } catch (err) {
            // If sending message throws an exception, the extension context has been invalidated
            clearInterval(pollInterval);
            return;
          }
        }
      } catch (globalErr) {
        clearInterval(pollInterval);
      }
    }, 2000);
    
    return; // Exit early: do not run media filter logic on bootube.app website
  }

  let respectfulModeEnabled = true;
let blocklist = [];
let disabledWords = [];
let enabledCategories = ["Profanity", "Blasphemy", "Religious exclamations", "Sexual", "Scatological", "Anatomical", "Derogatory", "Bleeps & Symbols", "Custom"];
let activeBlocklist = [];
let muteZones = [];
let allCaptionPayloads = [];

// NEW STATE VARIABLES
let whitelistedChannels = [];
let safeList = ["god", "jesus", "christ", "lord", "savior", "messiah", "holy spirit", "jehovah", "yahweh", "jesus christ"];
let currentChannelName = "";
let isReligiousContext = false;
let wasChannelWhitelisted = false;
let muteAggressiveness = 2;
let lastYouTubeVideoId = '';
var metaInterval = null;
let lastPageHref = typeof window !== 'undefined' ? window.location.href : '';

function performGarbageCollection(reason = 'video_change') {
  console.log("🧹 [BooTube Trash Removal] Garbage Collection triggered (" + reason + ") — Wiping accumulated subtitle & mute caches.");
  const now = Date.now();
  // Protect fresh payloads received in the last 6 seconds for streaming platforms (Netflix, etc.) so SPA transitions don't lose subtitles
  const isStreamingPlatform = isNetflix || isHulu || isDisneyPlus || isMax || isParamount || isPeacock || isPrimeVideo || isFandango || isPlex || isFacebook;
  const recentPayloads = isStreamingPlatform ? (allCaptionPayloads || []).filter(p => p && p._timestamp && (now - p._timestamp) < 6000) : [];

  muteZones = [];
  allCaptionPayloads = recentPayloads;
  queuedPayloads = [];
  subtitleSyncBeacons = [];
  if (typeof regexCache !== 'undefined' && regexCache && regexCache.clear) {
    regexCache.clear();
  }
  networkIsMuting = false;
  fallbackIsMuting = false;
  isReligiousContext = false;
  wasChannelWhitelisted = false;
  currentChannelName = "";
  lastBadWordTime = 0;
  lastMutedFacebookText = '';
  lastFacebookVideoTime = 0;
  if (typeof mutedFacebookPhrases !== 'undefined') mutedFacebookPhrases.clear();
  
  if (videoElement) {
    delete videoElement.dataset.bootubeListenersAttached;
  }

  if (allCaptionPayloads.length > 0) {
    allCaptionPayloads.forEach(data => processCaptionData(data.payload, data.isTranslated));
  }
  
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      if (allCaptionPayloads.length === 0) {
        chrome.storage.local.remove(['activeVideoCaptions', 'lastFetchedCaptions']);
      }
    }
  } catch(e) {}
}

function isChannelWhitelisted(name) {
  if (!name || !Array.isArray(whitelistedChannels) || whitelistedChannels.length === 0) return false;
  const target = name.toLowerCase().trim();
  return whitelistedChannels.some(ch => ch && ch.toLowerCase().trim() === target);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const regexCache = new Map();

function getWordRegex(word) {
  if (!word || typeof word !== 'string') return null;
  const key = word.toLowerCase();
  if (regexCache.has(key)) {
    const cached = regexCache.get(key);
    cached.lastIndex = 0;
    return cached;
  }

  // Special case: "fu" is used by YouTube auto-captions as a minced oath for "fuck".
  // Use a strict regex that requires "fu" to NOT be preceded by a word character,
  // preventing false positives in "kung fu", "tofu", "futon", etc.
  if (key === 'fu') {
    const fuRx = /(?<![a-z])\bfu\b/gi;
    regexCache.set(key, fuRx);
    return fuRx;
  }
  let pattern = '';
  for (let i = 0; i < word.length; i++) {
     const char = word[i];
     if (i > 0 && i < word.length - 1 && /[a-z]/i.test(char)) {
        pattern += '[' + escapeRegExp(char) + '\\*]';
     } else {
        pattern += escapeRegExp(char);
     }
  }
  
  const first = word[0];
  const last = word[word.length - 1];
  const middleLen = word.length - 2;
  
  let asteriskPattern = '';
  if (word.length > 2 && /[a-z]/i.test(first) && /[a-z']/i.test(last)) {
     const escapedFirst = escapeRegExp(first);
     const escapedLast = escapeRegExp(last);
     asteriskPattern = '|' + escapedFirst + '\\*{' + Math.max(1, middleLen - 1) + ',}' + escapedLast + '|' + escapedFirst + '\\*{' + middleLen + ',}';
  }
  
  const finalPattern = '(?:' + pattern + asteriskPattern + ')';
  const startBoundary = /^\w/.test(word) ? '\\b' : '';
  const endBoundary = /[\w']$/.test(word) ? "(?:\\b|(?=\\s)|$)" : '';
  const rx = new RegExp(startBoundary + finalPattern + endBoundary, 'gi');
  regexCache.set(key, rx);
  return rx;
}

function stripSoundDescriptors(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\[\s*(?:música|music|aplausos|cheering|applause|laughter|gritos|ruido|singing|instrumental|sound|fx|snorting|chuckles|coughing|groan|sighs)\s*\]/gi, ' ')
             .replace(/\(\s*(?:música|music|aplausos|cheering|applause|laughter|gritos|ruido|singing|instrumental|sound|fx|snorting|chuckles|coughing|groan|sighs)\s*\)/gi, ' ');
}

function getTwitterExactWordTimings(txt, matchIdx, wordLen, cueStartTime, cueDuration) {
  if (!txt || typeof txt !== 'string' || !txt.includes('<X-word-ms')) return null;
  try {
    const msMatch = txt.match(/ms=([\d,]+)/);
    const rangeMatch = txt.match(/character_ranges=([\d\-,]+)/);
    if (!msMatch || !rangeMatch) return null;
    
    const durations = msMatch[1].split(',').map(Number);
    const ranges = rangeMatch[1].split(',').map(r => r.split('-').map(Number));
    if (durations.length === 0 || ranges.length === 0) return null;
    
    let wordIdx = -1;
    for (let i = 0; i < ranges.length; i++) {
      const [start, end] = ranges[i];
      if (matchIdx >= start && matchIdx <= end) {
        wordIdx = i;
        break;
      }
    }
    
    if (wordIdx === -1) {
      let minDiff = Infinity;
      for (let i = 0; i < ranges.length; i++) {
        const [start] = ranges[i];
        const diff = Math.abs(matchIdx - start);
        if (diff < minDiff) {
          minDiff = diff;
          wordIdx = i;
        }
      }
    }
    
    if (wordIdx !== -1 && wordIdx < durations.length) {
      let offsetMs = 0;
      for (let i = 0; i < wordIdx; i++) {
        offsetMs += (durations[i] || 0);
      }
      
      let matchedDurationMs = 0;
      const targetEndIdx = matchIdx + Math.max(1, wordLen);
      for (let i = wordIdx; i < ranges.length; i++) {
        const [start] = ranges[i];
        if (start < targetEndIdx) {
          matchedDurationMs += (durations[i] || 0);
        } else {
          break;
        }
      }
      if (matchedDurationMs === 0) matchedDurationMs = durations[wordIdx] || 300;
      
      const wordStartSec = cueStartTime + (offsetMs / 1000);
      const wordEndSec = cueStartTime + ((offsetMs + matchedDurationMs) / 1000);
      return { wordStartSec, wordEndSec };
    }
  } catch(e) {}
  return null;
}

function getExpandedWords(blocklist) {
  if (!Array.isArray(blocklist)) return [];
  const words = blocklist.map(w => {
    if (typeof w === 'string') return w.toLowerCase();
    if (w && typeof w.word === 'string') return w.word.toLowerCase();
    return null;
  }).filter(w => w !== null);

  const expanded = new Set();
  words.forEach(w => {
     expanded.add(w);
     if (w === 'fuck') {
        expanded.add('fucking');
        expanded.add('fuckin');
        expanded.add("fuckin'");
        expanded.add('fucked');
        expanded.add('fucker');
        expanded.add('fuckers');
        expanded.add('fucks');
        // YouTube auto-captions often output "fu" as a minced oath when "fuck" is spoken
        // (the word gets clipped mid-utterance). Matched with a strict regex in getWordRegex.
        expanded.add('fu');
     } else if (w === 'fucking') {
        expanded.add('fuckin');
        expanded.add("fuckin'");
     } else if (w === 'motherfucker') {
        expanded.add('motherfuckin');
        expanded.add("motherfuckin'");
        expanded.add('mothafucka');
        expanded.add('mothafuckin');
        expanded.add("mothafuckin'");
     } else if (w === 'ass') {
        expanded.add('asshole');
        expanded.add('assholes');
        expanded.add('asses');
        expanded.add('ass-hole');
        expanded.add('ass-holes');
        expanded.add('badass');
        expanded.add('badasses');
        expanded.add('bad-ass');
        expanded.add('bad-asses');
     } else if (w === 'shit') {
        expanded.add('shitty');
        expanded.add('shitting');
        expanded.add('shits');
        expanded.add('bullshit');
        expanded.add('bullshitting');
     } else if (w === 'bullshit') {
        expanded.add('bullshitting');
        expanded.add('bullshitter');
        expanded.add('bullshitters');
        expanded.add('bullshits');
        expanded.add('bull-shit');
        expanded.add('bull-shitting');
     } else if (w === 'bitch') {
        expanded.add('bitches');
        expanded.add('bitching');
     } else if (w === 'bastard') {
        expanded.add('bastards');
     } else if (w === 'damn') {
        expanded.add('damned');
        expanded.add('damning');
        expanded.add('damns');
     }
  });
  return Array.from(expanded).sort((a, b) => b.length - a.length);
}

function findShadowElement(node, selector) {
  if (!node) return null;
  if (node.querySelector) {
     try {
       const found = node.querySelector(selector);
       if (found) return found;
     } catch(e) {}
  }
  if (node.shadowRoot) {
     const found = findShadowElement(node.shadowRoot, selector);
     if (found) return found;
  }
  if (node.childNodes) {
     for (let i = 0; i < node.childNodes.length; i++) {
        const found = findShadowElement(node.childNodes[i], selector);
        if (found) return found;
     }
  }
  return null;
}

function queryShadowAll(node, selector, results = []) {
  if (!node) return results;
  if (node.querySelectorAll) {
     try {
       const found = node.querySelectorAll(selector);
       found.forEach(el => results.push(el));
     } catch(e) {}
  }
  if (node.shadowRoot) {
     queryShadowAll(node.shadowRoot, selector, results);
  }
  if (node.children) {
     for (let i = 0; i < node.children.length; i++) {
        queryShadowAll(node.children[i], selector, results);
     }
  }
  return results;
}

const trackedContentMedia = new Set();
try {
  const origAudio = window.Audio;
  if (origAudio) {
    function TrackedAudio(...args) {
      const a = new origAudio(...args);
      trackedContentMedia.add(a);
      return a;
    }
    TrackedAudio.prototype = origAudio.prototype;
    window.Audio = TrackedAudio;
  }
  const origCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function(tagName, ...args) {
    const el = origCreateElement.call(this, tagName, ...args);
    if (el && typeof tagName === 'string' && (tagName.toLowerCase() === 'audio' || tagName.toLowerCase() === 'video')) {
      trackedContentMedia.add(el);
    }
    return el;
  };
} catch(e) {}

let _cachedVideos = [];
let _lastFindVideosTime = 0;

function findVideos() {
  const now = Date.now();
  if (now - _lastFindVideosTime < 1500 && _cachedVideos.length > 0) {
    if (_cachedVideos.some(v => v && v.isConnected)) {
      return _cachedVideos;
    }
  }
  _lastFindVideosTime = now;

  const vids = [];
  try {
    trackedContentMedia.forEach(m => {
      if (m && m.isConnected && !vids.includes(m)) vids.push(m);
    });

    const nativeVids = document.getElementsByTagName('video');
    for (let i = 0; i < nativeVids.length; i++) {
      if (!vids.includes(nativeVids[i])) vids.push(nativeVids[i]);
    }
    if (isSpotify) {
      const nativeAuds = document.getElementsByTagName('audio');
      for (let i = 0; i < nativeAuds.length; i++) {
        if (!vids.includes(nativeAuds[i])) vids.push(nativeAuds[i]);
      }
    }

    if (vids.length === 0) {
      const queue = [document.documentElement || document.body];
      let steps = 0;
      while (queue.length > 0 && steps < 500) {
        steps++;
        const node = queue.shift();
        if (!node) continue;
        
        if (node.tagName && (node.tagName.toLowerCase() === 'video' || (isSpotify && node.tagName.toLowerCase() === 'audio'))) {
          if (!vids.includes(node)) vids.push(node);
        }
        
        if (node.shadowRoot) {
          queue.push(node.shadowRoot);
        }
        
        const children = node.children;
        if (children) {
          for (let i = 0; i < children.length; i++) {
            queue.push(children[i]);
          }
        }
      }
    }
  } catch(e) {}

  _cachedVideos = vids;
  return vids;
}

function getActiveVideoElement(vids) {
  if (!vids || vids.length === 0) return null;
  const validVids = Array.from(vids).filter(v => v && (v.src || v.currentSrc || (v.querySelector && v.querySelector('source')) || isSpotify));
  if (validVids.length === 0) return vids[0];
  
  // Highest priority: actively playing video element
  const playingWithTime = validVids.find(v => !v.paused && v.currentTime > 0 && !v.ended);
  if (playingWithTime) return playingWithTime;
  const playing = validVids.find(v => !v.paused && !v.ended);
  if (playing) return playing;

  const visibleVids = validVids.filter(v => v.offsetWidth > 0 && v.offsetHeight > 0);
  if (visibleVids.length > 0) {
    visibleVids.sort((a, b) => {
      const sizeA = a.offsetWidth * a.offsetHeight;
      const sizeB = b.offsetWidth * b.offsetHeight;
      return sizeB - sizeA;
    });
    return visibleVids[0];
  }
  return validVids[0];
}

function getHuluDOMTitle() {
  try {
     const hitRegion = queryShadowAll(document.body, '[data-testid="player-metadata-hit-region"], [aria-label*="You are watching"]')[0];
     if (hitRegion) {
        const ariaLabel = hitRegion.getAttribute('aria-label');
        if (ariaLabel) {
           const match = ariaLabel.match(/You are watching\s*-?\s*(.*?)\s+For\s+more\s+actions/i);
           if (match && match[1]) {
              let titleText = match[1].trim();
              if (titleText && titleText.toLowerCase() !== 'hulu') {
                 console.log(`🤬 [Censor] Found Hulu title in hitRegion: "${titleText}"`);
                 return titleText;
              }
           }
        }
     }
  } catch(e) {}

  try {
      const titleEl = queryShadowAll(document.body, '[class*="titleText"], [class*="title-text"], [class*="TitleText"]')[0];
      if (titleEl && titleEl.textContent) {
         let titleText = titleEl.textContent.trim();
         if (titleText && titleText.toLowerCase() !== 'hulu' && titleText.toLowerCase() !== 'watch') {
            const subEl = queryShadowAll(document.body, '[class*="subTitle"], [class*="subtitle"], [class*="Subtitle"]')[0];
            if (subEl && subEl.textContent) {
               const subText = subEl.textContent.trim();
               if (subText && subText.toLowerCase() !== 'hulu') {
                  titleText = `${titleText} - ${subText}`;
               }
            }
            console.log(`🤬 [Censor] Found Hulu title in titleText: "${titleText}"`);
            return titleText;
         }
      }
   } catch(e) {}

  return null;
}

function getPlexDOMTitle() {
  try {
     const plexTitleEl = document.querySelector('div[class*="MetadataState"] [class*="Title"]');
     if (plexTitleEl && plexTitleEl.textContent) {
        return plexTitleEl.textContent.trim();
     }
  } catch(e) {}
  
  try {
     let rawTitle = document.title || "";
     if (rawTitle.toLowerCase().endsWith(" - plex")) {
        rawTitle = rawTitle.substring(0, rawTitle.length - 7).trim();
     } else if (rawTitle.toLowerCase().endsWith(" | plex")) {
        rawTitle = rawTitle.substring(0, rawTitle.length - 7).trim();
     }
     return rawTitle || "Plex | Watch";
  } catch(e) {}
  return "Plex | Watch";
}

function getHuluMetadataTitle() {
  try {
     const domTitle = getHuluDOMTitle();
     if (domTitle && domTitle.toLowerCase() !== 'hulu' && domTitle.toLowerCase() !== 'watch') {
        return domTitle;
     }
  } catch(e) {}

  try {
     const ogTitle = document.querySelector('meta[property="og:title"]');
     if (ogTitle && ogTitle.content) {
        let title = ogTitle.content.trim();
        title = title.replace(/ \| Hulu/i, "").replace(/^Watch /i, "");
        if (title.length > 0 && title.toLowerCase() !== 'hulu' && title.toLowerCase() !== 'watch') {
           return title;
        }
     }
  } catch(e) {}

  try {
     const twTitle = document.querySelector('meta[name="twitter:title"]');
     if (twTitle && twTitle.content) {
        let title = twTitle.content.trim();
        title = title.replace(/ \| Hulu/i, "").replace(/^Watch /i, "");
        if (title.length > 0 && title.toLowerCase() !== 'hulu' && title.toLowerCase() !== 'watch') {
           return title;
        }
     }
  } catch(e) {}

  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data) {
          if (data['@type'] === 'TVEpisode') {
             const seriesName = data.partOfSeries && data.partOfSeries.name;
             const episodeName = data.name;
             if (seriesName && episodeName) {
                return `${seriesName} - ${episodeName}`;
             } else if (seriesName) {
                return seriesName;
             }
          }
          if (data.name && data.name.toLowerCase() !== 'hulu') {
             return data.name;
          }
        }
      } catch(e) {}
    }
  } catch(e) {}

  try {
     let title = document.title || "";
     title = title.replace(/ \| Hulu/i, "").replace(/^Watch /i, "").replace(/hulu/i, "").replace(/ \| watch/i, "").replace(/^hulu \| /i, "").trim();
     if (title && title.toLowerCase() !== 'watch') {
        return title;
     }
  } catch(e) {}

  return null;
}

let videoElement = null;
let currentVideoSrc = "";
let networkIsMuting = false; 
let fallbackIsMuting = false;
let lastBadWordTime = 0;
let lastMutedText = "";
let lastMutedFacebookText = "";
let lastFacebookVideoTime = 0;
const mutedFacebookPhrases = new Map();

function isFacebookPhraseAlreadyMuted(text, vTime) {
  if (!text || typeof text !== 'string') return false;
  const norm = text.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, ' ').toLowerCase().trim();
  if (norm.length < 3) return false;
  
  for (let [mutedText] of mutedFacebookPhrases.entries()) {
    if (norm === mutedText || (mutedText.length >= 8 && norm.includes(mutedText)) || (norm.length >= 8 && mutedText.includes(norm))) {
      return true;
    }
  }
  return false;
}

let captionObserver = null;
let topHost = '';
let topHref = '';
try {
  if (window.top && window.top.location) {
    topHost = window.top.location.hostname || '';
    topHref = window.top.location.href || '';
  }
} catch(e) {}

const interceptedSubtitleTexts = new Set();

function getCanonicalText(text) {
  if (!text) return "";
  let val = text.toLowerCase()
                .replace(/[\u2018\u2019\u201B`’]/g, "'") // Normalize curly apostrophes/backticks to straight single quote
                .replace(/'/g, "")                     // Strip all single quotes completely!
                .replace(/\[\s*_+\s*\]/g, " ")  // Remove [ __ ]
                .replace(/_+/g, " ");           // Remove ___
  
  const blocklist = (typeof activeBlocklist !== 'undefined' && Array.isArray(activeBlocklist) && activeBlocklist.length > 0) 
    ? activeBlocklist 
    : (typeof DEFAULT_BLOCKLIST !== 'undefined' ? DEFAULT_BLOCKLIST : []);
    
  const words = getExpandedWords(blocklist);
  if (Array.isArray(words)) {
    words.forEach(word => {
      if (word && typeof word === 'string') {
        const regex = getWordRegex(word);
        val = val.replace(regex, " ");
      }
    });
  }
  
  return val.replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
}

function isInsideVideoPlayer(node) {
  let curr = node;
  for (let i = 0; i < 12; i++) {
    if (!curr || curr === document.body || curr === document.documentElement) break;
    if (curr.querySelector && curr.querySelector('video')) {
      return true;
    }
    curr = curr.parentElement || (curr.getRootNode && curr.getRootNode().host);
  }
  return false;
}

function isElementVideoPlayerUI(el) {
  if (!el) return false;

  const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
  const id = (typeof el.id === 'string' ? el.id : '').toLowerCase();

  // Explicit guard: Subtitle/caption/cue elements are NEVER UI buttons! Check captions FIRST!
  if (cls.includes('subtitle') || cls.includes('caption') || cls.includes('cue') || cls.includes('timedtext') || cls.includes('shaka-text') || cls.includes('vudu-subtitle') || cls.includes('vudu-cue') || id.includes('subtitle') || id.includes('caption') || id.includes('cue') || id.includes('shaka-text') || id.includes('vudu-subtitle') || (isFacebook && (cls.includes('x32vodv') || cls.includes('x18l40ae') || cls.includes('x14ctfv') || (el.style && el.style.backgroundColor && el.style.backgroundColor.includes('rgba('))))) {
    return false;
  }

  const hasControlKeyword = 
    cls.includes('control') || cls.includes('button') || cls.includes('seek') || cls.includes('bar') || cls.includes('scrubber') || cls.includes('slider') || cls.includes('play') || cls.includes('pause') || cls.includes('volume') || cls.includes('overlay') ||
    id.includes('control') || id.includes('button') || id.includes('seek') || id.includes('bar') || id.includes('scrubber') || id.includes('slider') || id.includes('play') || id.includes('pause') || id.includes('volume') || id.includes('overlay');

  if (hasControlKeyword) {
    return true;
  }

  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'button' || tag === 'a' || tag === 'svg' || tag === 'input' || tag === 'path' || tag === 'select' || tag === 'option') {
    return true;
  }
  
  const role = el.getAttribute ? el.getAttribute('role') : '';
  const isUIRole = role && (role === 'button' || role === 'menu' || role === 'menuitem' || role === 'menuitemcheckbox' || role === 'menuitemradio' || role === 'option' || role === 'dialog' || role === 'listbox' || role === 'checkbox' || role === 'radio');
  if (isUIRole) return true;
  
  const ariaHasPopup = el.getAttribute ? el.getAttribute('aria-haspopup') : '';
  const ariaExpanded = el.getAttribute ? el.getAttribute('aria-expanded') : '';
  const ariaControls = el.getAttribute ? el.getAttribute('aria-controls') : '';
  if (ariaHasPopup || ariaExpanded || ariaControls) return true;

  const uiKeywords = [
    'btn', 'button', 'control', 'menu', 'picker', 'volume', 'progress', 
    'timeline', 'time', 'logo', 'bar', 'setting', 'tooltip', 'ad-', 'ad',
    'avia', 'cbs', 'play', 'pause', 
    'scrub', 'playback', 'slider', 'interaction', 'dss-player'
  ];
  
  for (const keyword of uiKeywords) {
    if (cls.includes(keyword) || id.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

function isTextKnownSubtitle(cleanText) {
  if (!cleanText) return false;
  if (interceptedSubtitleTexts.has(cleanText)) return true;
  
  // Only use sub-phrase matching on Facebook and Twitter
  if (isFacebook || isTwitter) {
    if (cleanText.length < 3) return false; // Prevent matching short common words like 'a', 'to', 'go'
    for (const txt of interceptedSubtitleTexts) {
      if (txt.includes(cleanText)) {
        return true;
      }
    }
  }
  return false;
}

function queryAllElementsIncludingShadow(selector, root = document) {
  const results = [];
  if (!root || !root.querySelectorAll) return results;
  try {
    const found = root.querySelectorAll(selector);
    for (let i = 0; i < found.length; i++) {
      results.push(found[i]);
    }
    const all = root.querySelectorAll('*');
    for (let i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) {
        const shadowFound = queryAllElementsIncludingShadow(selector, all[i].shadowRoot);
        for (let j = 0; j < shadowFound.length; j++) {
          results.push(shadowFound[j]);
        }
      }
    }
  } catch(e) {}
  return results;
}

function hideExistingCaptionsOnPage() {
  if (!hideCC || isYouTube || isDisneyPlus || isNetflix || isHulu) return;
  try {
    const targetSelector = '.shaka-text-container, .vudu-subtitle, [class*="shaka-text"], [class*="vudu-subtitle"], [class*="vudu-cue"], [class*="vudu-text"], [class*="vudu-caption"], [class*="vjs-text-track"], [class*="player-timedtext"], [class*="timedtext"], [class*="subtitle"], [class*="caption"], [class*="PlaybackSubtitles"], [data-uia*="timed-text"], div[class*="x32vodv"], div[style*="background-color: rgba(20, 22, 26"], div[style*="background-color:rgba(20,22,26"], div[class*="x18l40ae"][class*="x14ctfv"], .hive-subtitle-renderer-wrapper, .hive-subtitle-renderer-cue-window, .hive-subtitle-renderer-line, [class*="hive-subtitle"], [class*="cue-window"], [class*="cue-line"]';
    const elements = queryAllElementsIncludingShadow(targetSelector);
    for (let el of elements) {
      // Guard: Skip interactive elements, tools, menus, or ad overlay wrappers
      if (el.querySelector && el.querySelector('video, button, svg, input, a, [class*="control"]:not([class*="subtitle"]):not([class*="caption"]), [class*="button"]:not([class*="subtitle"]):not([class*="caption"]), [class*="ad"]')) {
        continue;
      }
      
      if (isElementVideoPlayerUI(el)) {
        continue;
      }

      const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
      const id = (typeof el.id === 'string' ? el.id : '').toLowerCase();
      const isTargetClass = (cls.includes('shaka-text') || cls.includes('vudu-subtitle') || cls.includes('vudu-cue') || cls.includes('vudu-text') || cls.includes('vudu-caption') || cls.includes('vjs-text-track') || cls.includes('player-timedtext') || cls.includes('timedtext') || cls.includes('subtitle') || cls.includes('caption') || cls.includes('cue') || cls.includes('hive-subtitle') || cls.includes('cue-window') || cls.includes('cue-line') || id.includes('shaka-text') || id.includes('vudu-subtitle') || id.includes('vudu-cue') || id.includes('hive-subtitle') || id.includes('cue')) && !isElementVideoPlayerUI(el);
      const isShakaOrVuduDescendant = !!(el.closest && el.closest('.shaka-text-container, .shaka-text-wrapper, .shaka-text-region, [class*="shaka-text"], [class*="vudu-subtitle"], [class*="vudu-cue"], [class*="vudu-text"], .hive-subtitle-renderer-wrapper, [class*="hive-subtitle"]'));
      const isFacebookSubEl = isFacebook && (cls.includes('x32vodv') || cls.includes('x18l40ae') || cls.includes('x14ctfv') || (el.style && el.style.backgroundColor && el.style.backgroundColor.includes('rgba(')));
      
      const textContentTrimmed = el.textContent ? el.textContent.trim() : '';
      const canonical = (textContentTrimmed.length > 1) ? getCanonicalText(textContentTrimmed) : null;
      const isKnownSub = canonical ? isTextKnownSubtitle(canonical) : false;
      
      if (isTargetClass || isShakaOrVuduDescendant || isFacebookSubEl || (canonical && isInsideVideoPlayer(el) && isKnownSub)) {
        el.setAttribute('data-bootube-hidden', 'true');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('color', 'transparent', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('font-size', '0px', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('text-shadow', 'none', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.setProperty('clip-path', 'inset(100%)', 'important');
        el.style.setProperty('height', '0px', 'important');
        el.style.setProperty('width', '0px', 'important');
          
        if (el.querySelectorAll) {
          el.querySelectorAll('*').forEach(child => {
            child.setAttribute('data-bootube-hidden', 'true');
            child.style.setProperty('display', 'none', 'important');
            child.style.setProperty('color', 'transparent', 'important');
            child.style.setProperty('opacity', '0', 'important');
            child.style.setProperty('font-size', '0px', 'important');
            child.style.setProperty('visibility', 'hidden', 'important');
            child.style.setProperty('background-color', 'transparent', 'important');
            child.style.setProperty('text-shadow', 'none', 'important');
            child.style.setProperty('pointer-events', 'none', 'important');
          });
        }
        if (el.parentElement) {
          el.parentElement.setAttribute('data-bootube-parent-hidden', 'true');
          el.parentElement.style.setProperty('background-color', 'transparent', 'important');
          el.parentElement.style.setProperty('text-shadow', 'none', 'important');
        }
      }
    }
  } catch (e) {}
}

function restoreAllHiddenCaptions() {
  try {
    const restoreInRoot = (root) => {
      if (!root) return;
      
      const hidden = root.querySelectorAll('[data-bootube-hidden], [data-bootube-parent-hidden]');
      hidden.forEach(el => {
        const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
        const id = (typeof el.id === 'string' ? el.id : '').toLowerCase();
        if (cls.includes('option') || cls.includes('menu') || cls.includes('setting') || cls.includes('button') || cls.includes('dialog') || cls.includes('modal') || id.includes('option') || id.includes('menu') || id.includes('setting')) {
          el.removeAttribute('data-bootube-hidden');
          el.removeAttribute('data-bootube-parent-hidden');
          return;
        }
        if (el.style) {
          el.style.removeProperty('color');
          el.style.removeProperty('opacity');
          el.style.removeProperty('background');
          el.style.removeProperty('background-color');
          el.style.removeProperty('text-shadow');
          el.style.removeProperty('pointer-events');
          el.style.removeProperty('display');
          el.style.removeProperty('font-size');
          el.style.removeProperty('line-height');
          el.style.removeProperty('visibility');
          el.style.removeProperty('clip-path');
          el.style.removeProperty('border');
          el.style.removeProperty('outline');
          el.style.removeProperty('box-shadow');
          el.style.removeProperty('padding');
          el.style.removeProperty('margin');
          el.style.removeProperty('min-width');
          el.style.removeProperty('min-height');
          el.style.removeProperty('max-width');
          el.style.removeProperty('max-height');
          el.style.removeProperty('width');
          el.style.removeProperty('height');
        }
        el.removeAttribute('data-bootube-hidden');
        el.removeAttribute('data-bootube-parent-hidden');
      });
      
      // Check shadow roots for hidden elements (skip on YouTube for speed)
      if (!isYouTube) {
        const allElements = root.querySelectorAll('*');
        for (let i = 0; i < allElements.length; i++) {
          if (allElements[i].shadowRoot) {
            restoreInRoot(allElements[i].shadowRoot);
          }
        }
      }
    };
    
    restoreInRoot(document);
  } catch (e) {
    console.error("🤬 [Censor] Failed to restore hidden captions", e);
  }
}

const parentReferrer = (document.referrer || '').toLowerCase();
const currentHref = (window.location.href || '').toLowerCase();
const isDisneyPlus = window.location.hostname.includes('disneyplus.com') || parentReferrer.includes('disneyplus.com') || currentHref.includes('disneyplus.com') || topHost.includes('disneyplus.com') || topHref.includes('disneyplus.com');
const isHulu = window.location.hostname.includes('hulu.com') || parentReferrer.includes('hulu.com') || currentHref.includes('hulu.com') || topHost.includes('hulu.com') || topHref.includes('hulu.com');
const isPlex = window.location.hostname.includes('plex.tv') || window.location.hostname.includes('plex.direct') || window.location.port === '32400' || parentReferrer.includes('plex.tv') || parentReferrer.includes('plex.direct') || currentHref.includes('plex.tv') || currentHref.includes('plex.direct') || topHost.includes('plex.tv') || topHost.includes('plex.direct') || topHref.includes('plex.tv') || topHref.includes('plex.direct');
const isFandango = window.location.hostname.includes('fandango.com') || window.location.hostname.includes('vudu.com') || parentReferrer.includes('fandango.com') || parentReferrer.includes('vudu.com') || currentHref.includes('fandango.com') || currentHref.includes('vudu.com') || topHost.includes('fandango.com') || topHost.includes('vudu.com') || topHref.includes('fandango.com') || topHref.includes('vudu.com');
const isNetflix = window.location.hostname.includes('netflix.com') || parentReferrer.includes('netflix.com') || currentHref.includes('netflix.com') || topHost.includes('netflix.com') || topHref.includes('netflix.com');
const isPrimeVideo = window.location.hostname.includes('amazon.') || window.location.hostname.includes('primevideo.com') || parentReferrer.includes('amazon.') || parentReferrer.includes('primevideo.com') || currentHref.includes('amazon.') || currentHref.includes('primevideo.com') || topHost.includes('amazon.') || topHost.includes('primevideo.com') || topHref.includes('amazon.') || topHref.includes('primevideo.com');
const isYouTube = window.location.hostname.includes('youtube.com') || parentReferrer.includes('youtube.com') || currentHref.includes('youtube.com') || topHost.includes('youtube.com') || topHref.includes('youtube.com');
const isTwitter = window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com') || parentReferrer.includes('twitter.com') || parentReferrer.includes('x.com') || currentHref.includes('twitter.com') || currentHref.includes('x.com') || topHost.includes('twitter.com') || topHost.includes('x.com') || topHref.includes('twitter.com') || topHref.includes('x.com');
const isSpotify = window.location.hostname.includes('spotify.com') || parentReferrer.includes('spotify.com') || currentHref.includes('spotify.com') || topHost.includes('spotify.com') || topHref.includes('spotify.com');
const isFacebook = window.location.hostname.includes('facebook.com') || window.location.hostname.includes('fb.watch') || window.location.hostname.includes('fbcdn.net') || window.location.hostname.includes('messenger.com') || parentReferrer.includes('facebook.com') || parentReferrer.includes('fb.watch') || parentReferrer.includes('fbcdn.net') || parentReferrer.includes('messenger.com') || currentHref.includes('facebook.com') || currentHref.includes('fb.watch') || currentHref.includes('fbcdn.net') || currentHref.includes('maw_proxy') || currentHref.includes('messenger.com') || topHost.includes('facebook.com') || topHost.includes('fbcdn.net') || topHost.includes('messenger.com') || topHref.includes('facebook.com') || topHref.includes('fbcdn.net') || topHref.includes('messenger.com');
const isMax = window.location.hostname.includes('max.com') || window.location.hostname.includes('hbomax.com') || parentReferrer.includes('max.com') || parentReferrer.includes('hbomax.com') || currentHref.includes('max.com') || currentHref.includes('hbomax.com') || topHost.includes('max.com') || topHost.includes('hbomax.com') || topHref.includes('max.com') || topHref.includes('hbomax.com');
let isParamount = window.location.hostname.includes('paramountplus.com') || window.location.hostname.includes('cbs.com') || window.location.hostname.includes('cbsaavideo.com') || window.location.hostname.includes('cbsinteractive.com') || window.location.hostname.includes('theplatform.com') || parentReferrer.includes('paramountplus.com') || parentReferrer.includes('cbs.com') || parentReferrer.includes('cbsaavideo.com') || parentReferrer.includes('cbsinteractive.com') || parentReferrer.includes('theplatform.com') || currentHref.includes('paramountplus.com') || currentHref.includes('cbs.com') || currentHref.includes('cbsaavideo.com') || currentHref.includes('cbsinteractive.com') || currentHref.includes('theplatform.com') || topHost.includes('paramountplus.com') || topHost.includes('cbs.com') || topHost.includes('cbsaavideo.com') || topHost.includes('cbsinteractive.com') || topHost.includes('theplatform.com') || topHref.includes('paramountplus.com') || topHref.includes('cbs.com') || topHref.includes('cbsaavideo.com') || topHref.includes('cbsinteractive.com') || topHref.includes('theplatform.com');
const isPeacock = window.location.hostname.includes('peacocktv.com') || window.location.hostname.includes('peacock.com') || parentReferrer.includes('peacocktv.com') || parentReferrer.includes('peacock.com') || currentHref.includes('peacocktv.com') || currentHref.includes('peacock.com') || topHost.includes('peacocktv.com') || topHost.includes('peacock.com') || topHref.includes('peacocktv.com') || topHref.includes('peacock.com');

let spotifyBearerToken = null;
let lastSpotifyTrackId = null;
let chunkOffset = 0;
let lastUiTime = -1;
let subtitleSyncBeacons = [];
const injectedShadowRoots = new WeakSet();

let disneyTimeCache = null;
let huluTimeCache = null;
let lastHuluUiTime = -1;

function getMuteCooldown() {
  let cooldown = 1500;
  if (typeof muteAggressiveness !== 'undefined') {
    if (muteAggressiveness === 1) cooldown = 1000;
    else if (muteAggressiveness === 3) cooldown = 2500;
  }
  if ((typeof isPrimeVideo !== 'undefined' && isPrimeVideo) || (typeof isMax !== 'undefined' && isMax)) {
    cooldown = 2500;
    if (muteAggressiveness === 1) cooldown = 1800;
    else if (muteAggressiveness === 3) cooldown = 3200;
  }
  if (typeof isPlex !== 'undefined' && isPlex) {
    cooldown = 2200;
    if (muteAggressiveness === 1) cooldown = 1600;
    else if (muteAggressiveness === 3) cooldown = 3000;
  }
  if (typeof isNetflix !== 'undefined' && isNetflix) {
    cooldown = 500;
    if (muteAggressiveness === 1) cooldown = 350;
    else if (muteAggressiveness === 3) cooldown = 800;
  }
  if (typeof isPeacock !== 'undefined' && isPeacock) {
    cooldown = 1200;
    if (muteAggressiveness === 1) cooldown = 800;
    else if (muteAggressiveness === 3) cooldown = 1800;
  }
  if (typeof isFacebook !== 'undefined' && isFacebook) {
    cooldown = 8500;
    if (muteAggressiveness === 1) cooldown = 7500;
    else if (muteAggressiveness === 3) cooldown = 11000;
  }
  return cooldown;
}

function getFacebookMuteCooldown(text) {
  let baseCooldown = 8500;
  if (typeof muteAggressiveness !== 'undefined') {
    if (muteAggressiveness === 1) baseCooldown = 7500;
    else if (muteAggressiveness === 3) baseCooldown = 11000;
  }
  if (!text || typeof text !== 'string') return baseCooldown;
  
  let cooldown = baseCooldown;
  let matchIndex = -1;

  // Check asterisk masks
  const masksActive = typeof activeBlocklist !== 'undefined' && Array.isArray(activeBlocklist) && activeBlocklist.some(w => {
    let word = typeof w === 'string' ? w : (w ? w.word : '');
    return typeof word === 'string' && (/\[\s*_+\s*\]/.test(word) || /[*_]{2,}/.test(word) || word === '*' || word === '****' || word === '***');
  });
  const maskMatch = masksActive ? /(?:\[\s*_+\s*\]|\*{2,}|\b[a-z]{1,2}\*{1,}[a-z]*\b)/i.exec(text) : null;
  if (maskMatch) {
    matchIndex = maskMatch.index;
  }

  // Check blocklist words
  let count = 0;
  if (typeof activeBlocklist !== 'undefined' && Array.isArray(activeBlocklist)) {
    const wordsToCheck = getExpandedWords(activeBlocklist);
    for (const w of wordsToCheck) {
      if (!w || typeof w !== 'string') continue;
      const rx = getWordRegex(w);
      if (rx) {
        const m = rx.exec(text);
        if (m) {
          count++;
          if (matchIndex === -1 || m.index < matchIndex) {
            matchIndex = m.index;
          }
          if (count >= 5) break;
        }
      }
    }
  }

  // If the bad word is positioned later in the caption line (after preceding clean dialogue),
  // add proportional padding so the mute does not expire before the bad word is spoken!
  if (matchIndex > 15) {
    const latePadding = Math.min(3500, Math.floor((matchIndex - 15) / 10) * 1000 + 1000);
    cooldown += latePadding;
  }

  if (count > 1) {
    cooldown += (count - 1) * 2000;
  }
  return cooldown;
}

function getDisneyRealTime() {
  if (disneyTimeCache && disneyTimeCache.el && disneyTimeCache.el.isConnected) {
    if (disneyTimeCache.type === 'slider') {
      const val = disneyTimeCache.el.getAttribute('aria-valuenow') || disneyTimeCache.el.value;
      if (val !== null && val !== undefined) return parseFloat(val);
    } else {
      const match = disneyTimeCache.el.textContent.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (match) {
        return match[3] ? parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) : parseInt(match[1]) * 60 + parseInt(match[2]);
      }
    }
  }
  
  let results = [];
  function deepScan(root) {
    if (!root) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      if (root.shadowRoot) deepScan(root.shadowRoot);
      if (root.getAttribute('role') === 'slider' || (root.tagName === 'INPUT' && root.type === 'range')) {
        const val = root.getAttribute('aria-valuenow') || root.value;
        const max = root.getAttribute('aria-valuemax') || root.max;
        if (val && max && parseFloat(max) > 100) {
          results.push({ type: 'slider', el: root });
        }
      }
      for (let child of root.childNodes) deepScan(child);
    } else if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (let child of root.childNodes) deepScan(child);
    } else if (root.nodeType === Node.TEXT_NODE) {
      if (root.nodeValue && /^\s*(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*\/\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*$/.test(root.nodeValue)) {
        results.push({ type: 'text', el: root.parentElement });
      }
    }
  }
  
  try { deepScan(document.body); } catch(e) {}
  
  if (results.length > 0) {
    const slider = results.find(r => r.type === 'slider');
    if (slider) {
      disneyTimeCache = slider;
      return parseFloat(slider.el.getAttribute('aria-valuenow') || slider.el.value);
    } else {
      disneyTimeCache = results[0];
      const match = disneyTimeCache.el.textContent.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (match) {
        return match[3] ? parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) : parseInt(match[1]) * 60 + parseInt(match[2]);
      }
    }
  }
  return -1;
}

function getHuluRealTime() {
  if (huluTimeCache && huluTimeCache.el && huluTimeCache.el.isConnected) {
    if (huluTimeCache.type === 'slider') {
      const val = huluTimeCache.el.getAttribute('aria-valuenow') || huluTimeCache.el.value;
      if (val !== null && val !== undefined) return parseFloat(val);
    } else {
      const match = huluTimeCache.el.textContent.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (match) {
        return match[3] ? parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) : parseInt(match[1]) * 60 + parseInt(match[2]);
      }
    }
  }
  
  let results = [];
  function deepScan(root) {
    if (!root) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      if (root.shadowRoot) deepScan(root.shadowRoot);
      if (root.getAttribute('role') === 'slider' || (root.tagName === 'INPUT' && root.type === 'range')) {
        const val = root.getAttribute('aria-valuenow') || root.value;
        const max = root.getAttribute('aria-valuemax') || root.max;
        if (val && max && parseFloat(max) > 100) {
          results.push({ type: 'slider', el: root });
        }
      }
      for (let child of root.childNodes) deepScan(child);
    } else if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (let child of root.childNodes) deepScan(child);
    } else if (root.nodeType === Node.TEXT_NODE) {
      if (root.nodeValue && /^\s*(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*\/\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*$/.test(root.nodeValue)) {
        results.push({ type: 'text', el: root.parentElement });
      }
    }
  }
  
  try { deepScan(document.body); } catch(e) {}
  
  if (results.length > 0) {
    const slider = results.find(r => r.type === 'slider');
    if (slider) {
      huluTimeCache = slider;
      return parseFloat(slider.el.getAttribute('aria-valuenow') || slider.el.value);
    } else {
      huluTimeCache = results[0];
      const match = huluTimeCache.el.textContent.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (match) {
        return match[3] ? parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) : parseInt(match[1]) * 60 + parseInt(match[2]);
      }
    }
  }
  return -1;
}

 function findTextInDOM(targetText) {
  let found = false;
  const targetLower = targetText.toLowerCase();

  // Find the subtitle container root node to avoid scanning the entire DOM!
  let rootNode = findShadowElement(document.body, '.hive-subtitle-renderer-wrapper') ||
                 findShadowElement(document.body, '.shaka-text-container') ||
                 findShadowElement(document.body, '.ytp-caption-window-container') ||
                 findShadowElement(document.body, '.dss-subtitle-container') ||
                 findShadowElement(document.body, '.dss-hls-subtitle-overlay') ||
                 findShadowElement(document.body, '.player-timedtext') ||
                 findShadowElement(document.body, 'div[class*="playback__subtitles"]') ||
                 findShadowElement(document.body, 'div[class*="shaka-text"]') ||
                 findShadowElement(document.body, '[class*="subtitles-container"]') ||
                 findShadowElement(document.body, '[class*="subtitle-text"]');

  if (!rootNode) {
     rootNode = document.body;
  }

  function scan(root) {
     if (found) return;
     if (!root) return;
     if (root.nodeType === Node.TEXT_NODE) {
        if (root.nodeValue) {
           const cleanNode = root.nodeValue.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, " ").toLowerCase();
           if (cleanNode.includes(targetLower)) {
              found = true;
              
              let path = [];
              let temp = root.parentElement;
              for (let j = 0; j < 5; j++) {
                 if (!temp) break;
                 let cls = '';
                 if (typeof temp.className === 'string') cls = temp.className;
                 else if (temp.classList && temp.classList.length > 0) cls = Array.from(temp.classList).join('.');
                 path.push(temp.tagName + (cls ? '.' + cls : ''));
                 temp = temp.parentElement;
              }
              console.log(`🤬 [Censor-Diagnostic] Found text "${targetText}" at:`, path.join(' -> '));
              
              if (hideCC && !isYouTube && root.parentElement) {
                 let sCurr = root.parentElement;
                 sCurr.setAttribute('data-bootube-hidden', 'true');
                 sCurr.style.setProperty('color', 'transparent', 'important');
                 sCurr.style.setProperty('background-color', 'transparent', 'important');
                 sCurr.style.setProperty('text-shadow', 'none', 'important');
                 
                 if (sCurr.parentElement) {
                   sCurr.parentElement.setAttribute('data-bootube-parent-hidden', 'true');
                   sCurr.parentElement.style.setProperty('background-color', 'transparent', 'important');
                   sCurr.parentElement.style.setProperty('text-shadow', 'none', 'important');
                 }
              }
           }
        }
     } else if (root.nodeType === Node.ELEMENT_NODE) {
        if (root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
        if (root.shadowRoot) scan(root.shadowRoot);
        for (let child of root.childNodes) scan(child);
     } else if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        for (let child of root.childNodes) scan(child);
     }
  }
  try { scan(rootNode); } catch(e) {}
  return found;
}

let hideCC = true;
let enableBlur = true;
let extensionEnabled = true;
let revealWordsEnabled = false;
let styleElement = null;

function obfuscateWord(word) {
  if (!word || typeof word !== 'string') return word;
  const w = word.trim();
  if (w.length <= 2 || (w.includes("[") && w.includes("]"))) {
    return w;
  }
  return w[0] + '*'.repeat(w.length - 2) + w[w.length - 1];
}

function getProfanityReplacementText(word) {
  if (revealWordsEnabled) {
    return word;
  }
  return obfuscateWord(word);
}

let isStorageLoaded = false;
let queuedPayloads = [];

console.log("🤬 [Censor] Content script loaded. Initializing bulletproof tracker...");
// Initialize storage safely
function handleSettingsLoaded(result) {
  if (!result) return;
  isPremiumUser = checkIsPremium(result ? result.subscriptionStatus : undefined);
  
  if (isPremiumUser) {
    const existingBanner = document.getElementById('bootube-upgrade-banner');
    if (existingBanner) existingBanner.remove();
  }

  const rawBlocklist = result.blocklist || [];
  disabledWords = result.disabledWords || [];
  
  if (result.enabledCategories !== undefined) enabledCategories = result.enabledCategories;
  if (result.respectfulModeEnabled !== undefined) respectfulModeEnabled = result.respectfulModeEnabled;
  if (result.hideCCEnabled !== undefined) hideCC = result.hideCCEnabled;
  if (result.revealWordsEnabled !== undefined) revealWordsEnabled = result.revealWordsEnabled;
  
  // Advanced settings (Blur, Mute buffer) are fully functional on all tiers
  enableBlur = result.blurEnabled ?? true;
  extensionEnabled = result.bootubeEnabled ?? true;
  if (result.whitelistedChannels !== undefined) whitelistedChannels = result.whitelistedChannels;
  muteAggressiveness = result.muteAggressiveness ?? 2;

  if (!extensionEnabled) {
    activeBlocklist = [];
    muteZones = [];
    networkIsMuting = false;
    fallbackIsMuting = false;
    isStorageLoaded = true;
    applyHideCCStyle();
    updatePlayerState();
    console.log("🤬 [Censor] Censor is OFF. Blocklist cleared and muting disabled.");
    return;
  }
  
  // Transform object array into string array based on enabled categories, filtering out premium lists if not active
  const cats = isPremiumUser ? (enabledCategories || ["Profanity", "Blasphemy", "Religious exclamations", "Sexual", "Scatological", "Anatomical", "Derogatory", "Bleeps & Symbols", "Custom"]) : ["Religious exclamations", "Blasphemy"];
  
  activeBlocklist = rawBlocklist.filter(item => {
    const word = typeof item === 'string' ? item : item.word;
    const cat = typeof item === 'string' ? 'Custom' : item.category;
    
    if (!isPremiumUser && cat !== "Religious exclamations" && cat !== "Blasphemy") {
      return false;
    }
    
    const lowerWord = (typeof word === 'string' ? word : '').toLowerCase().trim();
    const isWordDisabled = disabledWords.some(dw => (typeof dw === 'string' ? dw : '').toLowerCase().trim() === lowerWord);
    if (isWordDisabled) return false;
    
    if (cat === 'Custom') return cats.includes('Custom');
    if (cats.includes(cat)) return true;
    if (cat === 'Blasphemy' && cats.includes('Religious exclamations')) return true;
    if (cat === 'Religious exclamations' && cats.includes('Blasphemy')) return true;
    return false;
  }).map(item => typeof item === 'string' ? item : item.word);
  
  if (typeof regexCache !== 'undefined' && regexCache && regexCache.clear) {
    regexCache.clear();
  }
  
  applyHideCCStyle();
  
  muteZones = [];
  fallbackIsMuting = false;
  networkIsMuting = false;
  restoreAllTextTrackCues();

  if (isPrimeVideo || isMax) {
    allCaptionPayloads = [];
    muteZones = [];
    try {
      if (isContextValid()) {
        chrome.storage.local.remove(['activeVideoCaptions', 'lastFetchedCaptions']);
      }
    } catch(e) {}
  } else if (allCaptionPayloads && allCaptionPayloads.length > 0) {
     allCaptionPayloads.forEach(data => processCaptionData(data.payload, data.isTranslated));
  } else if (!isYouTube && result.lastFetchedCaptions && result.lastFetchedCaptions.payload) {
     const data = result.lastFetchedCaptions;
     if (Date.now() - data.timestamp < 3600000) { // 1 hour fresh
        allCaptionPayloads = [{ payload: data.payload, isTranslated: data.isTranslated, _timestamp: data.timestamp }];
        processCaptionData(data.payload, data.isTranslated);
     }
  }
  
  if (Array.isArray(muteZones)) {
    muteZones.sort((a, b) => a.start - b.start);
  }
  
  isStorageLoaded = true;
  queuedPayloads.forEach(p => processCaptionData(p.payload, p.isTranslated));
  queuedPayloads = [];
  
  startTrackingPlaytime();
  updatePlayerState();
  console.log("🤬 [Censor] Storage loaded, blocklist ready with", activeBlocklist.length, "words. Mute zones count:", muteZones.length);
}

// Initialize storage safely
if (isContextValid()) {
  try {
    chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions', 'revealWordsEnabled'], (result) => {
      handleSettingsLoaded(result);
    });
  } catch (e) {
    console.error("🤬 [Censor] failed to get storage during init", e);
  }
} else {
  // We are in a sandboxed unique-origin iframe. Request settings from parent page!
  try {
    window.parent.postMessage({ type: 'BOOTUBE_REQ_SETTINGS' }, '*');
  } catch (e) {}
}

function broadcastSettingsToSubframes(settings) {
  try {
    const frames = document.querySelectorAll('iframe');
    frames.forEach(f => {
      try {
        if (f.contentWindow) {
          f.contentWindow.postMessage({
            type: 'BOOTUBE_RESP_SETTINGS',
            settings: settings
          }, '*');
        }
      } catch (e) {}
    });
  } catch (e) {}
}

// Sync settings between frames
window.addEventListener('message', (event) => {
  if (!event || !event.data) return;
  
  if (event.data.type === 'BOOTUBE_REQ_SETTINGS') {
    if (isContextValid()) {
      try {
        chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions', 'revealWordsEnabled'], (result) => {
          try {
            if (event.source) {
              event.source.postMessage({
                type: 'BOOTUBE_RESP_SETTINGS',
                settings: result
              }, '*');
            }
          } catch (e) {}
        });
      } catch (e) {}
    }
  } else if (event.data.type === 'BOOTUBE_RESP_SETTINGS') {
    handleSettingsLoaded(event.data.settings);
  }
});

if (isContextValid()) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (isSubFrame) {
        if (changes.bootubeEnabled !== undefined) {
           extensionEnabled = changes.bootubeEnabled.newValue ?? changes.bootubeEnabled;
           applyHideCCStyle();
        }
        if (changes.hideCCEnabled !== undefined) {
           hideCC = changes.hideCCEnabled.newValue ?? changes.hideCCEnabled;
           applyHideCCStyle();
        }
        
        const needsBlocklistReload = changes.blocklist || changes.disabledWords || changes.enabledCategories || changes.respectfulModeEnabled || changes.muteAggressiveness !== undefined;
        if (!needsBlocklistReload) {
           return;
        }
      }
      if (changes.subscriptionStatus !== undefined) {
         isPremiumUser = checkIsPremium(changes.subscriptionStatus.newValue ?? changes.subscriptionStatus);
         if (isPremiumUser) {
            const banner = document.getElementById('bootube-upgrade-banner');
            if (banner) banner.remove();
         }
      }
      if (changes.bootubeEnabled !== undefined) {
         extensionEnabled = changes.bootubeEnabled.newValue ?? changes.bootubeEnabled;
         applyHideCCStyle();
         updatePlayerState();
         if (isYouTube) {
            if (extensionEnabled) {
               autoEnableCC();
            } else {
               disableCC();
            }
         }
      }
      if (changes.hideCCEnabled !== undefined) {
         hideCC = changes.hideCCEnabled.newValue ?? changes.hideCCEnabled;
         applyHideCCStyle();
      }
      if (changes.revealWordsEnabled !== undefined) {
         revealWordsEnabled = changes.revealWordsEnabled.newValue ?? changes.revealWordsEnabled;
      }
      if (changes.blurEnabled !== undefined) {
         enableBlur = changes.blurEnabled.newValue ?? changes.blurEnabled;
         updatePlayerState();
      }
      if (changes.respectfulModeEnabled !== undefined) respectfulModeEnabled = changes.respectfulModeEnabled.newValue ?? changes.respectfulModeEnabled;
      if (changes.enabledCategories !== undefined) enabledCategories = changes.enabledCategories.newValue ?? changes.enabledCategories;
      if (changes.muteAggressiveness !== undefined) muteAggressiveness = changes.muteAggressiveness.newValue ?? changes.muteAggressiveness;
      
      if (changes.blocklist || changes.disabledWords || changes.enabledCategories || changes.respectfulModeEnabled || changes.muteAggressiveness !== undefined || changes.subscriptionStatus !== undefined || changes.bootubeEnabled !== undefined || changes.hideCCEnabled !== undefined || changes.blurEnabled !== undefined || changes.whitelistedChannels || changes.revealWordsEnabled !== undefined) {
        if (isContextValid()) {
          try {
            chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions', 'revealWordsEnabled'], (res) => {
              if (!isContextValid() || !res) return;
              
              handleSettingsLoaded(res);
              broadcastSettingsToSubframes(res);
            });
          } catch (e) {
            console.error("🤬 [Censor] failed to get storage during onChanged", e);
          }
        }
      }
      
      if (changes.whitelistedChannels) {
        whitelistedChannels = changes.whitelistedChannels.newValue || [];
      }
      if (!isPrimeVideo && !isMax && changes.lastFetchedCaptions && changes.lastFetchedCaptions.newValue) {
        const data = changes.lastFetchedCaptions.newValue;
        processCaptionData(data.payload, data.isTranslated);
      }
    }
  });
}

setInterval(() => {
   // Skip on YouTube — shadow root injection not needed; querySelectorAll('*') is expensive on YT's DOM
   if (!isYouTube && extensionEnabled && hideCC) {
      applyHideCCStyle();
   }
}, 1000);

// Communication with popup
if (isContextValid()) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (isSubFrame) return;
    if (request.type === 'GET_CHANNEL_INFO') {
      sendResponse({
        channelName: currentChannelName,
        isReligiousContext: isReligiousContext
      });
    } else if (request.action === 'REQUEST_CAPTIONS') {
      if (allCaptionPayloads && allCaptionPayloads.length > 0) {
        sendResponse({ payloads: allCaptionPayloads });
      } else if (isContextValid()) {
        try {
          chrome.storage.local.get(['activeVideoCaptions', 'lastFetchedCaptions'], (res) => {
            let fallback = [];
            if (res && res.activeVideoCaptions && res.activeVideoCaptions.length > 0) {
              fallback = res.activeVideoCaptions;
            } else if (res && res.lastFetchedCaptions) {
              fallback = [res.lastFetchedCaptions];
            }
            sendResponse({ payloads: fallback });
          });
        } catch (e) {
          sendResponse({ payloads: [] });
        }
        return true;
      } else {
        sendResponse({ payloads: [] });
      }
    }
  });
}

function restoreAllTextTrackCues() {
  try {
    const vids = findVideos();
    vids.forEach(v => {
      if (v && v.textTracks) {
        for (let t = 0; t < v.textTracks.length; t++) {
          const track = v.textTracks[t];
          const cues = (track.cues && track.cues.length > 0) ? track.cues : track.activeCues;
          if (cues) {
            for (let c = 0; c < cues.length; c++) {
              const cue = cues[c];
              if (cue && cue._bootubeOriginalText !== undefined) {
                try { cue.text = cue._bootubeOriginalText; } catch(e) {}
              }
            }
          }
        }
      }
    });
  } catch(e) {}
  
  try {
    const segments = getSubtitleSegments();
    segments.forEach(s => {
      const original = s.getAttribute('data-bootube-original-text');
      if (original !== null && original !== undefined) {
        s.textContent = original;
        s.removeAttribute('data-bootube-original-text');
      }
    });
  } catch(e) {}
}



function applyHideCCStyle() {
  const isCurrentlyHiding = extensionEnabled === true && hideCC === true;
  if (!isCurrentlyHiding) {
    restoreAllHiddenCaptions();
  }
  try {
    window.postMessage({ type: 'BOOTUBE_SETTINGS_UPDATED', hideCC: hideCC, extensionEnabled: extensionEnabled }, '*');
  } catch(e) {}
  try {
    if (!isFandango && !isParamount && !isNetflix) {
      const vids = findVideos();
      vids.forEach(v => {
        if (v && v.textTracks) {
          for (let i = 0; i < v.textTracks.length; i++) {
            const track = v.textTracks[i];
            if (isCurrentlyHiding) {
              if (track.mode !== 'hidden') {
                try {
                  if (!track._bootubeWasShowing) {
                    track._bootubeWasShowing = track.mode;
                  }
                  track.mode = 'hidden';
                } catch(e) {}
              }
            } else {
              if (track._bootubeWasShowing && track.mode === 'hidden') {
                try {
                  track.mode = (track._bootubeWasShowing === 'disabled') ? 'disabled' : 'showing';
                  delete track._bootubeWasShowing;
                } catch(e) {}
              }
            }
          }
        }
      });
    }
  } catch(e) {}



  const fandangoCss = (isCurrentlyHiding && isFandango) ? `
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

  const paramountCss = (isCurrentlyHiding && isParamount) ? `
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
  if (isCurrentlyHiding) {
    if (isFandango) {
      activeCustomCss = fandangoCss;
    } else if (isParamount) {
      activeCustomCss = paramountCss;
    } else {
      activeCustomCss = `
    .shaka-text-container, .shaka-text-container *, .shaka-text-wrapper, .shaka-text-wrapper *, .shaka-text-region, .shaka-text-region *, [class*="shaka-text"], [class*="shaka-text"] *, [class*="shaka-text"] span, [class*="shaka-text"] div, [class*="vudu-subtitle"], [class*="vudu-subtitle"] *, [class*="vudu-subtitle"] span, [class*="vudu-subtitle"] div, [class*="vudu-cue"], [class*="vudu-cue"] *, [class*="vudu-text"], [class*="vudu-text"] *, [class*="vudu-caption"], [class*="vudu-caption"] *, div[class*="subtitle"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="Subtitle"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="subtitles"]:not([class*="ytp-"]):not([class*="ytp-button"]), div[class*="Subtitles"]:not([class*="ytp-"]):not([class*="ytp-button"]), .player-timedtext, .player-timedtext *, [class*="player-timedtext"], [class*="player-timedtext"] *, [class*="timedtext"], [class*="timedtext"] *, [data-uia*="timed-text"], [data-uia*="timed-text"] *, .vjs-text-track-display, .vjs-text-track-display *, .vjs-text-track-cue, .vjs-text-track-cue *, .hive-subtitle-renderer-wrapper, .hive-subtitle-renderer-wrapper *, .hive-subtitle-renderer-cue-window, .hive-subtitle-renderer-cue-window *, .hive-subtitle-renderer-line, .hive-subtitle-renderer-line *, .hive-subtitle-renderer-cue, .hive-subtitle-renderer-cue *, [class*="hive-subtitle"], [class*="hive-subtitle"] *, [class*="cue-window"], [class*="cue-window"] *, [class*="cue-line"], [class*="cue-line"] *, [id*="hive-subtitle"], [id*="hive-subtitle"] * { display: none !important; color: transparent !important; background: transparent !important; background-color: transparent !important; text-shadow: none !important; font-size: 0px !important; line-height: 0px !important; max-height: 0px !important; max-width: 0px !important; min-height: 0px !important; min-width: 0px !important; height: 0px !important; width: 0px !important; opacity: 0 !important; visibility: hidden !important; border: none !important; box-shadow: none !important; outline: none !important; padding: 0px !important; margin: 0px !important; clip-path: inset(100%) !important; overflow: hidden !important; }
    .shaka-controls-overlay:not(.shaka-text-container), .shaka-controls-overlay *:not(.shaka-text-container):not(.shaka-text-container *):not(.shaka-text-wrapper):not(.shaka-text-wrapper *):not(.shaka-text-region):not(.shaka-text-region *):not([class*="shaka-text"]):not([class*="shaka-text"] *):not([class*="vudu-subtitle"]):not([class*="vudu-subtitle"] *):not([class*="vudu-cue"]):not([class*="vudu-cue"] *), .shaka-bottom-controls, .shaka-bottom-controls *, .shaka-seek-bar-container, .shaka-seek-bar-container *, .shaka-seek-bar, .shaka-seek-bar *, .shaka-play-button, .shaka-volume-bar-container, .shaka-volume-bar-container *, [class*="seek-bar"], [class*="scrubber"] { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
    .caption-visual-line, .cfq7fuo, .crgqtox, .ytp-caption-segment, .ytp-caption-segment *, .ytp-caption-window-container, .ytp-caption-window-container *, .caption-window, .caption-window *, [class*="avia-caption"], [class*="avia-caption"] *, [class*="avia-subtitle"], [class*="avia-subtitle"] *, [data-testid="caption_renderer_overlay"], [data-testid="caption_renderer_overlay"] *, [class*="PlaybackSubtitles"], [class*="PlaybackSubtitles"] *, div[class*="x32vodv"], div[class*="x32vodv"] *, div[class*="x18l40ae"][class*="x14ctfv"], div[class*="x18l40ae"][class*="x14ctfv"] *, div[style*="background-color: rgba(20, 22, 26"], div[style*="background-color: rgba(20, 22, 26"] *, div[style*="background-color:rgba(20,22,26"], div[style*="background-color:rgba(20,22,26"] * { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
    video::-webkit-media-text-track-container { opacity: 0 !important; visibility: hidden !important; display: none !important; }
    video::-webkit-media-text-track-display { opacity: 0 !important; visibility: hidden !important; display: none !important; }
    video::-webkit-media-text-track-region { opacity: 0 !important; visibility: hidden !important; display: none !important; }
    ::cue, video::cue { color: transparent !important; background-color: transparent !important; text-shadow: none !important; opacity: 0 !important; visibility: hidden !important; font-size: 0px !important; display: none !important; }
    .ytp-subtitles-button, .ytp-subtitles-button *, .ytp-subtitles-button-container, .ytp-subtitles-button-container *, button[class*="ytp-subtitles"], button[class*="ytp-subtitles"] *, div[class*="ytp-subtitles"], div[class*="ytp-subtitles"] * { opacity: 1 !important; visibility: visible !important; display: inline-block !important; color: inherit !important; font-size: inherit !important; line-height: inherit !important; max-height: none !important; max-width: none !important; pointer-events: auto !important; transform: none !important; clip-path: none !important; filter: none !important; }
      `;
    }
  }

  const lightCssText = activeCustomCss;
  const shadowCssText = activeCustomCss;

  // 1. Inject into Light DOM
  let lightStyle = document.getElementById('censor-light-css');
  if (!lightStyle) {
    try {
      lightStyle = document.createElement('style');
      if (lightStyle) {
        lightStyle.id = 'censor-light-css';
        const target = document.head || document.documentElement;
        if (target) target.appendChild(lightStyle);
      }
    } catch(e) {}
  }
  if (lightStyle && lightStyle.textContent !== lightCssText) {
    lightStyle.textContent = lightCssText;
  }

  // 2. Inject into all Shadow DOMs on the page dynamically (including nested shadow roots).
  // Throttled: skip if less than 2000ms since last scan to avoid expensive DOM walk on every call.
  // Also skip entirely on YouTube where shadow root injection is unnecessary.
  const _now = Date.now();
  if (!isYouTube && (_now - (applyHideCCStyle._lastShadowScan || 0) > 2000 || shadowCssText !== applyHideCCStyle._lastShadowCss)) {
    applyHideCCStyle._lastShadowScan = _now;
    applyHideCCStyle._lastShadowCss = shadowCssText;
    try {
       const allElements = document.querySelectorAll('*');
       for (let i = 0; i < allElements.length; i++) {
          if (allElements[i].shadowRoot) {
             injectShadowCss(allElements[i].shadowRoot, shadowCssText);
          }
       }
    } catch(e) {}
  }
}

if (isFandango || isParamount) {
  let autoHidingIdleTimer = null;
  const AUTO_HIDE_IDLE_TIMEOUT_MS = 2500;

  function wakeUpAutoHidingControls() {
    if (!extensionEnabled || !hideCC) return;
    if (document.body) {
      if (isFandango) {
        document.body.classList.add('bootube-fandango-active');
        document.body.classList.remove('bootube-fandango-idle');
      }
      if (isParamount) {
        document.body.classList.add('bootube-paramount-active');
        document.body.classList.remove('bootube-paramount-idle');
      }
    }

    if (autoHidingIdleTimer) clearTimeout(autoHidingIdleTimer);
    autoHidingIdleTimer = setTimeout(() => {
      if (extensionEnabled && hideCC && document.body) {
        if (isFandango) {
          document.body.classList.add('bootube-fandango-idle');
          document.body.classList.remove('bootube-fandango-active');
        }
        if (isParamount) {
          document.body.classList.add('bootube-paramount-idle');
          document.body.classList.remove('bootube-paramount-active');
        }
      }
    }, AUTO_HIDE_IDLE_TIMEOUT_MS);
  }

  ['mousemove', 'pointermove', 'mousedown', 'keydown', 'touchstart'].forEach(evtType => {
    window.addEventListener(evtType, wakeUpAutoHidingControls, { passive: true });
  });

  wakeUpAutoHidingControls();

  if (isFandango) {
    try {
      const fandangoInspectorObs = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const txt = node.textContent ? node.textContent.trim() : '';
              if (txt.length > 2 && txt.length < 200 && !node.querySelector('button, svg, video, script, style')) {
                let pPath = [];
                let cur = node;
                for (let i = 0; i < 4; i++) {
                  if (!cur) break;
                  let cName = typeof cur.className === 'string' ? cur.className : '';
                  pPath.push(cur.tagName + (cName ? '.' + cName : ''));
                  cur = cur.parentElement;
                }
                console.log(`🤬 [Fandango Subtitle Inspector] Found text "${txt}" at:`, pPath.join(' -> '));
              }
            }
          });
        });
      });
      if (document.body || document.documentElement) {
        fandangoInspectorObs.observe(document.body || document.documentElement, { childList: true, subtree: true });
      }
    } catch(e) {}
  }
}

function injectShadowCss(shadowRoot, cssText) {
  if (!shadowRoot) return;
  if (injectedShadowRoots.has(shadowRoot)) {
     const shadowStyle = shadowRoot.getElementById ? shadowRoot.getElementById('censor-shadow-css') : null;
     if (shadowStyle && shadowStyle.textContent === cssText) {
        return;
     }
  }

  let shadowStyle = shadowRoot.getElementById ? shadowRoot.getElementById('censor-shadow-css') : null;
  if (!shadowStyle) {
     try {
       shadowStyle = document.createElement('style');
       if (shadowStyle) {
         shadowStyle.id = 'censor-shadow-css';
         shadowRoot.appendChild(shadowStyle);
       }
     } catch(e) {}
  }
  if (shadowStyle && shadowStyle.textContent !== cssText) {
     shadowStyle.textContent = cssText;
  }
  injectedShadowRoots.add(shadowRoot);
}

function extractMetadata() {
  try {
      if (typeof metaInterval !== 'undefined' && metaInterval) {
          clearInterval(metaInterval);
          metaInterval = null;
      }
      currentChannelName = "";
      isReligiousContext = false;
      
      if (Array.isArray(whitelistedChannels)) {
          whitelistedChannels = whitelistedChannels.filter(c => c !== "");
      } else {
          whitelistedChannels = [];
      }

      let attempts = 0;
      metaInterval = setInterval(() => {
          attempts++;
          try {
              if (isHulu) {
                 const huluTitle = getHuluMetadataTitle();
                 if (huluTitle) {
                    currentChannelName = huluTitle;
                    if (!document.title.includes(huluTitle)) {
                       document.title = huluTitle + " | Hulu";
                    }
                 }
              }
              
              if (isPlex) {
                 const plexTitle = getPlexDOMTitle();
                 if (plexTitle) {
                    currentChannelName = plexTitle;
                 }
              }
              
              let anyChannelText = null;
              
              if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails && window.ytInitialPlayerResponse.videoDetails.author) {
                  currentChannelName = window.ytInitialPlayerResponse.videoDetails.author;
              } else {
                  const metaName = document.querySelector('span[itemprop="author"] link[itemprop="name"]');
                  if (metaName) {
                      currentChannelName = metaName.getAttribute('content').trim();
                  } else {
                      const selectors = [
                          '.slim-owner-channel-name', '.ytm-slim-owner-renderer', 'a[href^="/@"]', 
                          '.ytd-channel-name', '.ytm-channel-name', 'ytm-channel-name',
                          'c3-material-button.ytm-channel-button', '.yt-core-attributed-string'
                      ];
                      for (let sel of selectors) {
                          anyChannelText = document.querySelector(sel);
                          if (anyChannelText && anyChannelText.textContent.trim().length > 0) {
                              let text = anyChannelText.textContent.trim();
                              text = text.split('\n')[0].split('subscribers')[0].trim();
                              if (text.length < 50 && text.length > 0) {
                                  currentChannelName = text;
                                  break;
                              }
                          }
                      }
                  }
              }
              
              let rawTitle = (document.title || "").toLowerCase();
              if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
                  if (window.ytInitialPlayerResponse.videoDetails.title) {
                      rawTitle += " " + window.ytInitialPlayerResponse.videoDetails.title.toLowerCase();
                  }
                  if (window.ytInitialPlayerResponse.videoDetails.shortDescription) {
                      rawTitle += " " + window.ytInitialPlayerResponse.videoDetails.shortDescription.toLowerCase();
                  }
              }
              
              let title = "";
              for (let i = 0; i < rawTitle.length; i++) {
                  let charCode = rawTitle.charCodeAt(i);
                  if ((charCode >= 97 && charCode <= 122) || (charCode >= 48 && charCode <= 57) || charCode === 32) {
                      title += rawTitle[i];
                  } else {
                      title += " ";
                  }
              }

              const RELIGIOUS_KEYWORDS_REGEX = /\b(?:religion|religions|religious|christian|christians|christianity|church|churches|sermon|sermons|gospel|gospels|lds|mormon|mormons|worship|worshipping|worshiper|worshipers|worshipper|worshippers|worships|ministry|ministries|pastor|pastors|priest|priests|bishop|bishops|bible|biblical|scripture|scriptures|god|jesus|christ|lord|savior|messiah|jehovah|yahweh|faith|prayer|prayers|pray|praying|devotional|devotionals|catholic|catholicism|orthodox|baptist|methodist|lutheran|presbyterian|evangelical|preach|preaches|preaching|doctrine|doctrines|covenant|covenants|apostle|apostles|disciple|disciples|testimony|testimonies|sacred|heavenly|blessing|blessings)\b/i;
                
               let foundNewReligious = false;
               if (!isSpotify) {
                  let sampleCaptionText = '';
                  if (allCaptionPayloads && allCaptionPayloads.length > 0) {
                     try {
                        const evs = allCaptionPayloads[0]?.payload?.events || [];
                        sampleCaptionText = evs.slice(0, 30).map(e => (e.segs || []).map(s => s.utf8 || '').join('')).join(' ').toLowerCase();
                     } catch(e) {}
                  }
                  const combinedTextLower = `${rawTitle} ${currentChannelName} ${sampleCaptionText}`.toLowerCase();
                  foundNewReligious = RELIGIOUS_KEYWORDS_REGEX.test(combinedTextLower);
               }
              
              let isWhitelisted = (typeof isChannelWhitelisted === 'function') ? isChannelWhitelisted(currentChannelName) : whitelistedChannels.includes(currentChannelName);
              
              const contextChanged = (foundNewReligious !== isReligiousContext) || (isWhitelisted !== wasChannelWhitelisted);
              const hasUnnecessaryMutes = isYouTube && (foundNewReligious || isWhitelisted) && respectfulModeEnabled && muteZones.some(z => z.word && safeList.includes(z.word.toLowerCase()));

              if (contextChanged || hasUnnecessaryMutes) {
                  isReligiousContext = foundNewReligious;
                  wasChannelWhitelisted = isWhitelisted;
                  console.log(`🤬 [Censor] Context updated: isReligiousContext=${isReligiousContext}, isWhitelisted=${isWhitelisted}, channel="${currentChannelName}". Re-processing captions.`);
                  muteZones = [];
                  if (allCaptionPayloads && allCaptionPayloads.length > 0) {
                     allCaptionPayloads.forEach(data => processCaptionData(data.payload, data.isTranslated));
                  }
              }
              
              if (currentChannelName !== "" || attempts > 10) {
                  if (typeof metaInterval !== 'undefined' && metaInterval) {
                      clearInterval(metaInterval);
                      metaInterval = null;
                  }
              }
          } catch(e) {}
      }, 1000);
  } catch(e) { console.error("extractMetadata failed", e); }
}

let lastSpotifyTrack = '';

function getSpotifyTrackId() {
  if (!isSpotify) return '';
  try {
    const trackEl = document.querySelector('[data-testid="now-playing-widget"] a[href*="/track/"], [data-testid="context-item-link"], [data-testid="nowplaying-track-link"]');
    if (trackEl) {
      const href = trackEl.getAttribute('href') || '';
      if (href) return href;
      return trackEl.textContent.trim();
    }
  } catch(e) {}
  return document.title || '';
}

// 1. Better DOM/SPA tracking
  setInterval(() => {
    if (isSubFrame && !isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isYouTube && !isTwitter && !isSpotify && !isFacebook && !isMax && !isParamount && !isPeacock) return;
    const vids = findVideos();
  const currentVid = getActiveVideoElement(vids);

  // Continuously ensure our CSS rules apply to dynamically mounted shadow roots.
  // Skip on YouTube — shadow root injection not needed and querySelectorAll('*') is expensive on YT's DOM.
  if (!isYouTube && extensionEnabled && hideCC) {
    applyHideCCStyle();
  }

  if (isHulu && extensionEnabled) {
     try {
        const huluTitle = getHuluMetadataTitle();
        if (huluTitle && huluTitle.toLowerCase() !== 'hulu' && huluTitle.toLowerCase() !== 'watch') {
           currentChannelName = huluTitle;
           if (!document.title.includes(huluTitle)) {
              document.title = huluTitle + " | Hulu";
           }
        }
     } catch(e) {}
  }
  
  if (isPlex && extensionEnabled) {
     try {
        const plexTitle = getPlexDOMTitle();
        if (plexTitle && plexTitle !== "Plex | Watch") {
           currentChannelName = plexTitle;
        }
     } catch(e) {}
  }

  if (!currentVid && !isSpotify) return;
  if (currentVid || isSpotify) {
    try {
      if (!isYouTube) {
        const hosts = document.querySelectorAll('*');
        hosts.forEach(host => {
           if (host.shadowRoot && !host.shadowRoot._observed) {
              host.shadowRoot._observed = true;
              subtitleObserver.observe(host.shadowRoot, { childList: true, subtree: true, characterData: true });
           }
        });
      }
    } catch(err) {}
    const activeSrc = currentVid ? (currentVid.src || currentVid.currentSrc || 'unknown_src') : 'spotify_stream';
    const currentSpotifyTrack = getSpotifyTrackId();
    const isNewSpotifyTrack = (isSpotify && currentSpotifyTrack && currentSpotifyTrack !== lastSpotifyTrack);

    const ytUrlParams = (isYouTube && typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : null;
    const currentYTId = ytUrlParams ? (ytUrlParams.get('v') || '') : '';
    const isNewYouTubeVideo = (isYouTube && currentYTId && currentYTId !== lastYouTubeVideoId);

    const currentHref = typeof window !== 'undefined' ? window.location.href : '';
    const isPageNavigated = (currentHref !== lastPageHref);

    const isSameVideoElement = (currentVid === videoElement && videoElement !== null);
    const isBlobUrlChangeOnly = isSameVideoElement && (activeSrc.startsWith('blob:') || currentVideoSrc.startsWith('blob:'));

    if (currentVid !== videoElement || activeSrc !== currentVideoSrc || isNewSpotifyTrack || isNewYouTubeVideo) {
      console.log("🤬 [Censor] New video detected:", isNewSpotifyTrack ? ("Spotify Track: " + currentSpotifyTrack) : (isNewYouTubeVideo ? ("YouTube Video: " + currentYTId) : activeSrc));
      
      if (isYouTube && isNewYouTubeVideo) {
        lastYouTubeVideoId = currentYTId;
      }
      
      if (isSpotify && isNewSpotifyTrack) {
        lastSpotifyTrack = currentSpotifyTrack;
        toastShownThisSession = false;
        try { sessionStorage.removeItem('bootubeToastShown'); } catch(e) {}
      }
      
      const isStreamingPlatform = isNetflix || isHulu || isDisneyPlus || isMax || isParamount || isPeacock || isPrimeVideo || isFandango || isPlex;
      const shouldGC = (isNewYouTubeVideo || isNewSpotifyTrack || isPageNavigated || (!isBlobUrlChangeOnly && !isStreamingPlatform));

      if (shouldGC && (currentVideoSrc !== 'unknown_src' && currentVideoSrc !== 'unknown' || isNewYouTubeVideo)) {
        performGarbageCollection(isNewYouTubeVideo ? ("YouTube Navigated: " + currentYTId) : (isPageNavigated ? ("Page Navigated: " + currentHref) : "New Video Element"));
      }
      
      if (isPageNavigated) {
        lastPageHref = currentHref;
        // Reload storage settings to guarantee custom words & activeBlocklist are ready on the new page
        if (isContextValid()) {
          try {
            chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions', 'revealWordsEnabled'], (result) => {
              handleSettingsLoaded(result);
            });
          } catch(e) {}
        }
      }
      
      videoElement = currentVid;
      currentVideoSrc = activeSrc;
      
      extractMetadata();
      
      if (allCaptionPayloads && allCaptionPayloads.length > 0 && muteZones.length === 0) {
        allCaptionPayloads.forEach(data => processCaptionData(data.payload, data.isTranslated));
      }

      startTrackingPlaytime();
      startFallbackObserver();
      if (extensionEnabled) {
        autoEnableCC();
        checkSubtitlesStatus();
      }
    }
  }
  
  if (extensionEnabled && hideCC) {
    hideExistingCaptionsOnPage();
  }

  if (isFandango && extensionEnabled && currentVid && currentVid.textTracks) {
    try {
      for (let i = 0; i < currentVid.textTracks.length; i++) {
        const track = currentVid.textTracks[i];
        if (hideCC && track.mode === 'showing') {
          track.mode = 'hidden';
        } else if (!hideCC && track.mode === 'hidden') {
          track.mode = 'showing';
        }
      }
    } catch(e) {}
  }
}, 500);

// Module-level handle: ensures only one ccInterval ever exists at a time.
// Prevents stacked intervals caused by rapid toggle OFF→ON which would crash YT's player.
let _ccIntervalHandle = null;

function autoEnableCC() {
  if (!extensionEnabled) return;
  // Cancel any existing in-flight CC-enable poll before starting a new one
  if (_ccIntervalHandle !== null) {
    clearInterval(_ccIntervalHandle);
    _ccIntervalHandle = null;
  }
  const schedulePoll = () => {
    _ccIntervalHandle = setInterval(() => {
      if (!extensionEnabled) {
        clearInterval(_ccIntervalHandle);
        _ccIntervalHandle = null;
        return;
      }
      const ccButton = document.querySelector('.ytp-subtitles-button');
      if (ccButton) {
        clearInterval(_ccIntervalHandle);
        _ccIntervalHandle = null;
        setTimeout(() => {
          if (extensionEnabled && ccButton.getAttribute('aria-pressed') === 'false') {
            ccButton.click();
            if (hideCC) {
              setTimeout(() => {
                if (extensionEnabled && hideCC) {
                  applyHideCCStyle();
                  hideExistingCaptionsOnPage();
                }
              }, 400);
            }
          }
        }, 600);
      }
    }, 1000);
  };

  if (isYouTube && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(schedulePoll, { timeout: 2500 });
  } else {
    setTimeout(schedulePoll, isYouTube ? 1200 : 0);
  }
}

function disableCC() {
  if (!isYouTube) return;
  // Also cancel any pending CC-enable poll so it doesn't fight the disable
  if (_ccIntervalHandle !== null) {
    clearInterval(_ccIntervalHandle);
    _ccIntervalHandle = null;
  }
  const ccButton = document.querySelector('.ytp-subtitles-button');
  if (ccButton && ccButton.getAttribute('aria-pressed') === 'true') {
    ccButton.click();
  }
}

function isCaptionsActiveOnPlayer() {
  if (isSpotify) {
    const lyricsEl = document.querySelector('[data-testid="lyrics-line"], div[class*="lyrics"], div[class*="Lyrics"], .a8PTgYsfzc07Np9G');
    if (lyricsEl || (muteZones && muteZones.length > 0)) {
      return true;
    }
    return false;
  }

  // Global Check: If subtitle muteZones have been parsed from network payloads (Netflix, HBO Max, Hulu, Peacock, Fandango, etc.)
  if (muteZones && muteZones.length > 0) {
    return true;
  }

  if (isYouTube) {
    const ccBtn = document.querySelector('.ytp-subtitles-button');
    if (ccBtn && ccBtn.getAttribute('aria-pressed') === 'true') {
      return true;
    }
  }

  const activeVid = videoElement || getActiveVideoElement(findVideos());
  if (activeVid && activeVid.textTracks) {
    for (let i = 0; i < activeVid.textTracks.length; i++) {
      const track = activeVid.textTracks[i];
      if ((track.kind === 'subtitles' || track.kind === 'captions') && (track.mode === 'showing' || track.mode === 'hidden' || track._bootubeWasShowing)) {
        return true;
      }
    }
  }

  const capEl = document.querySelector('.ytp-caption-window-container, .shaka-text-container, .dss-subtitle-container, timed-text-override-region, .hive-subtitle-renderer-cue-window, .caption-visual-line, .player-timedtext, [class*="player-timedtext"], .vjs-text-track-display, .aria-subtitles-overlay, [class*="subtitle"], [class*="caption"]');
  if (capEl && capEl.textContent && capEl.textContent.trim().length > 0) {
    return true;
  }

  return false;
}

let toastShownThisSession = false;

function checkSubtitlesStatus() {
  if (!extensionEnabled) return;
  if (toastShownThisSession) return; // Max 1 toast per site session
  try {
    if (sessionStorage.getItem('bootubeToastShown') === 'true') {
      toastShownThisSession = true;
      return;
    }
  } catch(e) {}

  if (!isContextValid()) return;
  try {
    chrome.storage.local.get(['hideSubtitleToast', 'hideDisneyToast'], (res) => {
        if (!isContextValid() || !res) return;
        if (res.hideSubtitleToast || res.hideDisneyToast) return;
        
        // Check 3 seconds after video/audio load to verify if subtitles/lyrics are active
        setTimeout(() => {
          if (toastShownThisSession) return;
          const activeVid = videoElement || getActiveVideoElement(findVideos());

          // Feed Auto-play Mute Guard: On social feed platforms (Facebook, X / Twitter),
          // do NOT show toast if the video is auto-playing muted in feed
          if ((isFacebook || isTwitter) && activeVid && (activeVid.muted || activeVid.volume === 0)) {
            return;
          }

          const platformName = isPeacock ? 'Peacock' : isParamount ? 'Paramount+' : isMax ? 'Max' : isDisneyPlus ? 'Disney+' : 
                             isHulu ? 'Hulu' : 
                             isPlex ? 'Plex' : 
                             isFandango ? 'Fandango' : 
                             isNetflix ? 'Netflix' : 
                             isPrimeVideo ? 'Prime Video' : 
                             isSpotify ? 'Spotify' :
                             isYouTube ? 'YouTube' : 'this platform';

          const hasActiveCaptions = isCaptionsActiveOnPlayer();
          
          if (!hasActiveCaptions) {
            showBootubeToast(platformName);
          }
        }, 3000);
    });
  } catch(e) {}
}

function showBootubeToast(platformName = 'this platform') {
  if (document.getElementById('bootube-toast')) return;
  if (toastShownThisSession) return;

  toastShownThisSession = true;
  try {
    sessionStorage.setItem('bootubeToastShown', 'true');
  } catch(e) {}
  
  const toast = document.createElement('div');
  if (!toast) return;
  toast.id = 'bootube-toast';
  
  // Outer container styling
  Object.assign(toast.style, {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(10, 17, 20, 0.95)',
    color: '#fff',
    borderRadius: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: '0 8px 32px rgba(58, 165, 194, 0.25), 0 0 15px rgba(71, 137, 240, 0.4)',
    border: '1px solid rgba(71, 137, 240, 0.5)',
    zIndex: '9999999',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: '0',
    display: 'flex',
    flexDirection: 'column',
    width: '420px',
    overflow: 'hidden'
  });

  // Top content wrapper
  const content = document.createElement('div');
  Object.assign(content.style, {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  });
  
  // Header with title and close button
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  });
  
  const titleWrapper = document.createElement('div');
  Object.assign(titleWrapper.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  const booIcon = document.createElement('span');
  booIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="37.0 27.9 27.3 28.9" width="20" height="20" style="vertical-align: middle; display: block;"><path fill="#FEFEFE" d="M51.9397 34.1536C53.5404 34.0536 55.2921 34.5471 56.5804 35.5081C57.7658 36.3925 58.5666 37.6274 59.0306 39.0227C59.1451 39.3673 59.2566 39.7546 59.3089 40.1145C59.2943 40.1271 59.2837 40.1374 59.2698 40.1507C58.9897 40.4176 58.8296 40.7872 58.8274 41.1741C58.8209 41.7209 59.111 42.2087 59.4837 42.5891C59.4829 43.284 59.3366 44.2106 59.1829 44.8909C58.4856 47.9588 56.7542 50.988 54.0628 52.7122C51.1002 54.61 47.1652 54.8351 43.9368 53.5022C42.2934 52.8238 41.0044 51.7699 40.0511 50.2688C39.4493 49.2696 39.0937 48.1416 39.0149 46.9778C38.995 46.7085 38.9886 46.3889 39.0374 46.1253C39.0788 45.9124 39.2812 45.8384 39.3997 46.0471C39.8994 46.9274 40.3579 47.5786 41.4397 47.6917C42.9457 47.8491 43.9157 46.4941 44.3264 45.2268C44.4746 45.4239 45.164 46.2856 45.4485 46.0354C45.6573 45.8517 45.4041 45.6476 45.2581 45.5198C44.185 44.58 43.5265 43.0229 43.9417 41.6116C44.2086 40.7295 45.1659 39.5679 46.1819 39.5735C46.4228 39.5749 46.6532 39.6557 46.8216 39.8304C47.1435 40.1222 47.1136 40.7203 46.8274 41.0286C46.41 41.4783 46.2235 41.8857 46.4378 42.5061C46.5549 42.8246 46.7345 43.042 46.9524 43.2962C47.1201 43.4917 47.4312 43.5043 47.4182 43.2122C47.4124 43.0875 47.0863 42.7495 47.0149 42.6126C46.9308 42.4514 46.8551 42.3057 46.8489 42.1116C46.8237 41.7502 46.9353 41.6493 47.1595 41.4026C47.4304 41.1044 47.5681 40.697 47.5364 40.2932C47.5098 39.9503 47.3467 39.6326 47.0833 39.4114C46.7413 39.1247 46.3968 39.0671 45.9681 39.1028C46.3262 38.0309 46.8953 37.0409 47.6409 36.1917C48.7864 34.9072 50.2255 34.2514 51.9397 34.1536ZM60.054 40.3167C60.7124 40.2981 61.2911 40.8615 61.6106 41.3841C62.0361 42.073 62.2842 42.8677 62.094 43.6751C61.8358 44.7702 60.9353 45.7438 59.9944 46.3304C59.7046 46.5169 59.4466 46.6512 59.138 46.805C59.4475 45.9453 59.6776 45.0591 59.8255 44.1575C59.8767 43.8473 59.8979 43.5432 59.9407 43.2425C60.0163 43.0061 60.1578 42.8909 60.0686 42.6155C59.9785 42.3639 59.7588 42.1775 59.597 41.9641C59.157 41.3845 59.1839 40.45 60.054 40.3167ZM51.8831 42.6516C51.7406 42.7278 51.7056 42.8283 51.7181 42.9866C51.8538 44.6909 53.9452 45.4858 55.3128 44.6458C55.4285 44.5748 55.5373 44.4929 55.638 44.4016C55.7865 44.2608 55.8655 44.1673 55.9895 43.9817C56.1102 43.8012 56.201 43.4569 55.8684 43.4436C55.7662 43.4397 55.5575 43.5378 55.4388 43.5686C54.99 43.6855 54.5223 43.7133 54.0628 43.6497C53.4594 43.5691 52.9306 43.3225 52.4388 42.9739C52.2508 42.8408 52.1249 42.6435 51.8831 42.6516ZM56.6048 40.4114C56.2403 40.468 55.9909 40.639 55.7679 40.9329C55.6614 41.0731 55.4026 41.6134 55.5735 41.7434C55.7118 41.772 55.8549 41.5668 55.9505 41.4846C56.251 41.2266 56.6601 41.1381 57.013 41.3509C57.1365 41.4343 57.2051 41.4956 57.2884 41.6223C57.3304 41.6874 57.3671 41.7557 57.3987 41.8264C57.45 41.9402 57.5063 42.1563 57.6497 42.1341C57.7306 42.0788 57.7558 41.9685 57.7747 41.8763C57.9007 41.2543 57.5637 40.5401 56.8968 40.4192C56.8005 40.4017 56.7019 40.3993 56.6048 40.4114ZM51.4768 39.2483C50.8507 39.3281 50.3467 39.8689 50.3352 40.5091C50.3344 40.5489 50.358 40.5836 50.3821 40.6126C50.6462 40.7313 50.927 39.7909 51.8216 40.1263L51.8362 40.1321C52.2002 40.2892 52.284 40.5345 52.4788 40.8411C52.6125 41.0516 52.7383 40.7285 52.7327 40.6136C52.7709 40.2826 52.6738 39.9169 52.4661 39.6565C52.2865 39.4288 52.0237 39.2817 51.7356 39.2483C51.6701 39.2411 51.5426 39.2373 51.4768 39.2483ZM51.7503 30.0081C53.7879 29.9342 56.0311 30.3708 57.928 31.1389C58.5414 31.3873 60.3965 32.2752 59.5638 33.222C59.1227 33.7231 57.9183 33.8235 57.2473 33.8411C55.2551 33.8998 52.9702 33.4249 51.1145 32.7073C50.5284 32.4806 49.1912 31.8516 49.2044 31.1184C49.2225 30.114 51.0154 30.0407 51.7503 30.0081ZM51.5638 30.8499C51.0246 30.8749 50.5847 30.9012 50.0882 31.135C50.5789 31.8091 52.8614 32.4025 53.6663 32.5813C54.041 32.6608 54.4185 32.73 54.7972 32.7884C55.6732 32.9326 56.5607 32.9975 57.4485 32.9827C57.9064 32.9625 58.5054 32.9129 58.9085 32.6946C58.2037 31.9056 55.9554 31.3383 54.9231 31.1448C54.178 31.0052 53.4248 30.9117 52.6682 30.8645C52.3633 30.8471 52.8707 30.829 51.5638 30.8499Z" /></svg>`;

  const title = document.createElement('strong');
  title.innerText = isSpotify ? 'BooTube requires Lyrics' : 'BooTube requires subtitles';
  title.style.color = '#FFFFFF';
  title.style.fontSize = '16px';
  
  titleWrapper.appendChild(booIcon);
  titleWrapper.appendChild(title);
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', 
    fontSize: '24px', cursor: 'pointer', padding: '0 4px', lineHeight: '1'
  });
  closeBtn.onmouseenter = () => closeBtn.style.color = '#fff';
  closeBtn.onmouseleave = () => closeBtn.style.color = 'rgba(255,255,255,0.6)';
  closeBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof dismissToast === 'function') dismissToast();
  };
  
  header.appendChild(titleWrapper);
  header.appendChild(closeBtn);
  
  const msg = document.createElement('div');
  if (isSpotify) {
    msg.innerText = 'BooTube cannot filter profanity on Spotify until Lyrics are turned on. Please enable Lyrics in your player controls.';
  } else if (isParamount) {
    msg.innerText = 'Closed Captions must be turned ON in Paramount\'s player controls for profanity muting to work. Standard subtitle hiding is managed directly through Paramount player settings.';
  } else {
    msg.innerText = `BooTube cannot filter profanity on ${platformName} until subtitles are turned on. Please enable Subtitles in your player controls.`;
  }
  msg.style.fontSize = '14px';
  msg.style.lineHeight = '1.4';
  msg.style.color = 'rgba(255, 255, 255, 0.7)';
  
  const actions = document.createElement('div');
  Object.assign(actions.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
    fontSize: '13px'
  });
  
  // Don't show again checkbox
  const dontShowLabel = document.createElement('label');
  Object.assign(dontShowLabel.style, { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' });
  const dontShowCb = document.createElement('input');
  dontShowCb.type = 'checkbox';
  Object.assign(dontShowCb.style, { cursor: 'pointer', accentColor: '#3AA5C2' });
  dontShowLabel.appendChild(dontShowCb);
  dontShowLabel.appendChild(document.createTextNode("Don't show again"));
  
  // Settings Link
  const settingsLink = document.createElement('a');
  settingsLink.innerText = 'Open Settings';
  Object.assign(settingsLink.style, { 
    background: 'linear-gradient(90deg, #4789F0, #3AA5C2)',
    webkitBackgroundClip: 'text',
    webkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    cursor: 'pointer', 
    textDecoration: 'none', 
    fontWeight: '600' 
  });
  settingsLink.onclick = () => {
    if (isContextValid()) {
      try {
        chrome?.runtime?.sendMessage?.({ action: "openSettings" });
      } catch (e) {
        console.error("🤬 [Censor] failed to send message", e);
      }
    }
    if (typeof dismissToast === 'function') dismissToast();
  };
  
  actions.appendChild(dontShowLabel);
  actions.appendChild(settingsLink);
  
  content.appendChild(header);
  content.appendChild(msg);
  content.appendChild(actions);
  
  // Progress bar wrapper
  const progressWrapper = document.createElement('div');
  Object.assign(progressWrapper.style, { width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)' });
  
  // Progress bar fill (Scrubber)
  const progressFill = document.createElement('div');
  Object.assign(progressFill.style, { 
    height: '100%', 
    width: '100%', 
    background: 'linear-gradient(90deg, #4789F0, #3AA5C2)'
  });
  progressWrapper.appendChild(progressFill);
  
  toast.appendChild(content);
  toast.appendChild(progressWrapper);
  document.body.appendChild(toast);
  
  let dismissTimeout;
  let captionCheckInterval;

  const dismissToast = () => {
      clearTimeout(dismissTimeout);
      if (captionCheckInterval) clearInterval(captionCheckInterval);
      if (dontShowCb.checked) {
          if (isContextValid()) {
              try {
                chrome.storage.local.set({ hideSubtitleToast: true, hideDisneyToast: true });
              } catch (e) {
                console.error("🤬 [Censor] failed to set hideSubtitleToast", e);
              }
          }
      }
      toast.style.opacity = '0';
      toast.style.top = '80px';
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 500);
  };

  toast._dismiss = dismissToast;
  closeBtn.onclick = dismissToast;
  
  // Slide and fade in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.top = '100px';
    
    // Start progress bar animation after a brief delay
    setTimeout(() => {
        progressFill.style.transition = 'width 15s linear';
        progressFill.style.width = '0%';
    }, 100);
  });
  
  // Auto dismiss after 15 seconds or as soon as user enables subtitles in player
  dismissTimeout = setTimeout(dismissToast, 15000);
  captionCheckInterval = setInterval(() => {
    if (isCaptionsActiveOnPlayer()) {
      dismissToast();
    }
  }, 1000);
}

let liveSpotifyHardwareTime = -1;

window.addEventListener('message', (event) => {
  if (!event || !event.data) return;
  if (event.data.type === 'BOOTUBE_SPOTIFY_REAL_TIME') {
    if (typeof event.data.currentTime === 'number' && event.data.currentTime > 0) {
      liveSpotifyHardwareTime = event.data.currentTime;
    }
    return;
  }
  if (isSubFrame && !isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isYouTube && !isTwitter && !isSpotify && !isFacebook && !isMax && !isParamount && !isPeacock) return;
  if (event.data.type === 'BOOTUBE_SPA_NAVIGATED') {
    const newUrl = event.data.url || (typeof window !== 'undefined' ? window.location.href : '');
    if (newUrl && newUrl !== lastPageHref) {
      console.log("🧭 [BooTube] SPA Navigation detected to:", newUrl);
      lastPageHref = newUrl;
      // Reload fresh storage settings to guarantee custom words & activeBlocklist are 100% active
      if (isContextValid()) {
        try {
          chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions', 'revealWordsEnabled'], (result) => {
            handleSettingsLoaded(result);
          });
        } catch(e) {}
      }
      extractMetadata();
      startTrackingPlaytime();
      startFallbackObserver();
    }
    return;
  }
  if (event.data.type !== 'YOUTUBE_CAPTIONS_FETCHED' && event.data.type !== 'SPOTIFY_TOKEN_CAPTURED') return;
  if (event.data.type === 'SPOTIFY_TOKEN_CAPTURED') {
    spotifyBearerToken = event.data.token;
    return;
  }
  if (event.data.type === 'YOUTUBE_CAPTIONS_FETCHED') {
    event.data._timestamp = Date.now();
    if (isYouTube) {
      allCaptionPayloads = [event.data];
    } else {
      allCaptionPayloads.push(event.data);
    }
    if (isStorageLoaded && activeBlocklist && activeBlocklist.length > 0) {
      processCaptionData(event.data.payload, event.data.isTranslated);
    } else {
      queuedPayloads.push(event.data);
      if (isContextValid()) {
        try {
          chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions', 'revealWordsEnabled'], (result) => {
            handleSettingsLoaded(result);
          });
        } catch(e) {}
      }
    }
    
    // Sync captions across frames using local storage
    if (isContextValid()) {
      try {
        chrome.storage.local.set({
          activeVideoCaptions: allCaptionPayloads,
          lastFetchedCaptions: {
            payload: event.data.payload,
            isTranslated: event.data.isTranslated,
            timestamp: Date.now()
          }
        });
      } catch(e) {}
    }
  }
});

function findProfanityZones(subtitles) {
  let zones = [];
  subtitleSyncBeacons = []; // Reset beacons

  if (!subtitles || subtitles.length === 0) return zones;

  const activeToast = document.getElementById('bootube-toast');
  if (activeToast && typeof activeToast._dismiss === 'function') {
    activeToast._dismiss();
  }

  // DIAGNOSTIC BEACON: Always track the very first subtitle to find its CSS class!
  if (subtitles.length > 0 && isDisneyPlus) {
     subtitleSyncBeacons.push({
        start: subtitles[0].start,
        end: subtitles[0].end,
        text: subtitles[0].text,
        isDiagnostic: true
     });
  }

  if (!extensionEnabled || !Array.isArray(activeBlocklist) || activeBlocklist.length === 0) return zones;
  if (!Array.isArray(whitelistedChannels)) whitelistedChannels = [];
  if (!Array.isArray(safeList)) safeList = [];
  const wantsAutoCensorFilter = activeBlocklist.some(w => {
    let word = typeof w === 'string' ? w : (w ? w.word : '');
    return typeof word === 'string' && (/\[\s*_+\s*\]/.test(word) || /[*_]{2,}/.test(word) || word === '*' || word === '****' || word === '***');
  });

  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    let hasProfanity = false;
    let combinedText = "";
    let firstEventTextLength = 0;
    
    let startSec = sub.start;
    if (isNaN(startSec)) continue;
    
    let rawText = sub.text || '';
    rawText = rawText.replace(/<[^>]*>?/gm, '').trim();
    let cleanText = rawText.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
    if (cleanText.length > 0 && cleanText.length < 150) {
      subtitleSyncBeacons.push({ text: cleanText, start: startSec });
    }
    
    // Look ahead up to 15 events to catch highly fragmented auto-generated phrases
    for (let j = 0; j < 15 && (i + j) < subtitles.length; j++) {
      const ev = subtitles[i + j];
      const evText = stripSoundDescriptors(ev.text || '');
      combinedText += evText + " ";
      if (j === 0) firstEventTextLength = evText.length + 1; // +1 for the added space
      
      const cleanText = combinedText.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, " ").toLowerCase();
      
      let wordsToCheck = [...baseWordsToCheck];
      if (wantsAutoCensorFilter) {
          const autoCensoredMatches = cleanText.match(/(?:\[\s*_+\s*\]|\*{2,}|\b[a-z]{1,2}\*{1,}[a-z]*\b)/gi);
          if (autoCensoredMatches) {
            wordsToCheck.push(...autoCensoredMatches);
          }
      }
      
      const containsBadWord = wordsToCheck.some(word => {
        if (!word || typeof word !== 'string') return false;
        const regex = getWordRegex(word);
        let match = regex.exec(cleanText);
        if (!match) return false;
        let matchIndex = match.index;
        
        // --- RESPECTFUL MODE LOGIC ---
        if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) {
            return false;
        }
        
        // Guarantee the bad word actually touches the first event (i)
        // to prevent creating massive mute zones that start way too early.
        if (j > 0) {
          const textWithoutFirst = combinedText.substring(firstEventTextLength);
          const cleanWithoutFirst = textWithoutFirst.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, " ").toLowerCase();
          if (getWordRegex(word).test(cleanWithoutFirst)) {
            // The bad word exists entirely in the future events. Let the future loops handle it.
            return false;
          }
        }
        
        // We now know the word STARTS in event i and ENDS in event i+j
        let evDurationSec = (sub.end - sub.start);
        if (j > 0) {
           const endOfEv = (subtitles[i+j].end !== undefined) ? subtitles[i+j].end : (subtitles[i+j].start + 2);
           evDurationSec = endOfEv - startSec;
        }
        
        let paddedStart = startSec;
        let paddedEnd = startSec + evDurationSec;
        
        if (isDisneyPlus) {
          // Disney+ / Native WebVTT: Subtitles are hand-timed phrases (usually 1-3s).
          // Proportional interpolation misses exact timing due to speech cadence variations.
          // Mute the entire phrase chunk to guarantee a 100% hit rate!
          paddedStart = Math.max(0, startSec - 0.8);
          paddedEnd = startSec + evDurationSec + 0.4;
          if (muteAggressiveness === 1) {
            paddedStart = Math.max(0, startSec - 0.5);
            paddedEnd = startSec + evDurationSec + 0.3;
          } else if (muteAggressiveness === 3) {
            paddedStart = Math.max(0, startSec - 1.2);
            paddedEnd = startSec + evDurationSec + 0.6;
          }
        } else if (isFacebook) {
          // Facebook WebVTT: Subtitles display ~1.5s - 2.0s before spoken audio.
          // Extend padEnd to 2.2s so the mute holds through the spoken dialogue.
          let padStart = 0.50;
          let padEnd = 2.20;
          if (muteAggressiveness === 1) {
            padStart = 0.30;
            padEnd = 1.60;
          } else if (muteAggressiveness === 3) {
            padStart = 0.80;
            padEnd = 3.00;
          }
          paddedStart = Math.max(0, startSec - padStart);
          paddedEnd = Math.min(startSec + 15, startSec + evDurationSec + padEnd);
        } else if (isTwitter) {
          // X.com (Twitter): Subtitles are frame-synced. Zero offset!
          let padStart = 0.40;
          let padEnd = 0.50;
          if (muteAggressiveness === 1) {
            padStart = 0.25;
            padEnd = 0.30;
          } else if (muteAggressiveness === 3) {
            padStart = 0.65;
            padEnd = 0.75;
          }
          paddedStart = Math.max(0, startSec - padStart);
          paddedEnd = Math.min(startSec + 15, startSec + evDurationSec + padEnd);
        } else if (isHulu) {
          // Hulu: Pre-mute 1.50s earlier to clip initial spoken profanities ("ass", "shitty", "limp") completely!
          const offset = 0.00;
          let padStart = 1.50;
          let padEnd = 0.50;
          if (muteAggressiveness === 1) {
            padStart = 1.10;
            padEnd = 0.35;
          } else if (muteAggressiveness === 3) {
            padStart = 1.90;
            padEnd = 0.75;
          }
          paddedStart = Math.max(startSec, startSec + offset - padStart);
          paddedEnd = Math.min(startSec + 15, startSec + evDurationSec + offset + padEnd);
        } else if (isPlex) {
          // Plex: Zero offset with 1.50s pre-mute buffer cleanly catches spoken speech with 0 leakage!
          const offset = 0.00;
          let padStart = 1.50;
          let padEnd = 0.50;
          if (muteAggressiveness === 1) {
            padStart = 1.10;
            padEnd = 0.35;
          } else if (muteAggressiveness === 3) {
            padStart = 1.90;
            padEnd = 0.75;
          }
          paddedStart = Math.max(startSec, startSec + offset - padStart);
          paddedEnd = Math.min(startSec + 15, startSec + evDurationSec + offset + padEnd);
        } else if (isFandango || isNetflix || isPrimeVideo || isParamount || isSpotify) {
          // WebVTT / SRT subtitle cues display on screen ~0.5s - 1.2s BEFORE spoken audio.
          // Shift forward by +0.75s to align exactly with voiced dialogue!
          const offset = 0.75;
          let padStart = 0.15;
          let padEnd = 0.35;
          if (muteAggressiveness === 1) {
            padStart = 0.08;
            padEnd = 0.20;
          } else if (muteAggressiveness === 3) {
            padStart = 0.35;
            padEnd = 0.50;
          }
          paddedStart = Math.max(startSec, startSec + offset - padStart);
          paddedEnd = Math.min(startSec + 15, startSec + evDurationSec + offset + padEnd);
        } else if (isPeacock) {
          // Dedicated Peacock timing: Pre-mute 0.85s earlier to clip initial consonants/vowels completely!
          let padStart = 0.85;
          let padEnd = 0.75;
          if (muteAggressiveness === 1) {
            padStart = 0.50;
            padEnd = 0.50;
          } else if (muteAggressiveness === 3) {
            padStart = 1.20;
            padEnd = 1.00;
          }
          paddedStart = Math.max(0, startSec - padStart);
          paddedEnd = Math.min(startSec + 15, startSec + evDurationSec + padEnd);
        } else if (isMax) {
          let padStart = 0.40;
          let padEnd = 0.60;
          if (muteAggressiveness === 1) {
            padStart = 0.20;
            padEnd = 0.35;
          } else if (muteAggressiveness === 3) {
            padStart = 0.60;
            padEnd = 1.00;
          }
          paddedStart = Math.max(0, startSec - padStart);
          paddedEnd = Math.min(startSec + 15, startSec + evDurationSec + padEnd);
        } else {
          let startPad = 0.8;
          let endPad = 0.8;
          if (muteAggressiveness === 1) {
            startPad = 0.5;
            endPad = 0.5;
          } else if (muteAggressiveness === 3) {
            startPad = 1.5;
            endPad = 1.5;
          }
          paddedStart = Math.max(0, startSec - startPad);
          paddedEnd = startSec + evDurationSec + endPad;
        }
        
        zones.push({ start: paddedStart, end: paddedEnd });
        console.log(`🤬 [Censor] Zone caught! ${paddedStart.toFixed(1)} - ${paddedEnd.toFixed(1)} (Word: ${word})`);
        return true;
      });
      
      if (containsBadWord) break;
    }
  }
  zones.sort((a, b) => a.start - b.start);
  return zones;
}

function isCurrentTimeMuted(currentTime, zones) {
  if (!zones || zones.length === 0) return false;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    if (currentTime >= z.start && currentTime <= z.end) {
      return true;
    }
  }
  return false;
}

function processCaptionData(data, isTranslated) {
  if (!data || !data.events) return;
  if (isSpotify && data.events) {
    const jesusEvents = data.events.filter(e => e.segs && e.segs.some(s => /jesus/i.test(s.utf8 || '')));
    console.log("🟢 [Spotify Events Debug] total events: " + data.events.length + " | sample events: " + JSON.stringify(data.events.slice(0, 2)));
    console.log("🟢 [Spotify Jesus Events]: " + JSON.stringify(jesusEvents));
  }
  
  if (!extensionEnabled || !Array.isArray(activeBlocklist) || activeBlocklist.length === 0) return;
  if (!Array.isArray(whitelistedChannels)) whitelistedChannels = [];
  if (!Array.isArray(safeList)) safeList = [];
  const baseWordsToCheck = getExpandedWords(activeBlocklist);

  for (let i = 0; i < data.events.length; i++) {
    let combinedText = "";
    let firstEventTextLength = 0;
    
    let startSec = data.events[i].tStartMs / 1000;
    if (isNaN(startSec)) continue;
    
    if (data.events[i].segs) {
      let rawText = data.events[i].segs.map(seg => seg.utf8 || '').join('');
      rawText = rawText.replace(/<[^>]*>?/gm, '').trim();
      let cleanText = rawText.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
      if (isDisneyPlus && cleanText.length > 6 && cleanText.length < 150) {
        subtitleSyncBeacons.push({ text: cleanText, start: startSec });
      }
      const canonical = getCanonicalText(rawText);
      if (canonical) {
        interceptedSubtitleTexts.add(canonical);
      }
    }
    
    // Look ahead up to 15 events to catch highly fragmented auto-generated phrases on YouTube
    let charTimes = [];
    const maxLookAhead = (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isPeacock || isSpotify || isFacebook) ? 1 : 15;
    for (let j = 0; j < maxLookAhead && (i + j) < data.events.length; j++) {
      const ev = data.events[i + j];
      if (ev.segs) {
        const rawEvText = ev.segs.map(seg => seg.utf8 || '').join('');
        const evText = stripSoundDescriptors(rawEvText);
        combinedText += evText + " ";
        if (j === 0) firstEventTextLength = evText.length + 1; // +1 for the added space
        
        // Build an array mapping every single character in combinedText to its exact YouTube timestamp
        let baseTime = (ev.tStartMs !== undefined ? ev.tStartMs : data.events[i].tStartMs);
        for (const seg of ev.segs) {
           let segText = seg.utf8 || '';
           let segTimeSec = (baseTime + (seg.tOffsetMs || 0)) / 1000;
           for (let c = 0; c < segText.length; c++) charTimes.push(segTimeSec);
        }
        // Account for the appended space
        charTimes.push((baseTime + (ev.segs.length > 0 ? (ev.segs[ev.segs.length-1].tOffsetMs || 0) : 0)) / 1000);
      }
      
      // Condense whitespace and strip punctuation while building a map back to the original string
      let charMap = [];
      let cleanText = "";
      for (let k = 0; k < combinedText.length; k++) {
         let char = combinedText[k].toLowerCase();
         if (/[^\w\s'\[\]\*]/.test(char)) char = " ";
         if (char === " " && cleanText.endsWith(" ")) {
             // compress spaces, don't map
         } else {
             cleanText += char;
             charMap.push(k);
         }
      }
      
      let wordsToCheck = [...baseWordsToCheck];
      const wantsAutoCensorFilter = activeBlocklist.some(w => {
        let word = typeof w === 'string' ? w : (w ? w.word : '');
        return typeof word === 'string' && (/\[\s*_+\s*\]/.test(word) || /[*_]{2,}/.test(word) || word === '*' || word === '****' || word === '***');
      });
      if (wantsAutoCensorFilter) {
          const autoCensoredMatches = cleanText.match(/(?:\[\s*_+\s*\]|\*{2,}|\b[a-z]{1,2}\*{2,}[a-z]*\b)/gi);
          if (autoCensoredMatches) {
            wordsToCheck.push(...autoCensoredMatches);
          }
      }
      
      let containsBadWord = false;
      if (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isPeacock || isSpotify || isFacebook) {
         let evDurationSec = (data.events[i].dDurationMs || 2000) / 1000;
         if (j > 0 && data.events[i+j].tStartMs !== undefined) {
            const endOfEv = (data.events[i+j].tStartMs + (data.events[i+j].dDurationMs || 2000)) / 1000;
            evDurationSec = endOfEv - startSec;
         }

         wordsToCheck.forEach(word => {
            if (!word || typeof word !== 'string') return;
            
            const regex = getWordRegex(word);
            let match;
            while ((match = regex.exec(cleanText)) !== null) {
               const matchIndex = match.index;
               
               // --- RESPECTFUL MODE LOGIC ---
               if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) {
                   continue;
               }
               
               // Guarantee the bad word actually touches the first event (i)
               if (j > 0) {
                 const textWithoutFirst = combinedText.substring(firstEventTextLength);
                 const cleanWithoutFirst = textWithoutFirst.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase();
                 if (getWordRegex(word).test(cleanWithoutFirst)) {
                   continue;
                 }
               }
               
               containsBadWord = true;
               
               // Linear interpolation of word timing
               const textLen = cleanText.length || 1;
               const pctStart = matchIndex / textLen;
               const pctEnd = (matchIndex + word.length) / textLen;
               
               let wordStartSec = startSec + pctStart * evDurationSec;
               let wordEndSec = startSec + pctEnd * evDurationSec;
               
                let padStart = 0.5;
                let padEnd = 0.4;
                if (isDisneyPlus) {
                  // Disney+ / Native WebVTT: Subtitles are hand-timed phrases (usually 1-3s).
                  // Proportional interpolation misses exact timing due to speech cadence variations.
                  // Mute the entire phrase chunk to guarantee a 100% hit rate!
                  paddedStart = Math.max(0, startSec - 0.8);
                  paddedEnd = startSec + evDurationSec + 0.4;
                  if (muteAggressiveness === 1) {
                    paddedStart = Math.max(0, startSec - 0.5);
                    paddedEnd = startSec + evDurationSec + 0.3;
                  } else if (muteAggressiveness === 3) {
                    paddedStart = Math.max(0, startSec - 1.2);
                    paddedEnd = startSec + evDurationSec + 0.6;
                  }
                } else if (isFacebook) {
                  // Facebook WebVTT: Subtitles display ~1.5s - 2.0s before spoken audio.
                  // Extend padEnd to 2.2s so the mute holds through the spoken dialogue.
                  let padStart = 0.50;
                  let padEnd = 2.20;
                  if (muteAggressiveness === 1) {
                    padStart = 0.30;
                    padEnd = 1.60;
                  } else if (muteAggressiveness === 3) {
                    padStart = 0.80;
                    padEnd = 3.00;
                  }
                  paddedStart = Math.max(0, wordStartSec - padStart);
                  paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                } else if (isTwitter) {
                  // X.com (Twitter): Subtitles are frame-synced. Zero offset!
                  let padStart = 0.40;
                  let padEnd = 0.50;
                  if (muteAggressiveness === 1) {
                    padStart = 0.25;
                    padEnd = 0.30;
                  } else if (muteAggressiveness === 3) {
                    padStart = 0.65;
                    padEnd = 0.75;
                  }
                  paddedStart = Math.max(0, wordStartSec - padStart);
                  paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                } else if (isFandango) {
                  // Fandango at Home (Vudu): Subtitles stream in sync with media timeline (0.00s offset).
                  // Pre-mute 1.00s earlier to catch spoken dialogue without initial syllable leakage,
                  // and release promptly at 0.50s so clean dialogue following profanity is crystal clear!
                  const offset = 0.00;
                  wordStartSec += offset;
                  wordEndSec += offset;
                  padStart = 1.00;
                  padEnd = 0.50;
                  if (muteAggressiveness === 1) {
                    padStart = 0.70;
                    padEnd = 0.35;
                  } else if (muteAggressiveness === 3) {
                    padStart = 1.40;
                    padEnd = 0.75;
                  }
                  paddedStart = Math.max(0, wordStartSec - padStart);
                  paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                } else if (isHulu) {
                  // Hulu: Pre-mute 1.50s earlier to catch spoken dialogue timestamped ahead in TTML!
                  const offset = 0.00;
                  wordStartSec += offset;
                  wordEndSec += offset;
                  padStart = 1.50;
                  padEnd = 0.50;
                  if (muteAggressiveness === 1) {
                    padStart = 1.10;
                    padEnd = 0.35;
                  } else if (muteAggressiveness === 3) {
                    padStart = 1.90;
                    padEnd = 0.75;
                  }
                  paddedStart = Math.max(0, wordStartSec - padStart);
                  paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                } else if (isPlex) {
                  // Plex: Subtitles stream in sync with media timeline (0.00s offset).
                  // Pre-mute 1.50s earlier to catch spoken dialogue without initial syllable leakage,
                  // and release promptly at 0.50s so clean dialogue after profanity is unaffected!
                  const offset = 0.00;
                  wordStartSec += offset;
                  wordEndSec += offset;
                  padStart = 1.50;
                  padEnd = 0.50;
                  if (muteAggressiveness === 1) {
                    padStart = 1.10;
                    padEnd = 0.35;
                  } else if (muteAggressiveness === 3) {
                    padStart = 1.90;
                    padEnd = 0.75;
                  }
                  paddedStart = Math.max(0, wordStartSec - padStart);
                  paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                } else if (isMax) {
                  // Max (HBO Max): WebVTT cues are hand-timed phrase segments.
                  // For phrase cues (<= 3.5s), mute the cue window so variable speech cadence never causes early/late clipping!
                  if (evDurationSec <= 3.5) {
                    padStart = 0.35;
                    padEnd = 0.45;
                    if (muteAggressiveness === 1) {
                      padStart = 0.20;
                      padEnd = 0.30;
                    } else if (muteAggressiveness === 3) {
                      padStart = 0.60;
                      padEnd = 0.75;
                    }
                    paddedStart = Math.max(0, startSec - padStart);
                    paddedEnd = Math.min(startSec + 15, startSec + evDurationSec + padEnd);
                  } else {
                    padStart = 0.40;
                    padEnd = 0.85;
                    if (muteAggressiveness === 1) {
                      padStart = 0.20;
                      padEnd = 0.50;
                    } else if (muteAggressiveness === 3) {
                      padStart = 0.70;
                      padEnd = 1.20;
                    }
                    paddedStart = Math.max(0, wordStartSec - padStart);
                    paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                  }
                } else if (isPeacock) {
                  // Dedicated Peacock timing: WebVTT cues stream in sync with media timeline.
                  // Pre-mute 0.85s earlier to clip initial consonants/vowels completely, and release promptly at 0.75s!
                  padStart = 0.85;
                  padEnd = 0.75;
                  if (muteAggressiveness === 1) {
                    padStart = 0.50;
                    padEnd = 0.50;
                  } else if (muteAggressiveness === 3) {
                    padStart = 1.25;
                    padEnd = 1.00;
                  }
                  paddedStart = Math.max(0, wordStartSec - padStart);
                  paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                } else {
                  if (muteAggressiveness === 1) {
                    padStart = 0.3;
                    padEnd = 0.25;
                  } else if (muteAggressiveness === 3) {
                    padStart = 0.8;
                    padEnd = 0.6;
                  }
                  paddedStart = Math.max(0, wordStartSec - padStart);
                  paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                }
                
                if (word === 'jesus' || word === 'jesus christ' || word === 'god' || word === 'goddamn' || word === 'god damn' || word === 'christ' || word === 'lord') {
                    const extraPad = (isPeacock || isFandango) ? 0.45 : (isDisneyPlus || isHulu || isPlex || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isFacebook) ? 0.15 : 0.3;
                    paddedStart = Math.max(0, paddedStart - extraPad);
                    paddedEnd = paddedEnd + extraPad;
                }

               // Dedicated Spotify Platform Mute Buffer (Zero effect on YouTube, Hulu, Netflix, etc.)
               if (isSpotify) {
                 let spotifyPadStart = 1.0;
                 let spotifyPadEnd = 0.6;
                 if (muteAggressiveness === 1) {
                   spotifyPadStart = 0.7;
                   spotifyPadEnd = 0.4;
                 } else if (muteAggressiveness === 3) {
                    spotifyPadStart = 1.4;
                    spotifyPadEnd = 0.9;
                 }
                  paddedStart = Math.max(0, startSec - spotifyPadStart);
                  paddedEnd = (startSec + evDurationSec) + spotifyPadEnd;
               }
               
               muteZones.push({ start: paddedStart, end: paddedEnd, word: word });
               console.log(`🤬 [Censor] Interpolated Zone caught! ${paddedStart.toFixed(2)} - ${paddedEnd.toFixed(2)} (Word: ${word})`);
            }
         });
      } else {
         containsBadWord = wordsToCheck.some(word => {
            if (!word || typeof word !== 'string') return false;
            const regex = getWordRegex(word);
            let match = regex.exec(cleanText);
            if (!match) return false;
            let matchIndex = match.index;
            
            // --- RESPECTFUL MODE LOGIC ---
            if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) {
                return false;
            }
            
            // Guarantee the bad word actually touches the first event (i)
            if (j > 0) {
              if (charMap.length > matchIndex && charMap[matchIndex] >= firstEventTextLength) {
                return false;
              }
              const textWithoutFirst = combinedText.substring(firstEventTextLength);
              const cleanWithoutFirst = textWithoutFirst.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, " ").toLowerCase();
              if (getWordRegex(word).test(cleanWithoutFirst)) {
                return false;
              }
            }
            
            let evDurationSec = (data.events[i].dDurationMs || 2000) / 1000;
            if (j > 0 && data.events[i+j].tStartMs !== undefined) {
               const endOfEv = (data.events[i+j].tStartMs + (data.events[i+j].dDurationMs || 2000)) / 1000;
               evDurationSec = endOfEv - startSec;
            }
            
            let paddedStart = startSec;
            let paddedEnd = startSec + evDurationSec;
            
            if (isTranslated && data.events[i].dDurationMs) {
              // YouTube translated captions
              let translationPad = 1.5;
              if (muteAggressiveness === 1) {
                translationPad = 0.9;
              } else if (muteAggressiveness === 3) {
                translationPad = 2.5;
              }
              paddedStart = Math.max(0, startSec - translationPad);
              paddedEnd = startSec + evDurationSec + translationPad;
            } else {
              // YouTube native captions
              let exactStart = startSec;
              let exactEnd = startSec + evDurationSec;
              
              const hasMicroWordOffsets = charTimes.length > 1 && (charTimes[charTimes.length - 1] - charTimes[0]) > 0.05;
              if (hasMicroWordOffsets && charMap.length >= matchIndex + word.length) {
                  // ASR automatic captions with micro word-offsets
                  const startCharIdx = charMap[matchIndex];
                  const endCharIdx = charMap[matchIndex + word.length - 1];
                  if (startCharIdx < charTimes.length && endCharIdx < charTimes.length) {
                      exactStart = charTimes[startCharIdx];
                      exactEnd = charTimes[endCharIdx];
                  }
                  if (exactEnd - exactStart > 3.0) {
                      exactEnd = exactStart + 3.0;
                  }
              } else {
                  // Uploaded / manual captions without per-character offsets: linearly interpolate word position within cue duration!
                  const textLen = cleanText.length || 1;
                  const pctStart = matchIndex / textLen;
                  const pctEnd = (matchIndex + word.length) / textLen;
                  exactStart = startSec + pctStart * evDurationSec;
                  exactEnd = startSec + pctEnd * evDurationSec;
              }
              
              let exactPadStart = 0.5;
              let exactPadEnd = 0.6;
              if (muteAggressiveness === 1) {
                exactPadStart = 0.3;
                exactPadEnd = 0.4;
              } else if (muteAggressiveness === 3) {
                exactPadStart = 1.0;
                exactPadEnd = 1.0;
              }
              paddedStart = Math.max(0, exactStart - exactPadStart);
              paddedEnd = exactEnd + exactPadEnd;
            }
            
            if (word === 'jesus' || word === 'jesus christ' || word === 'god' || word === 'goddamn' || word === 'god damn' || word === 'christ' || word === 'lord') {
                const extraPad = 0.4;
                paddedStart = Math.max(0, paddedStart - extraPad);
                paddedEnd = paddedEnd + extraPad;
            }
            
            muteZones.push({ start: paddedStart, end: paddedEnd, word: word });
            console.log(`🤬 [Censor] Zone caught! ${paddedStart.toFixed(2)} - ${paddedEnd.toFixed(2)} | Word: "${word}" | Text: "${combinedText.trim()}"`);
            return true;
         });
      }
      
      if (containsBadWord) break;
    }
  }
  
  if (Array.isArray(muteZones) && muteZones.length > 0) {
    muteZones.sort((a, b) => a.start - b.start);
    const merged = [];
    for (let k = 0; k < muteZones.length; k++) {
      const z = muteZones[k];
      if (merged.length === 0) {
        merged.push({ start: z.start, end: z.end, word: z.word });
      } else {
        const prev = merged[merged.length - 1];
        if (z.start <= prev.end + 0.15) {
          prev.end = Math.max(prev.end, z.end);
          if (z.word && (!prev.word || !prev.word.includes(z.word))) {
            prev.word = prev.word ? (prev.word + ", " + z.word) : z.word;
          }
        } else {
          merged.push({ start: z.start, end: z.end, word: z.word });
        }
      }
    }
    muteZones = merged;
  }
  
  // Clean up any preloaded/existing captions already rendered in the DOM
  hideExistingCaptionsOnPage();
}

let paramountAudioCtx = null;
let paramountGainNode = null;
let paramountSourceNode = null;
let paramountConnectedVideo = null;
let paramountHasUserGesture = false;

// Create/Resume AudioContext strictly INSIDE human user gesture callbacks
try {
  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evtType => {
    window.addEventListener(evtType, () => {
      paramountHasUserGesture = true;
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass && !paramountAudioCtx) {
          paramountAudioCtx = new AudioContextClass();
        }
        if (paramountAudioCtx && paramountAudioCtx.state === 'suspended') {
          const res = paramountAudioCtx.resume();
          if (res && typeof res.catch === 'function') res.catch(() => {});
        }
      } catch(e) {}
    }, { passive: true, capture: true });
  });
} catch(e) {}

function setupParamountWebAudio(videoEl) {
  if (!videoEl || paramountConnectedVideo === videoEl) return;
  // Guard: Do NOT instantiate AudioContext prior to user gesture to satisfy Chrome Autoplay Policy
  if (!paramountHasUserGesture && !paramountAudioCtx) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!paramountAudioCtx && paramountHasUserGesture) {
      try {
        paramountAudioCtx = new AudioContextClass();
      } catch(e) {
        return;
      }
    }
    if (paramountAudioCtx && paramountAudioCtx.state === 'suspended') {
      try {
        const res = paramountAudioCtx.resume();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch(e) {}
    }
    if (paramountAudioCtx && !paramountSourceNode) {
      paramountSourceNode = paramountAudioCtx.createMediaElementSource(videoEl);
      paramountGainNode = paramountAudioCtx.createGain();
      paramountSourceNode.connect(paramountGainNode);
      paramountGainNode.connect(paramountAudioCtx.destination);
      paramountConnectedVideo = videoEl;
    }
  } catch(e) {}
}

function applyParamountAudioMute(videoEl, shouldMute) {
  if (!videoEl) return;
  setupParamountWebAudio(videoEl);
  if (paramountGainNode && paramountAudioCtx) {
    try {
      if (paramountAudioCtx.state === 'suspended') {
        const res = paramountAudioCtx.resume();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      }
      if (paramountAudioCtx.state === 'running') {
        paramountGainNode.gain.setValueAtTime(shouldMute ? 0 : 1, paramountAudioCtx.currentTime);
      }
    } catch(e) {}
  }
}

let lastBroadcastMuteState = null;

function updatePlayerState() {
  const shouldBeMuted = (networkIsMuting || fallbackIsMuting) && extensionEnabled === true;
  
  if (shouldBeMuted !== lastBroadcastMuteState) {
    lastBroadcastMuteState = shouldBeMuted;
    try {
      window.postMessage({ type: 'BOOTUBE_MUTE_STATE_CHANGED', isMuted: shouldBeMuted }, '*');
    } catch(e) {}
  }

  const vids = findVideos();
  if (shouldBeMuted && isYouTube) {
     const activeV = getActiveVideoElement(vids);
     const curTime = activeV ? activeV.currentTime.toFixed(2) : '0';
     console.log(`🤬 [Censor/YouTube] Mute & Blur ACTIVE at time: ${curTime}s | networkIsMuting=${networkIsMuting}, fallbackIsMuting=${fallbackIsMuting}, blur=${enableBlur}`);
  }
  if (isMax && vids.length > 0 && shouldBeMuted) {
     console.log(`📺 [HBO Max Diagnostic] Mute Triggered! shouldBeMuted=${shouldBeMuted}, fallbackIsMuting=${fallbackIsMuting}, networkIsMuting=${networkIsMuting}, blur=${enableBlur}`);
  }
  if (isNetflix && vids.length > 0 && shouldBeMuted) {
     console.log(`🍿 [Netflix Diagnostic] Mute & Blur ACTIVE! shouldBeMuted=${shouldBeMuted}, fallbackIsMuting=${fallbackIsMuting}, networkIsMuting=${networkIsMuting}, blur=${enableBlur}`);
  }
  
  for (const v of vids) {
    if (isParamount) {
      applyParamountAudioMute(v, shouldBeMuted);
      v._bootubeMuted = shouldBeMuted;
      if (enableBlur && shouldBeMuted) {
        v.style.filter = 'blur(40px)';
        v._bootubeBlurred = true;
      } else if (v._bootubeBlurred || v.style.filter === 'blur(40px)') {
        v.style.filter = 'none';
        v._bootubeBlurred = false;
      }
      continue;
    }
    if (shouldBeMuted) {
      if (!v.muted || (v.volume > 0 && !isNetflix && !isParamount && !isPeacock && !isFandango && !isMax)) {
        if (v._originalVolume === undefined && v.volume > 0) {
          v._originalVolume = v.volume;
        }
        v.muted = true;
        if (!isNetflix && !isParamount && !isPeacock && !isFandango && !isMax) {
          try { v.volume = 0; } catch(e) {}
        }
        v._bootubeMuted = true;
      }
      if (enableBlur) {
        v.style.filter = 'blur(40px)';
        v._bootubeBlurred = true;
      } else if (v._bootubeBlurred || v.style.filter === 'blur(40px)') {
        v.style.filter = 'none';
        v._bootubeBlurred = false;
      }
    } else {
      if (v._bootubeMuted) {
        v.muted = false;
        if (v._originalVolume !== undefined && !isNetflix && !isParamount && !isPeacock && !isFandango && !isMax) {
          try { v.volume = v._originalVolume; } catch(e) {}
        }
        v._bootubeMuted = false;
      }
      if (v._bootubeBlurred || v.style.filter === 'blur(40px)') {
        v.style.filter = 'none';
        v._bootubeBlurred = false;
      }
    }
  }
  
  if ((extensionEnabled === false || hideCC === false) && !isYouTube) {
     try {
       const segments = getSubtitleSegments();
       segments.forEach(s => {
          s.style.removeProperty('color');
          s.style.removeProperty('background-color');
          s.style.removeProperty('text-shadow');
          if (s.querySelectorAll) {
             s.querySelectorAll('*').forEach(child => {
                child.style.removeProperty('color');
                child.style.removeProperty('background-color');
                child.style.removeProperty('text-shadow');
             });
          }
          if (s.parentElement) {
             s.parentElement.style.removeProperty('background-color');
             s.parentElement.style.removeProperty('text-shadow');
          }
       });
     } catch(e) {}
  }
}

function getSpotifyCurrentTrackId() {
  const link = document.querySelector('[data-testid="now-playing-bar"] a[href*="/track/"]') || 
                document.querySelector('footer a[href*="/track/"]') || 
                document.querySelector('[class*="nowPlayingBar"] a[href*="/track/"]');
  if (link) {
     const match = link.href.match(/\/track\/([a-zA-Z0-9]+)/);
     if (match) return match[1];
  }
  return null;
}

function getSpotifyRealTime() {
  try {
    const posEl = document.querySelector('[data-testid="playback-position"]') ||
                  document.querySelector('.playback-bar [class*="time"]') ||
                  document.querySelector('[class*="playbackPosition"]') ||
                  document.querySelector('div[class*="elapsed"]');
    if (posEl && posEl.textContent) {
       const text = posEl.textContent.trim();
       const parts = text.split(':');
       if (parts.length === 2) {
          const mins = parseInt(parts[0], 10);
          const secs = parseFloat(parts[1]);
          if (!isNaN(mins) && !isNaN(secs)) {
             return mins * 60 + secs;
          }
       }
    }
  } catch(e) {}
  return -1;
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

function fetchSpotifyLyrics(trackId) {
  if (!spotifyBearerToken) return;
  console.log("🟢 [Spotify] Preemptively fetching lyrics for track:", trackId);
  
  const headers = {
    'Authorization': spotifyBearerToken,
    'App-Platform': 'WebPlayer'
  };
  
  fetch(`https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackId}?format=json&vocalRemoval=false`, { headers })
  .then(res => {
    if (!res.ok) throw new Error("HTTP status " + res.status);
    return res.json();
  })
  .then(data => {
    const converted = convertSpotifyLyricsToBooTube(data);
    if (converted) {
       console.log("🟢 [Spotify] Preemptive lyrics fetch succeeded (wg.spotify.com) & converted successfully.");
       processCaptionData(converted);
    }
  })
  .catch(err => {
    console.warn("⚠️ [Spotify] Preemptive lyrics fetch failed on wg.spotify.com, trying fallback...", err.message);
    fetch(`https://spclient.spotify.com/color-lyrics/v2/track/${trackId}?format=json&vocalRemoval=false`, { headers })
    .then(res => {
      if (!res.ok) throw new Error("HTTP status " + res.status);
      return res.json();
    })
    .then(data => {
      const converted = convertSpotifyLyricsToBooTube(data);
      if (converted) {
         console.log("🟢 [Spotify] Preemptive lyrics fetch succeeded (spclient.spotify.com) & converted successfully.");
         processCaptionData(converted);
      }
    })
    .catch(err2 => {
      console.error("❌ [Spotify] Preemptive lyrics fetch failed on both hosts:", err2.message);
    });
  });
}

function startTrackingPlaytime() {
  if (isSubFrame && !isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isYouTube && !isTwitter && !isSpotify && !isFacebook && !isMax && !isParamount && !isPeacock) return;
  if (window._censorTimeupdateBound) return;
  
  // Use a 50ms interval for sub-second precision!
  let tick = 0;
  let lastUrl = window.location.href;
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
       lastUrl = currentUrl;
       _lastFindVideosTime = 0;
       _cachedVideos = [];
       extractMetadata();
    }
    if (extensionEnabled === false) {
       fallbackIsMuting = false;
       networkIsMuting = false;
       updatePlayerState();
       return;
    }

    tick++;
    if (hideCC === true && tick % 20 === 0) {
       hideExistingCaptionsOnPage();
    }
    const vids = findVideos();
    if (isSpotify) {
       const currentTrackId = getSpotifyCurrentTrackId();
       if (currentTrackId && currentTrackId !== lastSpotifyTrackId) {
          lastSpotifyTrackId = currentTrackId;
          muteZones = [];
          console.log("🟢 [Spotify] Song changed, cleared muteZones, trackId is:", currentTrackId);
          fetchSpotifyLyrics(currentTrackId);
       }
    }
    const activeVid = getActiveVideoElement(vids);
    if (isYouTube && activeVid && activeVid.paused) return;
    let maxTime = activeVid ? activeVid.currentTime : 0;
    if (maxTime === 0) {
      for (const v of vids) {
        if (v.currentTime > maxTime) maxTime = v.currentTime;
      }
    }
    
    for (const v of vids) {
      
      if (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isPeacock || isSpotify || isFacebook) {
        try {
          for (let i = 0; i < v.textTracks.length; i++) {
const track = v.textTracks[i];
            if (!track._censorBound) {
              track._censorBound = true;
              track.addEventListener('cuechange', (e) => {
                if (extensionEnabled === false) return;
                const activeCues = e.target.activeCues;
                let hasBadWordInCues = false;
                let triggeringCue = null;
                let triggeringText = "";
                let paddedStart = 0;
                let paddedEnd = 0;
                
                if (activeCues && activeCues.length > 0) {
                  if (!Array.isArray(activeBlocklist)) activeBlocklist = DEFAULT_BLOCKLIST;
                  let wordsToCheck = getExpandedWords(activeBlocklist);

                  for (let j = 0; j < activeCues.length; j++) {
                    const cue = activeCues[j];
                    if (!cue._bootubeOriginalText) {
                      cue._bootubeOriginalText = cue.text || '';
                    }
                    const rawText = cue._bootubeOriginalText;
                    if (!rawText) continue;
                    let cleanText = rawText.replace(/<[^>]*>?/gm, '').replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
                    
                    let newText = rawText;
                    let foundBad = false;
                    let lastPaddedStart = 0;
                    let lastPaddedEnd = 0;
                    
                    wordsToCheck.forEach(word => {
                      if (!word) return;
                      const regex = getWordRegex(word);
                      let match;
                      let firstMatch = true;
                      while ((match = regex.exec(cleanText)) !== null) {
                        foundBad = true;
                        if (firstMatch) {
                          firstMatch = false;
                          const savedLastIndex = regex.lastIndex;
                          regex.lastIndex = 0;
                          newText = newText.replace(regex, getProfanityReplacementText(word));
                          regex.lastIndex = savedLastIndex;
                        }
                        
                        const badWordMatchIndex = match.index;
                        const textLen = cleanText.length || 1;
                        const pctStart = badWordMatchIndex / textLen;
                        const pctEnd = (badWordMatchIndex + word.length) / textLen;
                        const evDurationSec = cue.endTime - cue.startTime;
                        const startSec = cue.startTime;
                        
                        let wordStartSec = startSec + pctStart * evDurationSec;
                        let wordEndSec = startSec + pctEnd * evDurationSec;
                        
                        if (isTwitter) {
                          const twTiming = getTwitterExactWordTimings(cue.text || '', badWordMatchIndex, word.length, startSec, evDurationSec);
                          if (twTiming) {
                            wordStartSec = twTiming.wordStartSec;
                            wordEndSec = twTiming.wordEndSec;
                          }
                        }
                        
                        let padStart = 0.5;
                        let padEnd = 0.4;
                        if (muteAggressiveness === 1) {
                          padStart = 0.3;
                          padEnd = 0.25;
                        } else if (muteAggressiveness === 3) {
                          padStart = 0.8;
                          padEnd = 0.6;
                        }
                        
                        let paddedStart = 0;
                        let paddedEnd = 0;
                        
                        if (isSpotify) {
                          let spotifyPadStart = 1.0;
                          let spotifyPadEnd = 0.6;
                          if (muteAggressiveness === 1) {
                            spotifyPadStart = 0.7;
                            spotifyPadEnd = 0.4;
                          } else if (muteAggressiveness === 3) {
                            spotifyPadStart = 1.4;
                            spotifyPadEnd = 0.9;
                          }
                          paddedStart = Math.max(0, startSec - spotifyPadStart);
                          paddedEnd = (startSec + evDurationSec) + spotifyPadEnd;
                        } else {
                          let padStart = 0.5;
                          let padEnd = 0.4;
                          if (isDisneyPlus) {
                            paddedStart = Math.max(0, startSec - 0.8);
                            paddedEnd = startSec + evDurationSec + 0.4;
                            if (muteAggressiveness === 1) {
                              paddedStart = Math.max(0, startSec - 0.5);
                              paddedEnd = startSec + evDurationSec + 0.3;
                            } else if (muteAggressiveness === 3) {
                              paddedStart = Math.max(0, startSec - 1.2);
                              paddedEnd = startSec + evDurationSec + 0.6;
                            }
                          } else if (isFacebook) {
                            let padStart = 0.50;
                            let padEnd = 2.20;
                            if (muteAggressiveness === 1) {
                              padStart = 0.30;
                              padEnd = 1.60;
                            } else if (muteAggressiveness === 3) {
                              padStart = 0.80;
                              padEnd = 3.00;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          } else if (isTwitter) {
                            let padStart = 0.40;
                            let padEnd = 0.50;
                            if (muteAggressiveness === 1) {
                              padStart = 0.25;
                              padEnd = 0.30;
                            } else if (muteAggressiveness === 3) {
                              padStart = 0.65;
                              padEnd = 0.75;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          } else if (isFandango) {
                            const offset = 0.00;
                            wordStartSec += offset;
                            wordEndSec += offset;
                            padStart = 1.00;
                            padEnd = 0.50;
                            if (muteAggressiveness === 1) {
                              padStart = 0.70;
                              padEnd = 0.35;
                            } else if (muteAggressiveness === 3) {
                              padStart = 1.40;
                              padEnd = 0.75;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          } else if (isHulu) {
                            const offset = 0.00;
                            wordStartSec += offset;
                            wordEndSec += offset;
                            padStart = 1.50;
                            padEnd = 0.50;
                            if (muteAggressiveness === 1) {
                              padStart = 1.10;
                              padEnd = 0.35;
                            } else if (muteAggressiveness === 3) {
                              padStart = 1.90;
                              padEnd = 0.75;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          } else if (isPlex) {
                            const offset = 0.00;
                            wordStartSec += offset;
                            wordEndSec += offset;
                            padStart = 1.50;
                            padEnd = 0.50;
                            if (muteAggressiveness === 1) {
                              padStart = 1.10;
                              padEnd = 0.35;
                            } else if (muteAggressiveness === 3) {
                              padStart = 1.90;
                              padEnd = 0.75;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          } else if (isPrimeVideo) {
                            const offset = 0.75;
                            wordStartSec += offset;
                            wordEndSec += offset;
                            padStart = 0.15;
                            padEnd = 0.35;
                            if (muteAggressiveness === 1) {
                              padStart = 0.08;
                              padEnd = 0.20;
                            } else if (muteAggressiveness === 3) {
                              padStart = 0.35;
                              padEnd = 0.50;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          } else if (isMax) {
                            padStart = 0.45;
                            padEnd = 0.65;
                            if (muteAggressiveness === 1) {
                              padStart = 0.25;
                              padEnd = 0.40;
                            } else if (muteAggressiveness === 3) {
                              padStart = 0.75;
                              padEnd = 1.00;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          } else if (isPeacock) {
                            let padStart = 0.85;
                            let padEnd = 0.75;
                            if (muteAggressiveness === 1) {
                              padStart = 0.50;
                              padEnd = 0.50;
                            } else if (muteAggressiveness === 3) {
                              padStart = 1.25;
                              padEnd = 1.00;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          } else {
                            if (muteAggressiveness === 1) {
                              padStart = 0.3;
                              padEnd = 0.25;
                            } else if (muteAggressiveness === 3) {
                              padStart = 0.8;
                              padEnd = 0.6;
                            }
                            paddedStart = Math.max(0, wordStartSec - padStart);
                            paddedEnd = Math.min(startSec + 15, wordEndSec + padEnd);
                          }
                        }
                        
                        if (word === 'jesus' || word === 'jesus christ' || word === 'god' || word === 'goddamn' || word === 'god damn' || word === 'christ' || word === 'lord') {
                            const extraPad = (isPeacock || isFandango) ? 0.45 : (isDisneyPlus || isHulu || isPlex || isPrimeVideo || isTwitter || isMax || isFacebook) ? 0.05 : 0.3;
                            paddedStart = Math.max(0, paddedStart - extraPad);
                            paddedEnd = paddedEnd + extraPad;
                        }
                        
                        lastPaddedStart = paddedStart;
                        lastPaddedEnd = paddedEnd;
                        muteZones.push({ start: paddedStart, end: paddedEnd, word: word });
                      }
                    });

                    if (foundBad) {
                      if (v.currentTime >= lastPaddedStart && v.currentTime <= lastPaddedEnd) {
                        hasBadWordInCues = true;
                        triggeringCue = cue;
                        triggeringText = rawText;
                      }
                      try {
                        activeCues[j].text = newText;
                      } catch(err) {}
                    } else {
                      try {
                        if (activeCues[j]._bootubeOriginalText !== undefined) {
                          activeCues[j].text = activeCues[j]._bootubeOriginalText;
                        }
                      } catch(err) {}
                    }

                    const beacon = subtitleSyncBeacons.find(b => b.text === cleanText);
                    if (beacon && v.currentTime > 0) {
                      const estimatedOffset = beacon.start - v.currentTime;
                      if (Math.abs(chunkOffset - estimatedOffset) > 1.0) {
                        chunkOffset = estimatedOffset;
                        console.log(`🤬 [Censor] Synced Hulu/Disney+ clock via TextTrack! Phrase: "${cleanText}", Offset: ${chunkOffset.toFixed(2)}`);
                      }
                    }
                  }
                }


              });
            }
          }
        } catch(e) {}
      }
    }
    
    let spotifyTime = isSpotify ? getSpotifyRealTime() : -1;
    let activeMedia = getActiveVideoElement(vids);
    let currentTime = maxTime;
    if (isSpotify) {
       if (liveSpotifyHardwareTime > 0) {
          currentTime = liveSpotifyHardwareTime;
       } else if (spotifyTime >= 0) {
          currentTime = spotifyTime;
       } else if (activeMedia && activeMedia.currentTime > 0) {
          currentTime = activeMedia.currentTime;
       }
    }
    
    if (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isPeacock) {
      if (isDisneyPlus) {
        let uiTime = getDisneyRealTime();
        if (uiTime !== -1 && maxTime > 0) {
          if (uiTime !== lastUiTime) {
            chunkOffset = uiTime - maxTime;
            lastUiTime = uiTime;
            console.log(`🤬 [Censor] Synced Disney+ clock to UI Time: ${uiTime} (Offset: ${chunkOffset.toFixed(2)})`);
          }
        }
      } else if (isHulu) {
        let uiTime = getHuluRealTime();
        if (uiTime !== -1 && maxTime > 0) {
          if (uiTime !== lastHuluUiTime) {
            chunkOffset = uiTime - maxTime;
            lastHuluUiTime = uiTime;
            console.log(`🤬 [Censor] Synced Hulu clock to UI Time: ${uiTime} (Offset: ${chunkOffset.toFixed(2)})`);
          }
        }
      }
      
      // Subtitle Beacon Sync (Runs every 250ms)
      if (!isDisneyPlus && tick % 5 === 0 && subtitleSyncBeacons.length > 0 && maxTime > 0) {
         // Only check beacons that are close to the current player time (within 15 seconds) to avoid CPU spikes
         const currentOffset = chunkOffset || 0;
         const nearbyBeacons = subtitleSyncBeacons.filter(b => Math.abs(b.start - (maxTime + currentOffset)) < 15);
         for (const beacon of nearbyBeacons) {
            if (findTextInDOM(beacon.text)) {
                const estimatedOffset = beacon.start - maxTime;
                const isPlausible = chunkOffset === 0 || Math.abs(chunkOffset - estimatedOffset) < 10.0;
                
                if (chunkOffset === 0 || Math.abs(chunkOffset - estimatedOffset) > 2.0) {
                   chunkOffset = estimatedOffset;
                   console.log(`🤬 [Censor] Synced ${isHulu ? 'Hulu' : 'Platform'} clock via SUBTITLE BEACON! Phrase: "${beacon.text}", Offset: ${chunkOffset.toFixed(2)}`);
                }
                
                if (isPlausible) {
                   const idx = subtitleSyncBeacons.indexOf(beacon);
                   if (idx > -1) subtitleSyncBeacons.splice(idx, 1);
                   break;
                }
             }
         }
      }
      
      if (isNetflix || isMax || isParamount || isPeacock || isFandango || isPrimeVideo || isPlex) {
         chunkOffset = 0;
      }
      
      currentTime = maxTime + chunkOffset;
    }
    
    let shouldMute = isCurrentTimeMuted(currentTime, muteZones);
    
    if ((isHulu || isPlex || isNetflix || isPeacock || isFandango) && tick % 20 === 0) {
      const vidInfo = vids.map((v, idx) => `[#${idx} paused=${v.paused} cur=${v.currentTime.toFixed(1)}]`).join(' ');
      console.log(`📺 [${isFandango ? 'Fandango' : isPlex ? 'Plex' : isNetflix ? 'Netflix' : isPeacock ? 'Peacock' : 'Hulu'} Diagnostics] currentTime: ${currentTime.toFixed(2)}s (${Math.floor(currentTime/60)}:${String(Math.floor(currentTime%60)).padStart(2, '0')}) [rawMaxTime: ${maxTime.toFixed(2)}s, offset: ${chunkOffset.toFixed(2)}s] | shouldMute: ${shouldMute} | muteZones: ${muteZones.length} | vids (${vids.length}): ${vidInfo}`);
    }
    if ((isHulu || isPlex || isNetflix || isPeacock || isFandango) && Array.isArray(muteZones) && muteZones.length > 0) {
      const nearZone = muteZones.find(z => Math.abs(z.start - currentTime) < 3.0 || Math.abs(z.end - currentTime) < 3.0);
      if (nearZone && tick % 10 === 0) {
        console.log(`📺 [${isFandango ? 'Fandango' : isPlex ? 'Plex' : isNetflix ? 'Netflix' : isPeacock ? 'Peacock' : 'Hulu'} Near Zone] cur: ${currentTime.toFixed(2)}s | zone: [${nearZone.start.toFixed(2)}s - ${nearZone.end.toFixed(2)}s] (${nearZone.word}) | inZone: ${currentTime >= nearZone.start && currentTime <= nearZone.end}`);
      }
    }


    
    if (!isYouTube && (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isPeacock || isSpotify || isFacebook)) {
       const containerExists = isTwitter || isSpotify || isHulu || isPlex || isDisneyPlus || isFandango || isNetflix || isPrimeVideo || isFacebook || isMax || isParamount || isPeacock ||
                                document.querySelector('.a8PTgYsfzc07Np9G, [data-testid="lyrics-line"], div[class*="lyrics"], div[class*="Lyrics"]') ||
                                findShadowElement(document.body, '.shaka-text-container') ||
                               findShadowElement(document.body, '.dss-subtitle-container') ||
                               findShadowElement(document.body, '.dss-hls-subtitle-overlay') ||
                               findShadowElement(document.body, '.player-timedtext') ||
                               findShadowElement(document.body, 'div[class*="playback__subtitles"]') ||
                               findShadowElement(document.body, 'div[class*="shaka-text"]') ||
                               findShadowElement(document.body, '[class*="atvwebplayersdk"]') ||
                               findShadowElement(document.body, '[class*="subtitles-container"]') ||
                               findShadowElement(document.body, '[class*="subtitle-text"]') ||
                               findShadowElement(document.body, '[class*="atvplayer-subtitles"]') ||
                               findShadowElement(document.body, 'div[class*="x1vjfegm"]') ||
                               findShadowElement(document.body, 'div[class*="x1heor9g"]') ||
                               findShadowElement(document.body, 'div[class*="x32vodv"]') ||
                               findShadowElement(document.body, 'div[style*="background-color: rgba(20, 22, 26"]') ||
                               findShadowElement(document.body, 'div[style*="background-color: rgba(0, 0, 0"]') ||
                               findShadowElement(document.body, 'div[style*="background-color: rgba(0,0,0"]') ||
                               findShadowElement(document.body, 'div[class*="x1heor9g"]') ||
                               findShadowElement(document.body, '[class*="pv-video-subtitles"]');
                               
       if (!containerExists) {
          if (fallbackIsMuting) {
             fallbackIsMuting = false;
             updatePlayerState();
          }
       } else {
        const segments = getSubtitleSegments();
        let containsBadWord = false;
        
        if (segments.length > 0) {
          if (!Array.isArray(activeBlocklist)) activeBlocklist = DEFAULT_BLOCKLIST;
          let wordsToCheck = getExpandedWords(activeBlocklist);
          const wantsAutoCensorFilter = activeBlocklist.some(w => {
            let word = typeof w === 'string' ? w : (w ? w.word : '');
            return typeof word === 'string' && (/\[\s*_+\s*\]/.test(word) || /[*_]{2,}/.test(word) || word === '*' || word === '****' || word === '***');
          });

          const rawCombinedText = Array.from(segments).map(s => {
             const original = s.getAttribute('data-bootube-original-text');
             const textToUse = (original !== null && original !== undefined) ? original : s.textContent;
             return textToUse.replace(/\n/g, ' ');
          }).join(' ').toLowerCase().trim();

          const hasBadWord = (wantsAutoCensorFilter && /(?:\[\s*_+\s*\]|\*{2,}|\b[a-z]{1,2}\*{1,}[a-z]*\b)/i.test(rawCombinedText)) || wordsToCheck.some(word => {
              if (!word || typeof word !== 'string') return false;
              if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) return false;
              return getWordRegex(word).test(rawCombinedText);
          });

          if (isFacebook) {
             const activeV = videoElement || getActiveVideoElement(vids);
             const vTime = activeV ? activeV.currentTime : 0;
             const isRewind = activeV && lastFacebookVideoTime > 0 && (activeV.currentTime < lastFacebookVideoTime - 2.0);
             if (isRewind) {
               // User rewound/jumped backward in video - clear cached muted attributes & history so replaying works
               segments.forEach(s => {
                 if (s && s.removeAttribute) {
                   s.removeAttribute('data-bootube-bad-muted');
                   s.removeAttribute('data-bootube-last-text');
                 }
               });
               lastMutedFacebookText = '';
               mutedFacebookPhrases.clear();
             }
             if (activeV) lastFacebookVideoTime = activeV.currentTime;

             let hasNewUnmutedBadWord = false;
             let anyBadWordInCurrentSegments = false;

             segments.forEach(s => {
               const original = s.getAttribute('data-bootube-original-text');
               const textToUse = ((original !== null && original !== undefined) ? original : s.textContent).replace(/\n/g, ' ').toLowerCase().trim();
               
               const lastText = s.getAttribute('data-bootube-last-text');
               if (lastText !== textToUse) {
                 s.setAttribute('data-bootube-last-text', textToUse);
                 s.removeAttribute('data-bootube-bad-muted');
               }

               const segHasBad = (wantsAutoCensorFilter && /(?:\[\s*_+\s*\]|\*{2,}|\b[a-z]{1,2}\*{1,}[a-z]*\b)/i.test(textToUse)) || wordsToCheck.some(word => {
                 if (!word || typeof word !== 'string') return false;
                 return getWordRegex(word).test(textToUse);
               });

               if (segHasBad) {
                 anyBadWordInCurrentSegments = true;
                 const normSeg = textToUse.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, ' ').trim();
                 if (!isFacebookPhraseAlreadyMuted(normSeg, vTime)) {
                   s.setAttribute('data-bootube-bad-muted', 'true');
                   mutedFacebookPhrases.set(normSeg, vTime);
                   if (mutedFacebookPhrases.size > 100) {
                     const firstKey = mutedFacebookPhrases.keys().next().value;
                     mutedFacebookPhrases.delete(firstKey);
                   }
                   hasNewUnmutedBadWord = true;
                   console.log("🤬 [Censor/Facebook] Fresh bad word in segment:", normSeg, "at video time:", vTime.toFixed(2));
                 }
               }
             });

             if (hasNewUnmutedBadWord) {
               lastBadWordTime = Date.now();
               lastMutedFacebookText = rawCombinedText;
             }
             containsBadWord = anyBadWordInCurrentSegments;
          } else {
             containsBadWord = hasBadWord;
             if (containsBadWord) {
               lastBadWordTime = Date.now();
             }
          }

          if (containsBadWord) {
             
             segments.forEach(s => {
                const original = s.getAttribute('data-bootube-original-text');
                let text = (original !== null && original !== undefined) ? original : s.textContent;
                let foundBad = false;
                wordsToCheck.forEach(word => {
                   if (!word) return;
                   if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) {
                      return;
                   }
                   const regex = getWordRegex(word);
                   const nextText = text.replace(regex, getProfanityReplacementText(word));
                   if (nextText !== text) {
                      foundBad = true;
                      text = nextText;
                   }
                });
                if (!foundBad && wantsAutoCensorFilter && /(?:\[\s*_+\s*\]|\*{2,}|\b[a-z]{1,2}\*{1,}[a-z]*\b)/i.test(text)) {
                   foundBad = true;
                }
                if (foundBad) {
                   if (!s.hasAttribute('data-bootube-original-text')) {
                      s.setAttribute('data-bootube-original-text', s.textContent);
                   }
                   if (hideCC) {
                      s.style.setProperty('display', 'none', 'important');
                      s.style.setProperty('opacity', '0', 'important');
                      s.style.setProperty('transform', 'translate(-9999px, -9999px)', 'important');
                   } else {
                      s.textContent = text;
                   }
                }
             });
          } else {
             segments.forEach(s => {
                const original = s.getAttribute('data-bootube-original-text');
                if (original !== null && original !== undefined) {
                   s.textContent = original;
                   s.removeAttribute('data-bootube-original-text');
                }
             });
          }
          if (hideCC && isFacebook) {
             segments.forEach(s => {
                s.style.setProperty('display', 'none', 'important');
                s.style.setProperty('opacity', '0', 'important');
                if (s.parentElement && s.parentElement !== document.body) {
                   s.parentElement.style.setProperty('opacity', '0', 'important');
                   s.parentElement.style.setProperty('visibility', 'hidden', 'important');
                }
             });
          }
        }
         
        if (!shouldMute) {
          const activeVid = getActiveVideoElement(vids);
          if (activeVid && activeVid.textTracks) {
            for (let t = 0; t < activeVid.textTracks.length; t++) {
              const track = activeVid.textTracks[t];
              if (!track) continue;
              if (track.mode === 'disabled') {
                 if (!isPeacock && !isDisneyPlus && !isHulu && !isMax && !isParamount && !isNetflix && !isPrimeVideo && !isTwitter && !isSpotify && !isFacebook && !isFandango) {
                    try { track.mode = 'hidden'; } catch(e) {}
                 }
              }
              const cuesToScan = (track.cues && track.cues.length > 0) ? track.cues : track.activeCues;
              if (cuesToScan && cuesToScan.length > 0) {
                for (let j = 0; j < cuesToScan.length; j++) {
                  const cue = cuesToScan[j];
                  if (!cue._bootubeOriginalText) {
                    cue._bootubeOriginalText = cue.text || '';
                  }
                  const txt = cue._bootubeOriginalText;
                  if (!txt) continue;
                  
                  const canonical = getCanonicalText(txt);
                  if (canonical) {
                    interceptedSubtitleTexts.add(canonical);
                  }
                  
                  let cleanTxt = txt.replace(/<[^>]*>?/gm, '').replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
                  
                  if (!Array.isArray(activeBlocklist)) activeBlocklist = DEFAULT_BLOCKLIST;
                  let wordsToCheck = getExpandedWords(activeBlocklist);
                  let foundWord = null;
                  let matchIdx = -1;
                  
                  wordsToCheck.forEach(word => {
                    if (!word || typeof word !== 'string') return;
                    if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) {
                       return;
                    }
                    const regex = getWordRegex(word);
                    let match = regex.exec(cleanTxt);
                    if (match) {
                      foundWord = word;
                      matchIdx = match.index;
                    }
                  });
                  
                  if (foundWord) {
                    const textLen = cleanTxt.length || 1;
                    const pctStart = matchIdx / textLen;
                    const pctEnd = (matchIdx + foundWord.length) / textLen;
                    const duration = cue.endTime - cue.startTime;
                    
                    let wordStart = cue.startTime + pctStart * duration;
                    let wordEnd = cue.startTime + pctEnd * duration;
                    
                    if (isTwitter) {
                      const twTiming = getTwitterExactWordTimings(txt, matchIdx, foundWord.length, cue.startTime, duration);
                      if (twTiming) {
                        wordStart = twTiming.wordStartSec;
                        wordEnd = twTiming.wordEndSec;
                      }
                    }
                    
                    let padStart = 0.4;
                    let padEnd = 0.3;
                    if (isFacebook) {
                      padStart = 0.50;
                      padEnd = 2.20;
                      if (muteAggressiveness === 1) {
                        padStart = 0.30;
                        padEnd = 1.60;
                      } else if (muteAggressiveness === 3) {
                        padStart = 0.80;
                        padEnd = 3.00;
                      }
                    } else if (isTwitter) {
                      padStart = 0.40;
                      padEnd = 0.50;
                      if (muteAggressiveness === 1) {
                        padStart = 0.25;
                        padEnd = 0.30;
                      } else if (muteAggressiveness === 3) {
                        padStart = 0.65;
                        padEnd = 0.75;
                      }
                    } else if (isHulu) {
                      const offset = 0.00;
                      wordStart += offset;
                      wordEnd += offset;
                      padStart = 1.50;
                      padEnd = 0.50;
                      if (muteAggressiveness === 1) {
                        padStart = 1.10;
                        padEnd = 0.35;
                      } else if (muteAggressiveness === 3) {
                        padStart = 1.90;
                        padEnd = 0.75;
                      }
                    } else if (isPlex) {
                      const offset = 0.00;
                      wordStart += offset;
                      wordEnd += offset;
                      padStart = 1.50;
                      padEnd = 0.50;
                      if (muteAggressiveness === 1) {
                        padStart = 1.10;
                        padEnd = 0.35;
                      } else if (muteAggressiveness === 3) {
                        padStart = 1.90;
                        padEnd = 0.75;
                      }
                    } else if (isDisneyPlus || isPrimeVideo) {
                      const offset = 0.75;
                      wordStart += offset;
                      wordEnd += offset;
                      padStart = 0.30;
                      padEnd = 1.20;
                      if (muteAggressiveness === 1) {
                        padStart = 0.15;
                        padEnd = 0.85;
                      } else if (muteAggressiveness === 3) {
                        padStart = 0.50;
                        padEnd = 1.60;
                      }
                    } else if (isFandango) {
                      const offset = 0.00;
                      wordStart += offset;
                      wordEnd += offset;
                      padStart = 1.00;
                      padEnd = 0.50;
                      if (muteAggressiveness === 1) {
                        padStart = 0.70;
                        padEnd = 0.35;
                      } else if (muteAggressiveness === 3) {
                        padStart = 1.40;
                        padEnd = 0.75;
                      }
                    } else if (isPeacock) {
                      padStart = 1.10;
                      padEnd = 0.85;
                      if (muteAggressiveness === 1) {
                        padStart = 0.70;
                        padEnd = 0.60;
                      } else if (muteAggressiveness === 3) {
                        padStart = 1.50;
                        padEnd = 1.20;
                      }
                    } else if (isMax) {
                      padStart = 0.50;
                      padEnd = 0.80;
                      if (muteAggressiveness === 1) {
                        padStart = 0.30;
                        padEnd = 0.50;
                      } else if (muteAggressiveness === 3) {
                        padStart = 0.75;
                        padEnd = 1.20;
                      }
                    } else {
                      if (muteAggressiveness === 1) {
                        padStart = 0.2;
                        padEnd = 0.15;
                      } else if (muteAggressiveness === 3) {
                        padStart = 0.7;
                        padEnd = 0.5;
                      }
                    }
                    
                    if (foundWord === 'jesus' || foundWord === 'jesus christ' || foundWord === 'god' || foundWord === 'goddamn' || foundWord === 'god damn' || foundWord === 'christ' || foundWord === 'lord') {
                        const extraPad = (isPeacock || isFandango) ? 0.45 : (isDisneyPlus || isHulu || isPlex || isPrimeVideo || isTwitter || isMax || isFacebook) ? 0.05 : 0.3;
                        padStart += extraPad;
                    }
                    
                    const paddedStart = Math.max(0, wordStart - padStart);
                    const paddedEnd = Math.min(cue.startTime + 15, wordEnd + padEnd);
                    
                    if (!muteZones) muteZones = [];
                    const zoneExists = muteZones.some(z => Math.abs(z.start - paddedStart) < 0.15);
                    if (!zoneExists) {
                      muteZones.push({ start: paddedStart, end: paddedEnd, word: foundWord });
                      console.log(`🤬 [Censor/TextTrack] Built MuteZone from TextTrack cue "${foundWord}": [${paddedStart.toFixed(2)}s - ${paddedEnd.toFixed(2)}s] | Cue Text: "${txt.trim()}"`);
                    }
                    
                    if (activeVid.currentTime >= paddedStart && activeVid.currentTime <= paddedEnd) {
                      shouldMute = true;
                      break;
                    }
                  }
                }
              }
              if (shouldMute) break;
            }
          }
        }
        
        let isWithinMuteWindow = false;
        const cooldown = isFacebook ? getFacebookMuteCooldown(lastMutedFacebookText) : getMuteCooldown();
        if (isFacebook) {
          isWithinMuteWindow = (lastBadWordTime > 0 && (Date.now() - lastBadWordTime) < cooldown);
        } else {
          isWithinMuteWindow = containsBadWord || (lastBadWordTime > 0 && (Date.now() - lastBadWordTime) < cooldown);
        }
         
        if (isPrimeVideo || isMax || isFacebook || isPlex || !muteZones || muteZones.length === 0) {
          if (isWithinMuteWindow !== fallbackIsMuting) {
             console.log(`🤬 [Censor] Interval Mute State Changed -> ${isWithinMuteWindow} (containsBadWord: ${containsBadWord}, lastBadWordTime: ${lastBadWordTime}, elapsed: ${lastBadWordTime > 0 ? Date.now() - lastBadWordTime : -1}ms, cooldown: ${cooldown}ms)`);
             fallbackIsMuting = isWithinMuteWindow;
             updatePlayerState();
          }
        } else {
          if (fallbackIsMuting) {
             fallbackIsMuting = false;
             updatePlayerState();
          }
        }
       }
    }
    
    if (shouldMute !== networkIsMuting) {
      console.log(`🤬 [Censor] Mute State Changed -> ${shouldMute} at time: ${currentTime.toFixed(2)}`);
      networkIsMuting = shouldMute;
      updatePlayerState();
    } else {
      // Aggressively enforce state in case the SPA fights back
      if ((networkIsMuting || fallbackIsMuting) && (!isYouTube || (activeVid && !activeVid.paused))) {
        updatePlayerState();
      }
    }
  }, 50);
  
  window._censorTimeupdateBound = true;
}

// The Ultimate Fallback: Subtitle Sync Beacon & Dynamic Hiding!
let mutatingCensorText = false;
const subtitleObserver = new MutationObserver((mutations) => {
  if (mutatingCensorText) return;
  // NOTE: Subtitle hiding in subframes is handled exclusively via CSS injection (applyHideCCStyle).
  if (isSubFrame && !isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isYouTube && !isTwitter && !isSpotify && !isFacebook && !isMax && !isParamount && !isPeacock) return;
  if (!isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isTwitter && !isFacebook && !isMax && !isParamount && !isPeacock) return;
  if (!extensionEnabled || !Array.isArray(activeBlocklist) || activeBlocklist.length === 0) return;
  let wordsToCheck = getExpandedWords(activeBlocklist);
  if (wordsToCheck.length === 0) return;
  const wantsAutoCensorFilter = activeBlocklist.some(w => {
    let word = typeof w === 'string' ? w : (w ? w.word : '');
    return typeof word === 'string' && (/\[\s*_+\s*\]/.test(word) || /[*_]{2,}/.test(word) || word === '*' || word === '****' || word === '***');
  });
  
  let anyBadSubtitlesOnPage = false;
  let hasProcessedMutations = false;

  for (let m of mutations) {
    let rawText = "";
    let targetNode = null;
    
    if (m.type === 'characterData') {
      rawText = m.target.nodeValue;
      targetNode = m.target.parentElement;
    } else if (m.type === 'childList') {
      for (let node of m.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          rawText += node.nodeValue + " ";
          targetNode = node.parentElement;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue;
          rawText += node.textContent + " ";
          targetNode = node;
        }
      }
    }
    
    if (!rawText || !targetNode) continue;
    rawText = rawText.trim();
    if (rawText.length < 2) continue;
    
    if (isMax && rawText.length > 3) {
       console.log("📺 [HBO Max DOM Mutation]", rawText);
    }
    
    let isTargetSubtitle = false;
    let isUI = false;
    let insideHboCaptionOverlay = false;
    let insideFacebookSubtitle = false;
    let checkT = targetNode;
    const canonical = getCanonicalText(rawText);
    for (let step = 0; step < 12; step++) {
        if (!checkT) break;
        const tag = checkT.tagName.toLowerCase();
        const cls = (typeof checkT.className === 'string' ? checkT.className : '').toLowerCase();
        const id = (typeof checkT.id === 'string' ? checkT.id : '').toLowerCase();
        const testId = (checkT.getAttribute ? (checkT.getAttribute('data-testid') || '') : '').toLowerCase();
        const isHboCaptionOverlay = testId === 'caption_renderer_overlay' || cls.includes('caption_renderer');
        if (isHboCaptionOverlay) {
           insideHboCaptionOverlay = true;
        }
        
        // Precise tokenization for sub/cc classification to prevent false positives
        const classList = cls.split(/[\s_-]+/);
        const idList = id.split(/[\s_-]+/);
        const tokens = [...classList, ...idList];
        const hasSubtitleToken = tokens.some(t => 
          t === 'subtitle' || t === 'subtitles' || t === 'sub' || 
          t === 'caption' || t === 'captions' || t === 'cc' || 
          t === 'cue' || t === 'cues' || t === 'track' || t === 'tracks' || 
          t === 'lyric' || t === 'lyrics' || t === 'timedtext'
        );
        
        const hasVideo = document.querySelector('video') !== null;
        const insidePlayer = hasVideo && isInsideVideoPlayer(checkT);
        
        const hasMenuOrControlToken = 
            cls.includes('menu') || cls.includes('settings') || cls.includes('control') || cls.includes('audio') ||
            cls.includes('panel') || cls.includes('list') || cls.includes('select') ||
            cls.includes('btn') || cls.includes('button') || cls.includes('dropdown') || cls.includes('popover') ||
            cls.includes('popup') || cls.includes('dialog') || cls.includes('ad-') || cls.includes('promo') ||
            cls.includes('advertisement') || cls.includes('banner') || cls.includes('sponsor') || cls.includes('commercial') ||
            cls.includes('controls') || cls.includes('manager') || cls.includes('options') || cls.includes('selection') ||
            cls.includes('cbs') || cls.includes('avia') || cls.includes('ad') ||
            id.includes('menu') || id.includes('settings') || id.includes('control') || id.includes('audio') ||
            id.includes('panel') || id.includes('list') || id.includes('select') ||
            id.includes('btn') || id.includes('button') || id.includes('dropdown') || id.includes('popover') ||
            id.includes('popup') || id.includes('dialog') || id.includes('ad-') || id.includes('promo') ||
            id.includes('advertisement') || id.includes('banner') || id.includes('sponsor') || id.includes('commercial') ||
            id.includes('controls') || id.includes('manager') || id.includes('options') || id.includes('selection') ||
            id.includes('cbs') || id.includes('avia') || id.includes('ad');
        
        const isSpecificSubtitleClass = !hasMenuOrControlToken && (
            cls.includes('shaka') || cls.includes('vudu') || cls.includes('fandango') || cls.includes('dss-hls-subtitle') || cls.includes('timed-text') || cls.includes('timedtext') || cls.includes('player-timedtext') || cls.includes('atvwebplayersdk') || cls.includes('cfq7fuo') || cls.includes('crgqtox') ||
            id.includes('shaka') || id.includes('vudu') || id.includes('fandango') || id.includes('dss-hls-subtitle') || id.includes('timed-text') || id.includes('timedtext') || id.includes('atvwebplayersdk') ||
            cls.includes('caption-window') || cls.includes('subtitle-window') || cls.includes('caption-text') || cls.includes('subtitle-text') ||
            cls.includes('caption-cue') || cls.includes('subtitle-cue') || cls.includes('player-caption') || cls.includes('cue') || id.includes('cue')
        );

        const isPlayerSubtitle = canonical && insidePlayer && isTextKnownSubtitle(canonical);
        const isNetflixSubtitle = isNetflix && (cls.includes('player-timedtext') || cls.includes('timedtext') || (testId && testId.includes('timed-text')));
        const isFacebookSubtitle = isFacebook && (
            cls.includes('x32vodv') || cls.includes('x18l40ae') || cls.includes('x14ctfv') ||
            (checkT.style && (checkT.style.backgroundColor.includes('rgba(') || checkT.style.fontSize)) ||
            (checkT.parentElement && checkT.parentElement.style && (checkT.parentElement.style.backgroundColor.includes('rgba(') || checkT.parentElement.style.fontSize)) ||
            (checkT.querySelector && checkT.querySelector('br'))
        );
        if (isFacebookSubtitle) {
            insideFacebookSubtitle = true;
        }

        if ((hasVideo || isFacebook) && (
            (insidePlayer && hasSubtitleToken) || 
            isSpecificSubtitleClass || 
            isPlayerSubtitle ||
            insideHboCaptionOverlay ||
            isNetflixSubtitle ||
            insideFacebookSubtitle
        )) {
            isTargetSubtitle = true;
        }
        
        const role = checkT.getAttribute ? checkT.getAttribute('role') : '';
        const ariaHasPopup = checkT.getAttribute ? checkT.getAttribute('aria-haspopup') : '';
        const ariaExpanded = checkT.getAttribute ? checkT.getAttribute('aria-expanded') : '';
        const ariaControls = checkT.getAttribute ? checkT.getAttribute('aria-controls') : '';
        
        const isUIRoleOrAria = 
            (role && (role === 'button' || role === 'menu' || role === 'menuitem' || role === 'menuitemcheckbox' || role === 'menuitemradio' || role === 'option' || role === 'dialog' || role === 'listbox' || role === 'checkbox' || role === 'radio')) ||
            ariaHasPopup || ariaExpanded || ariaControls;

        if (!insideHboCaptionOverlay && !isNetflixSubtitle && !insideFacebookSubtitle && (tag === 'button' || tag === 'a' || tag === 'svg' || tag === 'input' || tag === 'path' ||
            hasMenuOrControlToken ||
            isUIRoleOrAria ||
            cls.includes('btn') || cls.includes('control') || cls.includes('button') || cls.includes('menu') || cls.includes('picker') || 
            cls.includes('volume') || cls.includes('progress') || cls.includes('timeline') || (cls.includes('time') && !cls.includes('timedtext') && !cls.includes('timed-text')) || 
            cls.includes('logo') || cls.includes('bar') || cls.includes('setting') || cls.includes('tooltip') || cls.includes('ad-') ||
            cls.includes('cbs') || cls.includes('avia') ||
            id.includes('btn') || id.includes('control') || id.includes('button') || id.includes('menu') || id.includes('volume') || id.includes('progress') ||
            id.includes('cbs') || id.includes('avia'))) {
            isUI = true;
        }
        checkT = checkT.parentElement || (checkT.getRootNode && checkT.getRootNode().host);
    }
    

    
    if (isTargetSubtitle && !isUI) {
      hasProcessedMutations = true;
      const cleanText = rawText.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, ' ').toLowerCase().trim();
      
      const containsBadWord = (wantsAutoCensorFilter && /(?:\[\s*_+\s*\]|\*{2,}|\b[a-z]{1,2}\*{1,}[a-z]*\b)/i.test(rawText.toLowerCase())) || wordsToCheck.some(word => {
          if (!word || typeof word !== 'string') return false;
          if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) return false;
          return getWordRegex(word).test(rawText.toLowerCase());
      });

      if (containsBadWord) {
        anyBadSubtitlesOnPage = true;
        console.log("🤬 [Censor/DOM] Detected bad word in subtitle DOM! Text:", rawText);

        if (isFacebook) {
          const vids = findVideos();
          const activeV = videoElement || getActiveVideoElement(vids);
          const vTime = activeV ? activeV.currentTime : 0;
          const normText = cleanText.replace(/[^\w\s'\[\]\*]/g, " ").replace(/\s+/g, ' ').trim();
          const segEl = (targetNode && targetNode.closest) ? targetNode.closest('span, div') : targetNode;
          if (isFacebookPhraseAlreadyMuted(normText, vTime) || (segEl && segEl.hasAttribute && segEl.hasAttribute('data-bootube-bad-muted'))) {
            // This segment was already muted! Do not re-trigger mute for lingering text.
          } else {
            if (segEl && segEl.setAttribute) segEl.setAttribute('data-bootube-bad-muted', 'true');
            mutedFacebookPhrases.set(normText, vTime);
            if (mutedFacebookPhrases.size > 100) {
              const firstKey = mutedFacebookPhrases.keys().next().value;
              mutedFacebookPhrases.delete(firstKey);
            }
            lastMutedFacebookText = cleanText;
            lastBadWordTime = Date.now();
            if (!fallbackIsMuting) {
              fallbackIsMuting = true;
              updatePlayerState();
            }
          }
        } else if (isPrimeVideo || isMax || isPlex) {
          // Amazon Prime Video, HBO Max, Plex: Real-time DOM subtitle rendering.
          // Trigger instant reactive audio muting with 0ms delay.
          lastBadWordTime = Date.now();
          if (!fallbackIsMuting) {
            fallbackIsMuting = true;
            updatePlayerState();
          }

          // Plex: Also record an instant live mute zone so scrubbing/rewinding remembers the profanity
          if (isPlex) {
            const vids = findVideos();
            const activeV = getActiveVideoElement(vids);
            if (activeV && activeV.currentTime > 0) {
              const curTime = activeV.currentTime;
              wordsToCheck.forEach(word => {
                if (!word || typeof word !== 'string') return;
                const regex = getWordRegex(word);
                if (regex.test(cleanText)) {
                  const liveStart = Math.max(0, curTime - 0.50);
                  const liveEnd = curTime + 2.00;
                  if (!muteZones) muteZones = [];
                  const exists = muteZones.some(z => Math.abs(z.start - liveStart) < 0.5);
                  if (!exists) {
                    muteZones.push({ start: liveStart, end: liveEnd, word: word });
                    muteZones.sort((a, b) => a.start - b.start);
                    console.log(`🤬 [Censor/DOM] Created Instant Live MuteZone for "${word}": [${liveStart.toFixed(2)}s - ${liveEnd.toFixed(2)}s]`);
                  }
                }
              });
            }
          }
        } else if (!isYouTube) {
          // Calculate proportional live mute zone from active video currentTime
          const vids = findVideos();
          const activeV = getActiveVideoElement(vids);
          if (activeV && activeV.currentTime > 0) {
            const curTime = activeV.currentTime;
            const textLen = cleanText.length || 1;
            const estDuration = 3.0; // standard subtitle phrase duration
            
            wordsToCheck.forEach(word => {
              if (!word || typeof word !== 'string') return;
              if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) return;
              
              const regex = getWordRegex(word);
              let match;
              while ((match = regex.exec(cleanText)) !== null) {
                const matchIdx = match.index;
                const pctStart = matchIdx / textLen;
                const pctEnd = (matchIdx + word.length) / textLen;
                
                const wordStart = curTime + pctStart * estDuration;
                const wordEnd = curTime + pctEnd * estDuration;
                
                const padStart = isFandango ? 0.80 : 0.40;
                const padEnd = isMax ? 0.85 : 0.65;
                const liveStart = Math.max(0, wordStart - padStart);
                const liveEnd = wordEnd + padEnd;
                
                if (!muteZones) muteZones = [];
                const exists = muteZones.some(z => Math.abs(z.start - liveStart) < 0.3);
                if (!exists) {
                  muteZones.push({ start: liveStart, end: liveEnd, word: word });
                  muteZones.sort((a, b) => a.start - b.start);
                  console.log(`🤬 [Censor/DOM] Created Proportional Live MuteZone for "${word}": [${liveStart.toFixed(2)}s - ${liveEnd.toFixed(2)}s] (pct: ${(pctStart*100).toFixed(0)}%-${(pctEnd*100).toFixed(0)}%)`);
                }
                
                // If the bad word is right at the start of the sentence, trigger immediate mute
                if (pctStart <= 0.20 && !isYouTube) {
                  if (curTime >= liveStart && curTime <= liveEnd) {
                    updatePlayerState();
                  }
                }
              }
            });
          } else if (!muteZones || muteZones.length === 0) {
            fallbackIsMuting = true;
            updatePlayerState();
          }
        }
        
        try {
          mutatingCensorText = true;
          
          if (m.type === 'characterData') {
             if (hideCC && m.target && m.target.parentElement) {
                m.target.parentElement.style.setProperty('display', 'none', 'important');
                m.target.parentElement.style.setProperty('opacity', '0', 'important');
                m.target.parentElement.style.setProperty('transform', 'translate(-9999px, -9999px)', 'important');
             } else {
                let censoredVal = m.target.nodeValue;
                wordsToCheck.forEach(word => {
                   if (!word) return;
                   if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) {
                      return;
                   }
                   const regex = getWordRegex(word);
                   censoredVal = censoredVal.replace(regex, getProfanityReplacementText(word));
                });
                if (m.target.nodeValue !== censoredVal) {
                   m.target.nodeValue = censoredVal;
                }
             }
          } else {
             const walker = document.createTreeWalker(targetNode, NodeFilter.SHOW_TEXT);
             while (walker.nextNode()) {
                if (hideCC && walker.currentNode.parentElement) {
                   walker.currentNode.parentElement.style.setProperty('display', 'none', 'important');
                   walker.currentNode.parentElement.style.setProperty('opacity', '0', 'important');
                   walker.currentNode.parentElement.style.setProperty('transform', 'translate(-9999px, -9999px)', 'important');
                } else if (!hideCC && walker.currentNode.parentElement && walker.currentNode.parentElement.style) {
                   walker.currentNode.parentElement.style.removeProperty('display');
                   walker.currentNode.parentElement.style.removeProperty('opacity');
                   walker.currentNode.parentElement.style.removeProperty('transform');
                   let censoredVal = walker.currentNode.nodeValue;
                   let foundBad = false;
                   wordsToCheck.forEach(word => {
                      if (!word) return;
                      if (isYouTube && respectfulModeEnabled && (isReligiousContext || isChannelWhitelisted(currentChannelName)) && safeList.includes(word)) {
                         return;
                      }
                      const regex = getWordRegex(word);
                      const nextText = censoredVal.replace(regex, getProfanityReplacementText(word));
                      if (nextText !== censoredVal) {
                         foundBad = true;
                         censoredVal = nextText;
                      }
                   });
                   if (foundBad && walker.currentNode.nodeValue !== censoredVal) {
                      walker.currentNode.nodeValue = censoredVal;
                   }
                }
             }
          }
        } catch(e) {} finally {
          mutatingCensorText = false;
        }
      }

      if (hideCC && !rawText.includes('{ opacity:')) {
        if (isDisneyPlus) {
           continue;
        }
        if (isElementVideoPlayerUI(targetNode) || isElementVideoPlayerUI(targetNode.parentElement)) {
           continue;
        }
        targetNode.setAttribute('data-bootube-hidden', 'true');
        targetNode.style.setProperty('color', 'transparent', 'important');
        targetNode.style.setProperty('opacity', '0', 'important');
        targetNode.style.setProperty('background-color', 'transparent', 'important');
        targetNode.style.setProperty('text-shadow', 'none', 'important');
        targetNode.style.setProperty('pointer-events', 'none', 'important');
        if (targetNode.querySelectorAll) {
           targetNode.querySelectorAll('*').forEach(child => {
              child.setAttribute('data-bootube-hidden', 'true');
              child.style.setProperty('color', 'transparent', 'important');
              child.style.setProperty('opacity', '0', 'important');
              child.style.setProperty('background-color', 'transparent', 'important');
              child.style.setProperty('text-shadow', 'none', 'important');
              child.style.setProperty('pointer-events', 'none', 'important');
           });
        }
        if (targetNode.parentElement) {
           targetNode.parentElement.setAttribute('data-bootube-parent-hidden', 'true');
           targetNode.parentElement.style.setProperty('background-color', 'transparent', 'important');
           targetNode.parentElement.style.setProperty('text-shadow', 'none', 'important');
        }
      }
    }
    
    if (rawText.length <= 150 && subtitleSyncBeacons.length > 0) {
      let cleanText = rawText.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
      if (cleanText.length > 0) {
        const beacon = subtitleSyncBeacons.find(b => b.text === cleanText);
        if (beacon) {
          const vids = findVideos();
          const activeVid = getActiveVideoElement(vids);
          let maxTime = activeVid ? activeVid.currentTime : 0;
          if (maxTime === 0) {
            for (let v of vids) { if (v.currentTime > maxTime) maxTime = v.currentTime; }
          }
          if (maxTime > 0) {
            const estimatedOffset = beacon.start - maxTime;
            if (chunkOffset === 0 || Math.abs(chunkOffset - estimatedOffset) > (isHulu ? 2.0 : 8.0)) {
              chunkOffset = estimatedOffset;
              console.log(`🤬 [Censor] Synced ${isHulu ? 'Hulu' : 'Disney+'} clock via Subtitle Beacon! Phrase: "${cleanText}", Offset: ${chunkOffset.toFixed(2)}`);
            }
          }
        }
      }
    }
  }

  if (hasProcessedMutations) {
    if (anyBadSubtitlesOnPage && !isFacebook) {
      if (!muteZones || muteZones.length === 0) {
        lastBadWordTime = Date.now();
        if (!fallbackIsMuting) {
          console.log(`🤬 [Censor] DOM mutation caught bad word! Muting...`);
          fallbackIsMuting = true;
          updatePlayerState();
        }
      }
    }
  }
});
if (!isYouTube) {
  subtitleObserver.observe(document.documentElement || document.body, { childList: true, subtree: true, characterData: true });
}

function isCaptionVisible(el) {
  if (!el || !el.textContent || el.textContent.trim().length === 0) return false;
  if (extensionEnabled && hideCC) {
    return true;
  }
  let curr = el;
  while (curr && curr !== document.body) {
    try {
      const style = window.getComputedStyle(curr);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
    } catch(err) {}
    curr = curr.parentElement || (curr.getRootNode && curr.getRootNode().host);
  }
  return true;
}

function getSubtitleSegments() {
  let rootNode = findShadowElement(document.body, '[data-testid="caption_renderer_overlay"]') ||
                 findShadowElement(document.body, '[class*="caption_renderer"]') ||
                 findShadowElement(document.body, '.hive-subtitle-renderer-wrapper') ||
                 findShadowElement(document.body, '.shaka-text-container') ||
                 findShadowElement(document.body, '.ytp-caption-window-container') ||
                 findShadowElement(document.body, '.dss-subtitle-container') ||
                 findShadowElement(document.body, '.dss-hls-subtitle-overlay') ||
                 findShadowElement(document.body, '.player-timedtext') ||
                 findShadowElement(document.body, 'div[class*="playback__subtitles"]') ||
                 findShadowElement(document.body, 'div[class*="shaka-text"]') ||
                 findShadowElement(document.body, '[class*="atvwebplayersdk"]') ||
                 findShadowElement(document.body, '[class*="subtitles-container"]') ||
                 findShadowElement(document.body, '[class*="subtitle-text"]') ||
                 findShadowElement(document.body, '[class*="avia-caption"]') ||
                 findShadowElement(document.body, '[class*="avia-subtitle"]') ||
                 findShadowElement(document.body, '.avia-caption-window') ||
                 findShadowElement(document.body, '.avia-subtitles') ||
                 findShadowElement(document.body, '[class*="atvplayer-subtitles"]') ||
                 findShadowElement(document.body, '[class*="pv-video-subtitles"]');
   
  if (isFacebook) {
    let video = videoElement || getActiveVideoElement(findVideos());
    let fbOverlay = null;
    if (video) {
      let container = (video.closest && video.closest('div[data-pagelet*="Video"], div[role="region"], div[data-video-id], .x10l6tqk, .x1ey2m1c')) || video.parentElement;
      if (container) {
        fbOverlay = container.querySelector('div[class*="x32vodv"], div[class*="x18l40ae"][class*="x14ctfv"], div[style*="background-color: rgba(20, 22, 26"], div[style*="background-color:rgba(20,22,26"]');
      }
    }
    if (!fbOverlay) {
      fbOverlay = document.querySelector('div[class*="x32vodv"], div[class*="x18l40ae"][class*="x14ctfv"], div[style*="background-color: rgba(20, 22, 26"], div[style*="background-color:rgba(20,22,26"]');
    }
    if (fbOverlay) {
      rootNode = fbOverlay;
    }
  }

  if (!rootNode) {
     let video = videoElement || getActiveVideoElement(findVideos());
    if (video) {
       let curr = video;
       for (let i = 0; i < 10; i++) {
          if (curr.parentElement && curr.parentElement !== document.body) {
             curr = curr.parentElement;
          } else {
             curr = document.body;
             break;
          }
       }
       rootNode = curr;
    } else {
       rootNode = document.querySelector('.html5-video-player') || document.querySelector('.hulu-player-container') || document.getElementById('hulu-player-container') || document.body;
    }
  }
  if (!rootNode) return [];

  if (isYouTube) {
    const allSegments = rootNode.querySelectorAll('.ytp-caption-segment');
    return Array.from(allSegments).filter(isCaptionVisible);
  }
  
  if (isSpotify) {
    // Only target the currently highlighted active lyric line to prevent loading the entire 50+ line song sheet into DOM memory at once
    const activeLyric = document.querySelector('[data-testid="lyrics-line"][class*="active"], [data-testid="lyrics-line"][class*="current"], [data-testid="lyrics-line"][aria-current="true"], div[class*="lyricsLine"][class*="active"], div[class*="LyricsLine"][class*="active"], [class*="lyrics-line--active"], [class*="active"][class*="lyric"], [class*="active"][class*="Lyric"]');
    if (activeLyric && isCaptionVisible(activeLyric)) {
      return [activeLyric];
    }
    return [];
  }
  
  const segments = [];
 
  function scan(node) {
    if (!node) return;
    
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue.trim().length === 0) return;
      const parent = node.parentElement;
      if (!parent) return;
      
      let isUI = false;
      let hasSubtitleParent = false;
      let curr = parent;
      for (let step = 0; step < 12; step++) {
         if (!curr) break;
         const tag = curr.tagName.toLowerCase();
         const cls = (typeof curr.className === 'string' ? curr.className : '').toLowerCase();
         const id = (typeof curr.id === 'string' ? curr.id : '').toLowerCase();
         const testId = curr.getAttribute ? curr.getAttribute('data-testid') : '';
         const isSubKeyword = testId === 'caption_renderer_overlay' ||
                              cls.includes('subtitle') || cls.includes('caption') || cls.includes('cue') || cls.includes('shaka-text') || cls.includes('dss-hls-subtitle') ||
                              cls.includes('hive-subtitle') || cls.includes('timedtext') || cls.includes('timed-text') || cls.includes('atvwebplayersdk') || cls.includes('lyric') ||
                              id.includes('subtitle') || id.includes('caption') || id.includes('cue') || id.includes('hive-subtitle') || id.includes('timedtext') || id.includes('timed-text') || id.includes('atvwebplayersdk') || id.includes('lyric') ||
                              /(?:^|[\s_-])(?:sub|subs|cc)(?:$|[\s_-])/i.test(cls) ||
                              /(?:^|[\s_-])(?:sub|subs|cc)(?:$|[\s_-])/i.test(id);
         const isFacebookSub = isFacebook && (
             cls.includes('x32vodv') || cls.includes('x18l40ae') || cls.includes('x14ctfv') ||
             (curr.style && (curr.style.backgroundColor.includes('rgba(') || curr.style.fontSize)) ||
             (curr.querySelector && curr.querySelector('br'))
         );
         if (isSubKeyword || isFacebookSub) {
             hasSubtitleParent = true;
         }
         
          const isButtonOrControl = tag === 'button' || tag === 'a' || tag === 'svg' || tag === 'input' || tag === 'path' || tag === 'select' ||
              cls.includes('control') || cls.includes('button') || cls.includes('menu') || cls.includes('picker') || 
              cls.includes('volume') || cls.includes('progress') || cls.includes('timeline') || (cls.includes('time') && !cls.includes('timedtext') && !cls.includes('timed-text')) || 
              cls.includes('logo') || cls.includes('bar') || cls.includes('setting') || cls.includes('tooltip') || cls.includes('ad-') ||
              cls.includes('scrub') || cls.includes('slider') || cls.includes('play') || cls.includes('pause') ||
              id.includes('control') || id.includes('button') || id.includes('menu') || id.includes('volume') || id.includes('progress') ||
              id.includes('scrub') || id.includes('slider') || id.includes('play') || id.includes('pause');

          if (!hasSubtitleParent && !isFacebookSub && isButtonOrControl) {
              isUI = true;
          }
         if (curr === rootNode) break;
         curr = curr.parentElement || (curr.getRootNode && curr.getRootNode().host);
      }
      if (isUI) {
         hasSubtitleParent = false;
      }
      if (!isUI && hasSubtitleParent && isCaptionVisible(parent)) {
         if (!segments.includes(parent)) {
            segments.push(parent);
         }
      }
    } else {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
        if (node.shadowRoot) scan(node.shadowRoot);
      }
      if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
          scan(node.childNodes[i]);
        }
      }
    }
  }
 
  scan(rootNode);
  return segments;
}

function startFallbackObserver() {
  if (captionObserver) {
     try {
       captionObserver.disconnect();
     } catch(err) {}
  }
}

// Tab Focus, Visibility & Stale Tab Re-hydration Suite
let lastRehydrationTime = 0;

function rehydrateFilterEngine() {
  const now = Date.now();
  if (now - lastRehydrationTime < 1000) return; // Cooldown throttle (1 sec)
  lastRehydrationTime = now;

  console.log("⚡ [BooTube] Re-hydrating filter engine (tab wake-up / focus / play event detected)...");

  // 1. Verify and reload storage safely if context is valid
  if (isContextValid() && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions'], (result) => {
        if (result) {
          handleSettingsLoaded(result);
        }
      });
    } catch (e) {
      console.warn("⚡ [BooTube] Context invalidated during tab wake-up, using active in-memory blocklist.");
    }
  }

  // 2. Re-bind active video DOM element and media play listeners
  const video = document.querySelector('video');
  if (video) {
    attachVideoPlayListeners(video);
  }

  // 3. Re-evaluate subtitle tracks and trigger player state update
  if (typeof updatePlayerState === 'function') {
    try {
      updatePlayerState();
    } catch(e) {}
  }

  // 4. Force caption payload re-processing for active cues if muteZones haven't been built yet
  if ((!muteZones || muteZones.length === 0) && allCaptionPayloads && allCaptionPayloads.length > 0) {
    allCaptionPayloads.forEach(data => processCaptionData(data.payload, data.isTranslated));
  }

  // 5. Ensure hideCC stylesheet is active
  if (typeof applyHideCCStyle === 'function') {
    try {
      applyHideCCStyle();
    } catch(e) {}
  }
}

function attachVideoPlayListeners(videoEl) {
  if (!videoEl || videoEl.dataset.bootubeListenersAttached === 'true') return;
  videoEl.dataset.bootubeListenersAttached = 'true';

  const onMediaEvent = () => {
    rehydrateFilterEngine();
  };

  videoEl.addEventListener('play', onMediaEvent);
  videoEl.addEventListener('playing', onMediaEvent);
  videoEl.addEventListener('seeked', onMediaEvent);
}

function setupTabRehydrationListeners() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      rehydrateFilterEngine();
    }
  });

  window.addEventListener('focus', () => {
    rehydrateFilterEngine();
  });

  // Watch for newly added video elements in SPA page transitions
  try {
    const videoObserver = new MutationObserver(() => {
      if (videoElement && videoElement.dataset.bootubeListenersAttached === 'true') return;
      const activeVid = videoElement || document.querySelector('video');
      if (activeVid && activeVid.dataset.bootubeListenersAttached === 'true') return;
      if (activeVid && !activeVid.dataset.bootubeListenersAttached) {
        attachVideoPlayListeners(activeVid);
      }
    });
    const target = document.body || document.documentElement;
    if (target) {
      videoObserver.observe(target, { childList: true, subtree: true });
    }
  } catch(e) {}

  // Initial attach for existing video
  const currentVideo = document.querySelector('video');
  if (currentVideo) {
    attachVideoPlayListeners(currentVideo);
  }
}

// YouTube SPA Trash Removal / Navigation Event Listeners
if (typeof window !== 'undefined') {
  const triggerYTGarbageCollection = () => {
    if (!isYouTube) return;
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || '';
    if (videoId && videoId !== lastYouTubeVideoId) {
      lastYouTubeVideoId = videoId;
      performGarbageCollection("YouTube SPA Event: " + videoId);
      setTimeout(() => {
        extractMetadata();
        if (extensionEnabled) {
          autoEnableCC();
          checkSubtitlesStatus();
        }
      }, 350);
    }
  };

  window.addEventListener('yt-navigate-finish', triggerYTGarbageCollection, true);
  window.addEventListener('yt-page-data-updated', triggerYTGarbageCollection, true);
  window.addEventListener('spfdone', triggerYTGarbageCollection, true);
  window.addEventListener('popstate', triggerYTGarbageCollection, true);
}

}
runBootube();
