# YouTube Time Tracker

A browser extension that helps you monitor and manage your time spent on YouTube.

## Features

- **Time Tracking**: Automatically tracks how much time you spend watching YouTube videos and shorts
- **Daily Statistics**: View your daily YouTube usage with intuitive charts
- **Video History**: Browse through your watched videos with filtering options
- **Shorts Analytics**: Separate tracking for YouTube Shorts consumption
- **Alternative Suggestions**: Provides suggestions for alternative activities
- **Dark Mode Support**: Toggle between light and dark themes

## Installation

### From Source

1. Clone this repository
   ```
   git clone https://github.com/yourusername/youtube-time-tracker.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and active

## Usage

1. Navigate to YouTube in your browser
2. The extension will automatically start tracking your time
3. Click on the extension icon in your browser toolbar to view your statistics
4. Use the tabs to navigate between different views:
   - Current Stats: View today's usage and weekly trends
   - Video History: Browse your watched videos with filtering options
   - Shorts Data: See statistics specific to YouTube Shorts
   - Analytics: View detailed usage patterns and category breakdowns

## Project Structure

- `background.js`: Background service worker that tracks YouTube activity
- `content.js`: Content script that interacts with YouTube pages
- `popup.html/css/js`: Extension popup UI and functionality
- `dashboard.html/css/js`: Full dashboard view for detailed analytics
- `manifest.json`: Extension configuration
- `lib/`: Third-party libraries (Chart.js)
- `icons/`: Extension icons

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.#   y t e x t e n s i o n  
 