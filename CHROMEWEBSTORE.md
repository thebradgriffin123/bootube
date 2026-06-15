# Chrome Web Store Listing — BooTube

> Last Updated: 2026-06-13

## Store Listing

**Extension Name** [REQUIRED]
BooTube

**Short Description** [REQUIRED]
Ghost the inappropriate words on YouTube! Automatically mutes and blurs profanity in real-time based on your custom word list.

**Detailed Description** [REQUIRED]
BooTube is a powerful, privacy-first extension that ensures a family-friendly viewing experience by proactively ghosting inappropriate words on YouTube. 

Key features:
- Automatically turns on Closed Captions (CC) behind the scenes to read upcoming dialog.
- Uses Proportional Interpolation to calculate the exact sub-second a word is spoken, guaranteeing frame-perfect muting.
- Instantly mutes the audio and applies a heavy blur to the video player to prevent lip-reading or seeing visually offensive content.
- Fully supports foreign language captions with our custom translation-sync algorithm.
- Features a customizable, obfuscated blocklist menu so you can safely add or remove words.

How to use it:
1. Install the extension.
2. Click the BooTube ghost icon in your toolbar to customize your blocked word list.
3. Open any YouTube video. The extension will automatically enable captions and censor the content seamlessly.

Privacy Note: BooTube runs entirely locally on your machine. Your blocklist and browsing data are never sent to any external servers.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Censors profanity in YouTube videos by automatically muting the audio and blurring the screen based on closed captions.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon-128.png |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

### Screenshot Notes
- Screenshot 1: Show a YouTube video player heavily blurred.
- Screenshot 2: Show the BooTube popup menu.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Required to save the user's customized blocklist of censored words so it persists across sessions. |
| *://www.youtube.com/* | host_permissions | Required to inject the content script into YouTube pages to read the captions and apply muting/blurring to the video element. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [RECOMMENDED]
*(Host the PRIVACY_POLICY.md file on GitHub Pages, Google Sites, or Notion and paste the URL here)*

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name** [REQUIRED]
*(Your Name/Company)*

**Contact Email** [REQUIRED]
*(Your Email)*

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0 | 2026-06-13 | Initial Release | Draft |
