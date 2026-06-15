(function() {
  console.log("🤬 [Censor] Network Interceptor injected into MAIN world.");

  const originalFetch = window.fetch;
  
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
              window.postMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: data, isTranslated: true }, '*');
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
    
    if (url && url.includes('/api/timedtext')) {
      console.log("🤬 [Censor] Intercepted timedtext fetch:", url);
      const clone = response.clone();
      clone.text().then(text => {
        try {
          const data = JSON.parse(text);
          console.log("🤬 [Censor] Parsed timedtext JSON successfully.");
          window.postMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: data, isTranslated: false }, '*');
          
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
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._interceptUrl = url;
    return originalXHROpen.call(this, method, url, ...rest);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      if (this._interceptUrl && this._interceptUrl.includes('/api/timedtext')) {
        console.log("🤬 [Censor] Intercepted timedtext XHR:", this._interceptUrl);
        try {
          const data = JSON.parse(this.responseText);
          console.log("🤬 [Censor] Parsed timedtext JSON from XHR successfully.");
          window.postMessage({ type: 'YOUTUBE_CAPTIONS_FETCHED', payload: data, isTranslated: false }, '*');
          
          handleBackgroundTranslation(this._interceptUrl);
        } catch (e) {
          console.log("🤬 [Censor] Could not parse XHR timedtext as JSON.");
        }
      }
    });
    return originalXHRSend.apply(this, args);
  };
})();
