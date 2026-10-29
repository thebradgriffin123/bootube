const DEFAULT_BLOCKLIST = [
  // Profanity
  { word: "damn", category: "Profanity" },
  { word: "bitch", category: "Profanity" },
  { word: "hell", category: "Profanity" },
  { word: "bastard", category: "Profanity" },
  { word: "badass", category: "Profanity" },
  
  // Bleeps & Symbols
  { word: "****", category: "Bleeps & Symbols" },
  { word: "***", category: "Bleeps & Symbols" },
  { word: "[ __ ]", category: "Bleeps & Symbols" },
  { word: "[__]", category: "Bleeps & Symbols" },
  
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
  { word: "goddamn", category: "Blasphemy" },
  
  // Scatological
  { word: "shit", category: "Scatological" },
  { word: "bullshit", category: "Scatological" },
  { word: "crap", category: "Scatological" },
  { word: "piss", category: "Scatological" },
  { word: "turd", category: "Scatological" },
  { word: "shitty", category: "Scatological" },
  { word: "shithole", category: "Scatological" },
  { word: "shitstorm", category: "Scatological" },
  
  // Anatomical
  { word: "ass", category: "Anatomical" },
  { word: "asshole", category: "Anatomical" },
  { word: "cunt", category: "Anatomical" },
  { word: "dick", category: "Anatomical" },
  { word: "dick head", category: "Anatomical" },
  { word: "penis", category: "Anatomical" },
  { word: "vagina", category: "Anatomical" },
  { word: "pussy", category: "Anatomical" },
  
  // Sexual
  { word: "fuck", category: "Sexual" },
  { word: "fucker", category: "Sexual" },
  { word: "fucking", category: "Sexual" },
  { word: "fucked", category: "Sexual" },
  { word: "motherfucker", category: "Sexual" },
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

// Configure the side panel to open when clicking the extension action icon
if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("🤬 [Background] Side Panel setPanelBehavior error:", error));
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({
      bootubeEnabled: true,
      hideCCEnabled: true,
      blurEnabled: true,
      respectfulModeEnabled: true,
      blocklist: DEFAULT_BLOCKLIST,
      disabledWords: [],
      whitelistedChannels: [],
      enabledCategories: ["Profanity", "Blasphemy", "Sexual", "Scatological", "Anatomical", "Derogatory", "Bleeps & Symbols", "Custom"],
      subscriptionStatus: "active"
    });
  } else {
    // Migration for existing users: clean duplicates, add Bleeps & Symbols
    chrome.storage.local.get(['blocklist', 'enabledCategories'], (res) => {
      if (res && res.blocklist && Array.isArray(res.blocklist)) {
        let needsUpdate = false;
        let list = res.blocklist.map(item => {
          if (typeof item === 'object' && item.word) {
            const w = item.word.trim();
            if (w === '****' || w === '***' || w === '[ __ ]' || w === '[__]') {
              if (item.category !== 'Bleeps & Symbols') {
                needsUpdate = true;
                return { word: w, category: 'Bleeps & Symbols' };
              }
            }
          }
          return item;
        });
        const duplicateProfanities = ['shit', 'fuck', 'asshole', 'motherfucker'];
        const initialLen = list.length;
        list = list.filter(item => {
          if (typeof item === 'object' && item.word && item.category === 'Profanity') {
            if (duplicateProfanities.includes(item.word.toLowerCase().trim())) {
              return false;
            }
          }
          return true;
        });
        if (list.length !== initialLen) needsUpdate = true;

        let cats = Array.isArray(res.enabledCategories) ? [...res.enabledCategories] : ["Profanity", "Blasphemy", "Sexual", "Scatological", "Anatomical", "Derogatory", "Bleeps & Symbols", "Custom"];
        if (!cats.includes("Bleeps & Symbols")) {
          cats.push("Bleeps & Symbols");
          needsUpdate = true;
        }

        if (needsUpdate) {
          chrome.storage.local.set({ blocklist: list, enabledCategories: cats });
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openSettings") {
    const windowId = sender.tab ? sender.tab.windowId : undefined;
    const tabId = sender.tab ? sender.tab.id : undefined;

    if (typeof chrome !== 'undefined' && chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
      if (windowId) {
        chrome.sidePanel.open({ windowId }).catch((error) => {
          console.error("🤬 [Background] Side Panel open window error:", error);
          chrome.windows.create({ 
            url: chrome.runtime.getURL("popup.html"),
            type: "popup",
            width: 380,
            height: 640,
            focused: true
          });
        });
      } else if (tabId) {
        chrome.sidePanel.open({ tabId }).catch((error) => {
          chrome.windows.create({ 
            url: chrome.runtime.getURL("popup.html"),
            type: "popup",
            width: 380,
            height: 640,
            focused: true
          });
        });
      } else {
        chrome.windows.create({ 
          url: chrome.runtime.getURL("popup.html"),
          type: "popup",
          width: 380,
          height: 640,
          focused: true
        });
      }
    } else {
      chrome.windows.create({ 
        url: chrome.runtime.getURL("popup.html"),
        type: "popup",
        width: 380,
        height: 640,
        focused: true
      });
    }
  } else if (request.action === "SAVE_SUPABASE_SESSION") {
    // Read session to see if it changed, but ignore if the user explicitly signed out in the extension
    chrome.storage.local.get(['supabaseSession', 'userExplicitlySignedOut', 'signedOutAccessToken'], (res) => {
      const newSession = request.session;
      const newAccessToken = newSession ? newSession.access_token : null;

      if (res.userExplicitlySignedOut) {
        if (!res.signedOutAccessToken || (newAccessToken && newAccessToken === res.signedOutAccessToken)) {
          console.log("☁️ [Background] Ignored SAVE_SUPABASE_SESSION because user explicitly signed out in the extension.");
          return;
        }
      }

      const existing = res.supabaseSession;
      
      // Determine the origin from the sender tab URL
      let origin = 'https://bootube.app';
      if (sender.tab && sender.tab.url) {
        try {
          origin = new URL(sender.tab.url).origin;
        } catch (e) {
          // Ignore URL parsing errors
        }
      }
      
      // If no existing session, or token is different, save and trigger sync
      if (!existing || existing.access_token !== newSession.access_token) {
        chrome.storage.local.get(['subscriptionStatus'], (subRes) => {
          const preservedStatus = subRes.subscriptionStatus || 'active';
          chrome.storage.local.set({ 
            supabaseSession: newSession,
            subscriptionStatus: preservedStatus,
            lastSyncOrigin: origin,
            userExplicitlySignedOut: false,
            signedOutAccessToken: null
          }, () => {
            console.log("☁️ [Background] Saved Supabase Session. Launching sync from origin:", origin);
            syncCloudSettings(newSession.access_token, origin);
          });
        });
      }
    });
  } else if (request.action === "CLEAR_SUPABASE_SESSION") {
    try {
      chrome.tabs.query({ url: ["*://bootube.app/*", "*://*.bootube.app/*"] }, (tabs) => {
        if (chrome.runtime.lastError) {}
        if (tabs && tabs.length > 0) {
          tabs.forEach(tab => {
            try {
              chrome.tabs.sendMessage(tab.id, { action: "LOGOUT_FROM_WEBSITE" }, () => {
                if (chrome.runtime.lastError) {}
              });
            } catch(e) {}
          });
        }
      });
    } catch(e) {}

    chrome.storage.local.get(['supabaseSession'], (res) => {
      const oldToken = res.supabaseSession ? res.supabaseSession.access_token : null;
      if (res.supabaseSession) {
        chrome.storage.local.remove(['supabaseSession'], () => {
          chrome.storage.local.set({ subscriptionStatus: 'free', userExplicitlySignedOut: true, signedOutAccessToken: oldToken }, () => {
            console.log("☁️ [Background] Cleared Supabase Session.");
            sendResponse({ success: true });
          });
        });
      } else {
        chrome.storage.local.set({ subscriptionStatus: 'free', userExplicitlySignedOut: true, signedOutAccessToken: oldToken }, () => {
          sendResponse({ success: true });
        });
      }
    });
    return true; // Keep message channel open for asynchronous response!
  } else if (request.action === "FORCE_SYNC") {
    chrome.storage.local.get(['supabaseSession', 'lastSyncOrigin'], (res) => {
      if (res.supabaseSession && res.supabaseSession.access_token) {
        const origin = (res.lastSyncOrigin && !res.lastSyncOrigin.includes("localhost")) ? res.lastSyncOrigin : 'https://bootube.app';
        syncCloudSettings(res.supabaseSession.access_token, origin);
      }
    });
  }
});

// Helper to query our Next.js backend and sync settings
async function syncCloudSettings(token, origin = 'https://bootube.app') {
  try {
    let baseOrigin = (origin || 'https://bootube.app').replace(/\/$/, '');
    let response = await fetch(`${baseOrigin}/api/auth/session`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(() => null);

    // Fall back to production if custom origin or stale localhost 404s/fails
    if ((!response || response.status === 404) && baseOrigin !== 'https://bootube.app') {
      baseOrigin = 'https://bootube.app';
      response = await fetch(`${baseOrigin}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => null);
    }
    
    if (response && response.ok) {
      const data = await response.json();
      if (data && data.profile) {
        const profile = data.profile;
        const rawStatus = String(profile.subscription_status || '').toLowerCase();
        const isPremium = ['active', 'premium', 'pro', 'trialing', 'trialling'].includes(rawStatus);
        
        chrome.storage.local.get(['blocklist'], (res) => {
          let currentList = res.blocklist || [];
          
          // Get existing custom words from local storage to prevent cloud overwrite loss
          const localCustomWords = currentList.filter(item => (typeof item === 'string' ? 'Custom' : item.category) === 'Custom')
                                             .map(item => (typeof item === 'string' ? item : item.word).toLowerCase());
          
          const cloudCustomWords = (profile.custom_blocked_words && Array.isArray(profile.custom_blocked_words)) 
            ? profile.custom_blocked_words.map(w => w.toLowerCase()) 
            : [];
          
          const mergedCustomWords = Array.from(new Set([...cloudCustomWords, ...localCustomWords]));
          
          // Remove old Custom items from list
          currentList = currentList.filter(item => (typeof item === 'string' ? 'Custom' : item.category) !== 'Custom');
          
          // Re-insert deduplicated merged custom words
          mergedCustomWords.forEach(word => {
            currentList.unshift({ word: word.toLowerCase(), category: 'Custom' });
          });

          // Save settings to chrome storage
          chrome.storage.local.set({
            blocklist: currentList,
            blurEnabled: profile.blur_screens ?? true,
            // Convert buffer_timer (seconds) back to muteAggressiveness index (1, 2, 3)
            muteAggressiveness: profile.buffer_timer <= 0.3 ? 1 : (profile.buffer_timer >= 1.0 ? 3 : 2),
            subscriptionStatus: isPremium ? (profile.subscription_status || 'active') : 'free'
          }, () => {
            console.log("☁️ [Background Sync] Successfully merged and synced cloud settings! Premium:", isPremium);
          });
        });
      }
    }
  } catch (err) {
    console.warn("☁️ [Background Sync] Could not sync settings (offline or server unavailable):", err && err.message ? err.message : err);
  }
}

// Perform a sync on background startup if authenticated
chrome.storage.local.get(['supabaseSession', 'lastSyncOrigin'], (res) => {
  if (res.supabaseSession && res.supabaseSession.access_token) {
    const origin = (res.lastSyncOrigin && !res.lastSyncOrigin.includes("localhost")) ? res.lastSyncOrigin : 'https://bootube.app';
    syncCloudSettings(res.supabaseSession.access_token, origin);
  }
});

// Service Worker Keep-Alive & Alarm Trigger for Stale Tabs
try {
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.create('bootubeKeepAlive', { periodInMinutes: 0.5 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm && alarm.name === 'bootubeKeepAlive') {
        // Periodic lightweight heartbeat to keep service worker active for idle tabs
        chrome.storage.local.get(['bootubeEnabled'], () => {});
      }
    });
  }
} catch(e) {}
