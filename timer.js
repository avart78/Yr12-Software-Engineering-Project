let timerInterval;
let isRunning = false;
let schedule = [];
let scheduleIndex = 0;
let currentTime = 0;

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
  } else {
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
        } else {
          clearInterval(timerInterval);
          isRunning = false;
          document.getElementById('startStopBtn').textContent = 'Start';
          alert("All sessions completed!");
          return;
        }
      }
    }, 1000);

    document.getElementById('startStopBtn').textContent = 'Stop';
  }
  isRunning = !isRunning;
}

document.getElementById('startStopBtn').addEventListener('click', startStopTimer);

document.getElementById('setScheduleBtn').addEventListener('click', () => {
  const total = parseInt(document.getElementById('totalInput').value) || 0;
  const work = parseInt(document.getElementById('workInput').value) || 0;
  const breakTime = parseInt(document.getElementById('breakInput').value) || 0;

  schedule = [];
  scheduleIndex = 0;

  let timeRemaining = total;
  while (timeRemaining >= work + breakTime) {
    schedule.push({ type: 'Work', duration: work });
    schedule.push({ type: 'Break', duration: breakTime });
    timeRemaining -= (work + breakTime);
  }

  if (timeRemaining >= work) {
    schedule.push({ type: 'Work', duration: work });
    timeRemaining -= work;
  } else if (timeRemaining > 0) {
    schedule.push({ type: 'Work', duration: timeRemaining });
    timeRemaining = 0;
  }

  currentTime = schedule[0].duration * 60;
  updateDisplay();

  let summaryHTML = `<h3>Your Work Schedule:</h3><ul>`;
  schedule.forEach((block, i) => {
    summaryHTML += `<li>${block.type}: ${block.duration} min</li>`;
  });
  summaryHTML += `</ul>`;
  document.getElementById('scheduleDisplay').innerHTML = summaryHTML;
});
