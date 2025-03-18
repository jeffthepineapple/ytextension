document.addEventListener('DOMContentLoaded', function() {
  // Tab switching functionality with animations
  const tabItems = document.querySelectorAll('.tab-item');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabItems.forEach(item => {
    item.addEventListener('click', function() {
      // Get the tab to show
      const tabToShow = this.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabItems.forEach(tab => tab.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      this.classList.add('active');
      document.getElementById(`${tabToShow}-content`).classList.add('active');
    });
  });
  
  // Theme toggle functionality with animation
  const themeSwitch = document.getElementById('theme-switch');
  const themeIcon = document.querySelector('.theme-toggle i');
  const themeLabel = document.querySelector('.theme-toggle label');
  
  // Check if dark mode is saved in localStorage
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-theme');
    themeSwitch.checked = true;
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
    themeLabel.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
  }
  
  themeSwitch.addEventListener('change', function() {
    // Add transition class for smooth animation
    document.body.classList.add('theme-transition');
    
    if (this.checked) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('darkMode', 'true');
      
      // Animate icon change
      themeIcon.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        themeLabel.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        themeIcon.style.transform = 'rotate(0)';
      }, 250);
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('darkMode', 'false');
      
      // Animate icon change
      themeIcon.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        themeLabel.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        themeIcon.style.transform = 'rotate(0)';
      }, 250);
    }
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 500);
  });
});
document.addEventListener('DOMContentLoaded', () => {
  // Tab Navigation
  const tabs = document.querySelectorAll('.tab-item');
  const contents = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-content`).classList.add('active');
    });
  });

  // Theme Switching
  const themeSwitch = document.getElementById('theme-switch');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeSwitch.checked = true;
  }
  themeSwitch.addEventListener('change', () => {
    if (themeSwitch.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  });

  // Initialize data and UI
  let youtubeData = {
    totalTimeToday: 0,
    shortsTime: 0,
    shortsCount: 0,
    history: []
  };

  // Format time function
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Load data from storage and update UI
  function loadDataAndUpdateUI() {
    chrome.runtime.sendMessage({ action: 'getTimeData' }, (response) => {
      if (response && response.data) {
        youtubeData = response.data;
        updateStatsUI();
        updateHistoryUI();
        updateShortsUI();
        updateAnalyticsUI();
      }
    });
    
    // Request immediate updates from any active YouTube tabs
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        tabs.forEach(tab => {
          try {
            chrome.tabs.sendMessage(tab.id, { action: 'startSendingUpdates' });
          } catch (error) {
            console.debug(`Could not request updates from tab ${tab.id}: ${error.message}`);
          }
        });
      }
    });
  }

  // Update Stats Tab UI
  function updateStatsUI() {
    // Update time today
    document.getElementById('time-today').textContent = formatTime(youtubeData.totalTimeToday);
    
    // Update equivalents
    const timeInMinutes = Math.floor(youtubeData.totalTimeToday / 60);
    document.getElementById('pages-equivalent').textContent = Math.floor(timeInMinutes / 2);
    document.getElementById('miles-equivalent').textContent = (timeInMinutes / 10).toFixed(1);
    
    // Update daily watch chart
    renderDailyWatchChart();
  }

  // Render Daily Watch Time Chart
  function renderDailyWatchChart() {
    const dailyWatchTime = {};
    const today = new Date().toDateString();
    
    // Initialize last 7 days with 0 values
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyWatchTime[date.toDateString()] = 0;
    }
    
    // Populate with actual data
    youtubeData.history.forEach(video => {
      const date = new Date(video.timestamp).toDateString();
      if (dailyWatchTime.hasOwnProperty(date)) {
        dailyWatchTime[date] += video.duration;
      }
    });
    
    // Add today's active time
    if (today === youtubeData.lastActiveDate) {
      dailyWatchTime[today] = youtubeData.totalTimeToday;
    }
    
    const ctx = document.getElementById('daily-watch-chart').getContext('2d');
    
    // Check if chart already exists and destroy it
    if (window.dailyChart) {
      window.dailyChart.destroy();
    }
    
    window.dailyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(dailyWatchTime),
        datasets: [{
          label: 'Daily Watch Time (min)',
          data: Object.values(dailyWatchTime).map(seconds => Math.floor(seconds / 60)),
          backgroundColor: 'rgba(0, 123, 255, 0.5)',
          borderColor: 'rgba(0, 123, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // Update History Tab UI
  function updateHistoryUI() {
    console.log("Updating history UI with data:", youtubeData.history);
    
    // Populate Category Filter
    const categories = [...new Set(youtubeData.history.map(video => video.category || 'Unknown'))];
    const categorySelect = document.getElementById('history-category');
    
    // Clear existing options except the first one
    while (categorySelect.options.length > 1) {
      categorySelect.remove(1);
    }
    
    // Add new options
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
    
    // Initial render with default filters
    renderVideoHistory({
      date: 'all',
      type: 'all',
      durationMin: null,
      durationMax: null,
      category: 'all'
    });
  }

  // Video History Filtering and Rendering
  function renderVideoHistory(filters) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    console.log("Rendering video history with filters:", filters);
    console.log("History data:", youtubeData.history);
    
    if (!youtubeData.history || youtubeData.history.length === 0) {
      historyList.innerHTML = '<div class="no-results">No watch history available yet</div>';
      return;
    }
    
    let filteredVideos = youtubeData.history.filter(video => {
      const videoDate = new Date(video.timestamp);
      const today = new Date();
      
      // Date Filter
      if (filters.date === 'today') {
        if (videoDate.toDateString() !== today.toDateString()) return false;
      } else if (filters.date === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        if (videoDate < weekAgo) return false;
      } else if (filters.date === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        if (videoDate < monthAgo) return false;
      }
      
      // Type Filter
      if (filters.type === 'videos' && video.isShort) return false;
      if (filters.type === 'shorts' && !video.isShort) return false;
      
      // Duration Filter
      if (filters.durationMin !== null && video.duration < filters.durationMin) return false;
      if (filters.durationMax !== null && video.duration > filters.durationMax) return false;
      
      // Category Filter
      if (filters.category !== 'all' && video.category !== filters.category) return false;
      
      return true;
    });
    
    console.log("Filtered videos:", filteredVideos);
    
    // Sort by most recent first
    filteredVideos.sort((a, b) => b.timestamp - a.timestamp);
    
    // Display message if no videos match filters
    if (filteredVideos.length === 0) {
      historyList.innerHTML = '<div class="no-results">No videos match the selected filters</div>';
      return;
    }
    
    // Render filtered videos
    filteredVideos.forEach(video => {
      const item = document.createElement('div');
      item.className = 'history-item';
      
      // Create thumbnail if video ID exists
      let thumbnailHTML = '';
      if (video.videoId) {
        thumbnailHTML = `
          <div class="video-thumbnail">
            <img src="https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg" alt="Video thumbnail">
            <span class="video-duration">${formatTime(video.duration)}</span>
            ${video.isShort ? '<span class="video-short-badge">SHORT</span>' : ''}
          </div>
        `;
      } else {
        thumbnailHTML = `
          <div class="video-thumbnail no-thumb">
            <i class="fas fa-${video.isShort ? 'film' : 'video'}"></i>
            <span class="video-duration">${formatTime(video.duration)}</span>
            ${video.isShort ? '<span class="video-short-badge">SHORT</span>' : ''}
          </div>
        `;
      }
      
      // Format date and time
      const videoDate = new Date(video.timestamp);
      const formattedDate = videoDate.toLocaleDateString();
      const formattedTime = videoDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      item.innerHTML = `
        ${thumbnailHTML}
        <div class="video-info">
          <div class="video-title">${video.title || 'Unknown Video'}</div>
          <div class="video-channel">${video.channelName || 'Unknown Channel'}</div>
          <div class="video-meta">
            <span class="video-category">${video.category || 'Unknown'}</span>
            <span class="video-date">${formattedDate} at ${formattedTime}</span>
          </div>
          <div class="video-stats">
            <span class="video-watch-time">Watched: ${formatTime(video.duration)}</span>
            <span class="video-percentage">${video.percentageOfTotal || 0}% of daily total</span>
          </div>
        </div>
      `;
      
      // Add click event to open the video
      item.addEventListener('click', () => {
        if (video.url) {
          chrome.tabs.create({ url: video.url });
        }
      });
      
      historyList.appendChild(item);
    });
  }

  // Update Shorts Tab UI
  function updateShortsUI() {
    // Update shorts statistics
    const shortsTime = youtubeData.shortsTime || 0;
    const shortsCount = youtubeData.shortsCount || 0;
    const totalTime = youtubeData.totalTimeToday || 0;
    
    document.getElementById('shorts-time').textContent = formatTime(shortsTime);
    document.getElementById('shorts-count').textContent = shortsCount;
    
    // Calculate and display ratio
    const ratio = totalTime > 0 ? Math.round((shortsTime / totalTime) * 100) : 0;
    document.getElementById('shorts-ratio').textContent = `${ratio}%`;
    
    // Get shorts-only history for additional display
    const shortsHistory = youtubeData.history.filter(video => video.isShort);
    
    // Additional shorts visualization could be added here
  }

  // Update Analytics Tab UI
  function updateAnalyticsUI() {
    // Calculate average daily usage
    const uniqueDays = new Set();
    let totalWatchTime = 0;
    
    youtubeData.history.forEach(video => {
      const date = new Date(video.timestamp).toDateString();
      uniqueDays.add(date);
      totalWatchTime += video.duration;
    });
    
    const avgDaily = uniqueDays.size > 0 ? Math.floor(totalWatchTime / uniqueDays.size) : 0;
    document.getElementById('avg-daily').textContent = formatTime(avgDaily);
    
    // Find longest session
    const longestVideo = youtubeData.history.reduce((longest, video) => {
      return video.duration > longest.duration ? video : longest;
    }, { duration: 0 });
    
    document.getElementById('longest-video').textContent = 
      longestVideo.duration > 0 ? formatTime(longestVideo.duration) : '0:00:00';
    
    // Render category chart
    renderCategoryChart();
  }

  // Render Category Chart
  function renderCategoryChart() {
    const categoryData = {};
    
    youtubeData.history.forEach(video => {
      const category = video.category || 'Unknown';
      categoryData[category] = (categoryData[category] || 0) + video.duration;
    });
    
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    // Check if chart already exists and destroy it
    if (window.categoryChart) {
      window.categoryChart.destroy();
    }
    
    // Generate colors for categories
    const colors = Object.keys(categoryData).map((_, index) => {
      const hue = (index * 137) % 360; // Golden angle approximation for good distribution
      return `hsl(${hue}, 70%, 60%)`;
    });
    
    window.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categoryData),
        datasets: [{
          data: Object.values(categoryData).map(seconds => Math.floor(seconds / 60)),
          backgroundColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: {
                size: 10
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const minutes = context.raw;
                return `${context.label}: ${minutes} min`;
              }
            }
          }
        }
      }
    });
  }

  // Apply Filters Button Event
  const applyFiltersButton = document.getElementById('apply-filters');
  applyFiltersButton.addEventListener('click', () => {
    const filters = {
      date: document.getElementById('history-date').value,
      type: document.getElementById('history-type').value,
      durationMin: document.getElementById('duration-min').value ? parseInt(document.getElementById('duration-min').value) : null,
      durationMax: document.getElementById('duration-max').value ? parseInt(document.getElementById('duration-max').value) : null,
      category: document.getElementById('history-category').value
    };
    renderVideoHistory(filters);
  });

  // Settings button event
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      // Open dashboard in a new tab
      chrome.tabs.create({ url: 'dashboard.html' });
    });
  }

  // Listen for messages from background script or content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updatePopup' && request.totalTime) {
      // Update only the time display without reloading everything
      document.getElementById('time-today').textContent = formatTime(request.totalTime);
    }
    return true;
  });

  // Initial data load
  loadDataAndUpdateUI();

  // Set up periodic refresh (every 5 seconds)
  const refreshInterval = setInterval(() => {
    loadDataAndUpdateUI();
  }, 5000);

  // Clear interval when popup closes
  window.addEventListener('unload', () => {
    clearInterval(refreshInterval);
    clearInterval(sessionCheckInterval);
  });

  // Add active session indicator
  function updateActiveSessionIndicator() {
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      const activeSessionIndicator = document.getElementById('active-session');
      if (!activeSessionIndicator) return;
      
      const activeTabs = tabs.filter(tab => 
        tab.url.includes('youtube.com/watch') || 
        tab.url.includes('youtube.com/shorts')
      );
      
      if (activeTabs.length > 0) {
        activeSessionIndicator.innerHTML = `<i class="fas fa-circle"></i> ${activeTabs.length} active session${activeTabs.length > 1 ? 's' : ''}`;
        activeSessionIndicator.classList.add('active');
        
        // Request immediate time update from background script
        chrome.runtime.sendMessage({ action: 'requestTimeUpdate' });
        
        // Show active video titles on hover
        if (activeTabs.length <= 3) {
          const titles = activeTabs.map(tab => tab.title.replace(' - YouTube', ''));
          activeSessionIndicator.setAttribute('title', titles.join('\n'));
        } else {
          activeSessionIndicator.setAttribute('title', `${activeTabs.length} YouTube videos currently playing`);
        }
      } else {
        // No active YouTube tabs, stop tracking
        chrome.runtime.sendMessage({ action: 'stopTracking' });
        activeSessionIndicator.innerHTML = `<i class="fas fa-circle"></i> No active sessions`;
        activeSessionIndicator.classList.remove('active');
        activeSessionIndicator.removeAttribute('title');
      }
    });
  }

  // Check for active sessions every 3 seconds
  const sessionCheckInterval = setInterval(() => {
    updateActiveSessionIndicator();
  }, 3000);
  
  // Initial active session check
  updateActiveSessionIndicator();
  
  // Add export functionality
  document.getElementById('export-btn')?.addEventListener('click', () => {
    chrome.storage.local.get(['youtubeTimeData'], (result) => {
      if (result.youtubeTimeData) {
        const dataStr = JSON.stringify(result.youtubeTimeData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `youtube-tracker-export-${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    });
  });
  
  // Add reset data confirmation
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    const confirmReset = confirm('Are you sure you want to reset all tracking data? This cannot be undone.');
    if (confirmReset) {
      chrome.storage.local.remove(['youtubeTimeData'], () => {
        alert('All tracking data has been reset.');
        loadDataAndUpdateUI();
      });
    }
  });
  
  // Add goal setting functionality
  const dailyGoalInput = document.getElementById('daily-goal');
  if (dailyGoalInput) {
    // Load saved goal
    chrome.storage.local.get(['youtubeGoal'], (result) => {
      if (result.youtubeGoal) {
        dailyGoalInput.value = result.youtubeGoal;
        updateGoalProgress(result.youtubeGoal);
      }
    });
    
    // Save goal when changed
    dailyGoalInput.addEventListener('change', () => {
      const goalMinutes = parseInt(dailyGoalInput.value) || 0;
      chrome.storage.local.set({ youtubeGoal: goalMinutes });
      updateGoalProgress(goalMinutes);
    });
  }
  
  // Update goal progress visualization
  function updateGoalProgress(goalMinutes) {
    const progressElement = document.getElementById('goal-progress');
    if (!progressElement) return;
    
    const totalMinutes = Math.floor(youtubeData.totalTimeToday / 60);
    const percentage = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)) || 0;
    
    progressElement.style.width = `${percentage}%`;
    progressElement.setAttribute('aria-valuenow', percentage);
    
    // Update color based on percentage
    if (percentage >= 100) {
      progressElement.classList.remove('bg-success', 'bg-warning');
      progressElement.classList.add('bg-danger');
    } else if (percentage >= 75) {
      progressElement.classList.remove('bg-success', 'bg-danger');
      progressElement.classList.add('bg-warning');
    } else {
      progressElement.classList.remove('bg-warning', 'bg-danger');
      progressElement.classList.add('bg-success');
    }
    
    // Update goal text
    document.getElementById('goal-text').textContent = 
      `${totalMinutes} / ${goalMinutes} minutes (${percentage}%)`;
  }
  
  // Clear all intervals when popup closes
  window.addEventListener('unload', () => {
    clearInterval(refreshInterval);
    clearInterval(sessionCheckInterval);
  });
});

// Add this error handling to your existing popup.js file
document.addEventListener('DOMContentLoaded', function() {
  // Establish connection with background script
  function connectToBackground() {
    try {
      // Check if we can connect to the background script
      chrome.runtime.sendMessage({ action: 'ping' }, function(response) {
        if (chrome.runtime.lastError) {
          console.log('Connection to background script failed, retrying in 1 second...');
          setTimeout(connectToBackground, 1000);
          return;
        }
        
        if (response && response.status === 'ok') {
          console.log('Connected to background script successfully');
          // Once connected, load data and initialize UI
          loadDataAndUpdateUI();
        }
      });
    } catch (error) {
      console.error('Error connecting to background script:', error);
      // Show error message to user
      showConnectionError();
    }
  }
  
  // Show connection error message
  function showConnectionError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'connection-error';
    errorDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <p>Could not connect to extension background service.</p>
      <button id="retry-connection">Retry Connection</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    document.getElementById('retry-connection').addEventListener('click', function() {
      errorDiv.remove();
      connectToBackground();
    });
  }
  
  // Start connection attempt
  connectToBackground();
});