// YouTube Time Tracker - Background Script

// Initialize or get stored data
function initializeData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['youtubeTimeData'], (result) => {
      if (result.youtubeTimeData) {
        resolve(result.youtubeTimeData);
      } else {
        const newData = {
          totalTimeToday: 0,
          lastActiveDate: new Date().toDateString(),
          history: [],
          alternatives: [
            { title: "Read a book", description: "Expand your knowledge and imagination" },
            { title: "Go for a walk", description: "Get some fresh air and exercise" },
            { title: "Learn a new skill", description: "Try coding, cooking, or a musical instrument" },
            { title: "Call a friend", description: "Connect with someone you care about" },
            { title: "Meditate", description: "Practice mindfulness for 10 minutes" }
          ]
        };
        chrome.storage.local.set({ youtubeTimeData: newData });
        resolve(newData);
      }
    });
  });
}

// Reset daily counter if it's a new day
function checkAndResetDailyCounter(data) {
  const today = new Date().toDateString();
  if (data.lastActiveDate !== today) {
    data.totalTimeToday = 0;
    data.lastActiveDate = today;
    chrome.storage.local.set({ youtubeTimeData: data });
  }
  return data;
}

// Track active YouTube tabs
let activeYouTubeTabs = {};

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    // Check if it's a video, short, or other YouTube page
    const isVideo = tab.url.includes('watch?v=');
    const isShort = tab.url.includes('/shorts/');
    const isOtherYouTubePage = !isVideo && !isShort;
    
    // Track all YouTube pages for time counting
    activeYouTubeTabs[tabId] = {
      startTime: Date.now(),
      url: tab.url,
      title: tab.title || 'YouTube',
      isShort: isShort,
      isOtherYouTubePage: isOtherYouTubePage // Flag for homepage/search
    };
  }
});

// Update time data when a YouTube session ends
async function updateTimeData(tabId, sessionTime) {
  const tabData = activeYouTubeTabs[tabId];
  const data = await initializeData();
  checkAndResetDailyCounter(data);
  
  // Update total time today for all YouTube pages
  data.totalTimeToday += sessionTime;
  
  // Update shorts statistics if it's a short
  if (tabData.isShort) {
    data.shortsTime = (data.shortsTime || 0) + sessionTime;
    data.shortsCount = (data.shortsCount || 0) + 1;
  }
  
  // Only add to history if it's a video or short (not homepage/search)
  // and session was at least 1 second
  if (sessionTime >= 1 && !tabData.isOtherYouTubePage) {
    const videoTitle = tabData.title.replace(' - YouTube', '');
    const videoId = getVideoIdFromUrl(tabData.url);
    
    // Extract channel name from title if possible
    let channelName = "Unknown Channel";
    // Try to extract channel name from title format "Video Title by Channel Name"
    if (videoTitle.includes(" by ")) {
      const parts = videoTitle.split(" by ");
      if (parts.length > 1) {
        channelName = parts[parts.length - 1];
      }
    }
    
    // Calculate percentage of total time
    const percentageOfTotal = data.totalTimeToday > 0 
      ? Math.round((sessionTime / data.totalTimeToday) * 100) 
      : 100;
    
    data.history.unshift({
      title: videoTitle,
      url: tabData.url,
      videoId: videoId,
      duration: sessionTime,
      timestamp: Date.now(),
      isShort: tabData.isShort,
      category: tabData.isShort ? 'short' : 'video',
      channelName: channelName,
      thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null,
      percentageOfTotal: percentageOfTotal
    });
    
    // Keep history limited to last 100 items
    if (data.history.length > 100) {
      data.history = data.history.slice(0, 100);
    }
  }
  
  // Save updated data
  await chrome.storage.local.set({ youtubeTimeData: data });
}

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeYouTubeTabs[tabId]) {
    const sessionTime = Math.floor((Date.now() - activeYouTubeTabs[tabId].startTime) / 1000);
    // Log all sessions regardless of duration
    updateTimeData(tabId, sessionTime);
    delete activeYouTubeTabs[tabId];
  }
});

// Listen for tab navigation away from YouTube
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && activeYouTubeTabs[tabId]) {
    if (!changeInfo.url.includes('youtube.com')) {
      const sessionTime = Math.floor((Date.now() - activeYouTubeTabs[tabId].startTime) / 1000);
      // Log all sessions regardless of duration
      updateTimeData(tabId, sessionTime);
      delete activeYouTubeTabs[tabId];
    } else {
      // Still on YouTube but URL changed - update the URL and title
      // Log the previous video session before updating to the new URL
      const sessionTime = Math.floor((Date.now() - activeYouTubeTabs[tabId].startTime) / 1000);
      updateTimeData(tabId, sessionTime);
      
      // Reset the start time for the new video
      activeYouTubeTabs[tab.id].startTime = Date.now();
      activeYouTubeTabs[tab.id].url = changeInfo.url;
      if (tab.title) {
        activeYouTubeTabs[tab.id].title = tab.title;
      }
    }
  }
});

// Extract video ID from YouTube URL
function getVideoIdFromUrl(url) {
  const urlObj = new URL(url);
  if (urlObj.searchParams.has('v')) {
    return urlObj.searchParams.get('v');
  }
  // Handle YouTube shorts URLs
  if (url.includes('/shorts/')) {
    const parts = url.split('/shorts/');
    if (parts.length > 1) {
      return parts[1].split('?')[0];
    }
  }
  return null;
}

// Send current time data to content script or popup when requested
// In your background.js
// Time tracking functions
// Update these functions to use consistent storage keys
function getTotalTimeToday() {
  const today = new Date().toDateString();
  return chrome.storage.local.get(['youtubeTimeData'])  // Changed from 'timeData'
    .then(result => {
      if (result.youtubeTimeData && result.youtubeTimeData.totalTimeToday) {
        return result.youtubeTimeData.totalTimeToday || 0;
      }
      return 0;
    })
    .catch(error => {
      console.error('Error getting total time:', error);
      return 0;
    });
}

function getShortsTime() {
  const today = new Date().toDateString();
  return chrome.storage.local.get(['youtubeTimeData'])  // Changed from 'timeData'
    .then(result => {
      if (result.youtubeTimeData) {
        return result.youtubeTimeData.shortsTime || 0;
      }
      return 0;
    });
}

function getShortsCount() {
  const today = new Date().toDateString();
  return chrome.storage.local.get(['youtubeTimeData'])  // Changed from 'timeData'
    .then(result => {
      if (result.youtubeTimeData) {
        return result.youtubeTimeData.shortsCount || 0;
      }
      return 0;
    });
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTimeData') {
    TimeSyncManager.syncAll().then(totalTime => {
      chrome.storage.local.get(['youtubeTimeData'], (result) => {
        const data = result.youtubeTimeData || {
          totalTimeToday: 0,
          shortsTime: 0,
          shortsCount: 0,
          history: []
        };

        sendResponse({
          data: {
            ...data,
            totalTimeToday: totalTime,
            lastSync: TimeSyncManager.lastSync
          }
        });
      });
    });
    return true;
  }

  if (request.action === 'stopTracking') {
    Object.keys(activeYouTubeTabs).forEach(tabId => {
      const sessionTime = Math.floor((Date.now() - activeYouTubeTabs[tabId].startTime) / 1000);
      updateTimeData(tabId, sessionTime);
    });
    activeYouTubeTabs = {};
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'requestTimeUpdate') {
    chrome.storage.local.get(['youtubeTimeData'], (result) => {
      if (result.youtubeTimeData) {
        try {
          chrome.runtime.sendMessage({
            action: 'updatePopup',
            totalTime: result.youtubeTimeData.totalTimeToday || 0,
            shortsTime: result.youtubeTimeData.shortsTime || 0,
            shortsCount: result.youtubeTimeData.shortsCount || 0
          });
          sendResponse({ success: true });
        } catch (error) {
          console.error("Error sending message:", error);
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: "No data found" });
      }
    });
    return true;
  }

  if (request.action === 'getCurrentSessions') {
    let totalTime = 0;
    let shortsTime = 0;
    
    for (const tabId in activeYouTubeTabs) {
      const tab = activeYouTubeTabs[tabId];
      const sessionTime = Math.floor((Date.now() - tab.startTime) / 1000);
      totalTime += sessionTime;
      
      if (tab.isShort) {
        shortsTime += sessionTime;
      }
    }
    
    sendResponse({
      sessions: {
        totalTime: totalTime,
        shortsTime: shortsTime
      }
    });
    return true;
  }

  return false;
});

// Update the periodic update interval
// Change the interval from 3000ms to 1000ms for faster updates
setInterval(async () => {
  const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
  const activeTabIds = tabs.map(tab => tab.id);
  
  // Clean up any closed tabs
  for (const tabId in activeYouTubeTabs) {
    if (!activeTabIds.includes(parseInt(tabId))) {
      delete activeYouTubeTabs[tabId];
    }
  }
  
  // Check for new YouTube tabs that aren't being tracked yet
  for (const tab of tabs) {
    if (!activeYouTubeTabs[tab.id] && tab.url) {
      // Add new YouTube tab to tracking
      const isVideo = tab.url.includes('watch?v=');
      const isShort = tab.url.includes('/shorts/');
      const isOtherYouTubePage = !isVideo && !isShort;
      
      activeYouTubeTabs[tab.id] = {
        startTime: Date.now(),
        url: tab.url,
        title: tab.title || 'YouTube',
        isShort: isShort,
        isOtherYouTubePage: isOtherYouTubePage
      };
    }
  }
  
  // Update active tabs
  for (const tab of tabs) {
    if (activeYouTubeTabs[tab.id]) {  // Removed isUserIdle check
      try {
        const currentSessionTime = Math.floor((Date.now() - activeYouTubeTabs[tab.id].startTime) / 1000);
        const data = await initializeData();
        
        // Update tab URL and title if they've changed
        if (tab.url !== activeYouTubeTabs[tab.id].url) {
          // URL changed - log the previous session and start a new one
          const sessionTime = Math.floor((Date.now() - activeYouTubeTabs[tab.id].startTime) / 1000);
          await updateTimeData(tab.id, sessionTime);
          
          // Update tracking info for the new URL
          const isVideo = tab.url.includes('watch?v=');
          const isShort = tab.url.includes('/shorts/');
          const isOtherYouTubePage = !isVideo && !isShort;
          
          activeYouTubeTabs[tab.id] = {
            startTime: Date.now(),
            url: tab.url,
            title: tab.title || 'YouTube',
            isShort: isShort,
            isOtherYouTubePage: isOtherYouTubePage
          };
        } else if (tab.title !== activeYouTubeTabs[tab.id].title) {
          // Just update the title if it changed
          activeYouTubeTabs[tab.id].title = tab.title;
        }
        
        // Send updated time to content script
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateTimer',
          totalTime: data.totalTimeToday + currentSessionTime,
          currentSessionTime: currentSessionTime,
          activeTabsCount: Object.keys(activeYouTubeTabs).length
        }).catch(() => {
          // Silently fail if tab isn't ready
          console.debug(`Tab ${tab.id} not ready for messages`);
        });
      } catch (error) {
        console.debug(`Error updating tab ${tab.id}`);
      }
    }
  }
  
  // Send active tabs info to any open popups
  chrome.runtime.sendMessage({
    action: 'updateActiveTabs',
    activeTabs: Object.keys(activeYouTubeTabs).length,
    tabDetails: Object.values(activeYouTubeTabs).map(tab => ({
      title: tab.title,
      isShort: tab.isShort,
      isOtherYouTubePage: tab.isOtherYouTubePage,
      sessionTime: Math.floor((Date.now() - tab.startTime) / 1000)
    }))
  }).catch(() => {
    // Popup might not be open, ignore errors
  });
}, 1000);  // Changed from 3000ms to 1000ms for faster updates

// Add this to your background.js
// Update the updateAllTrackers function with better error handling
function updateAllTrackers(timeData) {
  // Send update to all YouTube tabs
  chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateTracker',
        timeData: timeData
      }).catch(error => {
        // Silently fail if tab isn't ready
        console.debug(`Tab ${tab.id} not ready for tracker update: ${error.message}`);
      });
    });
  });
}

// Call this whenever time data is updated
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.youtubeTimeData) {
    updateAllTrackers(changes.youtubeTimeData.newValue);
  }
});

// Add a central time sync manager
const TimeSyncManager = {
  lastSync: Date.now(),
  activeTimers: new Set(),
  
  async syncAll() {
    const data = await initializeData();
    checkAndResetDailyCounter(data);
    
    // Calculate current session times
    let additionalTime = 0;
    for (const tabId in activeYouTubeTabs) {
      const sessionTime = Math.floor((Date.now() - activeYouTubeTabs[tabId].startTime) / 1000);
      additionalTime += sessionTime;
    }
    
    // Update total time
    const totalTime = data.totalTimeToday + additionalTime;
    
    // Broadcast update to all YouTube tabs
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'syncTime',
          totalTime: totalTime,
          lastSync: this.lastSync
        }).catch(() => {/* Silent fail for inactive tabs */});
      });
    });
    
    // Update popup if open
    chrome.runtime.sendMessage({
      action: 'syncTime',
      totalTime: totalTime,
      lastSync: this.lastSync
    }).catch(() => {/* Silent fail if popup is closed */});
    
    this.lastSync = Date.now();
    return totalTime;
  }
};

// Replace periodic update interval with more precise sync
setInterval(async () => {
  await TimeSyncManager.syncAll();
}, 1000);

// Enhance message handler for better sync
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTimeData') {
    TimeSyncManager.syncAll().then(totalTime => {
      chrome.storage.local.get(['youtubeTimeData'], (result) => {
        const data = result.youtubeTimeData || {
          totalTimeToday: 0,
          shortsTime: 0,
          shortsCount: 0,
          history: []
        };

        sendResponse({
          data: {
            ...data,
            totalTimeToday: totalTime,
            lastSync: TimeSyncManager.lastSync
          }
        });
      });
    });
    return true;
  }

  if (request.action === 'stopTracking') {
    Object.keys(activeYouTubeTabs).forEach(tabId => {
      const sessionTime = Math.floor((Date.now() - activeYouTubeTabs[tabId].startTime) / 1000);
      updateTimeData(tabId, sessionTime);
    });
    activeYouTubeTabs = {};
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'requestTimeUpdate') {
    chrome.storage.local.get(['youtubeTimeData'], (result) => {
      if (result.youtubeTimeData) {
        try {
          chrome.runtime.sendMessage({
            action: 'updatePopup',
            totalTime: result.youtubeTimeData.totalTimeToday || 0,
            shortsTime: result.youtubeTimeData.shortsTime || 0,
            shortsCount: result.youtubeTimeData.shortsCount || 0
          });
          sendResponse({ success: true });
        } catch (error) {
          console.error("Error sending message:", error);
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: "No data found" });
      }
    });
    return true;
  }

  if (request.action === 'getCurrentSessions') {
    let totalTime = 0;
    let shortsTime = 0;
    
    for (const tabId in activeYouTubeTabs) {
      const tab = activeYouTubeTabs[tabId];
      const sessionTime = Math.floor((Date.now() - tab.startTime) / 1000);
      totalTime += sessionTime;
      
      if (tab.isShort) {
        shortsTime += sessionTime;
      }
    }
    
    sendResponse({
      sessions: {
        totalTime: totalTime,
        shortsTime: shortsTime
      }
    });
    return true;
  }

  return false;
});

// Enhance updateTimeData function
async function updateTimeData(tabId, sessionTime) {
  const tabData = activeYouTubeTabs[tabId];
  const data = await initializeData();
  checkAndResetDailyCounter(data);
  
  data.totalTimeToday += sessionTime;
  
  if (tabData.isShort) {
    data.shortsTime = (data.shortsTime || 0) + sessionTime;
    data.shortsCount = (data.shortsCount || 0) + 1;
  }
  
  await chrome.storage.local.set({ youtubeTimeData: data });
  await TimeSyncManager.syncAll();
}