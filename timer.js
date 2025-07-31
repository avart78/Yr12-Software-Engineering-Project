let timerInterval;
let isRunning = false;
let schedule = [];
let scheduleIndex = 0;
let currentTime = 0;
let totalSession = 45;
let workBlock = 20;
let breakBlock = 5;
// Timer function, default setting are displayed and set to 45, 20, 5

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateDisplay() {
  document.getElementById('timer').textContent = formatTime(currentTime);
}

function showRatingPopup() {
  // Create rating modal
  const modal = document.createElement('div');
  modal.id = 'ratingModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    max-width: 400px;
    width: 90%;
  `;

  modalContent.innerHTML = `
    <h2 style="margin-bottom: 20px; color: #333;">Rate Your Session</h2>
    <p style="margin-bottom: 20px; color: #666;">How productive was your work session?</p>
    <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
      ${[1, 2, 3, 4, 5].map(num => `
        <button class="rating-btn" data-rating="${num}" style="
          width: 50px;
          height: 50px;
          border: 2px solid #ddd;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          transition: all 0.3s ease;
        ">${num}</button>
      `).join('')}
    </div>
    <button id="submitRating" style="
      background: #28a745;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      display: none;
    ">Submit Rating</button>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Add event listeners
  const ratingBtns = modal.querySelectorAll('.rating-btn');
  const submitBtn = modal.querySelector('#submitRating');
  let selectedRating = null;

  ratingBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Reset all buttons
      ratingBtns.forEach(b => {
        b.style.background = 'white';
        b.style.borderColor = '#ddd';
        b.style.color = '#333';
      });
      
      // Highlight selected button
      this.style.background = '#28a745';
      this.style.borderColor = '#28a745';
      this.style.color = 'white';
      
      selectedRating = this.dataset.rating;
      submitBtn.style.display = 'inline-block';
    });
  });

  submitBtn.addEventListener('click', function() {
    if (selectedRating) {
      saveRating(selectedRating);
      modal.remove();
    }
  });
}

function saveRating(rating) {
  fetch('back-end.php?action=rate_session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `rating=${rating}`
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('Rating saved! Thank you for your feedback.');
    } else {
      showNotification('Failed to save rating. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error saving rating:', error);
    showNotification('Failed to save rating. Please try again.');
  });
}

function startStopTimer() {
  if (isRunning) {
    clearInterval(timerInterval);
    document.getElementById('startStopBtn').textContent = 'Start';
    isRunning = false;
  } else {
    if (schedule.length === 0) {
      // Create default schedule if none exists
      createSchedule();
    }

    if (schedule.length === 0) return;

    currentTime = schedule[scheduleIndex].duration * 60;
    updateDisplay();

    timerInterval = setInterval(() => {
      if (currentTime > 0) {
        currentTime--;
        updateDisplay();
      } else {
        scheduleIndex++;
        if (scheduleIndex < schedule.length) {
          currentTime = schedule[scheduleIndex].duration * 60;
          updateDisplay();
          
          // Show notification for break/work transition
          const currentBlock = schedule[scheduleIndex];
          if (currentBlock.type === 'Break') {
            showNotification('Break time! Take a rest.');
          } else {
            showNotification('Work time! Let\'s get focused.');
          }
        } else {
          clearInterval(timerInterval);
          isRunning = false;
          document.getElementById('startStopBtn').textContent = 'Start';
          showNotification('Session completed! Great job!');
          
          // Check if user is logged in and show rating popup
          checkSessionAndShowRating();
          return;
        }
      }
    }, 1000);

    document.getElementById('startStopBtn').textContent = 'Stop';
    isRunning = true;
  }
}

function checkSessionAndShowRating() {
  fetch('back-end.php?action=session')
    .then(res => res.json())
    .then(data => {
      if (data.logged_in) {
        // Small delay to let the completion notification show first
        setTimeout(() => {
          showRatingPopup();
        }, 1000);
      }
    })
    .catch(error => {
      console.error('Error checking session:', error);
    });
}

function showNotification(message) {
  // Request notification permission if not already granted
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  // Browser notification (works even when tab is not active)
  if (Notification.permission === 'granted') {
    new Notification('Timer Complete', { 
      body: message,
      icon: 'weblogo.png',
      badge: 'weblogo.png',
      tag: 'timer-notification',
      requireInteraction: true,
      silent: false
    });
  }
  
  // Change tab title and color briefly to get attention
  const originalTitle = document.title;
  document.title = '⏰ ' + message + ' ⏰';
  
  // Change tab color briefly (if supported)
  if ('document' in window && 'title' in document) {
    const originalFavicon = document.querySelector('link[rel="icon"]');
    const tempFavicon = document.createElement('link');
    tempFavicon.rel = 'icon';
    tempFavicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>';
    document.head.appendChild(tempFavicon);
    
    setTimeout(() => {
      document.title = originalTitle;
      if (originalFavicon) {
        tempFavicon.remove();
      }
    }, 3000);
  }
  
  // Create a simple notification for when tab is active
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #28a745;
    color: white;
    padding: 1rem 2rem;
    border-radius: 5px;
    z-index: 1000;
    font-weight: bold;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    animation: slideIn 0.5s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

function createSchedule() {
  schedule = [];
  scheduleIndex = 0;

  let timeRemaining = totalSession;
  
  while (timeRemaining >= workBlock + breakBlock) {
    schedule.push({ type: 'Work', duration: workBlock });
    schedule.push({ type: 'Break', duration: breakBlock });
    timeRemaining -= (workBlock + breakBlock);
  }

  if (timeRemaining >= workBlock) {
    schedule.push({ type: 'Work', duration: workBlock });
    timeRemaining -= workBlock;
  } else if (timeRemaining > 0) {
    schedule.push({ type: 'Work', duration: timeRemaining });
    timeRemaining = 0;
  }

  if (schedule.length > 0) {
    currentTime = schedule[0].duration * 60;
    updateDisplay();
  }
}

function setSchedule() {
  const total = parseInt(document.getElementById('totalInput').value) || 45;
  const work = parseInt(document.getElementById('workInput').value) || 20;
  const breakTime = parseInt(document.getElementById('breakInput').value) || 5;

  totalSession = total;
  workBlock = work;
  breakBlock = breakTime;

  createSchedule();

  // Update schedule display
  let summaryHTML = `<h3>Your Work Schedule:</h3><ul>`;
  schedule.forEach((block, i) => {
    summaryHTML += `<li>${block.type}: ${block.duration} min</li>`;
  });
  summaryHTML += `</ul>`;
  document.getElementById('scheduleDisplay').innerHTML = summaryHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('startStopBtn').addEventListener('click', startStopTimer);
  document.getElementById('setScheduleBtn').addEventListener('click', setSchedule);
  
  // Initialize with default values
  createSchedule();
});
