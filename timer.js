let timerInterval;
let isRunning = false;
let schedule = [];
let scheduleIndex = 0;
let currentTime = 0;
let totalSession = 45;
let workBlock = 20;
let breakBlock = 5;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateDisplay() {
  document.getElementById('timer').textContent = formatTime(currentTime);
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
          return;
        }
      }
    }, 1000);

    document.getElementById('startStopBtn').textContent = 'Stop';
    isRunning = true;
  }
}

function showNotification(message) {
  // Create a simple notification
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
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
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
