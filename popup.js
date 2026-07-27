// Developer mock for local browser testing outside of Chrome Extension context
if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
  const mockStorage = {};
  window.chrome = {
    runtime: {
      lastError: null,
      sendMessage: (msg, cb) => {
        console.log("Mock sendMessage:", msg);
        if (cb) cb({});
      }
    },
    storage: {
      local: {
        get: (keys, cb) => {
          let res = {};
          if (typeof keys === 'string') {
            res[keys] = mockStorage[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach(k => res[k] = mockStorage[k]);
          } else if (typeof keys === 'object') {
            res = { ...keys };
            for (const k in keys) {
              if (mockStorage[k] !== undefined) {
                res[k] = mockStorage[k];
              }
            }
          }
          if (cb) cb(res);
        },
        set: (data, cb) => {
          Object.assign(mockStorage, data);
          if (cb) cb();
        }
      }
    },
    tabs: {
      query: (queryInfo, cb) => {
        if (cb) {
          cb([{
            id: 1,
            url: "https://www.hulu.com/watch/mock-video-id",
            title: "Mock Show | Hulu"
          }]);
        }
      },
      sendMessage: (tabId, msg, cb) => {
        console.log("Mock tabs.sendMessage:", tabId, msg);
        if (msg.action === "REQUEST_CAPTIONS") {
          if (cb) {
            cb({
              payloads: [
                {
                  payload: {
                    events: [
                      { tStartMs: 121000, segs: [{ utf8: "Oh, I get it." }] },
                      { tStartMs: 122000, segs: [{ utf8: "You guys aren't allowed to talk. Is that it?" }] },
                      { tStartMs: 123000, segs: [{ utf8: "Are you not allowed to talk?" }] },
                      { tStartMs: 124000, segs: [{ utf8: "No. We're allowed to talk." }] },
                      { tStartMs: 125000, segs: [{ utf8: "Oh. I see. So it's personal." }] }
                    ]
                  }
                }
              ]
            });
          }
        } else if (cb) {
          cb({});
        }
      },
      reload: (tabId) => {
        console.log("Mock reload of tab:", tabId);
      },
      captureVisibleTab: (windowId, options, cb) => {
        if (cb) cb(null);
      }
    }
  };
}

const DEFAULT_BLOCKLIST = [
  // Profanity
  { word: "shit", category: "Profanity" },
  { word: "fuck", category: "Profanity" },
  { word: "damn", category: "Profanity" },
  { word: "bitch", category: "Profanity" },
  { word: "hell", category: "Profanity" },
  { word: "asshole", category: "Profanity" },
  { word: "motherfucker", category: "Profanity" },
  { word: "bastard", category: "Profanity" },
  { word: "[ __ ]", category: "Profanity" },
  { word: "[__]", category: "Profanity" },
  
  // Blasphemy
  { word: "jesus", category: "Blasphemy" },
  { word: "christ", category: "Blasphemy" },
  { word: "christ's", category: "Blasphemy" },
  { word: "jesus christ", category: "Blasphemy" },
  { word: "god", category: "Blasphemy" },
  { word: "my god", category: "Blasphemy" },
  { word: "oh my god", category: "Blasphemy" },
  { word: "god damn", category: "Blasphemy" },
  { word: "god damn you", category: "Blasphemy" },
  
  // Scatological
  { word: "shit", category: "Scatological" },
  { word: "crap", category: "Scatological" },
  { word: "piss", category: "Scatological" },
  { word: "turd", category: "Scatological" },
  { word: "shitty", category: "Scatological" },
  
  // Anatomical
  { word: "ass", category: "Anatomical" },
  { word: "cunt", category: "Anatomical" },
  { word: "dick", category: "Anatomical" },
  { word: "dick head", category: "Anatomical" },
  { word: "penis", category: "Anatomical" },
  { word: "vagina", category: "Anatomical" },
  { word: "pussy", category: "Anatomical" },
  
  // Sexual
  { word: "fuck", category: "Sexual" },
  { word: "fucker", category: "Sexual" },
  { word: "mother fucker", category: "Sexual" },
  { word: "cunnilingus", category: "Sexual" },
  { word: "oral", category: "Sexual" },
  { word: "anal", category: "Sexual" },
  { word: "whore", category: "Sexual" },
  { word: "slut", category: "Sexual" },
  
  // Derogatory
  { word: "niga", category: "Derogatory" },
  { word: "niger", category: "Derogatory" },
  { word: "dirty jew", category: "Derogatory" },
  { word: "faggot", category: "Derogatory" }
];

const contextMenu = document.getElementById("contextMenu");
const ctxReveal = document.getElementById("ctxReveal");
const ctxDisable = document.getElementById("ctxDisable");
const ctxDelete = document.getElementById("ctxDelete");

let state = {
  bootubeEnabled: true,
  hideCCEnabled: false,
  blurEnabled: true,
  respectfulModeEnabled: true,
  revealWordsEnabled: false,
  muteAggressiveness: 2,
  blocklist: [...DEFAULT_BLOCKLIST],
  disabledWords: [],
  enabledCategories: ["Profanity", "Blasphemy", "Custom"],
  supabaseSession: null,
  subscriptionStatus: 'free',
  collapsedCategories: [],
  hudExpanded: false,
  lastSyncOrigin: null,
  customAvatarDataUrl: null
};

let currentView = 'list'; // 'list', 'filter', 'script'
let currentPlatformThumbnail = null;

let categoryCounts = {};
const MOCK_SCRIPT = [
  { time: '00:1:21', text: "Oh, I get it." },
  { time: '00:1:22', text: "You guys aren't allowed to talk. Is that it?" },
  { time: '00:1:23', text: "Are you not allowed to talk?" },
  { time: '00:1:23', text: "One Airman grins, fidgeting with his orange NY Mets watch." },
  { time: '00:1:24', text: "No. We're allowed to talk." },
  { time: '00:1:24', text: "Oh. I see. So it's personal." },
  { time: '00:1:24', text: "I think they're intimidated." },
  { time: '00:1:24', text: "Good God, you're a woman. The others try to compress laughs." },
  { time: '00:1:25', text: "I, honestly, I couldn't have called that. (after silence) I would apologize, but isn't that what we're going for here? I saw you as a soldier first." }
];

// UI Elements
const closeBtn = document.getElementById("closeBtn");
const booLogo = document.getElementById("booLogo");
const videoBanner = document.getElementById("videoBanner");
const promoVideo = document.getElementById("promoVideo");
const domainIcon = document.getElementById("domainIcon");
const domainSubtitle = document.getElementById("domainSubtitle");
const bootubeEnabledToggle = document.getElementById("bootubeEnabled");
const wordCount = document.getElementById("wordCount");

const syncStatus = document.getElementById("syncStatus");
const syncBtn = document.getElementById("syncBtn");

// New Top Bar & Account Panel Elements
const topUpgradeBtn = document.getElementById("topUpgradeBtn");
const topProfileBtn = document.getElementById("topProfileBtn");
const topProfileText = document.getElementById("topProfileText");
const profileDropdown = document.getElementById("profileDropdown");
const dropManageBtn = document.getElementById("dropManageBtn");
const dropSignOutBtn = document.getElementById("dropSignOutBtn");
const accountPanel = document.getElementById("accountPanel");
const accountPanelCloseBtn = document.getElementById("accountPanelCloseBtn");
const accountPanelDetails = document.getElementById("accountPanelDetails");

function renderSyncStatus() {
  if (!syncStatus || !syncBtn) return;
  
  if (state.supabaseSession) {
    const email = state.supabaseSession.user?.email || 'User';
    const tier = (state.subscriptionStatus || 'free').toUpperCase();
    syncStatus.textContent = `☁️ Synced: ${email} (${tier})`;
    syncBtn.textContent = "Sign Out";
    syncBtn.classList.add("connected");
    
    syncBtn.onclick = () => {
      signOutUser();
    };
  } else {
    syncStatus.textContent = "☁️ Cloud Sync Inactive";
    syncBtn.textContent = "Sign in";
    syncBtn.classList.remove("connected");
    
    syncBtn.onclick = () => {
      showAuthModal();
    };
  }
}

const listTabBtn = document.getElementById("listTabBtn");
const scriptTabBtn = document.getElementById("scriptTabBtn");
const advancedBtn = document.getElementById("advancedBtn");
const sectionTitleText = document.getElementById("sectionTitleText");

const advancedContent = document.getElementById("advancedContent");
const scriptPanel = document.getElementById("scriptPanel");
const wordListContainer = document.getElementById("wordListContainer");

const platformPills = document.getElementById("platformPills");
const platformLeftArrow = document.getElementById("platformLeftArrow");
const platformRightArrow = document.getElementById("platformRightArrow");
const scriptContent = document.getElementById("scriptContent");

const hideCCEnabledToggle = document.getElementById("hideCCEnabled");
const blurEnabledToggle = document.getElementById("blurEnabled");
const respectfulModeEnabledToggle = document.getElementById("respectfulModeEnabled");
const revealAllToggle = document.getElementById("revealAllToggle");
const restoreDefaultBtn = document.getElementById("restoreDefaultBtn");
const addWordInput = document.getElementById("addWordInput");
const addWordBtn = document.getElementById("addWordBtn");
const wordList = document.getElementById("wordList");
const muteAggressivenessSlider = document.getElementById("muteAggressiveness");

const impactHud = document.getElementById("impactHud");
const hudMutedCount = document.getElementById("hudMutedCount");
const hudLockedTally = document.getElementById("hudLockedTally");
const hudLockedCount = document.getElementById("hudLockedCount");
const hudLogFeed = document.getElementById("hudLogFeed");
const hudUpgradeBtn = document.getElementById("hudUpgradeBtn");
const hudToggleBtn = document.getElementById("hudToggleBtn");

let countAnimationInterval = null;

function updateWordCountAnimated(newCount) {
  if (!wordCount) return;
  const currentText = wordCount.textContent;
  let currentVal = parseInt(currentText, 10);
  if (isNaN(currentVal)) currentVal = 0;
  
  if (currentVal === newCount) return;
  
  if (countAnimationInterval) {
    clearInterval(countAnimationInterval);
  }
  
  // Start spin blur
  wordCount.classList.add("spinning");
  
  const step = () => {
    if (currentVal === newCount) {
      clearInterval(countAnimationInterval);
      countAnimationInterval = null;
      
      // Settle animation
      wordCount.classList.remove("spinning");
      wordCount.classList.add("settle");
      
      // Update styling to final count
      if (newCount === 0) {
        wordCount.style.background = "linear-gradient(90deg, #D7361F, #FD533B)";
        wordCount.style.webkitBackgroundClip = "text";
        wordCount.style.webkitTextFillColor = "transparent";
      } else {
        wordCount.style.background = "none";
        wordCount.style.webkitBackgroundClip = "initial";
        wordCount.style.webkitTextFillColor = "initial";
        wordCount.style.color = "#4789F0";
      }
      
      wordCount.textContent = newCount.toString();
      
      setTimeout(() => {
        wordCount.classList.remove("settle");
      }, 200);
      return;
    }
    
    if (currentVal < newCount) {
      currentVal++;
    } else {
      currentVal--;
    }
    
    wordCount.textContent = currentVal.toString();
  };
  
  // Ticks every 35ms for smooth, high-speed spin roll
  countAnimationInterval = setInterval(step, 35);
}

function renderWordList() {
  wordList.innerHTML = "";
  
  const isMasterEnabled = state.bootubeEnabled;

  // Calculate active word count
  let activeCount = 0;
  if (isMasterEnabled) {
    state.blocklist.forEach(item => {
      let word = typeof item === 'string' ? item : item.word;
      let cat = typeof item === 'string' ? 'Custom' : item.category;
      if (state.enabledCategories.includes(cat) && !state.disabledWords.includes(word)) {
        activeCount++;
      }
    });
  }
  updateWordCountAnimated(activeCount);
  
  // Group by category
  let grouped = {};
  state.blocklist.forEach(item => {
    let word = typeof item === 'string' ? item : item.word;
    let cat = typeof item === 'string' ? 'Custom' : item.category;
    
    // We no longer filter by activeCategory since pills are global toggles now.

    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(word);
  });

  // Sort categories so 'Custom' is always first, and then alphabetically
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    if (a === 'Custom') return -1;
    if (b === 'Custom') return 1;
    return a.localeCompare(b);
  });

  const collapsedList = state.collapsedCategories || [];

  for (const cat of sortedCategories) {
    const isPremium = state.subscriptionStatus === 'active' || state.subscriptionStatus === 'premium';
    const isCategoryLocked = !isPremium && cat !== "Blasphemy";
    
    // Create Header Row Container
    const headerRow = document.createElement("div");
    headerRow.className = "category-header-row";
    if (isCategoryLocked) {
      headerRow.classList.add("disabled");
    }
    
    // Left Side: Chevron, Title, Word Count, Match Count
    const leftDiv = document.createElement("div");
    leftDiv.className = "category-header-left";
    
    const chevronImg = document.createElement("img");
    chevronImg.src = "images/ic_chevron_down.svg";
    chevronImg.className = "category-header-chevron";
    const isCollapsed = collapsedList.includes(cat);
    if (isCollapsed) {
      chevronImg.classList.add("collapsed");
    }
    leftDiv.appendChild(chevronImg);
    
    const titleSpan = document.createElement("span");
    titleSpan.className = "category-header-title";
    titleSpan.textContent = cat;
    if (isCategoryLocked) {
      const lockIcon = document.createElement("span");
      lockIcon.className = "lock-icon";
      lockIcon.textContent = " 🔒";
      titleSpan.appendChild(lockIcon);
    }
    leftDiv.appendChild(titleSpan);
    
    const countData = categoryCounts[cat] || { count: 0, hideCount: false };
    if (countData.count > 0 && !countData.hideCount) {
      const matchBadge = document.createElement("span");
      const isCatEnabled = state.enabledCategories.includes(cat);
      if (isCatEnabled) {
        matchBadge.className = "category-header-match-count";
      } else {
        matchBadge.className = "category-header-match-count disabled";
      }
      matchBadge.innerHTML = `<span class="match-count-text">Filter ${countData.count}</span>`;
      leftDiv.appendChild(matchBadge);
    }
    
    headerRow.appendChild(leftDiv);
    
    // Right Side: Switch Toggle
    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";
    
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = state.enabledCategories.includes(cat);
    if (isCategoryLocked) {
      toggleInput.disabled = true;
    }
    
    const sliderSpan = document.createElement("span");
    sliderSpan.className = "slider round";
    
    switchLabel.appendChild(toggleInput);
    switchLabel.appendChild(sliderSpan);
    
    switchLabel.onclick = (e) => {
      e.stopPropagation(); // Do not collapse/expand when clicking the switch
      if (isCategoryLocked) {
        showToast(`Sign in and upgrade to Premium to filter by ${cat}`, true);
        e.preventDefault();
        return;
      }
    };
    
    toggleInput.onchange = (e) => {
      if (toggleInput.checked) {
        if (!state.enabledCategories.includes(cat)) {
          state.enabledCategories.push(cat);
        }
        if (!state.bootubeEnabled) {
          state.bootubeEnabled = true;
          bootubeEnabledToggle.checked = true;
          updateUI();
        }
      } else {
        state.enabledCategories = state.enabledCategories.filter(c => c !== cat);
        const activeCats = new Set();
        state.blocklist.forEach(item => {
          const c = typeof item === 'string' ? 'Custom' : item.category;
          activeCats.add(c);
        });
        let anyEnabled = false;
        for (const c of activeCats) {
          if (state.enabledCategories.includes(c)) {
            anyEnabled = true;
            break;
          }
        }
        if (!anyEnabled) {
          state.bootubeEnabled = false;
          bootubeEnabledToggle.checked = false;
          updateUI();
        }
      }
      saveState();
      renderWordList(); // Re-render lists (strikethroughs, etc.)
    };
    
    headerRow.appendChild(switchLabel);
    wordList.appendChild(headerRow);
    
    // Container for Words
    const wordsContainer = document.createElement("div");
    wordsContainer.className = "category-words-container";
    if (isCollapsed) {
      wordsContainer.classList.add("collapsed");
    }
    
    // Toggle Collapse
    headerRow.onclick = (e) => {
      if (e.target.closest('.switch')) return;
      
      const collapsed = wordsContainer.classList.toggle("collapsed");
      chevronImg.classList.toggle("collapsed", collapsed);
      
      if (!state.collapsedCategories) {
        state.collapsedCategories = [];
      }
      if (collapsed) {
        if (!state.collapsedCategories.includes(cat)) {
          state.collapsedCategories.push(cat);
        }
      } else {
        state.collapsedCategories = state.collapsedCategories.filter(c => c !== cat);
      }
      saveState();
    };
    
    grouped[cat].forEach(word => {
      const item = document.createElement("div");
      item.className = "word-item";
      
      const isWordDisabled = state.disabledWords.includes(word) || !state.enabledCategories.includes(cat);
      if (!isMasterEnabled || isWordDisabled) {
        item.classList.add("strikethrough");
      }
      
      const wordSpan = document.createElement("span");
      if (state.revealWordsEnabled) {
        wordSpan.textContent = word;
      } else {
        if (word.length <= 2 || (word.includes("[") && word.includes("]"))) {
          wordSpan.textContent = word;
        } else {
          wordSpan.textContent = word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
        }
      }
      
      const optionsBtn = document.createElement("button");
      optionsBtn.className = "icon-btn";
      optionsBtn.title = "More Options";
      optionsBtn.innerHTML = `<img src="images/ic_more_vert.svg">`;
      
      let isRevealedLocally = false;
      
      optionsBtn.onclick = (e) => {
        e.stopPropagation();
        
        const isAlreadyOpen = contextMenu.style.display === "block" && contextMenu.dataset.activeWord === word;
        
        if (isAlreadyOpen) {
          contextMenu.style.display = "none";
          contextMenu.removeAttribute("data-active-word");
          return;
        }
        
        contextMenu.style.display = "block";
        contextMenu.dataset.activeWord = word;
        const rect = optionsBtn.getBoundingClientRect();
        
        contextMenu.style.top = `${rect.bottom + window.scrollY + 6}px`;
        contextMenu.style.left = 'auto';
        contextMenu.style.right = '24px';
        
        const ctxRevealTitle = document.getElementById("ctxRevealTitle");
        ctxRevealTitle.textContent = isRevealedLocally ? "Hide word" : "Reveal word";
        
        ctxReveal.onclick = (e) => {
          e.stopPropagation();
          isRevealedLocally = !isRevealedLocally;
          
          if (isRevealedLocally) {
            wordSpan.textContent = word;
          } else {
            if (!state.revealWordsEnabled && word.length > 2 && !(word.includes("[") && word.includes("]"))) {
              wordSpan.textContent = word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
            }
          }
          contextMenu.style.display = "none";
        };
        
        const ctxDisableTitle = document.getElementById("ctxDisableTitle");
        const ctxDisableSub = document.getElementById("ctxDisableSub");
        const isCatDisabled = !state.enabledCategories.includes(cat);
        
        if (isCatDisabled) {
          ctxDisableTitle.textContent = "Disable word";
          ctxDisableSub.textContent = "Category is turned off";
          ctxDisable.classList.add("ctx-disabled");
          ctxDisable.onclick = (e) => {
            e.stopPropagation();
          };
        } else {
          ctxDisable.classList.remove("ctx-disabled");
          if (state.disabledWords.includes(word)) {
            ctxDisableTitle.textContent = "Enable word";
            ctxDisableSub.textContent = "Word is being filtered";
          } else {
            ctxDisableTitle.textContent = "Disable word";
            ctxDisableSub.textContent = "Word will not be filtered";
          }
          
          ctxDisable.onclick = (e) => {
            e.stopPropagation();
            if (state.disabledWords.includes(word)) {
              state.disabledWords = state.disabledWords.filter(w => w !== word);
            } else {
              state.disabledWords.push(word);
            }
            saveState();
            renderWordList();
            contextMenu.style.display = "none";
          };
        }
        
        ctxDelete.onclick = (e) => {
          e.stopPropagation();
          state.blocklist = state.blocklist.filter(item => {
            let itemWord = typeof item === 'string' ? item : item.word;
            return itemWord !== word;
          });
          saveState();
          renderWordList();
          contextMenu.style.display = "none";
        };
      };
      
      item.appendChild(wordSpan);
      item.appendChild(optionsBtn);
      wordsContainer.appendChild(item);
    });
    
    wordList.appendChild(wordsContainer);
  }
}

function calculateCategoryCounts(scriptText = "") {
  let isDisneyPlus = false;
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url && (
      tabs[0].url.includes("paramountplus.com") || 
      tabs[0].url.includes("max.com") || 
      tabs[0].url.includes("hbomax.com") || 
      tabs[0].url.includes("disneyplus.com") || 
      tabs[0].url.includes("hulu.com") || 
      tabs[0].url.includes("plex.tv") || 
      tabs[0].url.includes("plex.direct") || 
      tabs[0].url.includes(":32400") || 
      tabs[0].url.includes("fandango.com") || 
      tabs[0].url.includes("vudu.com") || 
      tabs[0].url.includes("netflix.com") ||
      tabs[0].url.includes("primevideo.com") ||
      tabs[0].url.includes("amazon.com/gp/video") ||
      tabs[0].url.includes("amazon.com/v/") ||
      tabs[0].url.includes("amazon.co.uk/gp/video") ||
      tabs[0].url.includes("amazon.ca/gp/video")
    )) {
      isDisneyPlus = true;
    }
    
    const categories = ["Profanity", "Blasphemy", "Scatological", "Anatomical", "Sexual", "Derogatory", "Custom"];
    
    categories.forEach(catName => {
      let count = 0;
      let wordsInCat = state.blocklist.filter(item => {
         let c = typeof item === 'string' ? 'Custom' : item.category;
         return c === catName;
      }).map(item => typeof item === 'string' ? item : item.word);
      
      wordsInCat = [...new Set(wordsInCat)];
      
      if (scriptText && !isDisneyPlus) {
          wordsInCat.forEach(word => {
             const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
             const matches = scriptText.match(regex);
             if (matches) count += matches.length;
          });
          if (catName === "Profanity") {
             const regex = /\[\s*__\s*\]/g;
             const matches = scriptText.match(regex);
             if (matches) count += matches.length;
          }
      }
      
      categoryCounts[catName] = { 
        count: count, 
        hideCount: isDisneyPlus, 
        wordCount: wordsInCat.length 
      };
    });
    
    renderWordList();
  });
}

function updateImpactHud() {
  if (!impactHud) return;
  impactHud.style.display = "none";
  // NOTE: Censor Stream history HUD hidden for a future update
}

function obfuscateWord(word) {
  if (!word) return "";
  if (word === "[__]" || word === "[ __ ]") return "[__]";
  return word.split(" ").map(w => {
    if (w.length <= 1) return w;
    if (w.length === 2) return w[0] + "*";
    return w[0] + "*".repeat(w.length - 2) + w[w.length - 1];
  }).join(" ");
}

function isXDomain(str) {
  if (!str) return false;
  const s = str.toLowerCase();
  try {
    if (s.includes("://")) {
      const u = new URL(s);
      return u.hostname === 'x.com' || u.hostname.endsWith('.x.com') || u.hostname === 'twitter.com' || u.hostname.endsWith('.twitter.com');
    }
  } catch(e) {}
  return s === 'x.com' || s.endsWith('.x.com') || s === 'twitter.com' || s.endsWith('.twitter.com') || s.includes('//x.com') || s.includes('.x.com/') || s.includes('//twitter.com') || s.includes('.twitter.com/');
}

let currentScriptData = [];
let currentSearchMatches = [];
let currentMatchIndex = -1;

const SUPPORTED_PLATFORMS = [
  {
    name: "YouTube",
    icon: "images/ic_youtube.svg",
    url: "https://www.youtube.com",
    patterns: ["youtube.com"]
  },
  {
    name: "Netflix",
    icon: "images/ic_netflix.svg",
    url: "https://www.netflix.com",
    patterns: ["netflix.com"]
  },
  {
    name: "Disney+",
    icon: "images/ic_disney_plus.svg",
    url: "https://www.disneyplus.com",
    patterns: ["disneyplus.com"]
  },
  {
    name: "Hulu",
    icon: "images/ic_hulu.svg",
    url: "https://www.hulu.com",
    patterns: ["hulu.com"]
  },
  {
    name: "Prime Video",
    icon: "images/ic_prime_video.svg",
    url: "https://www.primevideo.com",
    patterns: ["primevideo.com", "amazon.com/gp/video", "amazon.com/v/", "amazon.co.uk/gp/video", "amazon.ca/gp/video"]
  },
  {
    name: "Max",
    icon: "images/ic_max.svg",
    url: "https://www.max.com",
    patterns: ["max.com", "hbomax.com"]
  },
  {
    name: "Paramount+",
    icon: "images/ic_paramount.svg",
    url: "https://www.paramountplus.com",
    patterns: ["paramountplus.com", "cbs.com"]
  },
  {
    name: "Plex",
    icon: "images/ic_plex.svg",
    url: "https://app.plex.tv",
    patterns: ["plex.tv", "plex.direct"]
  },
  {
    name: "Spotify",
    icon: "images/ic_spotify.svg",
    url: "https://open.spotify.com",
    patterns: ["spotify.com"]
  },
  {
    name: "X.com",
    icon: "images/ic_x.svg",
    url: "https://x.com",
    patterns: ["x.com", "twitter.com"]
  },
  {
    name: "Facebook",
    icon: "images/ic_facebook.svg",
    url: "https://www.facebook.com",
    patterns: ["facebook.com", "fb.watch"]
  },
  {
    name: "Fandango",
    icon: "images/ic_fandango.svg",
    url: "https://www.fandango.com",
    patterns: ["fandango.com", "vudu.com"]
  }
];

let isDraggingPlatformPills = false;
let isDown = false;
let startX;
let scrollLeft;
let draggedDistance = 0;

function renderPlatformPills() {
  if (!platformPills) return;
  platformPills.innerHTML = "";
  
  SUPPORTED_PLATFORMS.forEach(platform => {
    const pill = document.createElement("button");
    pill.className = "platform-pill";
    pill.dataset.platform = platform.name;
    pill.innerHTML = `<img src="${platform.icon}" alt="${platform.name}"> ${platform.name}`;
    pill.title = `Watch on ${platform.name}`;
    
    pill.onclick = (e) => {
      if (isDraggingPlatformPills) return;
      chrome.tabs.query({}, (tabs) => {
        const matchedTab = tabs.find(tab => {
          if (!tab.url) return false;
          return platform.patterns.some(pattern => tab.url.includes(pattern));
        });
        
        if (matchedTab) {
          chrome.tabs.update(matchedTab.id, { active: true });
          chrome.windows.update(matchedTab.windowId, { focused: true });
        } else {
          chrome.tabs.create({ url: platform.url });
        }
      });
    };
    
    platformPills.appendChild(pill);
  });
  
  setTimeout(updatePlatformScrollArrows, 50);
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
      updateSelectedPlatformPill(tabs[0].url || "");
    }
  });
}

function updateSelectedPlatformPill(url) {
  const pills = document.querySelectorAll(".platform-pill");
  pills.forEach(p => p.classList.remove("selected"));
  
  if (!url) return;
  
  const activePlatform = SUPPORTED_PLATFORMS.find(p => 
    p.patterns.some(pattern => {
      if (pattern === 'x.com') {
        return isXDomain(url);
      }
      return url.includes(pattern);
    })
  );
  
  if (activePlatform) {
    const activePill = document.querySelector(`.platform-pill[data-platform="${activePlatform.name}"]`);
    if (activePill) {
      activePill.classList.add("selected");
      const containerWidth = platformPills.clientWidth;
      const pillLeft = activePill.offsetLeft;
      const pillWidth = activePill.clientWidth;
      platformPills.scrollTo({
        left: pillLeft - (containerWidth / 2) + (pillWidth / 2),
        behavior: "smooth"
      });
    }
  }
}

function updatePlatformScrollArrows() {
  if (!platformPills || !platformLeftArrow || !platformRightArrow) return;
  
  const scrollLeft = platformPills.scrollLeft;
  const maxScrollLeft = platformPills.scrollWidth - platformPills.clientWidth;
  
  const hasLeft = scrollLeft > 2;
  const hasRight = scrollLeft < maxScrollLeft - 2;
  
  if (hasLeft) {
    platformLeftArrow.classList.add("visible");
    platformPills.classList.add("left-overflow");
  } else {
    platformLeftArrow.classList.remove("visible");
    platformPills.classList.remove("left-overflow");
  }
  
  if (hasRight) {
    platformRightArrow.classList.add("visible");
    platformPills.classList.remove("no-right-overflow");
  } else {
    platformRightArrow.classList.remove("visible");
    platformPills.classList.add("no-right-overflow");
  }
  
  if (!hasLeft && !hasRight) {
    platformPills.classList.add("no-overflow");
  } else {
    platformPills.classList.remove("no-overflow");
  }
}

if (platformPills && platformLeftArrow && platformRightArrow) {
  platformPills.addEventListener("scroll", updatePlatformScrollArrows);
  window.addEventListener("resize", updatePlatformScrollArrows);
  
  platformLeftArrow.addEventListener("click", () => {
    platformPills.scrollBy({ left: -120, behavior: "smooth" });
  });
  
  platformRightArrow.addEventListener("click", () => {
    platformPills.scrollBy({ left: 120, behavior: "smooth" });
  });

  // Mouse click-and-drag horizontal scroll logic
  platformPills.style.cursor = "grab";
  
  platformPills.addEventListener("mousedown", (e) => {
    isDown = true;
    platformPills.style.cursor = "grabbing";
    startX = e.pageX - platformPills.offsetLeft;
    scrollLeft = platformPills.scrollLeft;
    draggedDistance = 0;
    isDraggingPlatformPills = false;
  });
  
  platformPills.addEventListener("mouseleave", () => {
    isDown = false;
    platformPills.style.cursor = "grab";
    setTimeout(() => { isDraggingPlatformPills = false; }, 50);
  });
  
  platformPills.addEventListener("mouseup", () => {
    isDown = false;
    platformPills.style.cursor = "grab";
    setTimeout(() => { isDraggingPlatformPills = false; }, 50);
  });
  
  platformPills.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - platformPills.offsetLeft;
    const walk = (x - startX) * 1.5;
    platformPills.scrollLeft = scrollLeft - walk;
    draggedDistance += Math.abs(e.movementX);
    if (draggedDistance > 6) {
      isDraggingPlatformPills = true;
    }
  });
}



function updateUI() {
  renderSyncStatus();
  bootubeEnabledToggle.checked = state.bootubeEnabled;
  hideCCEnabledToggle.checked = state.hideCCEnabled;
  respectfulModeEnabledToggle.checked = state.respectfulModeEnabled;
  revealAllToggle.checked = state.revealWordsEnabled;
  
  const isPremium = state.subscriptionStatus === 'active' || state.subscriptionStatus === 'premium';
  
  if (!isPremium && state.bootubeEnabled) {
    state.enabledCategories = ["Blasphemy"];
    saveState();
  }

  // Update Top Bar buttons based on premium plan status
  if (topUpgradeBtn && topProfileBtn && topProfileText) {
    const topProfileAvatar = document.getElementById("topProfileAvatar");
    const topProfileIcon = document.getElementById("topProfileIcon");
    
    if (state.supabaseSession) {
      // Hide standard profile text and default SVG icon
      topProfileText.style.display = "none";
      if (topProfileIcon) topProfileIcon.style.display = "none";
      
      // Sync custom avatar from Supabase user_metadata if available and not set locally
      if (state.supabaseSession.user?.user_metadata?.avatar_url && !state.customAvatarDataUrl) {
        state.customAvatarDataUrl = state.supabaseSession.user.user_metadata.avatar_url;
        saveState();
      }
      
      // Calculate first letter of email
      const email = state.supabaseSession.user?.email || '';
      const username = email.split('@')[0] || 'User';
      const firstLetter = email.charAt(0).toUpperCase() || 'U';
      
      // Show dynamic outline circle avatar
      if (topProfileAvatar) {
        topProfileAvatar.style.display = "flex";
        if (state.customAvatarDataUrl) {
          topProfileAvatar.style.backgroundImage = `url("${state.customAvatarDataUrl}")`;
          topProfileAvatar.style.backgroundSize = "cover";
          topProfileAvatar.style.backgroundPosition = "center";
          topProfileAvatar.classList.add("has-custom-photo");
          topProfileAvatar.textContent = "";
        } else {
          topProfileAvatar.style.backgroundImage = "none";
          topProfileAvatar.classList.remove("has-custom-photo");
          topProfileAvatar.textContent = firstLetter;
        }
      }
      
      if (isPremium) {
        topUpgradeBtn.style.display = "none";
      } else {
        topUpgradeBtn.style.display = "block";
        topUpgradeBtn.textContent = "Upgrade";
      }
      
      // Update custom profile dropdown card properties dynamically
      const dropAvatarCircle = document.getElementById("dropAvatarCircle");
      const dropUsername = document.getElementById("dropUsername");
      const dropEmail = document.getElementById("dropEmail");
      const dropTierVal = document.getElementById("dropTierVal");
      const dropManageText = document.getElementById("dropManageText");
      const resetAvatarBtn = document.getElementById("resetAvatarBtn");
      
      if (dropAvatarCircle) {
        if (state.customAvatarDataUrl) {
          dropAvatarCircle.style.backgroundImage = `url("${state.customAvatarDataUrl}")`;
          dropAvatarCircle.style.backgroundSize = "cover";
          dropAvatarCircle.style.backgroundPosition = "center";
          dropAvatarCircle.classList.add("has-custom-photo");
          dropAvatarCircle.textContent = "";
        } else {
          dropAvatarCircle.style.backgroundImage = "none";
          dropAvatarCircle.classList.remove("has-custom-photo");
          dropAvatarCircle.textContent = firstLetter;
        }
      }
      if (resetAvatarBtn) {
        resetAvatarBtn.style.display = state.customAvatarDataUrl ? "inline-block" : "none";
      }
      if (dropUsername) dropUsername.textContent = "Account";
      if (dropEmail) dropEmail.textContent = email;
      if (dropTierVal) {
        dropTierVal.textContent = isPremium ? "Premium" : "Free";
        dropTierVal.className = isPremium ? "value premium" : "value";
      }
      if (dropManageText) {
        dropManageText.textContent = isPremium ? "Manage subscription" : "Upgrade to premium";
      }
      const dropVersionVal = document.getElementById("dropVersionVal");
      if (dropVersionVal) {
        try {
          dropVersionVal.textContent = `v${chrome.runtime.getManifest().version}`;
        } catch (e) {
          dropVersionVal.textContent = "v1.26";
        }
      }
    } else {
      // Restore standard "Sign in" label and SVG icon when logged out
      topProfileText.textContent = "Sign in";
      topProfileText.style.display = "";
      if (topProfileIcon) topProfileIcon.style.display = "";
      if (topProfileAvatar) topProfileAvatar.style.display = "none";
      
      topUpgradeBtn.style.display = "block";
      topUpgradeBtn.textContent = "Upgrade";
    }
  }

  // Hide dropdown menu by default during state shifts
  if (profileDropdown) {
    profileDropdown.classList.remove("show");
  }

  // Live redraw of account panel if it happens to be open when state updates
  if (accountPanel && accountPanel.classList.contains("open")) {
    renderAccountPanelDetails();
  }
  
  // Enforce premium gating for video blurring
  const blurRow = blurEnabledToggle ? blurEnabledToggle.closest('.toggle-row') : null;
  if (blurEnabledToggle) {
    if (!isPremium) {
      state.blurEnabled = false;
      blurEnabledToggle.checked = false;
      blurEnabledToggle.disabled = true;
      if (blurRow) {
        blurRow.classList.add("disabled-premium");
        blurRow.title = "Upgrade to Premium to enable video blurring";
      }
    } else {
      blurEnabledToggle.checked = state.blurEnabled;
      blurEnabledToggle.disabled = false;
      if (blurRow) {
        blurRow.classList.remove("disabled-premium");
        blurRow.removeAttribute("title");
      }
    }
  }

  // Enforce premium gating for mute buffer slider
  const sliderRow = muteAggressivenessSlider ? muteAggressivenessSlider.closest('.toggle-row') : null;
  if (muteAggressivenessSlider) {
    if (!isPremium) {
      state.muteAggressiveness = 2;
      muteAggressivenessSlider.value = 2;
      muteAggressivenessSlider.disabled = true;
      if (sliderRow) {
        sliderRow.classList.add("disabled-premium");
        sliderRow.title = "Upgrade to Premium to adjust the mute buffer";
      }
    } else {
      muteAggressivenessSlider.value = state.muteAggressiveness || 2;
      muteAggressivenessSlider.disabled = false;
      if (sliderRow) {
        sliderRow.classList.remove("disabled-premium");
        sliderRow.removeAttribute("title");
      }
    }
  }

  // Enforce premium gating for custom word blocklist input
  if (!isPremium) {
    if (addWordInput) {
      addWordInput.readOnly = true;
      addWordInput.placeholder = "🔒 Upgrade to add custom words";
      addWordInput.value = "";
      addWordInput.style.cursor = "pointer";
    }
    if (addWordBtn) {
      addWordBtn.disabled = true;
      addWordBtn.classList.remove("has-text");
    }
  } else {
    if (addWordInput) {
      addWordInput.readOnly = false;
      addWordInput.placeholder = "Add custom word...";
      addWordInput.style.cursor = "text";
    }
    if (addWordBtn) {
      addWordBtn.disabled = false;
    }
  }

  if (booLogo) {
    booLogo.src = state.bootubeEnabled ? "images/ic_boo_on.svg" : "images/ic_boo_off.svg";
  }
  
  const advancedRows = document.querySelectorAll("#advancedContent .toggle-row");
  advancedRows.forEach(row => {
    if (!state.bootubeEnabled) {
      row.classList.add("disabled-advanced");
      row.title = "Turn on Censoring to use this control";
    } else {
      row.classList.remove("disabled-advanced");
      row.removeAttribute("title");
    }
  });
  
  if (wordListContainer) {
    wordListContainer.style.display = currentView === 'list' ? 'block' : 'none';
  }
  if (scriptPanel) {
    scriptPanel.style.display = currentView === 'script' ? 'block' : 'none';
  }
  if (advancedContent) {
    advancedContent.style.display = currentView === 'advanced' ? 'block' : 'none';
  }
  
  if (currentView === 'list') {
    renderWordList();
  }
}

function saveState() {
  chrome.storage.local.set(state);
}

// Event Listeners
booLogo.style.cursor = "pointer";
booLogo.addEventListener("click", () => {
  videoBanner.classList.remove("banner-collapsed");
  videoBanner.style.backgroundImage = "none";
  promoVideo.style.display = "block";
  promoVideo.currentTime = 0;
  promoVideo.play().catch(e => {
    showActivePlatformBanner();
  });
  promoVideo.onended = () => {
    showActivePlatformBanner();
  };
});

if (closeBtn) {
  closeBtn.addEventListener("click", () => window.close());
}

// Global click listener to close context menu
document.addEventListener("click", (e) => {
  if (contextMenu && contextMenu.style.display === "block") {
    contextMenu.style.display = "none";
    contextMenu.removeAttribute("data-active-word");
  }
});

// Disclaimer Accordion
const disclaimerHeader = document.getElementById("disclaimerHeader");
const disclaimerContent = document.getElementById("disclaimerContent");
if (disclaimerHeader && disclaimerContent) {
  disclaimerHeader.addEventListener("click", () => {
    disclaimerHeader.classList.toggle("open");
    if (disclaimerContent.style.display === "none") {
      disclaimerContent.style.display = "block";
    } else {
      disclaimerContent.style.display = "none";
    }
  });
}

function updateTitleWithAnimation(newText) {
  if (!sectionTitleText) return;
  
  sectionTitleText.classList.add("fade-out");
  
  setTimeout(() => {
    sectionTitleText.classList.remove("fade-out");
    sectionTitleText.classList.add("prepare-in");
    sectionTitleText.textContent = newText;
    
    // Force reflow
    void sectionTitleText.offsetWidth;
    
    sectionTitleText.classList.remove("prepare-in");
  }, 150);
}



bootubeEnabledToggle.addEventListener("change", (e) => {
  state.bootubeEnabled = e.target.checked;
  if (!state.bootubeEnabled) {
    state.enabledCategories = [];
  } else {
    const isPremium = state.subscriptionStatus === 'active' || state.subscriptionStatus === 'premium';
    if (isPremium) {
      state.enabledCategories = ["Blasphemy", "Profanity", "Sexual", "Scatological", "Anatomical", "Derogatory", "Custom"];
    } else {
      state.enabledCategories = ["Blasphemy"];
    }
  }
  saveState();
  updateUI();
  renderWordList();
});

hideCCEnabledToggle.addEventListener("change", (e) => { state.hideCCEnabled = e.target.checked; saveState(); });
blurEnabledToggle.addEventListener("change", (e) => { state.blurEnabled = e.target.checked; saveState(); });
respectfulModeEnabledToggle.addEventListener("change", (e) => { state.respectfulModeEnabled = e.target.checked; saveState(); });

revealAllToggle.addEventListener("change", (e) => {
  state.revealWordsEnabled = e.target.checked;
  saveState();
  renderWordList();
});

restoreDefaultBtn.addEventListener("click", () => {
  state.blocklist = [...DEFAULT_BLOCKLIST];
  state.disabledWords = [];
  saveState();
  renderWordList();
  calculateCategoryCounts(""); // Force UI refresh for the pills!
});

addWordBtn.addEventListener("click", () => {
  const isPremium = state.subscriptionStatus === 'active' || state.subscriptionStatus === 'premium';
  if (!isPremium) {
    showToast("Upgrade to Premium to add custom words", true);
    return;
  }
  const word = addWordInput.value.trim();
  if (word) {
    state.blocklist.unshift({ word, category: 'Custom' });
    if (!state.enabledCategories.includes('Custom')) {
      state.enabledCategories.push('Custom');
    }
    state.disabledWords = state.disabledWords.filter(w => w.toLowerCase() !== word.toLowerCase());
    addWordInput.value = "";
    addWordBtn.classList.remove("has-text");
    saveState();
    updateUI();
  }
});

addWordInput.addEventListener("click", () => {
  const isPremium = state.subscriptionStatus === 'active' || state.subscriptionStatus === 'premium';
  if (!isPremium) {
    showToast("Upgrade to Premium to add custom words", true);
  }
});

addWordInput.addEventListener("input", () => {
  const text = addWordInput.value.trim();
  if (text.length > 0) {
    addWordBtn.classList.add("has-text");
  } else {
    addWordBtn.classList.remove("has-text");
  }
});

addWordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addWordBtn.click();
});

function updateAggressivenessLabels() {
  const value = state.muteAggressiveness || 2;
  const labels = document.querySelectorAll(".range-labels span");
  if (labels && labels.length === 3) {
    labels.forEach((lbl, idx) => {
      if (idx + 1 === value) {
        lbl.classList.add("highlight-label");
      } else {
        lbl.classList.remove("highlight-label");
      }
    });
  }
}

if (muteAggressivenessSlider) {
  const sliderRow = muteAggressivenessSlider.closest(".slider-row");
  if (sliderRow) {
    sliderRow.addEventListener("click", () => {
      const isPremium = state.subscriptionStatus === 'active' || state.subscriptionStatus === 'premium';
      if (!isPremium) {
        showToast("Upgrade to Premium to adjust the mute buffer", true);
      }
    });
  }

  muteAggressivenessSlider.addEventListener("input", (e) => {
    state.muteAggressiveness = parseInt(e.target.value);
    saveState();
    updateAggressivenessLabels();
  });

  const labels = document.querySelectorAll(".range-labels span");
  if (labels && labels.length === 3) {
    labels.forEach((lbl, idx) => {
      lbl.addEventListener("click", (e) => {
        const isPremium = state.subscriptionStatus === 'active' || state.subscriptionStatus === 'premium';
        if (!isPremium) {
          e.stopPropagation();
          showToast("Upgrade to Premium to adjust the mute buffer", true);
          return;
        }
        muteAggressivenessSlider.value = idx + 1;
        state.muteAggressiveness = idx + 1;
        saveState();
        updateAggressivenessLabels();
      });
    });
  }
}

function signOutUser() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: "CLEAR_SUPABASE_SESSION" }, () => {
        if (chrome.runtime.lastError) {}
        state.supabaseSession = null;
        state.subscriptionStatus = 'free';
        state.enabledCategories = state.bootubeEnabled ? ["Blasphemy"] : [];
        
        // Clear custom words from blocklist for Free tier
        state.blocklist = state.blocklist.filter(item => {
          const cat = typeof item === 'string' ? 'Custom' : item.category;
          return cat !== 'Custom';
        });
        
        if (accountPanel) accountPanel.classList.remove("open");
        
        saveState();
        chrome.storage.local.set({
          censorHistoryLog: [],
          sessionMutedCount: 0,
          sessionLockedCount: 0,
          userExplicitlySignedOut: true
        });
        updateUI();
        
        let fullScriptText = "";
        if (currentScriptData && currentScriptData.length > 0) {
          currentScriptData.forEach(line => { fullScriptText += line.text.toLowerCase() + " "; });
        }
        calculateCategoryCounts(fullScriptText);
      });
    }
  } catch(e) {}
}

function openAccountPanel() {
  console.log("🔓 [Popup] Opening Account Panel. Current session status:", state.supabaseSession ? "signed-in" : "signed-out", "Tier:", state.subscriptionStatus);
  renderAccountPanelDetails();
  if (accountPanel) {
    accountPanel.classList.add("open");
  } else {
    console.error("❌ [Popup] Could not find accountPanel element in DOM");
  }
}

function renderAccountPanelDetails() {
  if (!accountPanelDetails) {
    console.error("❌ [Popup] Could not find accountPanelDetails element");
    return;
  }
  
  const isPremium = state.subscriptionStatus === 'active' || state.subscriptionStatus === 'premium';
  const email = state.supabaseSession?.user?.email;
  
  if (!state.supabaseSession) {
    // Signed Out State
    accountPanelDetails.innerHTML = `
      <div class="account-details-container">
        <p class="account-action-desc">🔒 Create an account or sign in to synchronize settings and enable premium censoring filters.</p>
        <button id="accPanelSignInBtn" class="account-btn primary" style="margin-bottom: 12px;">Sign in</button>
        <button id="accPanelSignUpBtn" class="account-btn secondary">Create account</button>
      </div>
    `;
    
    const signInBtn = document.getElementById("accPanelSignInBtn");
    const signUpBtn = document.getElementById("accPanelSignUpBtn");
    if (signInBtn) signInBtn.onclick = () => showAuthModal();
    if (signUpBtn) signUpBtn.onclick = () => chrome.tabs.create({ url: "https://bootube.app/signup" });
  } else if (!isPremium) {
    // Signed In, Free State
    accountPanelDetails.innerHTML = `
      <div class="account-details-container">
        <div class="account-card">
          <div class="account-card-row">
            <span class="account-card-label">Account:</span>
            <span class="account-card-value">${email}</span>
          </div>
          <div class="account-card-row">
            <span class="account-card-label">Plan Status:</span>
            <span class="account-card-value">Free Tier</span>
          </div>
        </div>
        <p class="account-action-desc">Upgrade to BooTube Premium to filter other streaming channels (Hulu, Disney+, Plex) and enable custom word blocklists.</p>
        <button id="accPanelUpgradeBtn" class="account-btn primary" style="margin-bottom: 12px;">Upgrade to premium</button>
        <button id="accPanelSignOutBtn" class="account-btn secondary">Sign out</button>
      </div>
    `;
    
    const upgradeBtn = document.getElementById("accPanelUpgradeBtn");
    const signOutBtn = document.getElementById("accPanelSignOutBtn");
    if (upgradeBtn) upgradeBtn.onclick = () => chrome.tabs.create({ url: "https://bootube.app/account" });
    if (signOutBtn) signOutBtn.onclick = () => signOutUser();
  } else {
    // Signed In, Premium State
    accountPanelDetails.innerHTML = `
      <div class="account-details-container">
        <div class="account-card">
          <div class="account-card-row">
            <span class="account-card-label">Account:</span>
            <span class="account-card-value">${email}</span>
          </div>
          <div class="account-card-row">
            <span class="account-card-label">Plan Status:</span>
            <span class="account-card-value premium-status">Premium Plan</span>
          </div>
        </div>
        <p class="account-action-desc">You have active Premium access. Manage your subscription billing, auto-renewal, and invoices securely on Stripe.</p>
        <button id="accPanelManageBtn" class="account-btn primary" style="margin-bottom: 12px;">Manage subscription</button>
        <button id="accPanelSignOutBtn" class="account-btn secondary">Sign out</button>
        <button id="accPanelDeleteBtn" class="account-btn danger">Delete account</button>
      </div>
    `;
    
    const manageBtn = document.getElementById("accPanelManageBtn");
    const signOutBtn = document.getElementById("accPanelSignOutBtn");
    const deleteBtn = document.getElementById("accPanelDeleteBtn");
    if (manageBtn) manageBtn.onclick = () => chrome.tabs.create({ url: "https://bootube.app/account" });
    if (signOutBtn) signOutBtn.onclick = () => signOutUser();
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        if (confirm("Are you sure you want to delete your account? This will permanently delete your settings. You will be redirected to the profile settings page to confirm deletion.")) {
          chrome.tabs.create({ url: "https://bootube.app/account" });
        }
      };
    }
  }
}


// Initialization
document.addEventListener("DOMContentLoaded", () => {
  // Seamlessly request <all_urls> permission on first click to enable tab screenshots from side panel
  document.addEventListener("click", () => {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      chrome.permissions.contains({ origins: ["<all_urls>"] }, (result) => {
        if (!result) {
          chrome.permissions.request({ origins: ["<all_urls>"] }, (granted) => {
            if (granted) {
              console.log("☁️ [Popup] Permission <all_urls> granted dynamically!");
              refreshActiveTabDetails();
            }
          });
        }
      });
    }
  }, { once: true });

  // Trigger a background settings sync on popup open to fetch latest user state
  console.log("☁️ [Popup] Triggering FORCE_SYNC on startup...");
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: "FORCE_SYNC" }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  } catch(e) {}
  if (topUpgradeBtn) {
    topUpgradeBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://bootube.app/account" });
    });
  }
  if (hudUpgradeBtn) {
    hudUpgradeBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://bootube.app/account" });
    });
  }
  if (hudToggleBtn) {
    hudToggleBtn.addEventListener("click", () => {
      chrome.storage.local.get({ hudExpanded: false }, (res) => {
        const nextState = !res.hudExpanded;
        chrome.storage.local.set({ hudExpanded: nextState }, () => {
          updateImpactHud();
        });
      });
    });
  }
  if (topProfileBtn) {
    topProfileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.supabaseSession) {
        if (profileDropdown) profileDropdown.classList.toggle("show");
      } else {
        showAuthModal();
      }
    });
  }
  if (dropManageBtn) {
    dropManageBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://bootube.app/account" });
      if (profileDropdown) profileDropdown.classList.remove("show");
    });
  }
  if (dropSignOutBtn) {
    dropSignOutBtn.addEventListener("click", () => {
      signOutUser();
      if (profileDropdown) profileDropdown.classList.remove("show");
    });
  }
  document.addEventListener("click", (e) => {
    if (profileDropdown && !profileDropdown.contains(e.target) && topProfileBtn && !topProfileBtn.contains(e.target)) {
      profileDropdown.classList.remove("show");
    }
  });
  if (accountPanelCloseBtn) {
    accountPanelCloseBtn.addEventListener("click", () => {
      accountPanel.classList.remove("open");
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0 && tabs[0].url && (
      tabs[0].url.includes('paramountplus.com') || 
      tabs[0].url.includes('max.com') || 
      tabs[0].url.includes('hbomax.com') || 
      tabs[0].url.includes('disneyplus.com') || 
      tabs[0].url.includes('hulu.com') || 
      tabs[0].url.includes('plex.tv') || 
      tabs[0].url.includes('plex.direct') || 
      tabs[0].url.includes(':32400') || 
      tabs[0].url.includes('fandango.com') || 
      tabs[0].url.includes('vudu.com') || 
      tabs[0].url.includes('netflix.com') ||
      tabs[0].url.includes('primevideo.com') ||
      tabs[0].url.includes('amazon.com/gp/video') ||
      tabs[0].url.includes('amazon.com/v/') ||
      tabs[0].url.includes('amazon.co.uk/gp/video') ||
      tabs[0].url.includes('amazon.ca/gp/video')
    )) {
      const row = document.getElementById('respectfulRow');
      if (row) row.style.display = 'none';
      const sliderRow = document.querySelector('.slider-row');
      if (sliderRow) sliderRow.style.display = 'none';
    }
  });

  chrome.storage.local.get(state, (res) => {
    Object.assign(state, res);
    
    // Auto-migration: Rename category "Religious exclamations" to "Blasphemy" in local storage
    let migrated = false;
    if (state.blocklist) {
      state.blocklist.forEach(item => {
        if (item && item.category === "Religious exclamations") {
          item.category = "Blasphemy";
          migrated = true;
        }
      });
    }
    if (state.enabledCategories) {
      state.enabledCategories = state.enabledCategories.map(cat => {
        if (cat === "Religious exclamations") {
          migrated = true;
          return "Blasphemy";
        }
        return cat;
      });
    }
    if (state.collapsedCategories) {
      state.collapsedCategories = state.collapsedCategories.map(cat => {
        if (cat === "Religious exclamations") {
          migrated = true;
          return "Blasphemy";
        }
        return cat;
      });
    }
    if (migrated) {
      saveState();
    }
    
    // Auto-migration: if any old blocklist items are plain strings, convert them to Custom objects
    if (state.blocklist && state.blocklist.length > 0 && typeof state.blocklist[0] === 'string') {
      // If the old blocklist exactly equals the old default strings, just nuke it and load the new default!
      const oldStrings = ["goddamn", "god damn", "jesus christ", "jesus", "christ", "damn", "hell", "fuck", "shit", "bitch", "asshole", "motherfucker", "bastard", "[ __ ]", "[__]"];
      const isExactlyOldDefault = state.blocklist.length === oldStrings.length && state.blocklist.every((v,i)=> v === oldStrings[i]);
      
      if (isExactlyOldDefault) {
        state.blocklist = [...DEFAULT_BLOCKLIST];
      } else {
        state.blocklist = state.blocklist.map(item => {
          return typeof item === 'string' ? { word: item, category: 'Custom' } : item;
        });
      }
      saveState();
    }
    
    // Ensure enabledCategories is initialized if missing
    if (!state.enabledCategories) {
      state.enabledCategories = ["Profanity", "Blasphemy", "Custom"];
    }

    if (!state.collapsedCategories) {
      state.collapsedCategories = [];
    }
    
    // Auto-migration to ensure new default words are in active blocklist
    if (state.blocklist && state.blocklist.length > 0) {
      const hasChrist = state.blocklist.some(item => {
        let word = typeof item === 'string' ? item : item.word;
        return word.toLowerCase() === 'christ';
      });
      if (!hasChrist) {
        state.blocklist.push({ word: "christ", category: "Blasphemy" });
        state.blocklist.push({ word: "christ's", category: "Blasphemy" });
      }
      
      const hasAss = state.blocklist.some(item => {
        let word = typeof item === 'string' ? item : item.word;
        return word.toLowerCase() === 'ass';
      });
      if (!hasAss) {
        state.blocklist.push({ word: "ass", category: "Anatomical" });
      }
      
      const hasShitty = state.blocklist.some(item => {
        let word = typeof item === 'string' ? item : item.word;
        return word.toLowerCase() === 'shitty';
      });
      if (!hasShitty) {
        state.blocklist.push({ word: "shitty", category: "Scatological" });
      }
      
      if (!hasChrist || !hasAss || !hasShitty) {
        saveState();
      }
    }
    
    renderPlatformPills();
    updateUI();
    setupAvatarUploadListeners();
    calculateCategoryCounts(""); // Initial render with 0 counts
    updateImpactHud();
    loadScript(); // Pre-fetch script immediately so it's ready!
    if (muteAggressivenessSlider) {
      muteAggressivenessSlider.value = state.muteAggressiveness || 2;
    }
    updateAggressivenessLabels();
  });

  function refreshActiveTabDetails() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
      currentScriptData = [];
      calculateCategoryCounts("");
      updateImpactHud();
      loadScript();
      
      const url = tabs[0].url || "";
      updateSelectedPlatformPill(url);
      
      // Update body background to emulate the brand theme!
      const fallback = getPlatformFallbackBanner(url);
      if (fallback) {
        document.body.style.setProperty('--bg-center', fallback.centerBg);
        document.body.style.setProperty('--bg-edge', fallback.edgeBg);
      } else {
        document.body.style.setProperty('--bg-center', '#133a46');
        document.body.style.setProperty('--bg-edge', '#0a1114');
      }

      const pageTitle = tabs[0].title || "";
      const domainTitle = document.querySelector('.domain-info h2');
      const domainIconContainer = document.getElementById('domainIconContainer');
      
      // Clean up the title to remove the generic site name suffixes
      let cleanTitle = pageTitle.replace(/ - YouTube/i, "").replace(/ \| Disney\+/i, "").replace(/ \| Hulu/i, "").replace(/ \| Watching/i, "").replace(/Hulu \| /i, "").replace(/^Watching /i, "").replace(/ - Plex/i, "").replace(/ \| Plex/i, "").replace(/ - Spotify/i, "").replace(/ \| Spotify/i, "").replace(/ \| Stream on Fandango \(Vudu\)/i, "").replace(/ \| Fandango at Home/i, "").replace(/ - Fandango at Home/i, "").replace(/^Watch /i, "");
      // Truncate if it's crazy long so it doesn't break the UI
      if (cleanTitle.length > 50) {
        cleanTitle = cleanTitle.substring(0, 47) + "...";
      }
      if (!url.includes("youtube.com")) {
        scriptTabBtn.style.display = "none";
        if (currentView === 'script') {
           toggleSection('list');
        }
      } else {
        scriptTabBtn.style.display = "";
      }
      
      if (url.includes("youtube.com")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon youtube";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_youtube.svg";
        domainSubtitle.innerHTML = cleanTitle || "YouTube";
        document.querySelector('.domain-info').title = pageTitle || "YouTube";
        
        // Extract directly from URL (works even if content script is disconnected)
        try {
          const urlObj = new URL(url);
          const videoId = urlObj.searchParams.get('v');
          if (videoId) {
            renderThumbnail(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
            return; // Skip sendMessage
          }
        } catch (e) {}
      } else if (url.includes("disneyplus.com")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon disneyplus";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_disney_plus.svg";
        domainSubtitle.innerHTML = cleanTitle || "Disney+";
        document.querySelector('.domain-info').title = pageTitle || "Disney+";
        
        // Nuke from orbit: Just take a literal screenshot of the tab!
        // This bypasses ALL of Disney's DOM obfuscation, canvas hiding, and CSS tricks.
        captureTabAndRender(tabs[0], url);
        return; // Skip the default fallback
      } else if (url.includes("hulu.com")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon hulu";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_hulu.svg";
        domainSubtitle.innerHTML = cleanTitle || "Hulu";
        document.querySelector('.domain-info').title = pageTitle || "Hulu";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (url.includes("plex.tv") || url.includes("plex.direct") || url.includes(":32400")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon plex";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_plex.svg";
        domainSubtitle.innerHTML = cleanTitle || "Plex";
        document.querySelector('.domain-info').title = pageTitle || "Plex";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (url.includes("fandango.com") || url.includes("vudu.com")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon fandango";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_fandango.svg";
        domainSubtitle.innerHTML = cleanTitle || "Fandango at Home";
        document.querySelector('.domain-info').title = pageTitle || "Fandango at Home";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (url.includes("netflix.com")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon netflix";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_netflix.svg";
        domainSubtitle.innerHTML = cleanTitle || "Netflix";
        document.querySelector('.domain-info').title = pageTitle || "Netflix";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (url.includes("primevideo.com") || (url.includes("amazon.") && (url.includes("/gp/video") || url.includes("/v/") || url.includes("/dp/")))) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon prime-video";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_prime_video.svg";
        domainSubtitle.innerHTML = cleanTitle || "Prime Video";
        document.querySelector('.domain-info').title = pageTitle || "Prime Video";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (url.includes("spotify.com")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon spotify";
        domainTitle.innerHTML = "Filtering";
        domainIcon.src = "images/ic_spotify.svg";
        domainSubtitle.innerHTML = cleanTitle || "Spotify";
        document.querySelector('.domain-info').title = pageTitle || "Spotify";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (isXDomain(url)) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon x";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_x.svg";
        domainSubtitle.innerHTML = cleanTitle || "X (Twitter)";
        document.querySelector('.domain-info').title = pageTitle || "X (Twitter)";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon facebook";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_facebook.svg";
        domainSubtitle.innerHTML = cleanTitle || "Facebook";
        document.querySelector('.domain-info').title = pageTitle || "Facebook";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (url.includes("paramountplus.com")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon paramount";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_paramount.svg";
        domainSubtitle.innerHTML = cleanTitle || "Paramount+";
        document.querySelector('.domain-info').title = pageTitle || "Paramount+";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else if (url.includes("max.com") || url.includes("hbomax.com")) {
        domainIconContainer.style.display = "flex";
        domainIconContainer.className = "domain-icon max";
        domainTitle.innerHTML = "Censoring";
        domainIcon.src = "images/ic_max.svg";
        domainSubtitle.innerHTML = cleanTitle || "Max";
        document.querySelector('.domain-info').title = pageTitle || "Max";
        
        captureTabAndRender(tabs[0], url);
        return;
      } else {
        // Zero state
        domainIconContainer.style.display = "none";
        domainIconContainer.className = "domain-icon";
        domainTitle.innerHTML = "Nothing to censor";
        const fullZeroStateText = "Play YouTube, Disney+, Hulu, Netflix, Prime Video, Plex, Fandango, Spotify, X, Facebook, Max, or Paramount+ to censor";
        domainSubtitle.innerHTML = fullZeroStateText;
        const domainInfo = document.querySelector('.domain-info');
        if (domainInfo) {
          domainInfo.title = fullZeroStateText;
        }
        handleZeroStateBanner();
        return;
      }
      
      // Fallback for any other scenario on supported domains
      fallbackContentScriptThumbnail(tabs[0].id, url);
    } else {
      // Not in a valid tab context (zero state)
      const domainTitle = document.querySelector('.domain-info h2');
      const domainIconContainer = document.getElementById('domainIconContainer');
      if (domainTitle) domainTitle.innerHTML = "Nothing to censor";
      if (domainIconContainer) {
         domainIconContainer.style.display = "none";
         domainIconContainer.className = "domain-icon";
      }
      const fullZeroStateText = "Play YouTube, Disney+, Hulu, Netflix, Prime Video, Plex, Fandango, Spotify, X, Facebook, Max, or Paramount+ to censor";
      domainSubtitle.innerHTML = fullZeroStateText;
      const domainInfo = document.querySelector('.domain-info');
      if (domainInfo) {
        domainInfo.title = fullZeroStateText;
      }
      handleZeroStateBanner();
    }
  });
}

// Initial active tab query on popup open
refreshActiveTabDetails();

// Dynamic update when switching browser tabs
let refreshActiveTabTimeout = null;
function debouncedRefreshActiveTabDetails() {
  if (refreshActiveTabTimeout) {
    clearTimeout(refreshActiveTabTimeout);
  }
  refreshActiveTabTimeout = setTimeout(() => {
    refreshActiveTabDetails();
  }, 250);
}

if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onActivated.addListener(() => {
    debouncedRefreshActiveTabDetails();
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && (changeInfo.status === "complete" || changeInfo.url)) {
      debouncedRefreshActiveTabDetails();
    }
  });
}

let lastCaptureTime = 0;
function captureTabAndRender(tab, url) {
  const now = Date.now();
  if (now - lastCaptureTime < 1000) {
    fallbackContentScriptThumbnail(tab.id, url);
    return;
  }
  lastCaptureTime = now;
  chrome.tabs.captureVisibleTab(tab.windowId, {format: 'jpeg', quality: 20}, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error("captureVisibleTab failed for", url, ":", chrome.runtime.lastError.message);
      fallbackContentScriptThumbnail(tab.id, url);
    } else if (dataUrl) {
      renderThumbnail(dataUrl);
    } else {
      fallbackContentScriptThumbnail(tab.id, url);
    }
  });
}


function getPlatformFallbackBanner(url) {
  if (url.includes("youtube.com")) {
    return {
      gradient: "linear-gradient(135deg, #141414 0%, #ff0000 100%)",
      logo: "images/ic_youtube.svg",
      centerBg: "rgb(51, 0, 0)", edgeBg: "rgb(15, 0, 0)"
    };
  } else if (url.includes("disneyplus.com")) {
    return {
      gradient: "linear-gradient(135deg, #020b1e 0%, #0063e5 100%)",
      logo: "images/ic_disney_plus.svg",
      centerBg: "rgb(0, 30, 70)", edgeBg: "rgb(0, 10, 25)"
    };
  } else if (url.includes("hulu.com")) {
    return {
      gradient: "linear-gradient(135deg, #0b0c0e 0%, #1ce783 100%)",
      logo: "images/ic_hulu.svg",
      centerBg: "rgb(10, 45, 25)", edgeBg: "rgb(5, 15, 10)"
    };
  } else if (url.includes("netflix.com")) {
    return {
      gradient: "linear-gradient(135deg, #141414 0%, #e50914 100%)",
      logo: "images/ic_netflix.svg",
      centerBg: "rgb(45, 5, 5)", edgeBg: "rgb(15, 2, 2)"
    };
  } else if (url.includes("max.com") || url.includes("hbomax.com")) {
    return {
      gradient: "linear-gradient(135deg, #001e62 0%, #0056f3 100%)",
      logo: "images/ic_max.svg",
      centerBg: "rgb(0, 25, 75)", edgeBg: "rgb(0, 8, 25)"
    };
  } else if (url.includes("paramountplus.com")) {
    return {
      gradient: "linear-gradient(135deg, #000c1f 0%, #0064ff 100%)",
      logo: "images/ic_paramount.svg",
      centerBg: "rgb(0, 30, 80)", edgeBg: "rgb(0, 10, 30)"
    };
  } else if (url.includes("spotify.com")) {
    return {
      gradient: "linear-gradient(135deg, #121212 0%, #1db954 100%)",
      logo: "images/ic_spotify.svg",
      centerBg: "rgb(10, 50, 25)", edgeBg: "rgb(5, 20, 10)"
    };
  } else if (isXDomain(url)) {
    return {
      gradient: "linear-gradient(135deg, #000000 0%, #15202b 100%)",
      logo: "images/ic_x.svg",
      centerBg: "rgb(20, 25, 30)", edgeBg: "rgb(5, 8, 10)"
    };
  } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return {
      gradient: "linear-gradient(135deg, #1877f2 0%, #3b5998 100%)",
      logo: "images/ic_facebook.svg",
      centerBg: "rgb(20, 45, 90)", edgeBg: "rgb(8, 15, 35)"
    };
  } else if (url.includes("amazon.") || url.includes("primevideo.com")) {
    return {
      gradient: "linear-gradient(135deg, #0f172a 0%, #00a8e1 100%)",
      logo: "images/ic_prime_video.svg",
      centerBg: "rgb(10, 45, 75)", edgeBg: "rgb(5, 15, 25)"
    };
  } else if (url.includes("plex.tv") || url.includes("plex.direct") || url.includes(":32400")) {
    return {
      gradient: "linear-gradient(135deg, #1f2326 0%, #e5a93b 100%)",
      logo: "images/ic_plex.svg",
      centerBg: "rgb(45, 35, 15)", edgeBg: "rgb(15, 10, 5)"
    };
  } else if (url.includes("fandango.com") || url.includes("vudu.com")) {
    return {
      gradient: "linear-gradient(135deg, #1f2022 0%, #ff5a00 100%)",
      logo: "images/ic_fandango.svg",
      centerBg: "rgb(55, 20, 5)", edgeBg: "rgb(15, 5, 2)"
    };
  }
  return null;
}

function showActivePlatformBanner() {
  promoVideo.style.display = "none";
  promoVideo.pause();
  
  if (currentPlatformThumbnail && currentPlatformThumbnail !== "fallback") {
    videoBanner.classList.add("has-thumbnail");
    videoBanner.classList.remove("banner-collapsed");
    videoBanner.style.background = "";
    videoBanner.style.backgroundSize = "cover";
    videoBanner.style.backgroundPosition = "center";
    videoBanner.style.backgroundRepeat = "no-repeat";
    videoBanner.style.backgroundImage = `url('${currentPlatformThumbnail}')`;
  } else {
    videoBanner.classList.remove("has-thumbnail");
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const url = (tabs && tabs[0]) ? (tabs[0].url || "") : "";
      const fallback = getPlatformFallbackBanner(url);
      if (fallback) {
        videoBanner.classList.remove("banner-collapsed");
        videoBanner.style.background = "";
        videoBanner.style.backgroundSize = "120px 48px, cover";
        videoBanner.style.backgroundPosition = "center, center";
        videoBanner.style.backgroundRepeat = "no-repeat, no-repeat";
        videoBanner.style.backgroundImage = `url('${fallback.logo}'), ${fallback.gradient}`;
        
        document.body.style.setProperty('--bg-center', fallback.centerBg);
        document.body.style.setProperty('--bg-edge', fallback.edgeBg);
      } else {
        handleZeroStateBanner();
      }
    });
  }
}

function renderBrandFallback(url) {
  currentPlatformThumbnail = "fallback";
  showActivePlatformBanner();
}

function fallbackContentScriptThumbnail(tabId, url) {
  chrome.tabs.sendMessage(tabId, {action: "GET_THUMBNAIL"}, (response) => {
    if (chrome.runtime.lastError || !response || !response.thumbnail) {
      renderBrandFallback(url);
      return;
    }
    renderThumbnail(response.thumbnail);
  });
}



function renderThumbnail(thumbnailUrl) {
  currentPlatformThumbnail = thumbnailUrl;
  showActivePlatformBanner();
}

function handleZeroStateBanner() {
  chrome.storage.local.get("lastVideoPlayTime", (res) => {
    const lastPlayed = res.lastVideoPlayTime || 0;
    const now = Date.now();
    const COOLDOWN_MS = 24 * 60 * 60 * 1000;
    
    if (now - lastPlayed < COOLDOWN_MS) {
      videoBanner.classList.remove("has-thumbnail");
      videoBanner.classList.add("banner-collapsed");
    } else {
      videoBanner.classList.remove("has-thumbnail");
      videoBanner.classList.remove("banner-collapsed");
      videoBanner.style.background = "";
      videoBanner.style.backgroundSize = "";
      videoBanner.style.backgroundPosition = "";
      videoBanner.style.backgroundRepeat = "";
      videoBanner.style.backgroundImage = "none";
      promoVideo.style.display = "block";
      promoVideo.play().catch(e => {
        videoBanner.classList.add("banner-collapsed");
      });
      promoVideo.onended = () => {
        chrome.storage.local.set({ lastVideoPlayTime: Date.now() });
        videoBanner.classList.add("banner-collapsed");
      };
    }
  });
}

// --- SCRIPT VIEWER LOGIC ---



function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function loadScript() {
  const scriptContent = document.getElementById("scriptContent");
  scriptContent.innerHTML = "<div style='padding: 20px; color: #888;'>Loading script...</div>";
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs || !tabs[0]) return;
    
    // Check if on Disney+ or Hulu (DRM chunked streaming prevents ahead-of-time extraction)
    if (tabs[0].url && (
      tabs[0].url.includes("paramountplus.com") || 
      tabs[0].url.includes("max.com") || 
      tabs[0].url.includes("hbomax.com") || 
      tabs[0].url.includes("disneyplus.com") || 
      tabs[0].url.includes("hulu.com") || 
      tabs[0].url.includes("plex.tv") || 
      tabs[0].url.includes("plex.direct") || 
      tabs[0].url.includes(":32400") || 
      tabs[0].url.includes("fandango.com") || 
      tabs[0].url.includes("vudu.com") || 
      tabs[0].url.includes("netflix.com") ||
      tabs[0].url.includes("primevideo.com") ||
      (tabs[0].url.includes("amazon.") && (tabs[0].url.includes("/gp/video") || tabs[0].url.includes("/v/") || tabs[0].url.includes("/dp/")))
    )) {
       let platformName = "Disney+";
       if (tabs[0].url.includes("paramountplus.com")) platformName = "Paramount+";
       else if (tabs[0].url.includes("max.com") || tabs[0].url.includes("hbomax.com")) platformName = "Max";
       else if (tabs[0].url.includes("hulu.com")) platformName = "Hulu";
       else if (tabs[0].url.includes("plex.tv") || tabs[0].url.includes("plex.direct") || tabs[0].url.includes(":32400")) platformName = "Plex";
       else if (tabs[0].url.includes("fandango.com") || tabs[0].url.includes("vudu.com")) platformName = "Fandango at Home";
       else if (tabs[0].url.includes("netflix.com")) platformName = "Netflix";
       else if (tabs[0].url.includes("primevideo.com") || tabs[0].url.includes("amazon.")) platformName = "Prime Video";
       scriptContent.innerHTML = `<div style='padding: 20px; color: #888;'>Dynamic script extraction is unavailable for ${platformName} due to DRM encryption and chunked streaming.</div>`;
       return;
    }
    
    // Only proceed if we are actually on YouTube
    if (!tabs[0].url || !tabs[0].url.includes("youtube.com")) {
       scriptContent.innerHTML = "<div style='padding: 20px; color: #888;'>Script unavailable for this platform.</div>";
       return;
    }
    

    
    chrome.tabs.sendMessage(tabs[0].id, { action: "REQUEST_CAPTIONS" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.payloads || response.payloads.length === 0) {
        console.log("🤬 [Censor] Content script unavailable or missing captions. Showing reload prompt.");
        scriptContent.innerHTML = `
          <div style='padding: 30px 20px; text-align: center; color: #888;'>
            <div style='margin-bottom: 16px; font-size: 14px;'>We need a quick page refresh to load the video's script!</div>
            <button id="reloadTabBtn" class="primary-btn">
              Reload video tab
            </button>
          </div>
        `;
        
        document.getElementById("reloadTabBtn").addEventListener("click", () => {
           chrome.tabs.reload(tabs[0].id);
        });
        
        // Auto-scroll to the bottom so the reload message isn't hidden below the fold
        if (currentView === 'script') {
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }, 10);
        }
        
        return;
      }
      
      renderScript(response.payloads);
    });
  });
}

function renderScript(payloads) {
  const scriptContent = document.getElementById("scriptContent");
  scriptContent.innerHTML = "";
  currentScriptData = [];
  
  payloads.forEach(data => {
    if (!data || !data.payload || !data.payload.events) return;
    data.payload.events.forEach(ev => {
      if (ev.segs && ev.tStartMs !== undefined) {
        const text = ev.segs.map(seg => seg.utf8 || '').join('').trim();
        if (text) {
          currentScriptData.push({
            timeMs: ev.tStartMs,
            timeFormatted: formatTime(ev.tStartMs),
            text: text
          });
        }
      }
    });
  });
  
  // Sort by time just in case payloads arrived out of order
  currentScriptData.sort((a, b) => a.timeMs - b.timeMs);
  
  if (currentScriptData.length === 0) {
     scriptContent.innerHTML = "<div style='padding: 20px; color: #888;'>No spoken words detected.</div>";
     return;
  }
  
  currentScriptData.forEach((line, index) => {
    const lineDiv = document.createElement("div");
    lineDiv.className = "script-line";
    lineDiv.dataset.index = index;
    
    const timeDiv = document.createElement("div");
    timeDiv.className = "script-timestamp";
    timeDiv.textContent = line.timeFormatted;
    
    const textDiv = document.createElement("div");
    textDiv.className = "script-text";
    textDiv.textContent = line.text; // raw text for now
    
    lineDiv.appendChild(timeDiv);
    lineDiv.appendChild(textDiv);
    scriptContent.appendChild(lineDiv);
  });
  
  // Re-apply search if there is one
  const searchInput = document.getElementById("scriptSearchInput");
  
  // Calculate category hits now that we have the full script text!
  let fullScriptText = "";
  currentScriptData.forEach(line => { fullScriptText += line.text.toLowerCase() + " "; });
  calculateCategoryCounts(fullScriptText);
  if (searchInput.value.trim() !== "") {
    performSearch(searchInput.value.trim());
  }
}

// Search Logic
const searchInput = document.getElementById("scriptSearchInput");
const searchCounter = document.getElementById("searchCounter");
const searchClearBtn = document.getElementById("scriptSearchClearBtn");
const searchUpBtn = document.getElementById("scriptSearchUpBtn");
const searchDownBtn = document.getElementById("scriptSearchDownBtn");

searchInput.addEventListener("input", (e) => {
  performSearch(e.target.value.trim());
});

searchClearBtn.addEventListener("click", () => {
  searchInput.value = "";
  performSearch("");
});

searchUpBtn.addEventListener("click", () => {
  if (currentSearchMatches.length > 0) {
    currentMatchIndex = (currentMatchIndex - 1 + currentSearchMatches.length) % currentSearchMatches.length;
    scrollToMatch();
  }
});

searchDownBtn.addEventListener("click", () => {
  if (currentSearchMatches.length > 0) {
    currentMatchIndex = (currentMatchIndex + 1) % currentSearchMatches.length;
    scrollToMatch();
  }
});

function performSearch(query) {
  const scriptContent = document.getElementById("scriptContent");
  const lines = scriptContent.querySelectorAll(".script-line");
  
  currentSearchMatches = [];
  currentMatchIndex = -1;
  
  if (!query) {
    searchCounter.style.display = "none";
    lines.forEach(line => {
      line.style.display = "flex"; // show all
      const textDiv = line.querySelector(".script-text");
      // Reset text
      const idx = parseInt(line.dataset.index);
      if (currentScriptData[idx]) {
        textDiv.innerHTML = escapeHtml(currentScriptData[idx].text);
      }
    });
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  
  lines.forEach((line, index) => {
    const textData = currentScriptData[index].text;
    if (textData.toLowerCase().includes(lowerQuery)) {
      line.style.display = "flex";
      currentSearchMatches.push(line);
      
      // Highlight logic
      const textDiv = line.querySelector(".script-text");
      const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
      textDiv.innerHTML = escapeHtml(textData).replace(regex, '<span class="highlight">$1</span>');
    } else {
      line.style.display = "none";
    }
  });
  
  if (currentSearchMatches.length > 0) {
    searchCounter.style.display = "inline-block";
    currentMatchIndex = 0;
    scrollToMatch();
  } else {
    searchCounter.style.display = "inline-block";
    searchCounter.textContent = "0/0";
  }
}

function scrollToMatch() {
  if (currentMatchIndex < 0 || currentMatchIndex >= currentSearchMatches.length) return;
  
  searchCounter.textContent = `${currentMatchIndex + 1}/${currentSearchMatches.length}`;
  
  // Remove active-match class from all
  currentSearchMatches.forEach(line => line.classList.remove("active-match"));
  
  // Add active-match to current
  const activeLine = currentSearchMatches[currentMatchIndex];
  activeLine.classList.add("active-match");
  
  // Scroll into view
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "BOOTUBE_NEW_CAPTIONS") {
    renderScript(msg.payloads);
  }
});

function toggleSection(sectionName) {
  // Reset all button styles
  listTabBtn.classList.remove('active-btn');
  scriptTabBtn.classList.remove('active-btn');
  advancedBtn.classList.remove('active-btn');

  // Switch active tab
  currentView = sectionName;
  
  if (currentView === 'list') {
    listTabBtn.classList.add('active-btn');
    updateTitleWithAnimation("Censored words");
    wordCount.style.display = "";
  } else if (currentView === 'script') {
    scriptTabBtn.classList.add('active-btn');
    updateTitleWithAnimation("Video script");
    wordCount.style.display = "none";
    loadScript();
  } else if (currentView === 'advanced') {
    advancedBtn.classList.add('active-btn');
    updateTitleWithAnimation("Advanced settings");
    wordCount.style.display = "none";
  }
  
  updateUI();
}

listTabBtn.addEventListener("click", () => toggleSection('list'));
scriptTabBtn.addEventListener("click", () => toggleSection('script'));
advancedBtn.addEventListener("click", () => toggleSection('advanced'));

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.supabaseSession || changes.subscriptionStatus || changes.lastSyncOrigin || changes.blocklist || changes.censorHistoryLog || changes.sessionMutedCount || changes.sessionLockedCount) {
      chrome.storage.local.get(['supabaseSession', 'subscriptionStatus', 'lastSyncOrigin', 'blocklist', 'blurEnabled', 'muteAggressiveness', 'enabledCategories'], (res) => {
        Object.assign(state, res);
        updateUI();
        updateImpactHud();
      });
    }
  }
});

});

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

let toastTimeout = null;
function showToast(message, isUpgradeToast = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  
  if (isUpgradeToast) {
    toast.innerHTML = `
      <div class="upgrade-toast-card">
        <div class="upgrade-toast-content">
          <span class="upgrade-toast-close" id="upgradeToastClose">&times;</span>
          <img src="images/ic_boo_crown.png" class="upgrade-toast-image" alt="Boo Premium">
          <div class="upgrade-toast-title">BooTube Premium</div>
          <div class="upgrade-toast-msg">${message}</div>
          <button class="upgrade-toast-btn" id="upgradeToastAction">Upgrade to Premium</button>
        </div>
      </div>
    `;
    toast.className = "toast upgrade-toast show";
    
    const closeBtn = document.getElementById("upgradeToastClose");
    const actionBtn = document.getElementById("upgradeToastAction");
    
    const dismissHandler = (e) => {
      e.stopPropagation();
      toast.className = "toast";
    };
    
    if (closeBtn) {
      closeBtn.onclick = dismissHandler;
    }
    if (actionBtn) {
      actionBtn.onclick = (e) => {
        e.stopPropagation();
        toast.className = "toast";
        openAccountPanel();
      };
    }
    
    toast.onclick = dismissHandler;
    
    const cardEl = toast.querySelector(".upgrade-toast-card");
    if (cardEl) {
      cardEl.onclick = (e) => {
        e.stopPropagation();
      };
    }

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
  } else {
    toast.innerHTML = "";
    toast.textContent = message;
    toast.className = "toast show";
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toastTimeout = setTimeout(() => {
      toast.className = "toast";
    }, 3000);
  }
}

function showAuthModal() {
  const toast = document.getElementById("toast");
  if (!toast) return;
  
  toast.innerHTML = `
    <div class="auth-modal-card">
      <div class="auth-modal-content">
        <span class="auth-modal-close" id="authModalClose">&times;</span>
        <img src="images/ic_boo_halo.png" class="auth-modal-image" alt="BooTube Auth">
        <div class="auth-modal-title" id="authModalTitle">Sign In</div>
        <div class="auth-modal-subtitle" id="authModalSubtitle">Sign in to your BooTube account to synchronize settings and filters.</div>
        
        <div class="auth-modal-form" id="authLoginForm">
          <input type="email" id="authEmail" class="auth-modal-input" placeholder="Email Address" required>
          <div class="password-container" style="position:relative; width:100%;">
            <input type="password" id="authPassword" class="auth-modal-input" placeholder="Password" style="padding-right: 36px;" required>
            <span id="togglePasswordBtn" class="material-icons" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); cursor:pointer; color:#a0aec0; font-size:16px; user-select:none;">visibility</span>
          </div>
          <div id="authErrorMsg" class="auth-modal-error" style="display:none;"></div>
          <button class="auth-modal-btn" id="authLoginBtn">Log In to App</button>
        </div>
        
        <div class="auth-modal-form" id="authResetForm" style="display:none;">
          <input type="email" id="authResetEmail" class="auth-modal-input" placeholder="Email Address" required>
          <div id="authResetErrorMsg" class="auth-modal-error" style="display:none;"></div>
          <div id="authResetSuccessMsg" class="auth-modal-success" style="display:none;"></div>
          <button class="auth-modal-btn" id="authSendResetBtn">Send Reset Link</button>
        </div>
        
        <div class="auth-modal-footer">
          <a href="#" class="auth-modal-link" id="authResetLink">Forgot Password?</a>
          <a href="#" class="auth-modal-link" id="authBackToLoginLink" style="display:none;">Back to Login</a>
          <span class="auth-modal-divider">|</span>
          <a href="#" class="auth-modal-link" id="authWebLoginBtn">Sign in via Website</a>
        </div>
      </div>
    </div>
  `;
  toast.className = "toast auth-modal show";
  
  const closeBtn = document.getElementById("authModalClose");
  const loginBtn = document.getElementById("authLoginBtn");
  const sendResetBtn = document.getElementById("authSendResetBtn");
  const resetLink = document.getElementById("authResetLink");
  const backToLoginLink = document.getElementById("authBackToLoginLink");
  const webLoginBtn = document.getElementById("authWebLoginBtn");
  
  const loginForm = document.getElementById("authLoginForm");
  const resetForm = document.getElementById("authResetForm");
  const modalTitle = document.getElementById("authModalTitle");
  const modalSubtitle = document.getElementById("authModalSubtitle");
  
  const errorMsg = document.getElementById("authErrorMsg");
  const resetErrorMsg = document.getElementById("authResetErrorMsg");
  const resetSuccessMsg = document.getElementById("authResetSuccessMsg");
  
  const dismissHandler = (e) => {
    e.stopPropagation();
    toast.className = "toast";
  };
  
  if (closeBtn) closeBtn.onclick = dismissHandler;
  toast.onclick = dismissHandler;
  
  const cardEl = toast.querySelector(".auth-modal-card");
  if (cardEl) {
    cardEl.onclick = (e) => {
      e.stopPropagation();
    };
  }
  
  if (resetLink) {
    resetLink.onclick = (e) => {
      e.preventDefault();
      loginForm.style.display = "none";
      resetForm.style.display = "block";
      resetLink.style.display = "none";
      backToLoginLink.style.display = "inline";
      modalTitle.textContent = "Reset Password";
      modalSubtitle.textContent = "Enter your email address to receive a password reset link.";
    };
  }
  
  if (backToLoginLink) {
    backToLoginLink.onclick = (e) => {
      e.preventDefault();
      loginForm.style.display = "block";
      resetForm.style.display = "none";
      resetLink.style.display = "inline";
      backToLoginLink.style.display = "none";
      modalTitle.textContent = "Sign In";
      modalSubtitle.textContent = "Sign in to your BooTube account to synchronize settings and filters.";
    };
  }
  
  if (webLoginBtn) {
    webLoginBtn.onclick = (e) => {
      e.preventDefault();
      toast.className = "toast";
      chrome.storage.local.set({ userExplicitlySignedOut: false }, () => {
        chrome.tabs.create({ url: "https://bootube.app/login?clean=true" });
      });
    };
  }
  
  const validateEmail = (emailStr) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const emailInput = document.getElementById("authEmail");
  if (emailInput) {
    emailInput.addEventListener("mouseout", () => {
      const email = emailInput.value.trim();
      if (email && !validateEmail(email)) {
        errorMsg.textContent = "Please enter a valid email address.";
        errorMsg.style.display = "block";
      } else if (errorMsg.textContent === "Please enter a valid email address.") {
        errorMsg.style.display = "none";
      }
    });
  }

  const resetEmailInput = document.getElementById("authResetEmail");
  if (resetEmailInput) {
    resetEmailInput.addEventListener("mouseout", () => {
      const email = resetEmailInput.value.trim();
      if (email && !validateEmail(email)) {
        resetErrorMsg.textContent = "Please enter a valid email address.";
        resetErrorMsg.style.display = "block";
      } else if (resetErrorMsg.textContent === "Please enter a valid email address.") {
        resetErrorMsg.style.display = "none";
      }
    });
  }

  const togglePasswordBtn = document.getElementById("togglePasswordBtn");
  const authPasswordInput = document.getElementById("authPassword");
  if (togglePasswordBtn && authPasswordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      if (authPasswordInput.type === "password") {
        authPasswordInput.type = "text";
        togglePasswordBtn.textContent = "visibility_off";
      } else {
        authPasswordInput.type = "password";
        togglePasswordBtn.textContent = "visibility";
      }
    });
  }

  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      if (!email || !password) {
        errorMsg.textContent = "Please fill in all fields.";
        errorMsg.style.display = "block";
        return;
      }

      if (!validateEmail(email)) {
        errorMsg.textContent = "Please enter a valid email address.";
        errorMsg.style.display = "block";
        return;
      }
      
      loginBtn.disabled = true;
      loginBtn.textContent = "Signing In...";
      errorMsg.style.display = "none";
      
      chrome.tabs.query({}, async (tabs) => {
        let detectedOrigin = null;
        if (tabs && tabs.length > 0) {
          for (let tab of tabs) {
            if (tab.url) {
              try {
                const urlObj = new URL(tab.url);
                if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
                  detectedOrigin = `${urlObj.protocol}//${urlObj.host}`;
                  break;
                } else if (urlObj.hostname.includes("bootube.app")) {
                  detectedOrigin = `${urlObj.protocol}//${urlObj.host}`;
                }
              } catch (e) {}
            }
          }
        }
        
        let origin = detectedOrigin || state.lastSyncOrigin;
        if (!origin) {
          try {
            const pingRes = await fetch("http://localhost:3000/api/auth/login", { method: 'OPTIONS' }).catch(() => null);
            if (pingRes) {
              origin = "http://localhost:3000";
            }
          } catch (e) {}
        }
        if (!origin) {
          origin = 'https://bootube.app';
        }
        const baseOrigin = origin.replace(/\/$/, '');

        try {
          const response = await fetch(`${baseOrigin}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });
          
          let errorText = "Invalid email or password.";
          if (response.ok) {
            try {
              const data = await response.json();
              if (data && data.session) {
                const newSession = data.session;
                chrome.storage.local.set({
                  supabaseSession: newSession,
                  subscriptionStatus: newSession.user?.user_metadata?.subscription_status || 'free',
                  lastSyncOrigin: baseOrigin,
                  userExplicitlySignedOut: false
                }, () => {
                  toast.className = "toast";
                  chrome.runtime.sendMessage({ action: "FORCE_SYNC" });
                });
                return;
              } else {
                errorText = "Invalid session response from server.";
              }
            } catch (jsonErr) {
              errorText = "Failed to parse login session from server.";
            }
          } else {
            if (response.status === 404) {
              errorText = "Login endpoint not found (404). Ensure your local server is running or the backend is deployed.";
            } else if (response.status === 500) {
              errorText = "Internal Server Error (500). Please check your Next.js server console logs.";
            } else {
              try {
                const rawText = await response.text();
                if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
                  errorText = "Invalid email or password.";
                } else {
                  errorText = rawText || "Invalid email or password.";
                }
              } catch (textErr) {
                errorText = "Invalid email or password.";
              }
            }
          }
          throw new Error(errorText);
        } catch (err) {
          errorMsg.textContent = err.message || "Invalid email or password.";
          errorMsg.style.display = "block";
          loginBtn.disabled = false;
          loginBtn.textContent = "Log In to App";
        }
      });
    };
  }
  
  if (sendResetBtn) {
    sendResetBtn.onclick = async () => {
      const email = document.getElementById("authResetEmail").value.trim();
      if (!email) {
        resetErrorMsg.textContent = "Please enter your email.";
        resetErrorMsg.style.display = "block";
        return;
      }

      if (!validateEmail(email)) {
        resetErrorMsg.textContent = "Please enter a valid email address.";
        resetErrorMsg.style.display = "block";
        return;
      }
      
      sendResetBtn.disabled = true;
      sendResetBtn.textContent = "Sending...";
      resetErrorMsg.style.display = "none";
      resetSuccessMsg.style.display = "none";
      
      chrome.tabs.query({}, async (tabs) => {
        let detectedOrigin = null;
        if (tabs && tabs.length > 0) {
          for (let tab of tabs) {
            if (tab.url) {
              try {
                const urlObj = new URL(tab.url);
                if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
                  detectedOrigin = `${urlObj.protocol}//${urlObj.host}`;
                  break;
                } else if (urlObj.hostname.includes("bootube.app")) {
                  detectedOrigin = `${urlObj.protocol}//${urlObj.host}`;
                }
              } catch (e) {}
            }
          }
        }
        
        let origin = detectedOrigin || state.lastSyncOrigin;
        if (!origin) {
          try {
            const pingRes = await fetch("http://localhost:3000/api/auth/login", { method: 'OPTIONS' }).catch(() => null);
            if (pingRes) {
              origin = "http://localhost:3000";
            }
          } catch (e) {}
        }
        if (!origin) {
          origin = 'https://bootube.app';
        }
        const baseOrigin = origin.replace(/\/$/, '');

        try {
          const response = await fetch(`${baseOrigin}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
          });
          
          let errorText = "Failed to send reset link.";
          if (response.ok) {
            resetSuccessMsg.textContent = "Reset link sent! Please check your email inbox.";
            resetSuccessMsg.style.display = "block";
            document.getElementById("authResetEmail").value = "";
            return;
          } else {
            if (response.status === 404) {
              errorText = "Reset password endpoint not found (404). Ensure your local server is running or the backend is deployed.";
            } else if (response.status === 500) {
              errorText = "Internal Server Error (500). Please check your Next.js server console logs.";
            } else {
              try {
                const rawText = await response.text();
                if (rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html")) {
                  errorText = "Failed to send reset link.";
                } else {
                  errorText = rawText || "Failed to send reset link.";
                }
              } catch (textErr) {
                errorText = "Failed to send reset link.";
              }
            }
          }
          throw new Error(errorText);
        } catch (err) {
          resetErrorMsg.textContent = err.message || "Failed to send reset link.";
          resetErrorMsg.style.display = "block";
        } finally {
          sendResetBtn.disabled = false;
          sendResetBtn.textContent = "Send Reset Link";
        }
      });
    };
  }
  
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
}

// Custom Account Avatar Image Upload Setup
function setupAvatarUploadListeners() {
  const avatarUploadBtn = document.getElementById("avatarUploadBtn");
  const customAvatarInput = document.getElementById("customAvatarInput");
  const dropAvatarCircle = document.getElementById("dropAvatarCircle");
  const resetAvatarBtn = document.getElementById("resetAvatarBtn");

  if (!customAvatarInput) return;

  const processAndSaveAvatar = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to crop and compress to a clean square 128x128 image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const targetSize = 128;
        canvas.width = targetSize;
        canvas.height = targetSize;

        // Calculate center square crop
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        // Convert canvas to lightweight WebP data URL
        const dataUrl = canvas.toDataURL("image/webp", 0.88);
        state.customAvatarDataUrl = dataUrl;
        saveState();
        updateUI();

        // Optional Supabase user metadata update if session active
        if (state.supabaseSession && window.supabaseClient) {
          try {
            window.supabaseClient.auth.updateUser({
              data: { avatar_url: dataUrl }
            }).catch(err => console.log("Supabase avatar sync error:", err));
          } catch(e) {}
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  if (avatarUploadBtn) {
    avatarUploadBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      customAvatarInput.click();
    };
  }

  if (dropAvatarCircle) {
    dropAvatarCircle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      customAvatarInput.click();
    };
  }

  customAvatarInput.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      processAndSaveAvatar(file);
    }
    customAvatarInput.value = "";
  };

  if (resetAvatarBtn) {
    resetAvatarBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.customAvatarDataUrl = null;
      saveState();
      updateUI();
      if (state.supabaseSession && window.supabaseClient) {
        try {
          window.supabaseClient.auth.updateUser({
            data: { avatar_url: null }
          }).catch(err => console.log("Supabase avatar reset error:", err));
        } catch(e) {}
      }
    };
  }
}
