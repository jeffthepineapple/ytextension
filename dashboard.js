// YouTube Time Tracker - Dashboard Script

// Format seconds into HH:MM:SS
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Load and display data based on selected time range
function loadData(timeRange = 'today') {
  chrome.storage.local.get(['youtubeTimeData'], (result) => {
    if (result.youtubeTimeData) {
      const data = result.youtubeTimeData;
      
      // Calculate statistics based on time range
      let totalTime = 0;
      let avgTime = 0;
      let videoCount = 0;
      let channelCount = 0;
      let channelMap = new Map();
      let timeData = [];
      let labels = [];
      
      // Filter history based on time range
      const now = new Date();
      const filteredHistory = data.history.filter(item => {
        const itemDate = new Date(item.timestamp);
        
        switch(timeRange) {
          case 'today':
            return itemDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return itemDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            return itemDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(now);
            yearAgo.setFullYear(now.getFullYear() - 1);
            return itemDate >= yearAgo;
          default:
            return true;
        }
      });
      
      // Calculate statistics
      if (filteredHistory.length > 0) {
        // Total time
        totalTime = filteredHistory.reduce((sum, item) => sum + item.duration, 0);
        
        // Video count
        videoCount = filteredHistory.length;
        
        // Channel count (based on video titles as a proxy)
        filteredHistory.forEach(item => {
          // Extract channel from title (this is a simplification)
          const channelName = item.title.split(' - ')[1] || 'Unknown';
          
          if (!channelMap.has(channelName)) {
            channelMap.set(channelName, {
              name: channelName,
              time: item.duration,
              videos: 1
            });
          } else {
            const channel = channelMap.get(channelName);
            channel.time += item.duration;
            channel.videos += 1;
            channelMap.set(channelName, channel);
          }
        });
        
        channelCount = channelMap.size;
        
        // Calculate average daily time
        if (timeRange === 'today') {
          avgTime = totalTime;
        } else {
          // Get the number of unique days in the filtered history
          const uniqueDays = new Set();
          filteredHistory.forEach(item => {
            const date = new Date(item.timestamp).toDateString();
            uniqueDays.add(date);
          });
          
          avgTime = Math.floor(totalTime / Math.max(uniqueDays.size, 1));
        }
        
        // Prepare data for chart
        const timeMap = new Map();
        
        // Group by day/week/month based on time range
        filteredHistory.forEach(item => {
          const date = new Date(item.timestamp);
          let key;
          
          switch(timeRange) {
            case 'today':
              // Group by hour
              key = date.getHours();
              break;
            case 'week':
            case 'month':
              // Group by day
              key = date.toLocaleDateString();
              break;
            case 'year':
              // Group by month
              key = `${date.getMonth() + 1}/${date.getFullYear()}`;
              break;
          }
          
          if (!timeMap.has(key)) {
            timeMap.set(key, item.duration);
          } else {
            timeMap.set(key, timeMap.get(key) + item.duration);
          }
        });
        
        // Convert map to arrays for chart
        if (timeRange === 'today') {
          // For today, show all 24 hours
          for (let i = 0; i < 24; i++) {
            labels.push(`${i}:00`);
            timeData.push(timeMap.get(i) || 0);
          }
        } else {
          // Sort entries by date
          const sortedEntries = Array.from(timeMap.entries()).sort((a, b) => {
            if (timeRange === 'year') {
              // Parse month/year format
              const [aMonth, aYear] = a[0].split('/');
              const [bMonth, bYear] = b[0].split('/');
              return new Date(aYear, aMonth - 1) - new Date(bYear, bMonth - 1);
            }
            return new Date(a[0]) - new Date(b[0]);
          });
          
          sortedEntries.forEach(entry => {
            labels.push(entry[0]);
            timeData.push(entry[1]);
          });
        }
      }
      
      // Update UI with calculated statistics
      document.getElementById('total-time').textContent = formatTime(totalTime);
      document.getElementById('avg-time').textContent = formatTime(avgTime);
      document.getElementById('video-count').textContent = videoCount;
      document.getElementById('channel-count').textContent = channelCount;
      
      // Update channels list
      const channelsList = document.getElementById('channels-list');
      channelsList.innerHTML = '';
      
      // Sort channels by watch time
      const sortedChannels = Array.from(channelMap.values())
        .sort((a, b) => b.time - a.time)
        .slice(0, 5); // Show top 5 channels
      
      sortedChannels.forEach(channel => {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        channelItem.innerHTML = `
          <div class="channel-name">${channel.name}</div>
          <div class="channel-stats">
            <span>${formatTime(channel.time)}</span> • 
            <span>${channel.videos} video${channel.videos !== 1 ? 's' : ''}</span>
          </div>
        `;
        channelsList.appendChild(channelItem);
      });
      
      // Update recent videos
      const recentVideos = document.getElementById('recent-videos');
      recentVideos.innerHTML = '';
      
      // Show most recent 5 videos
      filteredHistory.slice(0, 5).forEach(video => {
        const videoItem = document.createElement('div');
        videoItem.className = 'recent-video';
        videoItem.innerHTML = `
          <div class="video-thumbnail">
            <img src="https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg" alt="Video thumbnail">
            <span class="video-duration">${formatTime(video.duration)}</span>
          </div>
          <div class="video-info">
            <div class="video-title">${video.title}</div>
            <div class="video-date">${new Date(video.timestamp).toLocaleDateString()}</div>
          </div>
        `;
        recentVideos.appendChild(videoItem);
      });
      
      // Create/update chart
      updateChart(labels, timeData);
    }
  });
}

// Create and update the time chart
function updateChart(labels, data) {
  const ctx = document.getElementById('time-chart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.timeChart) {
    window.timeChart.destroy();
  }
  
  // Create new chart
  window.timeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Watch Time (seconds)',
        data: data,
        backgroundColor: 'rgba(255, 0, 0, 0.7)',
        borderColor: 'rgba(255, 0, 0, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatTime(value);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatTime(context.raw);
            }
          }
        }
      }
    }
  });
}

// Set up theme and layout selectors
function setupThemeAndLayout() {
  const themeSelector = document.getElementById('theme-selector');
  const layoutSelector = document.getElementById('layout-selector');
  const body = document.body;
  
  // Load saved preferences
  chrome.storage.local.get(['dashboardTheme', 'dashboardLayout'], (result) => {
    if (result.dashboardTheme) {
      themeSelector.value = result.dashboardTheme;
      body.className = `dashboard ${result.dashboardTheme}`;
    }
    
    if (result.dashboardLayout) {
      layoutSelector.value = result.dashboardLayout;
      body.classList.add(result.dashboardLayout);
    }
  });
  
  // Theme selector change handler
  themeSelector.addEventListener('change', () => {
    // Remove all theme classes
    body.classList.remove('dark-theme', 'minimal-theme');
    
    // Add selected theme class if not default
    if (themeSelector.value !== 'default') {
      body.classList.add(themeSelector.value);
    }
    
    // Save preference
    chrome.storage.local.set({ 'dashboardTheme': themeSelector.value });
  });
  
  // Layout selector change handler
  layoutSelector.addEventListener('change', () => {
    // Remove all layout classes
    body.classList.remove('layout-compact', 'layout-spacious');
    
    // Add selected layout class if not default
    if (layoutSelector.value !== 'default') {
      body.classList.add(layoutSelector.value);
    }
    
    // Save preference
    chrome.storage.local.set({ 'dashboardLayout': layoutSelector.value });
  });
}

// Set up time range selector
function setupTimeRangeSelector() {
  const timeRangeOptions = document.querySelectorAll('.time-range-option');
  
  // Load saved preference
  chrome.storage.local.get(['dashboardTimeRange'], (result) => {
    if (result.dashboardTimeRange) {
      // Remove active class from all options
      timeRangeOptions.forEach(option => option.classList.remove('active'));
      
      // Add active class to saved option
      const savedOption = document.querySelector(`.time-range-option[data-range="${result.dashboardTimeRange}"]`);
      if (savedOption) {
        savedOption.classList.add('active');
        loadData(result.dashboardTimeRange);
      } else {
        // Fallback to today if saved option not found
        document.querySelector('.time-range-option[data-range="today"]').classList.add('active');
        loadData('today');
      }
    } else {
      // Default to today
      loadData('today');
    }
  });
  
  // Time range option click handler
  timeRangeOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove active class from all options
      timeRangeOptions.forEach(opt => opt.classList.remove('active'));
      
      // Add active class to clicked option
      option.classList.add('active');
      
      // Get selected time range
      const timeRange = option.getAttribute('data-range');
      
      // Load data for selected time range
      loadData(timeRange);
      
      // Save preference
      chrome.storage.local.set({ 'dashboardTimeRange': timeRange });
    });
  });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  setupThemeAndLayout();
  setupTimeRangeSelector();
  
  // Add CSS for additional elements
  const style = document.createElement('style');
  style.textContent = `
    .channel-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color);
    }
    
    .channel-item:last-child {
      border-bottom: none;
    }
    
    .channel-name {
      font-weight: 500;
    }
    
    .channel-stats {
      color: var(--text-color);
      opacity: 0.7;
      font-size: 14px;
    }
    
    .recent-video {
      display: flex;
      margin-bottom: 15px;
    }
    
    .recent-video:last-child {
      margin-bottom: 0;
    }
    
    .video-thumbnail {
      width: 120px;
      height: 68px;
      position: relative;
      margin-right: 10px;
    }
    
    .video-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }
    
    .video-duration {
      position: absolute;
      bottom: 5px;
      right: 5px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      font-size: 12px;
      padding: 1px 4px;
      border-radius: 2px;
    }
    
    .video-title {
      font-weight: 500;
      margin-bottom: 5px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .video-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    
    .video-date {
      font-size: 12px;
      color: var(--text-color);
      opacity: 0.7;
    }
    
    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .header-title i {
      font-size: 24px;
    }
    
    .header-title h1 {
      font-size: 20px;
      font-weight: 500;
    }
  `;
  document.head.appendChild(style);
});