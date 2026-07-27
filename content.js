const DEFAULT_BLOCKLIST = [
  "goddamn", "god damn", "jesus christ", "jesus", "christ", 
  "damn", "hell", "fuck", "fucking", "fucked", "shit", "bitch", "asshole", 
  "motherfucker", "bastard", "[ __ ]", "[__]", "ass", "shitty"
];

let isPremiumUser = true;

function checkIsPremium(status) {
  if (status === undefined || status === null || status === '') return true;
  const s = String(status).toLowerCase();
  return s === 'active' || s === 'premium' || s === 'pro' || s === 'true';
}

function isContextValid() {
  if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') return false;
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
  
  banner.innerHTML = `
    <span style="font-size: 14px; font-weight: 500; letter-spacing: -0.01em; color: #f3f4f6; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">🔒</span> Protect your streams: Upgrade to BooTube Premium to filter this channel
    </span>
    <a href="https://bootube.app/account" target="_blank" style="background: linear-gradient(90deg, #06b6d4, #3b82f6); color: #000; text-decoration: none; padding: 6px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; transition: all 0.2s; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);">Upgrade</a>
    <button id="bootube-close-banner-btn" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px; font-weight: bold; margin-left: 8px; padding: 4px; line-height: 1;">×</button>
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
let enabledCategories = ["Profanity", "Religious exclamations", "Custom"];
let activeBlocklist = [];
let muteZones = [];
let allCaptionPayloads = [];

// NEW STATE VARIABLES
let whitelistedChannels = [];
let safeList = ["god", "jesus", "christ", "lord", "savior", "messiah", "holy spirit", "jehovah", "yahweh", "jesus christ"];
let currentChannelName = "";
let isReligiousContext = false;
let wasChannelWhitelisted = false;
let metaInterval = null;

let muteAggressiveness = 2;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getWordRegex(word) {
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
  return new RegExp(startBoundary + finalPattern + endBoundary, 'gi');
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
     } else if (w === 'shit') {
        expanded.add('shitty');
        expanded.add('shitting');
        expanded.add('shits');
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

function findVideos() {
  const vids = [];
  try {
    trackedContentMedia.forEach(m => {
      if (m && !vids.includes(m)) vids.push(m);
    });
    const queue = [document.documentElement || document.body];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node) continue;
      
      if (node.tagName && (node.tagName.toLowerCase() === 'video' || node.tagName.toLowerCase() === 'audio')) {
        if (!vids.includes(node)) vids.push(node);
      }
      
      if (node.tagName && node.tagName.toLowerCase() === 'iframe') {
        try {
          if (node.contentDocument && node.contentDocument.documentElement) {
            queue.push(node.contentDocument.documentElement);
          }
        } catch(e) {}
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
  } catch(e) {}
  return vids;
}

function getActiveVideoElement(vids) {
  if (!vids || vids.length === 0) return null;
  const validVids = Array.from(vids).filter(v => v && (v.src || v.currentSrc || v.querySelector('source') || isSpotify));
  if (validVids.length === 0) return vids[0];
  if (isSpotify) {
     const playingWithTime = validVids.find(v => !v.paused && v.currentTime > 0 && !v.ended);
     if (playingWithTime) return playingWithTime;
     const playing = validVids.find(v => !v.paused);
     if (playing) return playing;
     const maxTimeVid = validVids.reduce((max, v) => (v.currentTime > (max ? max.currentTime : -1) ? v : max), null);
     return maxTimeVid || validVids[0];
  }
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
     if (titleEl) {
        let titleText = titleEl.textContent.trim();
        if (titleText && titleText.toLowerCase() !== 'hulu' && titleText.toLowerCase() !== 'watch') {
           const subEl = queryShadowAll(document.body, '[class*="subTitle"], [class*="subtitle"], [class*="Subtitle"]')[0];
           if (subEl) {
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

  const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
  const id = (typeof el.id === 'string' ? el.id : '').toLowerCase();
  
  const uiKeywords = [
    'btn', 'button', 'control', 'menu', 'picker', 'volume', 'progress', 
    'timeline', 'time', 'logo', 'bar', 'setting', 'tooltip', 'ad-', 'ad',
    'overlay', 'wrapper', 'player', 'avia', 'cbs', 'play', 'pause', 
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

function hideExistingCaptionsOnPage() {
  if (!hideCC || isYouTube || isDisneyPlus) return;
  try {
    const elements = document.querySelectorAll('span, div, p');
    for (let el of elements) {
      // Guard: Skip interactive elements, tools, menus, or ad overlay wrappers
      if (el.querySelector('video, button, svg, input, a, [class*="control"], [class*="player"], [class*="button"], [class*="ad"]')) {
        continue;
      }
      
      if (isElementVideoPlayerUI(el)) {
        continue;
      }
      
      if (el.textContent && el.textContent.trim().length > 1) {
        const canonical = getCanonicalText(el.textContent);
        if (canonical && isInsideVideoPlayer(el) && isTextKnownSubtitle(canonical)) {
          el.setAttribute('data-bootube-hidden', 'true');
          el.style.setProperty('color', 'transparent', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.style.setProperty('background-color', 'transparent', 'important');
          el.style.setProperty('text-shadow', 'none', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
          
          if (el.querySelectorAll) {
            el.querySelectorAll('*').forEach(child => {
              child.setAttribute('data-bootube-hidden', 'true');
              child.style.setProperty('color', 'transparent', 'important');
              child.style.setProperty('opacity', '0', 'important');
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
    }
  } catch (e) {}
}

function restoreAllHiddenCaptions() {
  try {
    const restoreInRoot = (root) => {
      if (!root) return;
      
      const hidden = root.querySelectorAll('[data-bootube-hidden], [data-bootube-parent-hidden]');
      hidden.forEach(el => {
        el.style.removeProperty('color');
        el.style.removeProperty('opacity');
        el.style.removeProperty('background-color');
        el.style.removeProperty('text-shadow');
        el.style.removeProperty('pointer-events');
        el.removeAttribute('data-bootube-hidden');
        el.removeAttribute('data-bootube-parent-hidden');
      });
      
      // Recurse into nested shadow roots
      const allElements = root.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.shadowRoot) {
          restoreInRoot(el.shadowRoot);
        }
      });
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

let spotifyBearerToken = null;
let lastSpotifyTrackId = null;
let chunkOffset = 0;
let lastUiTime = -1;
let subtitleSyncBeacons = [];
const injectedShadowRoots = new WeakSet();

let disneyTimeCache = null;

function getMuteCooldown() {
  let cooldown = 1500;
  if (typeof muteAggressiveness !== 'undefined') {
    if (muteAggressiveness === 1) cooldown = 1000;
    else if (muteAggressiveness === 3) cooldown = 2500;
  }
  if (typeof isPrimeVideo !== 'undefined' && isPrimeVideo) {
    cooldown += 1000;
  }
  if (typeof isNetflix !== 'undefined' && isNetflix) {
    cooldown = 500;
    if (muteAggressiveness === 1) cooldown = 350;
    else if (muteAggressiveness === 3) cooldown = 800;
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
           const cleanNode = root.nodeValue.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase();
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
let styleElement = null;

let isStorageLoaded = false;
let queuedPayloads = [];

console.log("🤬 [Censor] Content script loaded. Initializing bulletproof tracker...");
// Initialize storage safely
function handleSettingsLoaded(result) {
  if (!result) return;
  isPremiumUser = checkIsPremium(result ? result.subscriptionStatus : undefined);
  
  const isNonYoutube = isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isSpotify || isFacebook || isMax || isMax;
  if (isNonYoutube && !isPremiumUser) {
     console.log("🔒 [BooTube] Non-YouTube domain detected on Free tier. Censoring deactivated.");
     injectUpgradeBanner();
     extensionEnabled = false;
     applyHideCCStyle();
     return;
  }
  
  const rawBlocklist = result.blocklist || [];
  disabledWords = result.disabledWords || [];
  
  if (result.enabledCategories !== undefined) enabledCategories = result.enabledCategories;
  if (result.respectfulModeEnabled !== undefined) respectfulModeEnabled = result.respectfulModeEnabled;
  if (result.hideCCEnabled !== undefined) hideCC = result.hideCCEnabled;
  
  // Enforce premium settings locks
  enableBlur = isPremiumUser ? (result.blurEnabled ?? true) : false;
  extensionEnabled = result.bootubeEnabled ?? true;
  if (result.whitelistedChannels !== undefined) whitelistedChannels = result.whitelistedChannels;
  muteAggressiveness = isPremiumUser ? (result.muteAggressiveness ?? 2) : 2;
  
  // Transform object array into string array based on enabled categories, filtering out premium lists if not active
  const cats = isPremiumUser ? enabledCategories : ["Religious exclamations"];
  
  activeBlocklist = rawBlocklist.filter(item => {
    const word = typeof item === 'string' ? item : item.word;
    const cat = typeof item === 'string' ? 'Custom' : item.category;
    
    if (!isPremiumUser && cat !== "Religious exclamations") {
      return false;
    }
    
    return !disabledWords.includes(word) && cats.includes(cat);
  }).map(item => typeof item === 'string' ? item : item.word);
  
  applyHideCCStyle();
  
  muteZones = [];
  allCaptionPayloads.forEach(data => processCaptionData(data.payload, data.isTranslated));
  
  if (isSubFrame && !isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isYouTube && !isTwitter && !isSpotify && !isFacebook && !isMax && !isParamount) return;
  
  if (result.lastFetchedCaptions && result.lastFetchedCaptions.payload) {
     const data = result.lastFetchedCaptions;
     if (Date.now() - data.timestamp < 300000) { // 5 minutes fresh
        processCaptionData(data.payload, data.isTranslated);
     }
  }
  
  isStorageLoaded = true;
  queuedPayloads.forEach(p => processCaptionData(p.payload, p.isTranslated));
  queuedPayloads = [];
  
  if (isSpotify) {
     startTrackingPlaytime();
  }
  console.log("🤬 [Censor] Storage loaded, blocklist ready with", activeBlocklist.length, "words.");
}

// Initialize storage safely
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  try {
    chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions'], (result) => {
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
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions'], (result) => {
        try {
          if (event.source) {
            event.source.postMessage({
              type: 'BOOTUBE_RESP_SETTINGS',
              settings: result
            }, '*');
          }
        } catch (e) {}
      });
    }
  } else if (event.data.type === 'BOOTUBE_RESP_SETTINGS') {
    handleSettingsLoaded(event.data.settings);
  }
});

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
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
         const isNonYoutube = isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isSpotify || isFacebook || isMax || isMax;
         if (isNonYoutube && !isPremiumUser && !isSubFrame) {
            injectUpgradeBanner();
            extensionEnabled = false;
            applyHideCCStyle();
            updatePlayerState();
         } else if (isPremiumUser) {
            const banner = document.getElementById('bootube-upgrade-banner');
            if (banner) banner.remove();
            if (chrome.storage && chrome.storage.local) {
              chrome.storage.local.get(['bootubeEnabled'], (res) => {
                 if (res) {
                    extensionEnabled = res.bootubeEnabled ?? true;
                    applyHideCCStyle();
                    updatePlayerState();
                 }
              });
            }
         }
      }
      if (changes.bootubeEnabled !== undefined) {
         extensionEnabled = changes.bootubeEnabled.newValue ?? changes.bootubeEnabled;
         applyHideCCStyle();
         updatePlayerState();
      }
      if (changes.hideCCEnabled !== undefined) {
         hideCC = changes.hideCCEnabled.newValue ?? changes.hideCCEnabled;
         applyHideCCStyle();
      }
      if (changes.blurEnabled !== undefined) {
         enableBlur = isPremiumUser ? (changes.blurEnabled.newValue ?? changes.blurEnabled) : false;
         updatePlayerState();
      }
      if (changes.respectfulModeEnabled !== undefined) respectfulModeEnabled = changes.respectfulModeEnabled.newValue ?? changes.respectfulModeEnabled;
      if (changes.enabledCategories !== undefined) enabledCategories = changes.enabledCategories.newValue ?? changes.enabledCategories;
      if (changes.muteAggressiveness !== undefined) muteAggressiveness = isPremiumUser ? (changes.muteAggressiveness.newValue ?? changes.muteAggressiveness) : 2;
      
      if (changes.blocklist || changes.disabledWords || changes.enabledCategories || changes.respectfulModeEnabled || changes.muteAggressiveness !== undefined || changes.subscriptionStatus !== undefined || changes.bootubeEnabled !== undefined || changes.hideCCEnabled !== undefined || changes.blurEnabled !== undefined) {
        if (chrome.storage && chrome.storage.local && chrome.runtime && chrome.runtime.id) {
          try {
            chrome.storage.local.get(['subscriptionStatus', 'blocklist', 'disabledWords', 'hideCCEnabled', 'blurEnabled', 'bootubeEnabled', 'whitelistedChannels', 'enabledCategories', 'respectfulModeEnabled', 'muteAggressiveness', 'lastFetchedCaptions'], (res) => {
              if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id || !res) return;
              
              isPremiumUser = checkIsPremium(res.subscriptionStatus);
              enableBlur = isPremiumUser ? (res.blurEnabled ?? true) : false;
              extensionEnabled = res.bootubeEnabled ?? true;
              if (res.whitelistedChannels !== undefined) whitelistedChannels = res.whitelistedChannels;
              muteAggressiveness = isPremiumUser ? (res.muteAggressiveness ?? 2) : 2;
              
              const fullBlocklist = res.blocklist || [];
              const disabled = res.disabledWords || [];
              const cats = isPremiumUser ? (res.enabledCategories || ["Profanity", "Religious exclamations", "Custom"]) : ["Religious exclamations"];
              
              activeBlocklist = fullBlocklist.filter(item => {
                const word = typeof item === 'string' ? item : item.word;
                const cat = typeof item === 'string' ? 'Custom' : item.category;
                
                if (!isPremiumUser && cat !== "Religious exclamations") {
                  return false;
                }
                
                return !disabled.includes(word) && cats.includes(cat);
              }).map(item => typeof item === 'string' ? item : item.word);
              
              muteZones = [];
              allCaptionPayloads.forEach(data => processCaptionData(data.payload, data.isTranslated));
              
              // Broadcast updated settings to all sandboxed frames
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
      if (changes.lastFetchedCaptions && changes.lastFetchedCaptions.newValue) {
        const data = changes.lastFetchedCaptions.newValue;
        processCaptionData(data.payload, data.isTranslated);
      }
    }
  });
}

setInterval(() => {
   if (extensionEnabled && hideCC) {
      applyHideCCStyle();
   }
}, 1000);

// Communication with popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (isSubFrame) return;
    if (request.type === 'GET_CHANNEL_INFO') {
      sendResponse({
        channelName: currentChannelName,
        isReligiousContext: isReligiousContext
      });
    } else if (request.action === 'REQUEST_CAPTIONS') {
      sendResponse({ payloads: allCaptionPayloads });
    }
  });
}

function applyHideCCStyle() {
  const isCurrentlyHiding = extensionEnabled === true && hideCC === true;
  if (!isCurrentlyHiding) {
    restoreAllHiddenCaptions();
  }
  const lightCssText = isCurrentlyHiding ? `
    .hive-subtitle-renderer-line, .hive-subtitle-renderer-line *, .hive-subtitle-renderer-cue-window, .hive-subtitle-renderer-cue-window *, .caption-visual-line, .cfq7fuo, .crgqtox, .ytp-caption-segment, [class*="avia-caption"], [class*="avia-caption"] *, [class*="avia-subtitle"], [class*="avia-subtitle"] *,
    div[class*="subtitle-window"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), div[class*="subtitle-cue"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]),
    div[class*="caption-window"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), div[class*="caption-cue"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), div[class*="caption-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]),
    span[class*="subtitle-cue"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), span[class*="subtitle-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), span[class*="caption-segment"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), span[class*="caption-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]),
    p[class*="subtitle-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), p[class*="subtitle-cue"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), p[class*="caption-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]) { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
    video::-webkit-media-text-track-container { opacity: 0 !important; visibility: hidden !important; display: none !important; }
    video::-webkit-media-text-track-display { opacity: 0 !important; visibility: hidden !important; display: none !important; }
    ::cue { color: transparent !important; background-color: transparent !important; text-shadow: none !important; opacity: 0 !important; visibility: hidden !important; }
    .ytp-subtitles-button, .ytp-subtitles-button * { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
  ` : '';
  const shadowCssText = isCurrentlyHiding ? `
    .hive-subtitle-renderer-line, .hive-subtitle-renderer-line *, .hive-subtitle-renderer-cue-window, .hive-subtitle-renderer-cue-window *, .caption-visual-line, .cfq7fuo, .crgqtox, .ytp-caption-segment, [class*="avia-caption"], [class*="avia-caption"] *, [class*="avia-subtitle"], [class*="avia-subtitle"] *,
    div[class*="subtitle-window"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), div[class*="subtitle-cue"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]),
    div[class*="caption-window"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), div[class*="caption-cue"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), div[class*="caption-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]),
    span[class*="subtitle-cue"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), span[class*="subtitle-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), span[class*="caption-segment"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), span[class*="caption-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]),
    p[class*="subtitle-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), p[class*="subtitle-cue"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]), p[class*="caption-text"]:not([class*="menu"]):not([class*="settings"]):not([class*="audio"]):not([class*="control"]):not([class*="panel"]):not([class*="list"]):not([class*="select"]):not([class*="track"]):not([class*="btn"]):not([class*="button"]):not([class*="dropdown"]):not([class*="popover"]):not([class*="popup"]):not([class*="dialog"]):not([class*="ad-"]):not([class*="promo"]):not([class*="advertisement"]):not([class*="banner"]):not([class*="sponsor"]):not([class*="commercial"]):not([class*="controls"]):not([class*="manager"]):not([class*="options"]):not([class*="selection"]):not([class*="view"]) { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
    video::-webkit-media-text-track-container { opacity: 0 !important; visibility: hidden !important; display: none !important; }
    video::-webkit-media-text-track-display { opacity: 0 !important; visibility: hidden !important; display: none !important; }
    ::cue { color: transparent !important; background-color: transparent !important; text-shadow: none !important; opacity: 0 !important; visibility: hidden !important; }
    .ytp-subtitles-button, .ytp-subtitles-button * { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
  ` : '';

  // 1. Inject into Light DOM
  let lightStyle = document.getElementById('censor-light-css');
  if (!lightStyle) {
    lightStyle = document.createElement('style');
    lightStyle.id = 'censor-light-css';
    const target = document.head || document.documentElement;
    if (target) target.appendChild(lightStyle);
  }
  if (lightStyle.textContent !== lightCssText) {
    lightStyle.textContent = lightCssText;
  }

  // 2. Inject into all Shadow DOMs on the page dynamically (including nested shadow roots)
  try {
     const queue = [document.documentElement || document.body];
     while (queue.length > 0) {
        const node = queue.shift();
        if (!node) continue;
        
        if (node.shadowRoot) {
           injectShadowCss(node.shadowRoot, shadowCssText);
           queue.push(node.shadowRoot);
        }
        
        const children = node.children;
        if (children) {
           for (let i = 0; i < children.length; i++) {
              queue.push(children[i]);
           }
        }
     }
  } catch(e) {}
}

function injectShadowCss(shadowRoot, cssText) {
  if (injectedShadowRoots.has(shadowRoot)) {
     // Already injected! Let's just make sure the style node is present and has the correct content
     const shadowStyle = shadowRoot.getElementById('censor-shadow-css');
     if (shadowStyle && shadowStyle.textContent === cssText) {
        return;
     }
  }

  let shadowStyle = shadowRoot.getElementById('censor-shadow-css');
  if (!shadowStyle) {
     shadowStyle = document.createElement('style');
     shadowStyle.id = 'censor-shadow-css';
     shadowRoot.appendChild(shadowStyle);
  }
  if (shadowStyle.textContent !== cssText) {
     shadowStyle.textContent = cssText;
  }
  injectedShadowRoots.add(shadowRoot);
}

function extractMetadata() {
  try {
      if (metaInterval) {
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
              
              const religiousKeywords = [
                  'religion', 'religions', 'religious', 'christian', 'christians', 'christianity',
                  'church', 'churches', 'sermon', 'sermons', 'gospel', 'gospels',
                  'lds', 'mormon', 'mormons', 'worship', 'worshipping', 'worshiper', 'worshipers',
                  'worshipper', 'worshippers', 'worships',
                  'ministry', 'ministries', 'pastor', 'pastors', 'priest', 'priests', 'bishop', 'bishops',
                  'bible', 'biblical', 'scripture', 'scriptures', 'god', 'jesus', 'christ', 'lord',
                  'savior', 'messiah', 'jehovah', 'yahweh', 'faith', 'prayer', 'prayers', 'pray', 'praying',
                  'devotional', 'devotionals', 'catholic', 'catholicism', 'orthodox', 'baptist',
                  'methodist', 'lutheran', 'presbyterian', 'evangelical', 'preach', 'preaches', 'preaching'
              ];
               
               let foundNewReligious = false;
               if (!isSpotify) {
                  const titleWords = title.split(/\s+/);
                  for (let tw of titleWords) {
                      if (tw && religiousKeywords.includes(tw)) {
                          foundNewReligious = true;
                          break;
                      }
                  }
                  if (!foundNewReligious && currentChannelName) {
                      const channelWords = currentChannelName.toLowerCase().split(/\s+/);
                      for (let cw of channelWords) {
                          if (cw && religiousKeywords.includes(cw)) {
                              foundNewReligious = true;
                              break;
                          }
                      }
                  }
               }
              
              let isWhitelisted = whitelistedChannels.includes(currentChannelName);
              
              if (foundNewReligious !== isReligiousContext || isWhitelisted !== wasChannelWhitelisted) {
                  isReligiousContext = foundNewReligious;
                  wasChannelWhitelisted = isWhitelisted;
                  console.log(`🤬 [Censor] Context changed: isReligiousContext=${isReligiousContext}, isWhitelisted=${isWhitelisted}. Re-processing captions.`);
                  muteZones = [];
                  allCaptionPayloads.forEach(data => processCaptionData(data.payload, data.isTranslated));
              }
              
              if (currentChannelName !== "" || attempts > 10) {
                  clearInterval(metaInterval);
                  metaInterval = null;
              }
          } catch(e) {}
      }, 1000);
  } catch(e) { console.error("extractMetadata failed", e); }
}

// 1. Better DOM/SPA tracking
  setInterval(() => {
    if (isSubFrame && !isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isYouTube && !isTwitter && !isSpotify && !isFacebook && !isMax && !isParamount) return;
    const vids = findVideos();
  const currentVid = getActiveVideoElement(vids);
  
  if (isFandango) {
     console.log("🤬 [Censor Fandango Debug] findVideos found:", vids.length, "currentVid:", currentVid ? {
       tagName: currentVid.tagName,
       src: currentVid.src,
       currentSrc: currentVid.currentSrc,
       width: currentVid.offsetWidth,
       height: currentVid.offsetHeight,
       paused: currentVid.paused,
       currentTime: currentVid.currentTime
     } : 'null');
  }
  
  // Continuously ensure our CSS rules apply to dynamically mounted shadow roots
  if (extensionEnabled && hideCC) {
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
  
  if (currentVid || isSpotify) {
    try {
      const hosts = document.querySelectorAll('*');
      hosts.forEach(host => {
         if (host.shadowRoot && !host.shadowRoot._observed) {
            host.shadowRoot._observed = true;
            subtitleObserver.observe(host.shadowRoot, { childList: true, subtree: true, characterData: true });
         }
      });
    } catch(err) {}
    const activeSrc = currentVid ? (currentVid.src || currentVid.currentSrc || 'unknown_src') : 'spotify_stream';
    if (currentVid !== videoElement || activeSrc !== currentVideoSrc) {
      console.log("🤬 [Censor] New video detected:", activeSrc);
      
      // Only wipe if the OLD video was an actual video.
      // If the old video was 'unknown_src', it means we are just upgrading to the blob URL during player boot.
      // We must not wipe, because the subtitles have already loaded!
      if (currentVideoSrc !== 'unknown_src' && currentVideoSrc !== 'unknown') {
        muteZones = [];
        subtitleSyncBeacons = [];
        chunkOffset = 0;
        networkIsMuting = false;
        fallbackIsMuting = false;
      }
      
      videoElement = currentVid;
      currentVideoSrc = activeSrc;
      
      extractMetadata();
      
      startTrackingPlaytime();
      startFallbackObserver();
      autoEnableCC();
      checkSubtitlesStatus();
    }
  }
  
  if (extensionEnabled && hideCC) {
    hideExistingCaptionsOnPage();
  }
}, 500);

function autoEnableCC() {
  const ccInterval = setInterval(() => {
    const ccButton = document.querySelector('.ytp-subtitles-button');
    if (ccButton) {
      clearInterval(ccInterval);
      setTimeout(() => {
        if (ccButton.getAttribute('aria-pressed') === 'false') {
          ccButton.click();
        }
      }, 1000);
    }
  }, 1000);
}

function checkSubtitlesStatus() {
  if (isSpotify) return; // Spotify lyrics are intercepted automatically in background
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
  try {
    chrome.storage.local.get(['hideSubtitleToast', 'hideDisneyToast'], (res) => {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id || chrome.runtime.lastError) return;
        if (res && (res.hideSubtitleToast || res.hideDisneyToast)) return;
        
        // Check 6 seconds after video load to verify if any subtitles are active
        setTimeout(() => {
          const platformName = isParamount ? 'Paramount+' : isMax ? 'Max' : isDisneyPlus ? 'Disney+' : 
                             isHulu ? 'Hulu' : 
                             isPlex ? 'Plex' : 
                             isFandango ? 'Fandango' : 
                             isNetflix ? 'Netflix' : 
                             isPrimeVideo ? 'Prime Video' : 
                             isYouTube ? 'YouTube' : 'this platform';

          let hasActiveCaptions = (allCaptionPayloads && allCaptionPayloads.length > 0) || (muteZones && muteZones.length > 0);
          let activeVid = videoElement || getActiveVideoElement(findVideos());
          
          if (!hasActiveCaptions && activeVid && activeVid.textTracks) {
            for (let i = 0; i < activeVid.textTracks.length; i++) {
              if (activeVid.textTracks[i].mode === 'showing') {
                hasActiveCaptions = true;
                break;
              }
            }
          }
          
          if (!hasActiveCaptions) {
            const capEl = document.querySelector('.ytp-caption-window-container, .shaka-text-container, .dss-subtitle-container, timed-text-override-region, .hive-subtitle-renderer-cue-window, .caption-visual-line, [class*="subtitle"], [class*="caption"]');
            if (capEl && capEl.textContent && capEl.textContent.trim().length > 0) {
              hasActiveCaptions = true;
            }
          }
          
          if (!hasActiveCaptions) {
            showBootubeToast(platformName);
          }
        }, 6000);
    });
  } catch(e) {}
}

function showBootubeToast(platformName = 'this platform') {
  if (document.getElementById('bootube-toast')) return;
  
  const toast = document.createElement('div');
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
  
  const title = document.createElement('strong');
  title.innerText = 'BooTube Requires Subtitles';
  title.style.color = '#3AA5C2';
  title.style.fontSize = '16px';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', 
    fontSize: '24px', cursor: 'pointer', padding: '0', lineHeight: '1'
  });
  closeBtn.onmouseenter = () => closeBtn.style.color = '#fff';
  closeBtn.onmouseleave = () => closeBtn.style.color = 'rgba(255,255,255,0.6)';
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const msg = document.createElement('div');
  msg.innerText = `BooTube cannot filter profanity on ${platformName} until subtitles are turned on. Please enable Subtitles in your player controls.`;
  msg.style.fontSize = '14px';
  msg.style.lineHeight = '1.4';
  msg.style.color = 'rgba(255,255,255,0.9)';
  
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
  dontShowCb.style.cursor = 'pointer';
  dontShowLabel.appendChild(dontShowCb);
  dontShowLabel.appendChild(document.createTextNode("Don't show again"));
  
  // Settings Link
  const settingsLink = document.createElement('a');
  settingsLink.innerText = 'Open Settings';
  Object.assign(settingsLink.style, { color: '#4789F0', cursor: 'pointer', textDecoration: 'none', fontWeight: '500' });
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
  
  // Progress bar fill
  const progressFill = document.createElement('div');
  Object.assign(progressFill.style, { 
    height: '100%', 
    width: '100%', 
    backgroundColor: '#3AA5C2'
  });
  progressWrapper.appendChild(progressFill);
  
  toast.appendChild(content);
  toast.appendChild(progressWrapper);
  document.body.appendChild(toast);
  
  let dismissTimeout;
  
  const dismissToast = () => {
      clearTimeout(dismissTimeout);
      if (dontShowCb.checked) {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && chrome.runtime && chrome.runtime.id) {
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
  
  // Auto dismiss after 15 seconds
  dismissTimeout = setTimeout(dismissToast, 15000);
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
  if (isSubFrame && !isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isYouTube && !isTwitter && !isSpotify && !isFacebook && !isMax && !isParamount) return;
  if (event.data.type !== 'YOUTUBE_CAPTIONS_FETCHED' && event.data.type !== 'SPOTIFY_TOKEN_CAPTURED') return;
  if (event.data.type === 'SPOTIFY_TOKEN_CAPTURED') {
    spotifyBearerToken = event.data.token;
    return;
  }
  if (event.data.type === 'YOUTUBE_CAPTIONS_FETCHED') {
    allCaptionPayloads.push(event.data);
    if (isStorageLoaded) {
      processCaptionData(event.data.payload, event.data.isTranslated);
    } else {
      queuedPayloads.push(event.data);
    }
    
    // Sync captions across frames using local storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.set({
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

  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    let hasProfanity = false;
    let combinedText = "";
    let firstEventTextLength = 0;
    
    let startSec = sub.start;
    if (isNaN(startSec)) continue;
    
    let rawText = sub.text || '';
    rawText = rawText.replace(/<[^>]*>?/gm, '').trim();
    let cleanText = rawText.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
    if (cleanText.length > 0 && cleanText.length < 150) {
      subtitleSyncBeacons.push({ text: cleanText, start: startSec });
    }
    
    // Look ahead up to 15 events to catch highly fragmented auto-generated phrases
    for (let j = 0; j < 15 && (i + j) < subtitles.length; j++) {
      const ev = subtitles[i + j];
      const evText = ev.text || '';
      combinedText += evText + " ";
      if (j === 0) firstEventTextLength = evText.length + 1; // +1 for the added space
      
      const cleanText = combinedText.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase();
      
      if (!Array.isArray(activeBlocklist)) activeBlocklist = DEFAULT_BLOCKLIST;
      if (!Array.isArray(whitelistedChannels)) whitelistedChannels = [];
      if (!Array.isArray(safeList)) safeList = [];
      
      let wordsToCheck = getExpandedWords(activeBlocklist);
      const wantsAutoCensorFilter = activeBlocklist.some(w => {
        let word = typeof w === 'string' ? w : (w ? w.word : '');
        return typeof word === 'string' && /\[\s*_+\s*\]/.test(word);
      });
      if (wantsAutoCensorFilter) {
          const autoCensoredMatches = cleanText.match(/\[\s*_+\s*\]/g);
          if (autoCensoredMatches) {
            wordsToCheck.push(...autoCensoredMatches);
          }
      }
      
      const containsBadWord = wordsToCheck.some(word => {
        if (!word || typeof word !== 'string') return false;
        let matchIndex = cleanText.indexOf(word);
        if (matchIndex === -1) return false;
        
        // --- RESPECTFUL MODE LOGIC ---
        if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) {
            return false;
        }
        
        // Guarantee the bad word actually touches the first event (i)
        // to prevent creating massive mute zones that start way too early.
        if (j > 0) {
          const textWithoutFirst = combinedText.substring(firstEventTextLength);
          const cleanWithoutFirst = textWithoutFirst.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase();
          if (cleanWithoutFirst.includes(word)) {
            // The bad word exists entirely in the future events. Let the future loops handle it.
            return false;
          }
        }
        
        // We now know the word STARTS in event i and ENDS in event i+j
        let evDurationSec = (sub.end - sub.start);
        if (j > 0) {
           const endOfEv = subtitles[i+j].end;
           evDurationSec = endOfEv - startSec;
        }
        
        let paddedStart = startSec;
        let paddedEnd = startSec + evDurationSec;
        
        if (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isSpotify || isFacebook || isMax) {
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
  return zones;
}

function processCaptionData(data, isTranslated) {
  if (!data || !data.events) return;
  
  for (let i = 0; i < data.events.length; i++) {
    let combinedText = "";
    let firstEventTextLength = 0;
    
    let startSec = data.events[i].tStartMs / 1000;
    if (isNaN(startSec)) continue;
    
    if (data.events[i].segs) {
      let rawText = data.events[i].segs.map(seg => seg.utf8 || '').join('');
      rawText = rawText.replace(/<[^>]*>?/gm, '').trim();
      let cleanText = rawText.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
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
    const maxLookAhead = (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isSpotify || isFacebook || isMax) ? 1 : 15;
    for (let j = 0; j < maxLookAhead && (i + j) < data.events.length; j++) {
      const ev = data.events[i + j];
      if (ev.segs) {
        const evText = ev.segs.map(seg => seg.utf8 || '').join('');
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
         if (/[^\w\s'\[\]]/.test(char)) char = " ";
         if (char === " " && cleanText.endsWith(" ")) {
             // compress spaces, don't map
         } else {
             cleanText += char;
             charMap.push(k);
         }
      }
      
      if (!Array.isArray(activeBlocklist)) activeBlocklist = DEFAULT_BLOCKLIST;
      if (!Array.isArray(whitelistedChannels)) whitelistedChannels = [];
      if (!Array.isArray(safeList)) safeList = [];
      
      let wordsToCheck = getExpandedWords(activeBlocklist);
      const wantsAutoCensorFilter = activeBlocklist.some(w => {
        let word = typeof w === 'string' ? w : (w ? w.word : '');
        return typeof word === 'string' && /\[\s*_+\s*\]/.test(word);
      });
      if (wantsAutoCensorFilter) {
          const autoCensoredMatches = cleanText.match(/\[\s*_+\s*\]/g);
          if (autoCensoredMatches) {
            wordsToCheck.push(...autoCensoredMatches);
          }
      }
      
      let containsBadWord = false;
      if (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isSpotify || isFacebook || isMax) {
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
               if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) {
                   continue;
               }
               
               // Guarantee the bad word actually touches the first event (i)
               if (j > 0) {
                 const textWithoutFirst = combinedText.substring(firstEventTextLength);
                 const cleanWithoutFirst = textWithoutFirst.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase();
                 if (cleanWithoutFirst.includes(word)) {
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
                } else if (isHulu || isPlex || isFandango || isPrimeVideo || isTwitter || isMax || isFacebook) {
                  // WebVTT / SRT subtitle cues display on screen ~0.5s - 1.2s BEFORE spoken audio.
                  // Shift forward by +0.75s to align exactly with voiced dialogue!
                  const offset = 0.75;
                  wordStartSec += offset;
                  wordEndSec += offset;
                  padStart = 0.30;
                  padEnd = 1.20;
                  if (muteAggressiveness === 1) {
                    padStart = 0.15;
                    padEnd = 0.85;
                  } else if (muteAggressiveness === 3) {
                    padStart = 0.50;
                    padEnd = 1.60;
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
                    const extraPad = (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isFacebook || isMax) ? 0.05 : 0.3;
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
               
               muteZones.push({ start: paddedStart, end: paddedEnd });
               console.log(`🤬 [Censor] Interpolated Zone caught! ${paddedStart.toFixed(2)} - ${paddedEnd.toFixed(2)} (Word: ${word})`);
            }
         });
      } else {
         containsBadWord = wordsToCheck.some(word => {
            if (!word || typeof word !== 'string') return false;
            let matchIndex = cleanText.indexOf(word);
            if (matchIndex === -1) return false;
            
            // --- RESPECTFUL MODE LOGIC ---
            if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) {
                return false;
            }
            
            // Guarantee the bad word actually touches the first event (i)
            if (j > 0) {
              const textWithoutFirst = combinedText.substring(firstEventTextLength);
              const cleanWithoutFirst = textWithoutFirst.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase();
              if (cleanWithoutFirst.includes(word)) {
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
              
              if (charTimes.length > 0 && charMap.length >= matchIndex + word.length) {
                  const startCharIdx = charMap[matchIndex];
                  const endCharIdx = charMap[matchIndex + word.length - 1];
                  if (startCharIdx < charTimes.length && endCharIdx < charTimes.length) {
                      exactStart = charTimes[startCharIdx];
                      exactEnd = charTimes[endCharIdx];
                  }
              }
              
              if (exactEnd - exactStart > 3.0) {
                  exactEnd = exactStart + 3.0;
              }
              
              let exactPad = 0.5;
              if (muteAggressiveness === 1) {
                exactPad = 0.3;
              } else if (muteAggressiveness === 3) {
                exactPad = 1.0;
              }
              paddedStart = Math.max(0, exactStart - exactPad);
              paddedEnd = exactEnd + exactPad;
            }
            
            if (word === 'jesus' || word === 'jesus christ') {
                paddedStart = Math.max(0, paddedStart - 0.8);
            }
            
            muteZones.push({ start: paddedStart, end: paddedEnd });
            console.log(`🤬 [Censor] Zone caught! ${paddedStart.toFixed(1)} - ${paddedEnd.toFixed(1)} (Word: ${word})`);
            return true;
         });
      }
      
      if (containsBadWord) break;
    }
  }
  
  // Clean up any preloaded/existing captions already rendered in the DOM
  hideExistingCaptionsOnPage();
}

function updatePlayerState() {
  const shouldBeMuted = (networkIsMuting || fallbackIsMuting) && extensionEnabled === true;
  
  try {
    window.postMessage({ type: 'BOOTUBE_MUTE_STATE_CHANGED', isMuted: shouldBeMuted }, '*');
  } catch(e) {}

  const vids = findVideos();
  
  for (const v of vids) {
    if (shouldBeMuted) {
      if (!v.muted || (v.volume > 0 && !isNetflix && !isParamount)) {
        if (v._originalVolume === undefined && v.volume > 0) {
          v._originalVolume = v.volume;
        }
        v.muted = true;
        if (!isNetflix && !isParamount) {
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
        if (v._originalVolume !== undefined && !isNetflix && !isParamount) {
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
  if (isSubFrame && !isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isYouTube && !isTwitter && !isSpotify && !isFacebook && !isMax && !isParamount) return;
  if (window._censorTimeupdateBound) return;
  
  // Use a 50ms interval for sub-second precision!
  let tick = 0;
  let lastUrl = window.location.href;
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
       lastUrl = currentUrl;
       extractMetadata();
    }
    if (extensionEnabled === false) {
       fallbackIsMuting = false;
       networkIsMuting = false;
       updatePlayerState();
       return;
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
    let maxTime = activeVid ? activeVid.currentTime : 0;
    if (maxTime === 0) {
      for (const v of vids) {
        if (v.currentTime > maxTime) maxTime = v.currentTime;
      }
    }
    
    for (const v of vids) {
      
      if (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isSpotify || isFacebook || isMax) {
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
                    if (v.currentTime < cue.startTime - 0.2 || v.currentTime > cue.endTime + 0.5) {
                      continue;
                    }
                    const rawText = activeCues[j].text || '';
                    if (!rawText) continue;
                    let cleanText = rawText.replace(/<[^>]*>?/gm, '').replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
                    
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
                          newText = newText.replace(regex, "[ __ ]");
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
                          } else if (isHulu || isPlex || isFandango || isPrimeVideo || isTwitter || isMax || isFacebook) {
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
                            const extraPad = (isDisneyPlus || isHulu || isPlex || isFandango || isPrimeVideo || isTwitter || isMax || isFacebook) ? 0.05 : 0.3;
                            paddedStart = Math.max(0, paddedStart - extraPad);
                            paddedEnd = paddedEnd + extraPad;
                        }
                        
                        lastPaddedStart = paddedStart;
                        lastPaddedEnd = paddedEnd;
                        muteZones.push({ start: paddedStart, end: paddedEnd });
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
    
    if (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount) {
      if (isDisneyPlus) {
        let uiTime = getDisneyRealTime();
        if (uiTime !== -1 && maxTime > 0) {
          if (uiTime !== lastUiTime) {
            chunkOffset = uiTime - maxTime;
            lastUiTime = uiTime;
            console.log(`🤬 [Censor] Synced Disney+ clock to UI Time: ${uiTime} (Offset: ${chunkOffset.toFixed(2)})`);
          }
        }
      }
      
      // Subtitle Beacon Sync (Runs every 250ms)
      if (!isHulu && !isDisneyPlus && tick % 5 === 0 && subtitleSyncBeacons.length > 0 && maxTime > 0) {
         // Only check beacons that are close to the current player time (within 15 seconds) to avoid CPU spikes
         const nearbyBeacons = subtitleSyncBeacons.filter(b => Math.abs(b.start - maxTime) < 15);
         for (const beacon of nearbyBeacons) {
            if (findTextInDOM(beacon.text)) {
                const estimatedOffset = beacon.start - maxTime;
                const isPlausible = chunkOffset === 0 || Math.abs(chunkOffset - estimatedOffset) < 10.0;
                
                if (chunkOffset === 0 || Math.abs(chunkOffset - estimatedOffset) > 8.0) {
                   chunkOffset = estimatedOffset;
                   console.log(`🤬 [Censor] Synced Disney+ clock via SUBTITLE BEACON! Phrase: "${beacon.text}", Offset: ${chunkOffset.toFixed(2)}`);
                }
                
                if (isPlausible) {
                   const idx = subtitleSyncBeacons.indexOf(beacon);
                   if (idx > -1) subtitleSyncBeacons.splice(idx, 1);
                   break;
                }
             }
         }
      }
      
      if (isHulu) {
         chunkOffset = 0;
      }
      
      currentTime = maxTime + chunkOffset;
    }
    
    let shouldMute = muteZones.some(zone => currentTime >= zone.start && currentTime <= zone.end);
    
    if (isDisneyPlus || isHulu || isPlex || isFandango || isNetflix || isPrimeVideo || isTwitter || isMax || isParamount || isSpotify || isFacebook || isMax) {
       const containerExists = isTwitter || isSpotify || isHulu || isPlex || isDisneyPlus || isFandango || isNetflix || isPrimeVideo || isFacebook || isMax || isParamount ||
                                document.querySelector('.a8PTgYsfzc07Np9G, [data-testid="lyrics-line"], div[class*="lyrics"], div[class*="Lyrics"]') ||
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
                               findShadowElement(document.body, '[class*="atvplayer-subtitles"]') ||
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

          const rawCombinedText = Array.from(segments).map(s => {
             const original = s.getAttribute('data-bootube-original-text');
             const textToUse = (original !== null && original !== undefined) ? original : s.textContent;
             return textToUse.replace(/\n/g, ' ');
          }).join(' ').toLowerCase().trim();

          containsBadWord = /\[\s*_+\s*\]/.test(rawCombinedText) || wordsToCheck.some(word => {
              if (!word || typeof word !== 'string') return false;
              if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) return false;
              return getWordRegex(word).test(rawCombinedText);
          });

          if (containsBadWord) {
             lastBadWordTime = Date.now();
             
             segments.forEach(s => {
                const original = s.getAttribute('data-bootube-original-text');
                let text = (original !== null && original !== undefined) ? original : s.textContent;
                let foundBad = false;
                wordsToCheck.forEach(word => {
                   if (!word) return;
                   if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) {
                      return;
                   }
                   const regex = getWordRegex(word);
                   const nextText = text.replace(regex, "[ __ ]");
                   if (nextText !== text) {
                      foundBad = true;
                      text = nextText;
                   }
                });
                if (foundBad) {
                   if (!s.hasAttribute('data-bootube-original-text')) {
                      s.setAttribute('data-bootube-original-text', s.textContent);
                   }
                   s.textContent = text;
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
        }
         
        if (!shouldMute) {
          const activeVid = getActiveVideoElement(vids);
          if (activeVid) {
            for (let t = 0; t < activeVid.textTracks.length; t++) {
              const ac = activeVid.textTracks[t].activeCues;
              if (ac && ac.length > 0) {
                for (let j = 0; j < ac.length; j++) {
                  const cue = ac[j];
                  const txt = cue.text || '';
                  if (!txt) continue;
                  
                  const canonical = getCanonicalText(txt);
                  if (canonical) {
                    interceptedSubtitleTexts.add(canonical);
                  }
                  
                  let cleanTxt = txt.replace(/<[^>]*>?/gm, '').replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
                  
                  if (!Array.isArray(activeBlocklist)) activeBlocklist = DEFAULT_BLOCKLIST;
                  let wordsToCheck = getExpandedWords(activeBlocklist);
                  let foundWord = null;
                  let matchIdx = -1;
                  
                  wordsToCheck.forEach(word => {
                    if (!word || typeof word !== 'string') return;
                    if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) {
                       return;
                    }
                    const idx = cleanTxt.indexOf(word);
                    if (idx !== -1) {
                      foundWord = word;
                      matchIdx = idx;
                    }
                  });
                  
                  if (foundWord) {
                    const textLen = cleanTxt.length || 1;
                    const pctStart = matchIdx / textLen;
                    const pctEnd = (matchIdx + foundWord.length) / textLen;
                    const duration = cue.endTime - cue.startTime;
                    
                    let wordStart = cue.startTime + pctStart * duration;
                    let wordEnd = cue.startTime + pctEnd * duration;
                    
                    let padStart = 0.4;
                    let padEnd = 0.3;
                    if (isDisneyPlus || isHulu || isPlex || isFandango || isPrimeVideo || isTwitter || isMax || isFacebook) {
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
                    } else {
                      if (muteAggressiveness === 1) {
                        padStart = 0.2;
                        padEnd = 0.15;
                      } else if (muteAggressiveness === 3) {
                        padStart = 0.7;
                        padEnd = 0.5;
                      }
                    }
                    
                    const paddedStart = Math.max(cue.startTime, wordStart - padStart);
                    const paddedEnd = Math.min(cue.startTime + 15, cue.endTime + 0.8, wordEnd + padEnd);
                    
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
        const cooldown = getMuteCooldown();
        isWithinMuteWindow = containsBadWord || (lastBadWordTime > 0 && (Date.now() - lastBadWordTime) < cooldown);
         
         if (muteZones && muteZones.length > 0) {
            if (fallbackIsMuting) {
               fallbackIsMuting = false;
               updatePlayerState();
            }
         } else {
           if (isWithinMuteWindow !== fallbackIsMuting) {
              console.log(`🤬 [Censor] Interval Mute State Changed -> ${isWithinMuteWindow} (containsBadWord: ${containsBadWord}, lastBadWordTime: ${lastBadWordTime}, elapsed: ${lastBadWordTime > 0 ? Date.now() - lastBadWordTime : -1}ms, cooldown: ${cooldown}ms)`);
              fallbackIsMuting = isWithinMuteWindow;
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
      if (networkIsMuting || fallbackIsMuting) {
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
  // JS-based DOM manipulation in subframes has been removed to prevent pointer-events interference
  // with player controls (e.g. Disney+ player runs in a blob: subframe where isDisneyPlus=false).
  if (isSubFrame) {
    return;
  }
  if (!isDisneyPlus && !isHulu && !isPlex && !isFandango && !isNetflix && !isPrimeVideo && !isTwitter && !isFacebook && !isMax && !isParamount) return;
  if (extensionEnabled === false) return;
  
  if (!Array.isArray(activeBlocklist)) activeBlocklist = DEFAULT_BLOCKLIST;
  let wordsToCheck = getExpandedWords(activeBlocklist);
  
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
    
    let isTargetSubtitle = false;
    let isUI = false;
    let checkT = targetNode;
    const canonical = getCanonicalText(rawText);
    for (let step = 0; step < 12; step++) {
        if (!checkT) break;
        const tag = checkT.tagName.toLowerCase();
        const cls = (typeof checkT.className === 'string' ? checkT.className : '').toLowerCase();
        const id = (typeof checkT.id === 'string' ? checkT.id : '').toLowerCase();
        
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
            cls.includes('panel') || cls.includes('list') || cls.includes('select') || cls.includes('track') ||
            cls.includes('btn') || cls.includes('button') || cls.includes('dropdown') || cls.includes('popover') ||
            cls.includes('popup') || cls.includes('dialog') || cls.includes('ad-') || cls.includes('promo') ||
            cls.includes('advertisement') || cls.includes('banner') || cls.includes('sponsor') || cls.includes('commercial') ||
            cls.includes('controls') || cls.includes('manager') || cls.includes('options') || cls.includes('selection') || cls.includes('view') ||
            cls.includes('overlay') || cls.includes('wrapper') || cls.includes('player') || cls.includes('cbs') || cls.includes('avia') || cls.includes('ad') ||
            id.includes('menu') || id.includes('settings') || id.includes('control') || id.includes('audio') ||
            id.includes('panel') || id.includes('list') || id.includes('select') || id.includes('track') ||
            id.includes('btn') || id.includes('button') || id.includes('dropdown') || id.includes('popover') ||
            id.includes('popup') || id.includes('dialog') || id.includes('ad-') || id.includes('promo') ||
            id.includes('advertisement') || id.includes('banner') || id.includes('sponsor') || id.includes('commercial') ||
            id.includes('controls') || id.includes('manager') || id.includes('options') || id.includes('selection') || id.includes('view') ||
            id.includes('overlay') || id.includes('wrapper') || id.includes('player') || id.includes('cbs') || id.includes('avia') || id.includes('ad');
        
        const isSpecificSubtitleClass = !hasMenuOrControlToken && (
            cls.includes('shaka-text') || cls.includes('dss-hls-subtitle') || cls.includes('timed-text') || cls.includes('atvwebplayersdk') || cls.includes('cfq7fuo') || cls.includes('crgqtox') ||
            id.includes('shaka-text') || id.includes('dss-hls-subtitle') || id.includes('timed-text') || id.includes('atvwebplayersdk') ||
            cls.includes('caption-window') || cls.includes('subtitle-window') || cls.includes('caption-text') || cls.includes('subtitle-text') ||
            cls.includes('caption-cue') || cls.includes('subtitle-cue')
        );

        const isPlayerSubtitle = canonical && insidePlayer && isTextKnownSubtitle(canonical);
        
        if (hasVideo && (
            (insidePlayer && hasSubtitleToken) || 
            isSpecificSubtitleClass || 
            isPlayerSubtitle
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

        if (tag === 'button' || tag === 'a' || tag === 'svg' || tag === 'input' || tag === 'path' ||
            hasMenuOrControlToken ||
            isUIRoleOrAria ||
            cls.includes('btn') || cls.includes('control') || cls.includes('button') || cls.includes('menu') || cls.includes('picker') || 
            cls.includes('volume') || cls.includes('progress') || cls.includes('timeline') || cls.includes('time') || 
            cls.includes('logo') || cls.includes('bar') || cls.includes('setting') || cls.includes('tooltip') || cls.includes('ad-') ||
            cls.includes('overlay') || cls.includes('wrapper') || cls.includes('player') || cls.includes('cbs') || cls.includes('avia') || cls.includes('ad') ||
            id.includes('btn') || id.includes('control') || id.includes('button') || id.includes('menu') || id.includes('volume') || id.includes('progress') ||
            id.includes('overlay') || id.includes('wrapper') || id.includes('player') || id.includes('cbs') || id.includes('avia') || id.includes('ad')) {
            isUI = true;
        }
        checkT = checkT.parentElement || (checkT.getRootNode && checkT.getRootNode().host);
    }
    

    
    if (isTargetSubtitle && !isUI) {
      hasProcessedMutations = true;
      const cleanText = rawText.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, ' ').toLowerCase().trim();
      
      const containsBadWord = /\[\s*_+\s*\]/.test(rawText.toLowerCase()) || wordsToCheck.some(word => {
          if (!word || typeof word !== 'string') return false;
          if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) return false;
          return getWordRegex(word).test(rawText.toLowerCase());
      });

      if (containsBadWord) {
        anyBadSubtitlesOnPage = true;
        if (!muteZones || muteZones.length === 0) {
          lastBadWordTime = Date.now();
        }
        
        try {
          mutatingCensorText = true;
          
          if (m.type === 'characterData') {
             let censoredVal = m.target.nodeValue;
             wordsToCheck.forEach(word => {
                if (!word) return;
                if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) {
                   return;
                }
                const regex = getWordRegex(word);
                censoredVal = censoredVal.replace(regex, "[ __ ]");
             });
             if (m.target.nodeValue !== censoredVal) {
                m.target.nodeValue = censoredVal;
             }
          } else {
             const walker = document.createTreeWalker(targetNode, NodeFilter.SHOW_TEXT);
             while (walker.nextNode()) {
                let censoredVal = walker.currentNode.nodeValue;
                let foundBad = false;
                wordsToCheck.forEach(word => {
                   if (!word) return;
                   if (respectfulModeEnabled && (isReligiousContext || whitelistedChannels.includes(currentChannelName)) && safeList.includes(word)) {
                      return;
                   }
                   const regex = getWordRegex(word);
                   const nextText = censoredVal.replace(regex, "[ __ ]");
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
            if (chunkOffset === 0 || Math.abs(chunkOffset - estimatedOffset) > 8.0) {
              chunkOffset = estimatedOffset;
              console.log(`🤬 [Censor] Synced Disney+ clock via Subtitle Beacon! Phrase: "${cleanText}", Offset: ${chunkOffset.toFixed(2)}`);
            }
          }
        }
      }
    }
  }

  if (hasProcessedMutations) {
    if (anyBadSubtitlesOnPage) {
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
subtitleObserver.observe(document.documentElement || document.body, { childList: true, subtree: true, characterData: true });

function isCaptionVisible(el) {
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
  return el.textContent.trim().length > 0;
}

function getSubtitleSegments() {
  let rootNode = findShadowElement(document.body, '.hive-subtitle-renderer-wrapper') ||
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
                 findShadowElement(document.body, '[class*="atvplayer-subtitles"]') ||
                 findShadowElement(document.body, '[class*="pv-video-subtitles"]');
   
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
    const lyricElements = document.querySelectorAll('.a8PTgYsfzc07Np9G, [data-testid="lyrics-line"], div[class*="lyrics"], div[class*="Lyrics"]');
    if (lyricElements && lyricElements.length > 0) {
      return Array.from(lyricElements).filter(isCaptionVisible);
    }
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
         
         const isSubKeyword = cls.includes('subtitle') || cls.includes('caption') || cls.includes('cue') || cls.includes('shaka-text') || cls.includes('dss-hls-subtitle') ||
                              cls.includes('hive-subtitle') || cls.includes('timedtext') || cls.includes('timed-text') || cls.includes('atvwebplayersdk') || cls.includes('lyric') ||
                              id.includes('subtitle') || id.includes('caption') || id.includes('cue') || id.includes('hive-subtitle') || id.includes('timedtext') || id.includes('timed-text') || id.includes('atvwebplayersdk') || id.includes('lyric') ||
                              /(?:^|[\s_-])(?:sub|subs|cc)(?:$|[\s_-])/i.test(cls) ||
                              /(?:^|[\s_-])(?:sub|subs|cc)(?:$|[\s_-])/i.test(id);
         if (isSubKeyword) {
             hasSubtitleParent = true;
         }
         
         if (tag === 'button' || tag === 'a' || tag === 'svg' || tag === 'input' || tag === 'path' || tag === 'select' ||
             cls.includes('control') || cls.includes('button') || cls.includes('menu') || cls.includes('picker') || 
             cls.includes('volume') || cls.includes('progress') || cls.includes('timeline') || cls.includes('time') || 
             cls.includes('logo') || cls.includes('bar') || cls.includes('setting') || cls.includes('tooltip') || cls.includes('ad-') ||
             cls.includes('scrub') || cls.includes('slider') || cls.includes('play') || cls.includes('pause') ||
             id.includes('control') || id.includes('button') || id.includes('menu') || id.includes('volume') || id.includes('progress') ||
             id.includes('scrub') || id.includes('slider') || id.includes('play') || id.includes('pause')) {
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

}
runBootube();
