# YouTube Auto Quality Select Chrome Extension

A fully Manifest V3 compliant Chrome extension that automatically selects video quality on YouTube based on your preferences and connection stability.

## Features

- **Auto Select Highest Quality**: Automatically select the highest available quality
- **Auto Select Preferred Quality**: Choose your preferred quality (4K, 1440p, 1080p, etc.)
- **Auto Drop to Lower Quality**: Automatically drop to lower quality if connection is unstable
- **Connection Monitoring**: Monitors buffering events and adjusts quality accordingly
- **Premium Popup Blocking**: Automatically blocks "Enjoy enhanced quality with Premium" popups
- **Clean UI**: Modern, user-friendly popup interface
- **Real-time Updates**: Changes apply immediately without page refresh

## Installation

### Developer Mode Installation (for testing)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your extensions list

### Chrome Web Store Installation (when published)

1. Visit the Chrome Web Store
2. Search for "YouTube Auto Quality Select"
3. Click "Add to Chrome"
4. Confirm the installation

## How to Use

1. **Click the extension icon** in your Chrome toolbar while on YouTube
2. **Configure your preferences**:
   - Toggle "Auto Select Highest Quality" to always use the best available quality
   - Toggle "Auto Select Preferred Quality" and choose your preferred resolution
   - Toggle "Auto Drop to Lower Quality" and set a fallback quality for poor connections
3. **Save your settings** - they will be applied automatically to all YouTube videos
4. **Watch videos** - the extension will automatically adjust quality based on your preferences

## Settings Explained

### Auto Select Highest Quality
- When enabled, always selects the highest available quality
- Overrides preferred quality setting
- Best for users with excellent internet connections

### Auto Select Preferred Quality
- Choose your preferred quality from 144p to 4K
- Extension will select this quality when available
- If not available, selects the closest lower quality
- Good balance between quality and bandwidth usage

### Auto Drop to Lower Quality
- Monitors your connection stability
- If buffering occurs frequently, automatically drops to lower quality
- Helps prevent constant buffering on unstable connections
- You can set the fallback quality level

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: Only requests necessary permissions (storage, YouTube access)
- **Privacy**: All settings stored locally, no data sent to external servers
- **Performance**: Lightweight with minimal impact on YouTube performance

## Browser Compatibility

- Chrome 88+
- Chromium-based browsers (Edge, Brave, etc.)

## File Structure

```
Auto-Quality-Select-Youtube/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js            # YouTube interaction logic
├── popup.html            # Extension popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## Development

To modify or extend the extension:

1. Make changes to the relevant files
2. Reload the extension in `chrome://extensions/`
3. Test on YouTube videos
4. Debug using Chrome DevTools

## Troubleshooting

### Extension not working
- Make sure you're on a YouTube video page (`youtube.com/watch`)
- Check that the extension is enabled in `chrome://extensions/`
- Reload the YouTube page

### Settings not saving
- Check Chrome's storage permissions
- Try reloading the extension
- Clear extension storage in Chrome settings if needed

### Quality not changing
- Wait a few seconds for YouTube player to load completely
- Some videos may have limited quality options
- Check YouTube's own quality settings

## Privacy Policy

This extension:
- Only accesses YouTube pages
- Stores settings locally on your device
- Does not collect or transmit personal data
- Does not track user behavior
- Does not display ads or promotional content

## License

This project is open source and available under the MIT License.

## Support

For issues, feature requests, or contributions, please visit the project repository.
