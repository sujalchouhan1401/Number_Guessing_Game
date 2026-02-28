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
//  Game Logic
// ==========================================

let secretNumber, guessCount, gameOver, low, high;

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
const gameCard = document.getElementById('game-card');
const bestScoreEl = document.getElementById('best-score');
const gamesTodayEl = document.getElementById('games-today');
const rulesBtn = document.getElementById('rules-btn');
const rulesModal = document.getElementById('rules-modal');
const closeRulesBtn = document.getElementById('close-rules-btn');

function initGame() {
  secretNumber = Math.floor(Math.random() * 100) + 1;
  guessCount = 0;
  gameOver = false;
  low = 0;
  high = 0;

  guessInput.value = '';
  guessInput.disabled = false;
  guessBtn.classList.remove('hidden');
  restartBtn.classList.add('hidden');

  hintBox.className = 'hint-box';
  hintIcon.textContent = '🎯';
  hintText.textContent = 'Pick a number between 1 and 100!';

  guessCountEl.textContent = '0';
  rangeMinEl.textContent = '0';
  rangeMaxEl.textContent = '0';
  updateRangeBar();

  loadDailyStats();
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

  bestScoreEl.textContent = stats.bestScore !== null ? stats.bestScore : '—';
  gamesTodayEl.textContent = stats.gamesPlayed;
}

function saveDailyStats(score) {
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

  bestScoreEl.textContent = stats.bestScore;
  bestScoreEl.classList.add('number-pop');
  gamesTodayEl.textContent = stats.gamesPlayed;
  gamesTodayEl.classList.add('number-pop');
  setTimeout(() => {
    bestScoreEl.classList.remove('number-pop');
    gamesTodayEl.classList.remove('number-pop');
  }, 300);
}

function updateRangeBar() {
  // Fill represents how narrow the range has become
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
    hintBox.className = 'hint-box hint-win bounce-in';
    hintIcon.textContent = '🎉';
    hintText.textContent = `Congratulations! You got it in ${guessCount} guess${guessCount > 1 ? 'es' : ''}!`;

    guessInput.disabled = true;
    guessBtn.classList.add('hidden');
    restartBtn.classList.remove('hidden');

    gameCard.classList.add('pulse');
    rangeFill.style.width = '100%';

    launchConfetti();
    boostShapes();
    saveDailyStats(guessCount);
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
  initGame();
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
initGame();
