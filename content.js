// YouTube Time Tracker - Content Script

// Create and inject the timer display
function createTimerDisplay() {
  // Create the timer container
  const timerContainer = document.createElement('div');
  timerContainer.id = 'yt-time-tracker';
  timerContainer.className = 'yt-time-tracker';
  
  // Create the timer content
  timerContainer.innerHTML = `
    <div class="tracker-content">
      <div class="tracker-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
        </svg>
      </div>
      <div class="tracker-time">
        <span class="time-label">Today on YouTube:</span>
        <span class="time-value">0:00:00</span>
      </div>
      <button class="tracker-toggle" title="Toggle display">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
        </svg>
      </button>
    </div>
  `;
  
  // Append to the body
  document.body.appendChild(timerContainer);
  
  // Add toggle functionality
  const toggleBtn = timerContainer.querySelector('.tracker-toggle');
  toggleBtn.addEventListener('click', () => {
    try {
      timerContainer.classList.toggle('minimized');
      // Check if the extension context is still valid
      if (chrome && chrome.storage && chrome.storage.local) {
        // Save preference
        chrome.storage.local.set({ 'trackerMinimized': timerContainer.classList.contains('minimized') })
          .catch(error => {
            console.error('Failed to save minimized state:', error);
            // Revert the UI change if storage fails
            timerContainer.classList.toggle('minimized');
          });
      }
    } catch (error) {
      console.error('Error toggling minimized state:', error);
    }
  });
  
  // Check saved preference
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['trackerMinimized'])
        .then(result => {
          if (result.trackerMinimized) {
            timerContainer.classList.add('minimized');
          }
        })
        .catch(error => {
          console.error('Failed to load minimized state:', error);
        });
    }
  } catch (error) {
    console.error('Error loading minimized state:', error);
  }
  
  // Add click handler to open popup
  timerContainer.querySelector('.tracker-time').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  
  return timerContainer;
}

// Format seconds into HH:MM:SS
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Update the timer display
function updateTimerDisplay(seconds) {
  const timerDisplay = document.getElementById('yt-time-tracker');
  if (timerDisplay) {
    const timeValue = timerDisplay.querySelector('.time-value');
    timeValue.textContent = formatTime(seconds);
    
    // Send updated time to popup if it's open
    try {
      if (chrome && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ 
          action: 'updatePopup', 
          totalTime: seconds 
        });
      }
    } catch (error) {
      // Silently fail if popup isn't open or extension context is invalid
      console.debug('Could not send update to popup:', error.message);
    }
  }
}

// Initialize the tracker
function initTracker() {
  // Check if we're on YouTube
  if (!window.location.hostname.includes('youtube.com')) {
    return;
  }
  
  // Create the timer display if it doesn't exist
  if (!document.getElementById('yt-time-tracker')) {
    createTimerDisplay();
  }
  
  // Get current time data
  try {
    if (chrome && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({ action: 'getTimeData' }, (response) => {
        if (response && response.data) {
          updateTimerDisplay(response.data.totalTimeToday);
        }
      });
    }
  } catch (error) {
    console.debug('Extension context may be invalid:', error.message);
    // Display a fallback or retry mechanism here if needed
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateTimer') {
    updateTimerDisplay(request.totalTime);
  }
  return true;
});

// Initialize when the page is fully loaded
function initialize() {
  // Make sure the message listener is registered before any messages are sent
  setTimeout(() => {
    initTracker();
  }, 500); // Small delay to ensure extension is ready
}

if (document.readyState === 'complete') {
  initialize();
} else {
  window.addEventListener('load', initialize);
}

// Re-initialize when YouTube's SPA navigation occurs
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(initTracker, 1000); // Wait for YouTube's SPA to fully render
  }
}).observe(document, { subtree: true, childList: true });

// Add this to your content script
let isUpdatingPopup = false;

// Listen for requests to start sending updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startSendingUpdates') {
    isUpdatingPopup = true;
    sendTimeUpdates();
  }
  return true;
});

// Function to send time updates to the popup
function sendTimeUpdates() {
  // Get time data from background script
  chrome.runtime.sendMessage({ action: 'getTimeData' }, (response) => {
    if (chrome.runtime.lastError) {
      console.debug('Failed to get time data:', chrome.runtime.lastError);
      return;
    }
    
    if (response && response.data) {
      // Send complete data to popup
      chrome.runtime.sendMessage({
        action: 'updateTime',
        totalTime: response.data.totalTimeToday || 0,
        shortsTime: response.data.shortsTime || 0,
        shortsCount: response.data.shortsCount || 0,
        history: response.data.history || []
      });
    }
  });
}

// Listen for requests to start/stop sending updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSendingUpdates') {
    // Start sending updates more frequently (every 500ms instead of 1000ms)
    const updateInterval = setInterval(sendTimeUpdates, 500);
    
    // Store the interval ID
    window.updateIntervalId = updateInterval;
    sendResponse({ success: true });
    
    // Send an immediate update
    sendTimeUpdates();
  } else if (request.action === 'stopSendingUpdates') {
    // Clear the update interval
    if (window.updateIntervalId) {
      clearInterval(window.updateIntervalId);
      window.updateIntervalId = null;
    }
    sendResponse({ success: true });
  }
  return true;
});

// When tab is closed or navigated away
window.addEventListener('beforeunload', () => {
  isUpdatingPopup = false;
});