const DEFAULT_BLOCKLIST = [
  "goddamn", "god damn", "jesus christ", "jesus", "christ", 
  "damn", "hell", "fuck", "shit", "bitch", "asshole", 
  "motherfucker", "bastard", "[ __ ]", "[__]"
]; 
let blocklist = [];
let disabledWords = [];
let activeBlocklist = [];
let muteZones = [];

let videoElement = null;
let currentVideoSrc = "";
let networkIsMuting = false; 
let fallbackIsMuting = false;
let captionObserver = null;

let hideCC = true;
let enableBlur = true;
let extensionEnabled = true;
let styleElement = null;

let isStorageLoaded = false;
let queuedPayloads = [];

console.log("🤬 [Censor] Content script loaded. Initializing bulletproof tracker...");

// Initialize storage safely
chrome.storage.local.get(['blocklist', 'disabledWords', 'hideCC', 'enableBlur', 'extensionEnabled'], (result) => {
  blocklist = result.blocklist || DEFAULT_BLOCKLIST;
  disabledWords = result.disabledWords || [];
  activeBlocklist = blocklist.filter(w => !disabledWords.includes(w));
  if (result.hideCC !== undefined) hideCC = result.hideCC;
  if (result.enableBlur !== undefined) enableBlur = result.enableBlur;
  if (result.extensionEnabled !== undefined) extensionEnabled = result.extensionEnabled;
  applyHideCCStyle();
  
  isStorageLoaded = true;
  queuedPayloads.forEach(p => processCaptionData(p.payload, p.isTranslated));
  queuedPayloads = [];
  console.log("🤬 [Censor] Storage loaded, blocklist ready with", blocklist.length, "words.");
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.blocklist) {
      blocklist = changes.blocklist.newValue || DEFAULT_BLOCKLIST;
      activeBlocklist = blocklist.filter(w => !disabledWords.includes(w));
    }
    if (changes.disabledWords) {
      disabledWords = changes.disabledWords.newValue || [];
      activeBlocklist = blocklist.filter(w => !disabledWords.includes(w));
    }
    if (changes.hideCC) {
      hideCC = changes.hideCC.newValue;
      applyHideCCStyle();
    }
    if (changes.enableBlur) {
      enableBlur = changes.enableBlur.newValue;
      if (videoElement && (networkIsMuting || fallbackIsMuting)) {
        videoElement.style.filter = enableBlur ? 'blur(40px)' : 'none';
      }
    }
    if (changes.extensionEnabled) {
      extensionEnabled = changes.extensionEnabled.newValue;
      updatePlayerState();
    }
  }
});

function applyHideCCStyle() {
  if (hideCC) {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.textContent = `.ytp-caption-window-container { opacity: 0.001 !important; }`;
      document.head.appendChild(styleElement);
    }
  } else {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }
}

// 1. Better DOM/SPA tracking
setInterval(() => {
  const currentVid = document.querySelector('video');
  // Only trigger a reset if the video SRC actually changed. 
  // This prevents accidentally wiping the muteZones that were just fetched!
  if (currentVid && currentVid.src && currentVid.src !== currentVideoSrc) {
    console.log("🤬 [Censor] New video detected:", currentVid.src);
    videoElement = currentVid;
    currentVideoSrc = currentVid.src;
    
    muteZones = [];
    networkIsMuting = false;
    fallbackIsMuting = false;
    
    startTrackingPlaytime();
    startFallbackObserver();
    autoEnableCC();
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

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data) return;
  if (event.data.type === 'YOUTUBE_CAPTIONS_FETCHED') {
    if (isStorageLoaded) {
      processCaptionData(event.data.payload, event.data.isTranslated);
    } else {
      queuedPayloads.push(event.data);
    }
  }
});

function processCaptionData(data, isTranslated) {
  if (!data || !data.events) return;
  
  for (let i = 0; i < data.events.length; i++) {
    let combinedText = "";
    let firstEventTextLength = 0;
    
    let startSec = data.events[i].tStartMs / 1000;
    if (isNaN(startSec)) continue;
    let durationSec = (data.events[i].dDurationMs || 2000) / 1000;
    
    // Look ahead up to 15 events to catch highly fragmented auto-generated phrases
    for (let j = 0; j < 15 && (i + j) < data.events.length; j++) {
      const ev = data.events[i + j];
      if (ev.segs) {
        const evText = ev.segs.map(seg => seg.utf8 || '').join('');
        combinedText += evText + " ";
        if (j === 0) firstEventTextLength = evText.length + 1; // +1 for the added space
      }
      
      if (j > 0 && ev.tStartMs !== undefined) {
         const endOfEv = (ev.tStartMs + (ev.dDurationMs || 2000)) / 1000;
         durationSec = endOfEv - startSec;
      }
      
      const cleanText = combinedText.replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, " ").toLowerCase();
      
      let wordsToCheck = [...activeBlocklist];
      const autoCensoredMatches = cleanText.match(/\[\s*_+\s*\]/g);
      if (autoCensoredMatches) {
        wordsToCheck.push(...autoCensoredMatches);
      }
      
      const containsBadWord = wordsToCheck.some(word => {
        let matchIndex = cleanText.indexOf(word);
        if (matchIndex === -1) return false;
        
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
        
        let paddedStart = startSec;
        let paddedEnd = startSec + durationSec;
        
        if (isTranslated) {
          // Translated subtitles appear on screen before the actor speaks, meaning the timestamp
          // is "early". If they speak slowly, the audio happens AFTER the subtitle disappears.
          // We heavily pad the end by 3.0 seconds to cover the delayed audio!
          paddedStart = Math.max(0, startSec - 0.5);
          paddedEnd = startSec + durationSec + 3.0;
        } else {
          // Native subtitles: Proportional interpolation for frame-perfect muting
          // Narrows the mute zone to the exact sub-second the word is spoken!
          const startProportion = matchIndex / cleanText.length;
          const endProportion = (matchIndex + word.length) / cleanText.length;
          
          const exactStart = startSec + (durationSec * startProportion);
          const exactEnd = startSec + (durationSec * endProportion);
          
          paddedStart = Math.max(0, exactStart - 0.5);
          paddedEnd = exactEnd + 0.5;
        }
        
        muteZones.push({ start: paddedStart, end: paddedEnd });
        console.log(`🤬 [Censor] Zone caught! ${paddedStart.toFixed(1)} - ${paddedEnd.toFixed(1)}`);
        return true;
      });
    }
  }
}

function updatePlayerState() {
  if (!videoElement) return;
  
  const shouldBeMuted = (networkIsMuting || fallbackIsMuting) && extensionEnabled;
  
  if (shouldBeMuted && !videoElement.muted) {
    videoElement.muted = true;
    if (enableBlur) videoElement.style.filter = 'blur(40px)';
  } else if (!shouldBeMuted && videoElement.muted) {
    videoElement.muted = false;
    videoElement.style.filter = 'none';
  }
}

function startTrackingPlaytime() {
  videoElement.addEventListener('timeupdate', () => {
    let currentTime = videoElement.currentTime;
    let shouldMute = muteZones.some(zone => currentTime >= zone.start && currentTime <= zone.end);
    
    if (shouldMute !== networkIsMuting) {
      networkIsMuting = shouldMute;
      updatePlayerState();
    }
  });
}

function startFallbackObserver() {
  if (captionObserver) captionObserver.disconnect();
  
  captionObserver = new MutationObserver(() => {
    const segments = document.querySelectorAll('.ytp-caption-segment');
    if (segments.length > 0) {
      const currentText = Array.from(segments).map(s => {
        // Safely extract text while turning <br> tags into spaces
        const clone = s.cloneNode(true);
        clone.querySelectorAll('br').forEach(br => br.replaceWith(' '));
        return clone.textContent;
      }).join(' ').replace(/[^\w\s'\[\]]/g, " ").replace(/\s+/g, ' ').toLowerCase();
      
      const containsBadWord = activeBlocklist.some(word => currentText.includes(word)) || /\[\s*_+\s*\]/.test(currentText);
      if (containsBadWord && !fallbackIsMuting) {
        console.log(`🤬 [Censor] Fallback caught word: ${currentText}`);
        fallbackIsMuting = true;
        updatePlayerState();
        
        setTimeout(() => {
          fallbackIsMuting = false;
          updatePlayerState();
        }, 1500);
      }
    }
  });

  const targetNode = document.querySelector('.html5-video-player') || document.body;
  captionObserver.observe(targetNode, { childList: true, subtree: true });
}
