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
const mpEndActions = document.getElementById('mp-end-actions');
const mpReplayBtn = document.getElementById('mp-replay-btn');
const mpQuitBtn = document.getElementById('mp-quit-btn');
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

function cleanupMP() {
  if (conn) { conn.close(); conn = null; }
  if (peer) { peer.destroy(); peer = null; }
}

btnBackMpLobby.addEventListener('click', () => { cleanupMP(); showScreen(screenMenu); });
btnBackMpWait.addEventListener('click', () => { cleanupMP(); showScreen(screenMpLobby); });
btnBackGameplay.addEventListener('click', () => { cleanupMP(); showScreen(screenMenu); });

// --- Multiplayer WebRTC Networking via PeerJS ---
let myRole = null; // 'p1' or 'p2'
let currentRoomCode = null;
let peer = null;
let conn = null;

let mySecret = null;
let oppSecret = null;
let myGuesses = 0;
let oppGuesses = 0;
let myDone = false;
let oppDone = false;
let myReplayChoice = null;
let oppReplayChoice = null;

// CREATE ROOM (P1)
btnCreateRoom.addEventListener('click', () => {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  currentRoomCode = code;
  myRole = 'p1';

  displayRoomCode.textContent = code;
  mpMockStatus.textContent = "Connecting to server...";
  showScreen(screenMpWaiting);

  peer = new Peer('ngg-room-' + code);

  peer.on('open', (id) => {
    mpMockStatus.textContent = "Waiting for friend to join...";
  });

  peer.on('connection', (c) => {
    conn = c;
    setupConnection();
  });

  peer.on('error', (err) => {
    mpMockStatus.textContent = "Error: " + err.type;
  });
});

// JOIN ROOM (P2)
btnJoinRoom.addEventListener('click', () => {
  const codeInput = roomCodeInput.value.trim().toUpperCase();
  if (codeInput.length < 4) {
    gameCard.classList.add('shake');
    setTimeout(() => gameCard.classList.remove('shake'), 500);
    return;
  }

  currentRoomCode = codeInput;
  myRole = 'p2';
  displayRoomCode.textContent = codeInput;
  mpMockStatus.textContent = "Connecting to server...";
  showScreen(screenMpWaiting);

  peer = new Peer();

  peer.on('open', () => {
    mpMockStatus.textContent = "Joining room...";
    conn = peer.connect('ngg-room-' + codeInput);

    conn.on('open', () => {
      setupConnection();
      conn.send({ type: 'join' }); // Tell P1 we joined
    });

    conn.on('error', (err) => {
      mpMockStatus.textContent = "Connection failed!";
    });
  });

  peer.on('error', (err) => {
    mpMockStatus.textContent = "Error! Room may not exist.";
  });
});

// Handle RTC Connection
function setupConnection() {
  mySecret = null; oppSecret = null;
  myDone = false; oppDone = false;
  myGuesses = 0; oppGuesses = 0;
  myReplayChoice = null; oppReplayChoice = null;

  conn.on('data', (data) => {
    if (data.type === 'join' && myRole === 'p1') {
      mpMockStatus.textContent = "Player 2 joined! Starting...";
      conn.send({ type: 'start_choose' });
      setTimeout(startMpChooseNumber, 1500);
    }
    else if (data.type === 'start_choose' && myRole === 'p2') {
      mpMockStatus.textContent = "Joined! Starting...";
      setTimeout(startMpChooseNumber, 1500);
    }
    else if (data.type === 'secret') {
      oppSecret = data.val;
      checkBothSecrets();
    }
    else if (data.type === 'done') {
      oppDone = true;
      oppGuesses = data.guesses;
      checkBothDone();
    }
    else if (data.type === 'replay') {
      oppReplayChoice = data.choice;
      checkBothReplay();
    }
  });

  conn.on('close', () => {
    if (currentMode === 'MP') {
      if (!gameOver) {
        hintBox.className = 'hint-box hint-lower bounce-in';
        hintIcon.textContent = '🔌';
        hintText.textContent = 'Opponent disconnected!';
        gameInputGroup.classList.add('hidden');
        restartBtn.classList.remove('hidden');
        restartBtn.textContent = '🏠 Back to Menu';
      } else {
        oppReplayChoice = false;
        checkBothReplay();
      }
    }
  });
}

function checkBothSecrets() {
  if (mySecret !== null && oppSecret !== null) {
    startMpGameplay(oppSecret);
  }
}

function checkBothDone() {
  if (myDone && oppDone) {
    showMpResults(myGuesses, oppGuesses);
  } else if (myDone && !oppDone) {
    hintBox.className = 'hint-box';
    hintIcon.textContent = '⏳';
    hintText.textContent = `You took ${myGuesses} guesses! Waiting for opponent...`;
  }
}

function checkBothReplay() {
  if (myReplayChoice === true && oppReplayChoice === true) {
    hintBox.className = 'hint-box hint-win bounce-in';
    hintIcon.textContent = '🎮';
    hintText.textContent = 'Starting next game...';
    setTimeout(() => {
      mySecret = null; oppSecret = null;
      myDone = false; oppDone = false;
      myGuesses = 0; oppGuesses = 0;
      myReplayChoice = null; oppReplayChoice = null;
      startMpChooseNumber();
    }, 1500);
  } else if (oppReplayChoice === false) {
    hintBox.className = 'hint-box hint-lower bounce-in';
    hintIcon.textContent = '👋';
    hintText.textContent = 'Opponent declined to play again.';
    if (mpReplayBtn) mpReplayBtn.style.display = 'none';
  }
}

// UI Copy Action
document.getElementById('btn-copy-code').addEventListener('click', () => {
  if (currentRoomCode) {
    navigator.clipboard.writeText(currentRoomCode);
    const btn = document.getElementById('btn-copy-code');
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = '📋', 1500);
  }
});

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

  // Send to peer
  mySecret = val;
  if (conn && conn.open) {
    conn.send({ type: 'secret', val: val });
  }
  checkBothSecrets();
}

function startMpGameplay(oppSecret) {
  initGameplay(oppSecret);
  gameplayTitle.textContent = "VS Friend";
  gameplaySubtitle.textContent = myRole === 'p1' ? "Guess Player 2's number!" : "Guess Player 1's number!";
  showScreen(screenGameplay);
}

function showMpResults(myG, oppG) {
  if (mpEndActions) {
    mpEndActions.classList.remove('hidden');
  }

  let mpMsg = "";
  if (myG < oppG) {
    mpMsg = `Scores: You ${myG} - ${oppG} Opponent. <span style="color: var(--mint); font-weight: bold;">You won!</span>`;
    hintBox.className = 'hint-box hint-win bounce-in';
  } else if (myG > oppG) {
    mpMsg = `Scores: You ${myG} - ${oppG} Opponent. <span style="color: var(--pink); font-weight: bold;">You loose!</span>`;
    hintBox.className = 'hint-box hint-lower bounce-in';
  } else {
    mpMsg = `Scores: You ${myG} - ${oppG} Opponent. <span style="color: var(--yellow); font-weight: bold;">It's a tie!</span>`;
    hintBox.className = 'hint-box hint-win bounce-in';
  }

  hintIcon.innerHTML = '🏆';
  hintText.innerHTML = mpMsg;
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
  if (mpEndActions) mpEndActions.classList.add('hidden');
  if (mpReplayBtn) {
    mpReplayBtn.disabled = false;
    mpReplayBtn.style.display = 'block';
    mpReplayBtn.textContent = '🔄 Replay';
  }
  if (mpQuitBtn) mpQuitBtn.disabled = false;

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

      myDone = true;
      myGuesses = guessCount;
      if (conn && conn.open) {
        conn.send({ type: 'done', guesses: guessCount });
      }

      checkBothDone();
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
    cleanupMP();
    showScreen(screenMenu);
  }
});

if (mpReplayBtn) {
  mpReplayBtn.addEventListener('click', () => {
    myReplayChoice = true;
    mpReplayBtn.disabled = true;
    mpReplayBtn.textContent = 'Waiting...';
    if (conn && conn.open) conn.send({ type: 'replay', choice: true });
    if (oppReplayChoice === null) {
      hintBox.className = 'hint-box';
      hintIcon.textContent = '⏳';
      hintText.textContent = 'Waiting for opponent...';
    }
    checkBothReplay();
  });
}

if (mpQuitBtn) {
  mpQuitBtn.addEventListener('click', () => {
    myReplayChoice = false;
    if (conn && conn.open) conn.send({ type: 'replay', choice: false });
    cleanupMP();
    showScreen(screenMenu);
  });
}

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
