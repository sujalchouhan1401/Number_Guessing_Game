// ==========================================
//  Three.js 3D Animated Background
// ==========================================

let scene, camera, renderer, shapes = [];

function initThreeScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('bg-canvas'),
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Soft ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Colorful point lights
  const lights = [
    { color: 0xff6b9d, pos: [10, 10, 10] },
    { color: 0xa855f7, pos: [-10, -10, 10] },
    { color: 0x38bdf8, pos: [10, -10, -10] },
    { color: 0x34d399, pos: [-10, 10, -10] },
  ];

  lights.forEach(l => {
    const pl = new THREE.PointLight(l.color, 1.2, 60);
    pl.position.set(...l.pos);
    scene.add(pl);
  });

  // Create floating shapes
  const geometries = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TorusGeometry(0.8, 0.35, 16, 32),
    new THREE.TorusKnotGeometry(0.7, 0.25, 64, 8),
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.SphereGeometry(0.8, 32, 32),
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.ConeGeometry(0.8, 1.4, 6),
    new THREE.TetrahedronGeometry(1, 0),
  ];

  const colors = [0xff6b9d, 0xff8a65, 0xa855f7, 0x38bdf8, 0x34d399, 0xfbbf24, 0xf472b6, 0x818cf8, 0x22d3ee];

  for (let i = 0; i < 35; i++) {
    const geo = geometries[Math.floor(Math.random() * geometries.length)];
    const mat = new THREE.MeshPhongMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.55 + Math.random() * 0.3,
      shininess: 100,
      wireframe: Math.random() > 0.6,
    });

    const mesh = new THREE.Mesh(geo, mat);
    const scale = 0.4 + Math.random() * 1.2;
    mesh.scale.set(scale, scale, scale);

    mesh.position.set(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 35,
      (Math.random() - 0.5) * 30 - 5
    );

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Store motion data
    mesh.userData = {
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.01,
      },
      floatSpeed: 0.3 + Math.random() * 0.7,
      floatAmplitude: 0.5 + Math.random() * 1.5,
      baseY: mesh.position.y,
      phase: Math.random() * Math.PI * 2,
    };

    scene.add(mesh);
    shapes.push(mesh);
  }

  window.addEventListener('resize', onResize);
  animate();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const t = Date.now() * 0.001;

  shapes.forEach(mesh => {
    const d = mesh.userData;
    mesh.rotation.x += d.rotSpeed.x;
    mesh.rotation.y += d.rotSpeed.y;
    mesh.rotation.z += d.rotSpeed.z;
    mesh.position.y = d.baseY + Math.sin(t * d.floatSpeed + d.phase) * d.floatAmplitude;
  });

  // Slowly rotate the whole scene 
  scene.rotation.y = Math.sin(t * 0.1) * 0.15;
  scene.rotation.x = Math.cos(t * 0.08) * 0.08;

  renderer.render(scene, camera);
}

// ==========================================
//  Game Logic (CPU & Multiplayer)
// ==========================================

let secretNumber, guessCount, gameOver, low, high;
let currentMode = 'CPU'; // 'CPU' or 'MP'
let mpTimeLeft = 30;
let mpTimerInterval = null;

// UI Elements: Screens
const screenMenu = document.getElementById('screen-menu');
const screenMpLobby = document.getElementById('screen-mp-lobby');
const screenMpWaiting = document.getElementById('screen-mp-waiting');
const screenMpChoose = document.getElementById('screen-mp-choose');
const screenGameplay = document.getElementById('screen-gameplay');
const screens = [screenMenu, screenMpLobby, screenMpWaiting, screenMpChoose, screenGameplay];

// UI Elements: General
const gameCard = document.getElementById('game-card');
const rulesBtn = document.getElementById('rules-btn');
const rulesModal = document.getElementById('rules-modal');
const closeRulesBtn = document.getElementById('close-rules-btn');

// UI Elements: Menu
const btnPlayCpu = document.getElementById('btn-play-cpu');
const btnPlayFriends = document.getElementById('btn-play-friends');
const bestScoreEls = document.querySelectorAll('.best-score-val');
const gamesTodayEls = document.querySelectorAll('.games-today-val');
const gameplayDailyStats = document.getElementById('gameplay-daily-stats');

// UI Elements: MP Lobby & Waiting
const btnBackMpLobby = document.getElementById('btn-back-mp-lobby');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const roomCodeInput = document.getElementById('room-code-input');
const displayRoomCode = document.getElementById('display-room-code');
const btnBackMpWait = document.getElementById('btn-back-mp-wait');
const mpMockStatus = document.getElementById('mp-mock-status');

// UI Elements: MP Choose Number
const mpChooseTimer = document.getElementById('mp-choose-timer');
const mpSecretInput = document.getElementById('mp-secret-input');
const btnSubmitSecret = document.getElementById('btn-submit-secret');

// UI Elements: Gameplay
const gameplayTitle = document.getElementById('gameplay-title');
const gameplaySubtitle = document.getElementById('gameplay-subtitle');
const btnBackGameplay = document.getElementById('btn-back-gameplay');
const guessInput = document.getElementById('guess-input');
const guessBtn = document.getElementById('guess-btn');
const restartBtn = document.getElementById('restart-btn');
const hintBox = document.getElementById('hint-box');
const hintIcon = document.getElementById('hint-icon');
const hintText = document.getElementById('hint-text');
const guessCountEl = document.getElementById('guess-count');
const rangeMinEl = document.getElementById('range-min');
const rangeMaxEl = document.getElementById('range-max');
const rangeFill = document.getElementById('range-fill');
const gameInputGroup = document.getElementById('game-input-group');

// --- Screen Navigation ---
function showScreen(targetScreen) {
  screens.forEach(s => s.classList.add('hidden'));
  targetScreen.classList.remove('hidden');
}

// --- Init Application ---
function initApp() {
  loadDailyStats();
  showScreen(screenMenu);
}

// --- Menu Actions ---
btnPlayCpu.addEventListener('click', () => {
  currentMode = 'CPU';
  initGameplay();
  showScreen(screenGameplay);
});

btnPlayFriends.addEventListener('click', () => {
  currentMode = 'MP';
  roomCodeInput.value = '';
  showScreen(screenMpLobby);
});

btnBackMpLobby.addEventListener('click', () => showScreen(screenMenu));
btnBackMpWait.addEventListener('click', () => showScreen(screenMpLobby));
btnBackGameplay.addEventListener('click', () => showScreen(screenMenu));

// --- Multiplayer Cross-Tab Networking via localStorage ---
let myRole = null; // 'p1' or 'p2'
let currentRoom = null;
let roomCheckInterval = null;
let gameOverProcessed = false;

btnCreateRoom.addEventListener('click', () => {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 letters is easier to share
  currentRoom = {
    code: code,
    state: 'waiting',
    p1: { secret: null, guesses: 0, done: false },
    p2: { joined: false, secret: null, guesses: 0, done: false }
  };
  localStorage.setItem('ngg_room', JSON.stringify(currentRoom));
  myRole = 'p1';

  displayRoomCode.textContent = code;
  mpMockStatus.textContent = "Waiting for friend to join... (Open in a new tab to test!)";
  showScreen(screenMpWaiting);

  startRoomPolling();
});

btnJoinRoom.addEventListener('click', () => {
  const codeInput = roomCodeInput.value.trim().toUpperCase();
  const roomData = localStorage.getItem('ngg_room');

  if (codeInput.length >= 4 && roomData) {
    const room = JSON.parse(roomData);
    if (room.code === codeInput && room.state === 'waiting') {
      // Successful join
      room.p2.joined = true;
      room.state = 'choosing';
      localStorage.setItem('ngg_room', JSON.stringify(room));
      myRole = 'p2';
      currentRoom = room;

      displayRoomCode.textContent = codeInput;
      mpMockStatus.textContent = "Joined! Starting...";
      showScreen(screenMpWaiting);

      startRoomPolling();
      setTimeout(startMpChooseNumber, 1000);
      return;
    }
  }

  // Failed to join
  gameCard.classList.add('shake');
  setTimeout(() => gameCard.classList.remove('shake'), 500);
  const oldText = btnJoinRoom.textContent;
  btnJoinRoom.textContent = "Invalid code!";
  setTimeout(() => btnJoinRoom.textContent = "Join", 1500);
});

function startRoomPolling() {
  if (roomCheckInterval) clearInterval(roomCheckInterval);
  roomCheckInterval = setInterval(pollRoom, 1000);
}

function pollRoom() {
  const roomData = localStorage.getItem('ngg_room');
  if (!roomData) return;
  const room = JSON.parse(roomData);

  // Wait -> Choosing (P1 sees P2 joined)
  if (myRole === 'p1' && currentRoom.state === 'waiting' && room.state === 'choosing' && room.p2.joined) {
    currentRoom = room;
    mpMockStatus.textContent = "Player 2 joined! Starting...";
    setTimeout(startMpChooseNumber, 1000);
  }

  // Choosing -> Both have secrets -> transition to 'playing'
  if (currentRoom.state === 'choosing') {
    if (room.p1.secret !== null && room.p2.secret !== null) {
      room.state = 'playing';
      if (myRole === 'p1') localStorage.setItem('ngg_room', JSON.stringify(room));
      currentRoom = room;

      const oppSecret = myRole === 'p1' ? room.p2.secret : room.p1.secret;
      startMpGameplay(oppSecret);
    } else {
      currentRoom = room;
    }
  }

  // Playing -> checking if opponent is done
  if (currentRoom.state === 'playing') {
    if (room.p1.done && room.p2.done && !gameOverProcessed) {
      gameOverProcessed = true;
      currentRoom = room;
      showMpResults(room.p1.guesses, room.p2.guesses);
      clearInterval(roomCheckInterval);
    } else {
      currentRoom = room;
    }
  }
}

function startMpChooseNumber() {
  showScreen(screenMpChoose);
  mpSecretInput.value = '';
  mpSecretInput.disabled = false;
  btnSubmitSecret.disabled = false;
  btnSubmitSecret.textContent = 'Set!';

  mpTimeLeft = 30;
  mpChooseTimer.textContent = `${mpTimeLeft}s`;

  clearInterval(mpTimerInterval);
  mpTimerInterval = setInterval(() => {
    mpTimeLeft--;
    mpChooseTimer.textContent = `${mpTimeLeft}s`;

    if (mpTimeLeft <= 0) {
      clearInterval(mpTimerInterval);
      // Auto submit default random if time runs out
      if (!mpSecretInput.disabled) {
        mpSecretInput.value = Math.floor(Math.random() * 100) + 1;
        submitMpSecret();
      }
    }
  }, 1000);
}

btnSubmitSecret.addEventListener('click', submitMpSecret);

function submitMpSecret() {
  const val = parseInt(mpSecretInput.value);
  if (isNaN(val) || val < 1 || val > 100) {
    gameCard.classList.add('shake');
    setTimeout(() => gameCard.classList.remove('shake'), 500);
    return;
  }

  // Lock input
  mpSecretInput.disabled = true;
  btnSubmitSecret.disabled = true;
  clearInterval(mpTimerInterval);
  btnSubmitSecret.textContent = 'Waiting for opponent...';

  // Update local storage
  const roomData = localStorage.getItem('ngg_room');
  if (roomData) {
    const room = JSON.parse(roomData);
    if (myRole === 'p1') room.p1.secret = val;
    if (myRole === 'p2') room.p2.secret = val;
    localStorage.setItem('ngg_room', JSON.stringify(room));
  }
}

function startMpGameplay(oppSecret) {
  gameOverProcessed = false;
  initGameplay(oppSecret);
  gameplayTitle.textContent = "VS Friend";
  gameplaySubtitle.textContent = myRole === 'p1' ? "Guess Player 2's number!" : "Guess Player 1's number!";
  showScreen(screenGameplay);
}

function showMpResults(p1Guesses, p2Guesses) {
  restartBtn.classList.remove('hidden');

  let myGuesses = myRole === 'p1' ? p1Guesses : p2Guesses;
  let oppGuesses = myRole === 'p1' ? p2Guesses : p1Guesses;

  let mpMsg = "";
  if (myGuesses < oppGuesses) {
    mpMsg = `You win! (${myGuesses} vs ${oppGuesses} guesses)`;
    hintBox.className = 'hint-box hint-win bounce-in';
  } else if (myGuesses > oppGuesses) {
    mpMsg = `You lost! (${myGuesses} vs ${oppGuesses} guesses)`;
    hintBox.className = 'hint-box hint-lower bounce-in';
  } else {
    mpMsg = `It's a tie! Both took ${myGuesses} guesses.`;
    hintBox.className = 'hint-box hint-win bounce-in';
  }

  hintIcon.textContent = '🏆';
  hintText.textContent = mpMsg;
}

// --- Gameplay Logic ---
function initGameplay(forcedSecret = null) {
  gameplayTitle.textContent = "Number Guess";
  gameplaySubtitle.textContent = "Can you crack the secret number?";

  secretNumber = forcedSecret || (Math.floor(Math.random() * 100) + 1);
  guessCount = 0;
  gameOver = false;
  low = 0;
  high = 0;

  gameInputGroup.classList.remove('hidden');
  guessInput.value = '';
  guessInput.disabled = false;
  guessBtn.classList.remove('hidden');
  restartBtn.classList.add('hidden');

  if (currentMode === 'CPU') {
    restartBtn.textContent = '🔄 Play Again';
    gameplayDailyStats.classList.remove('hidden');
  } else {
    restartBtn.textContent = '🏠 Back to Menu';
    gameplayDailyStats.classList.add('hidden');
  }

  hintBox.className = 'hint-box';
  hintIcon.textContent = '🎯';
  hintText.textContent = 'Pick a number between 1 and 100!';

  guessCountEl.textContent = '0';
  rangeMinEl.textContent = '0';
  rangeMaxEl.textContent = '0';
  updateRangeBar();

  guessInput.focus();
}

// ==========================================
//  Daily Stats (localStorage)
// ==========================================

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadDailyStats() {
  const today = getTodayKey();
  const raw = localStorage.getItem('numberGuessStats');
  let stats = raw ? JSON.parse(raw) : null;

  // Reset if it's a new day
  if (!stats || stats.date !== today) {
    stats = { date: today, bestScore: null, gamesPlayed: 0 };
    localStorage.setItem('numberGuessStats', JSON.stringify(stats));
  }

  bestScoreEls.forEach(el => el.textContent = stats.bestScore !== null ? stats.bestScore : '—');
  gamesTodayEls.forEach(el => el.textContent = stats.gamesPlayed);
}

function saveDailyStats(score) {
  if (currentMode !== 'CPU') return; // Only save stats for CPU mode

  const today = getTodayKey();
  const raw = localStorage.getItem('numberGuessStats');
  let stats = raw ? JSON.parse(raw) : { date: today, bestScore: null, gamesPlayed: 0 };

  // Reset if somehow date changed mid-session
  if (stats.date !== today) {
    stats = { date: today, bestScore: null, gamesPlayed: 0 };
  }

  stats.gamesPlayed++;
  if (stats.bestScore === null || score < stats.bestScore) {
    stats.bestScore = score;
  }

  localStorage.setItem('numberGuessStats', JSON.stringify(stats));

  bestScoreEls.forEach(el => {
    el.textContent = stats.bestScore;
    el.classList.add('number-pop');
  });
  gamesTodayEls.forEach(el => {
    el.textContent = stats.gamesPlayed;
    el.classList.add('number-pop');
  });

  setTimeout(() => {
    bestScoreEls.forEach(el => el.classList.remove('number-pop'));
    gamesTodayEls.forEach(el => el.classList.remove('number-pop'));
  }, 300);
}

function updateRangeBar() {
  // Keep original visual logic:
  const totalRange = 100;
  const currentRange = high - low + 1;
  const progress = ((totalRange - currentRange) / totalRange) * 100;
  rangeFill.style.width = progress + '%';
}

function makeGuess() {
  if (gameOver) return;

  const value = parseInt(guessInput.value);
  if (isNaN(value) || value < 1 || value > 100) {
    // Shake for invalid input
    gameCard.classList.add('shake');
    setTimeout(() => gameCard.classList.remove('shake'), 500);
    hintBox.className = 'hint-box';
    hintIcon.textContent = '⚠️';
    hintText.textContent = 'Enter a valid number (1–100)!';
    return;
  }

  guessCount++;
  guessCountEl.textContent = guessCount;
  guessCountEl.classList.add('number-pop');
  setTimeout(() => guessCountEl.classList.remove('number-pop'), 300);

  if (value > secretNumber) {
    // Too high → go lower
    high++;
    rangeMaxEl.textContent = high;
    rangeMaxEl.classList.add('number-pop');
    setTimeout(() => rangeMaxEl.classList.remove('number-pop'), 300);
    updateRangeBar();

    hintBox.className = 'hint-box hint-lower';
    hintIcon.textContent = '⬇️';
    hintText.textContent = 'Lower Number Please!';

    gameCard.classList.add('shake');
    setTimeout(() => gameCard.classList.remove('shake'), 500);

  } else if (value < secretNumber) {
    // Too low → go higher
    low++;
    rangeMinEl.textContent = low;
    rangeMinEl.classList.add('number-pop');
    setTimeout(() => rangeMinEl.classList.remove('number-pop'), 300);
    updateRangeBar();

    hintBox.className = 'hint-box hint-higher';
    hintIcon.textContent = '⬆️';
    hintText.textContent = 'Higher Number Please!';

    gameCard.classList.add('shake');
    setTimeout(() => gameCard.classList.remove('shake'), 500);

  } else {
    // Correct!
    gameOver = true;

    gameInputGroup.classList.add('hidden');
    guessInput.disabled = true;
    guessBtn.classList.add('hidden');

    gameCard.classList.add('pulse');
    rangeFill.style.width = '100%';

    launchConfetti();
    boostShapes();

    if (currentMode === 'CPU') {
      restartBtn.classList.remove('hidden');
      hintBox.className = 'hint-box hint-win bounce-in';
      hintIcon.textContent = '🎉';
      hintText.textContent = `You got it in ${guessCount} guess${guessCount > 1 ? 'es' : ''}!`;
      saveDailyStats(guessCount);
    } else {
      // Multiplayer logic - wait for opponent
      hintBox.className = 'hint-box';
      hintIcon.textContent = '⏳';
      hintText.textContent = `You took ${guessCount} guesses! Waiting for opponent...`;

      const roomData = localStorage.getItem('ngg_room');
      if (roomData) {
        const room = JSON.parse(roomData);
        if (myRole === 'p1') { room.p1.guesses = guessCount; room.p1.done = true; }
        if (myRole === 'p2') { room.p2.guesses = guessCount; room.p2.done = true; }
        localStorage.setItem('ngg_room', JSON.stringify(room));
      }

      pollRoom(); // Trigger immediately just in case
    }
  }

  guessInput.value = '';
  guessInput.focus();
}

// ==========================================
//  Confetti Burst
// ==========================================

function launchConfetti() {
  const confettiColors = ['#ff6b9d', '#ff8a65', '#a855f7', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#818cf8', '#22d3ee'];

  for (let i = 0; i < 80; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.top = -10 + 'px';
      el.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      el.style.width = (6 + Math.random() * 8) + 'px';
      el.style.height = (6 + Math.random() * 8) + 'px';
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      el.style.animationDuration = (2 + Math.random() * 3) + 's';
      el.style.animationDelay = '0s';
      document.body.appendChild(el);

      setTimeout(() => el.remove(), 5000);
    }, i * 30);
  }
}

// ==========================================
//  Boost 3D shapes on win
// ==========================================

function boostShapes() {
  shapes.forEach(mesh => {
    mesh.userData.rotSpeed.x *= 3;
    mesh.userData.rotSpeed.y *= 3;
    mesh.userData.floatAmplitude *= 2;
  });

  // Return to normal after 3 seconds
  setTimeout(() => {
    shapes.forEach(mesh => {
      mesh.userData.rotSpeed.x /= 3;
      mesh.userData.rotSpeed.y /= 3;
      mesh.userData.floatAmplitude /= 2;
    });
  }, 3000);
}

// ==========================================
//  Event Listeners
// ==========================================

guessBtn.addEventListener('click', makeGuess);

guessInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') makeGuess();
});

restartBtn.addEventListener('click', () => {
  gameCard.classList.remove('pulse');
  if (currentMode === 'CPU') {
    initGameplay();
  } else {
    showScreen(screenMenu);
  }
});

rulesBtn.addEventListener('click', () => {
  rulesModal.classList.remove('hidden');
});

closeRulesBtn.addEventListener('click', () => {
  rulesModal.classList.add('hidden');
});

rulesModal.addEventListener('click', (e) => {
  if (e.target === rulesModal) {
    rulesModal.classList.add('hidden');
  }
});

// ==========================================
//  Initialize Everything
// ==========================================

initThreeScene();
initApp();
