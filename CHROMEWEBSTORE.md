# Chrome Web Store & Mozilla Add-ons (AMO) Listing — BooTube (v1.46 / v1.48)

> Last Updated: 2026-10-28

## Store Listing Copy (Ready to Copy-Paste)

**Extension Name** [REQUIRED]
BooTube: Streaming Profanity Filter & Audio Muter

**Short Description (<= 132 characters)** [REQUIRED]
Automatically mute profanity, blasphemy, and bleeps in real time across YouTube, Netflix, Disney+, Hulu, Prime Video, Max & more!

**Detailed Description** [REQUIRED]
BooTube is a real-time, privacy-first streaming profanity filter that automatically silences unwanted language and blurs the video screen across 13 major streaming platforms.

Supported Streaming Platforms (All 13 Included):
• YouTube
• Netflix
• Disney+
• Hulu
• Max (HBO Max)
• Amazon Prime Video
• Paramount+
• Peacock TV
• Plex
• Fandango at Home (Vudu)
• Spotify (Synced Lyrics & Video Podcasts)
• Facebook Video
• X.com (Twitter)

Key Features:
• Sub-Second Audio Muting: Intercepts subtitle and caption tracks ahead of time and uses proportional word timing to mute the exact word before it is spoken—and unmute cleanly right after.
• Optional Video Blur: Applies a smooth 40px privacy blur during muted intervals to prevent lip-reading.
• Hide Captions on Screen: Keeps captions enabled behind the scenes for the muting engine while hiding subtitle text and opaque caption boxes from your screen.
• Authoritative Category Filters: Toggle Blasphemy, Profanity, Sexual, Scatological, Anatomical, Derogatory, Bleeps & Symbols, and Custom words independently.
• Respectful Mode: Automatically detects sermons, scripture study, and religious broadcasts so sacred names ("Jesus", "Christ", "God", "Lord") are never muted in reverent contexts.
• Searchable Video Transcript: View and search the full caption transcript of the active video directly inside the BooTube popup.
• Adjustable Mute Buffer: Fine-tune your pre-mute and post-mute safety buffer (0.3s, 0.6s, or 1.0s).

Free vs. Premium:
• Free Forever Tier: Includes full Blasphemy filtering, Hide Captions on Screen, Video Blur, Adjustable Mute Buffer, and Respectful Mode across all 13 supported streaming platforms.
• BooTube Premium ($3.99/mo): Unlocks all 7 built-in profanity categories, unlimited custom words, and cross-device cloud sync.

Privacy Guarantee:
All caption parsing and audio muting execute 100% locally inside your browser. BooTube never transmits your viewing history, video titles, or stream data to external servers.

**Category** [REQUIRED]
Productivity / Entertainment

**Single Purpose Description** [REQUIRED]
Automatically mutes profanity and unwanted words in real time on supported video streaming platforms by analyzing closed caption timestamps locally in the browser.

---

## Permissions Justification (Chrome Web Store Dashboard)

| Permission | Justification |
|------------|---------------|
| `storage` | Required to save the user's enabled word categories, custom blocked words, mute buffer settings, and optional cloud sync session locally in the browser. |
| `tabs` | Required so the extension popup can identify the active streaming platform tab, display the active video title/transcript, and apply real-time filter updates without refreshing the page. |
| `Host Permissions` (`youtube.com`, `netflix.com`, `disneyplus.com`, `hulu.com`, `max.com`, `primevideo.com`, `amazon.com`, `paramountplus.com`, `peacocktv.com`, `plex.tv`, `athome.fandango.com`, `vudu.com`, `open.spotify.com`, `facebook.com`, `x.com`, `twitter.com`, `bootube.app`) | Required to inject the local caption-parsing content script into the 13 supported video players to detect subtitle timestamps and mute/blur the HTML5 `<video>` element during profanity, and to sync account status with `bootube.app`. |

---

## Privacy & Data Use

- **Privacy Policy URL**: `https://bootube.app/privacy`
- **Terms of Service URL**: `https://bootube.app/terms`
- **Support URL**: `https://bootube.app/support`
- **Contact Email**: `support@bootube.app`

---

## Packaged Store Builds Ready to Upload

- **Chrome Web Store Package (`v1.46`)**: `bootube-extension-v2.43-fandango-premute-exact-sync-stable.zip`
- **Mozilla Firefox Add-ons Package (`v1.48`)**: `bootube_streaming_profanity_filter-1.48.zip`
