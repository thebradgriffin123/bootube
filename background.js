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
      enabledCategories: ["Profanity", "Blasphemy", "Custom"],
      subscriptionStatus: "active"
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openSettings") {
    chrome.windows.create({ 
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 380,
      height: 640,
      focused: true
    });
  } else if (request.action === "SAVE_SUPABASE_SESSION") {
    // Read session to see if it changed, but ignore if the user explicitly signed out in the extension
    chrome.storage.local.get(['supabaseSession', 'userExplicitlySignedOut'], (res) => {
      if (res.userExplicitlySignedOut) {
        console.log("☁️ [Background] Ignored SAVE_SUPABASE_SESSION because user explicitly signed out in the extension.");
        return;
      }

      const existing = res.supabaseSession;
      const newSession = request.session;
      
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
        chrome.storage.local.set({ 
          supabaseSession: newSession,
          subscriptionStatus: newSession.user?.user_metadata?.subscription_status || 'free',
          lastSyncOrigin: origin
        }, () => {
          console.log("☁️ [Background] Saved Supabase Session. Launching sync from origin:", origin);
          syncCloudSettings(newSession.access_token, origin);
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
      if (res.supabaseSession) {
        chrome.storage.local.remove(['supabaseSession'], () => {
          chrome.storage.local.set({ subscriptionStatus: 'free', userExplicitlySignedOut: true }, () => {
            console.log("☁️ [Background] Cleared Supabase Session.");
            sendResponse({ success: true });
          });
        });
      } else {
        chrome.storage.local.set({ subscriptionStatus: 'free', userExplicitlySignedOut: true }, () => {
          sendResponse({ success: true });
        });
      }
    });
    return true; // Keep message channel open for asynchronous response!
  } else if (request.action === "FORCE_SYNC") {
    chrome.storage.local.get(['supabaseSession', 'lastSyncOrigin'], (res) => {
      if (res.supabaseSession && res.supabaseSession.access_token) {
        const origin = res.lastSyncOrigin || 'https://bootube.app';
        syncCloudSettings(res.supabaseSession.access_token, origin);
      }
    });
  }
});

// Helper to query our Next.js backend and sync settings
async function syncCloudSettings(token, origin = 'https://bootube.app') {
  try {
    const baseOrigin = origin.replace(/\/$/, '');
    const response = await fetch(`${baseOrigin}/api/auth/session`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.profile) {
        const profile = data.profile;
        const isPremium = profile.subscription_status === 'active' || profile.subscription_status === 'premium';
        
        chrome.storage.local.get(['blocklist'], (res) => {
          let currentList = res.blocklist || [];
          
          // Clean existing 'Custom' category items first
          currentList = currentList.filter(item => {
            const cat = typeof item === 'string' ? 'Custom' : item.category;
            return cat !== 'Custom';
          });
          
          // Add new custom words from cloud
          if (profile.custom_blocked_words && Array.isArray(profile.custom_blocked_words)) {
            profile.custom_blocked_words.forEach(word => {
              currentList.unshift({ word: word.toLowerCase(), category: 'Custom' });
            });
          }

          // Save settings to chrome storage
          chrome.storage.local.set({
            blocklist: currentList,
            blurEnabled: isPremium ? (profile.blur_screens ?? false) : false,
            // Convert buffer_timer (seconds) back to muteAggressiveness index (1, 2, 3)
            muteAggressiveness: profile.buffer_timer <= 0.3 ? 1 : (profile.buffer_timer >= 1.0 ? 3 : 2),
            subscriptionStatus: profile.subscription_status || 'free'
          }, () => {
            console.log("☁️ [Background Sync] Successfully synced cloud settings!");
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
    const origin = res.lastSyncOrigin || 'https://bootube.app';
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
