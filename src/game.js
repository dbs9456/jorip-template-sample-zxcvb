import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

const symbols = ["SEVEN", "BAR", "LUCK", "BELL", "STAR"];
const posterText = [
  "PULL PULL PULL SPIN STOP MATCH",
  "SEVEN BAR LUCK BELL STAR",
  "FRAME SCREEN FRAME SCREEN",
  "JACKPOT FANFARE TRY AGAIN",
].join(" ").repeat(12);

const elements = {
  canvas: document.getElementById("typeField"),
  typeStage: document.querySelector(".type-stage"),
  machineWrap: document.querySelector(".slot-shell"),
  reels: Array.from({ length: 3 }, (_, index) => document.getElementById(`reel${index}`)),
  reelFrames: Array.from(document.querySelectorAll(".reel")),
  result: document.getElementById("result"),
  spinButton: document.getElementById("spinButton"),
  leverLabel: document.getElementById("leverLabel"),
  spinCount: document.getElementById("spinCount"),
  hitCount: document.getElementById("hitCount"),
  shareButton: document.getElementById("shareButton"),
  soundToggle: document.getElementById("soundToggle"),
  confetti: document.getElementById("confetti"),
};

const state = {
  spinning: false,
  sound: true,
  spins: readNumber("triple-noise-spins"),
  hits: readNumber("triple-noise-hits"),
  audioContext: null,
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const preparedTextCache = new Map();
let posterFrame = 0;
let posterLines = [];
let posterMetrics = null;
let celebrationFrame = 0;
let celebrationPreviousTime = 0;
let celebrationParticles = [];
let pointerSample = null;

function readNumber(key) {
  try {
    const value = Number.parseInt(localStorage.getItem(key) || "0", 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveScore() {
  try {
    localStorage.setItem("triple-noise-spins", String(state.spins));
    localStorage.setItem("triple-noise-hits", String(state.hits));
  } catch {
    // The game still works when storage is disabled.
  }
}

function randomIndex(max) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

function pickTargets() {
  const shouldWin = randomIndex(100) < 22;
  if (shouldWin) {
    const symbol = symbols[randomIndex(symbols.length)];
    return [symbol, symbol, symbol];
  }

  let result;
  do {
    result = Array.from({ length: 3 }, () => symbols[randomIndex(symbols.length)]);
  } while (result[0] === result[1] && result[1] === result[2]);
  return result;
}

function setSymbol(index, symbol) {
  const reel = elements.reels[index];
  reel.textContent = symbol;
  reel.dataset.symbol = symbol;
}

function ensureAudio() {
  if (!state.sound) return null;
  if (!state.audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    state.audioContext = new AudioContext();
  }
  if (state.audioContext.state === "suspended") state.audioContext.resume();
  return state.audioContext;
}

function tone(frequency, start, duration, type = "square", gainValue = 0.055) {
  const context = ensureAudio();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
  gain.gain.setValueAtTime(0.0001, context.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(context.currentTime + start);
  oscillator.stop(context.currentTime + start + duration + 0.02);
}

function playTick(pitch = 220) {
  tone(pitch, 0, 0.035, "square", 0.018);
}

function playStop(index) {
  tone(150 + index * 55, 0, 0.09, "sawtooth", 0.035);
}

function playMiss() {
  tone(180, 0, 0.13, "sawtooth", 0.035);
  tone(120, 0.11, 0.2, "triangle", 0.04);
}

function playFanfare() {
  const melody = [
    [523.25, 0, 0.18],
    [659.25, 0.16, 0.18],
    [783.99, 0.32, 0.2],
    [1046.5, 0.5, 0.34],
    [880, 0.88, 0.18],
    [1046.5, 1.04, 0.18],
    [1318.51, 1.2, 0.3],
    [1567.98, 1.5, 0.24],
    [1318.51, 1.72, 0.24],
    [1046.5, 1.94, 0.34],
  ];
  melody.forEach(([frequency, start, duration]) => {
    tone(frequency, start, duration, "square", 0.052);
    tone(frequency / 2, start, duration, "triangle", 0.026);
  });

  const finale = [
    [523.25, 2.34, 1.28],
    [659.25, 2.34, 1.28],
    [783.99, 2.34, 1.28],
    [1046.5, 2.34, 1.28],
  ];
  finale.forEach(([frequency, start, duration]) => {
    tone(frequency, start, duration, "square", 0.038);
    tone(frequency / 2, start, duration, "triangle", 0.018);
  });

  tone(130.81, 0, 0.3, "sawtooth", 0.025);
  tone(196, 0.88, 0.28, "sawtooth", 0.025);
  tone(261.63, 1.5, 0.34, "sawtooth", 0.028);
  tone(130.81, 2.34, 1.28, "triangle", 0.03);
}

function sleep(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function animateReel(index, target, duration) {
  const frame = elements.reelFrames[index];
  frame.classList.add("is-spinning");
  const started = performance.now();
  let lastTick = 0;

  while (performance.now() - started < duration) {
    const elapsed = performance.now() - started;
    setSymbol(index, symbols[randomIndex(symbols.length)]);
    if (elapsed - lastTick > 125) {
      playTick(180 + index * 55);
      lastTick = elapsed;
    }
    await sleep(prefersReducedMotion.matches ? 85 : 62 + index * 8);
  }

  setSymbol(index, target);
  frame.classList.remove("is-spinning");
  playStop(index);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function seedCelebrationParticle(particle, initial = false) {
  const width = Math.max(1, Math.ceil(window.innerWidth));
  const height = Math.max(1, Math.ceil(window.innerHeight));
  particle.x = randomIndex(width);
  particle.y = initial ? randomIndex(height) : -40 - randomIndex(180);
  particle.vx = (randomIndex(121) - 60) / 10;
  particle.vy = 48 + randomIndex(88);
  particle.rotation = randomIndex(360);
  particle.spin = (randomIndex(181) - 90) / 10;
}

function stopCelebration() {
  cancelAnimationFrame(celebrationFrame);
  celebrationFrame = 0;
  celebrationPreviousTime = 0;
  celebrationParticles = [];
  pointerSample = null;
  elements.confetti.replaceChildren();
}

function animateCelebration(time) {
  if (!celebrationParticles.length) return;
  const delta = celebrationPreviousTime
    ? Math.min(0.034, Math.max(0.001, (time - celebrationPreviousTime) / 1000))
    : 0.016;
  celebrationPreviousTime = time;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const drag = Math.pow(0.987, delta * 60);

  celebrationParticles.forEach((particle) => {
    particle.vx *= drag;
    particle.vy = Math.min(280, particle.vy + 24 * delta);
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.rotation += particle.spin * delta * 6;

    if (particle.y > height + 80) {
      seedCelebrationParticle(particle);
    } else if (particle.x < -140) {
      particle.x = width + 80;
    } else if (particle.x > width + 140) {
      particle.x = -80;
    }

    particle.element.style.transform =
      `translate3d(${particle.x}px, ${particle.y}px, 0) rotate(${particle.rotation}deg)`;
  });

  celebrationFrame = requestAnimationFrame(animateCelebration);
}

function rememberPointer(event) {
  if (!celebrationParticles.length || prefersReducedMotion.matches) return;
  pointerSample = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
  };
}

function stirCelebration(event) {
  if (!celebrationParticles.length || prefersReducedMotion.matches) return;
  const now = performance.now();
  const current = { x: event.clientX, y: event.clientY, time: now };
  if (!pointerSample) {
    pointerSample = current;
    return;
  }

  const elapsed = now - pointerSample.time;
  if (elapsed <= 0 || elapsed > 140) {
    pointerSample = current;
    return;
  }

  const velocityX = clamp(((current.x - pointerSample.x) / elapsed) * 1000, -1800, 1800);
  const velocityY = clamp(((current.y - pointerSample.y) / elapsed) * 1000, -1800, 1800);
  const pointerSpeed = Math.hypot(velocityX, velocityY);
  pointerSample = current;
  if (pointerSpeed < 35) return;

  const radius = Math.min(180, Math.max(120, window.innerWidth * 0.13));
  celebrationParticles.forEach((particle) => {
    const offsetX = particle.x - current.x;
    const offsetY = particle.y - current.y;
    const distance = Math.hypot(offsetX, offsetY);
    if (distance >= radius) return;

    const influence = 1 - distance / radius;
    const normalX = distance > 1 ? offsetX / distance : 0;
    const normalY = distance > 1 ? offsetY / distance : -1;
    particle.vx = clamp(
      particle.vx + velocityX * 0.24 * influence + normalX * 190 * influence,
      -900,
      900,
    );
    particle.vy = clamp(
      particle.vy + velocityY * 0.24 * influence + normalY * 190 * influence,
      -900,
      900,
    );
    particle.spin = clamp(
      particle.spin + (velocityX - velocityY) * 0.018 * influence,
      -80,
      80,
    );
  });
}

function burstConfetti() {
  const colors = ["#ff3b30", "#1747ff", "#dfff00", "#ff8fbc", "#fffdf5"];
  const glyphs = ["WIN", "JACKPOT", "SEVEN", "LUCK", "MATCH"];
  stopCelebration();

  for (let index = 0; index < 90; index += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti-piece";
    piece.textContent = glyphs[randomIndex(glyphs.length)];
    piece.style.color = colors[randomIndex(colors.length)];
    elements.confetti.append(piece);

    if (prefersReducedMotion.matches) {
      piece.style.left = `${randomIndex(96)}%`;
      piece.style.top = `${randomIndex(96)}%`;
      piece.style.transform = `rotate(${randomIndex(100) - 50}deg)`;
      continue;
    }

    const particle = {
      element: piece,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rotation: 0,
      spin: 0,
    };
    seedCelebrationParticle(particle, true);
    piece.style.transform =
      `translate3d(${particle.x}px, ${particle.y}px, 0) rotate(${particle.rotation}deg)`;
    celebrationParticles.push(particle);
  }

  if (celebrationParticles.length) {
    celebrationFrame = requestAnimationFrame(animateCelebration);
  }
}

async function spin() {
  if (state.spinning) return;
  state.spinning = true;
  stopCelebration();
  ensureAudio();
  elements.spinButton.disabled = true;
  elements.spinButton.classList.add("is-pulled");
  elements.leverLabel.textContent = "GO!!";
  elements.result.textContent = "SPINNING...";
  elements.machineWrap.classList.remove("win-flash");
  window.setTimeout(() => elements.spinButton.classList.remove("is-pulled"), 430);

  const targets = pickTargets();
  const durations = prefersReducedMotion.matches ? [420, 540, 660] : [900, 1220, 1540];
  await Promise.all(targets.map((target, index) => animateReel(index, target, durations[index])));

  const won = targets.every((symbol) => symbol === targets[0]);
  state.spins += 1;
  if (won) state.hits += 1;
  saveScore();
  renderScore();

  if (won) {
    elements.result.textContent = `JACKPOT: ${targets[0]} ${targets[0]} ${targets[0]}`;
    elements.machineWrap.classList.add("win-flash");
    playFanfare();
    burstConfetti();
    window.setTimeout(() => elements.machineWrap.classList.remove("win-flash"), 3700);
  } else {
    elements.result.textContent = "MISS / PULL AGAIN";
    playMiss();
  }

  state.spinning = false;
  elements.spinButton.disabled = false;
  elements.spinButton.classList.remove("is-pulled");
  elements.leverLabel.textContent = "PULL";
  elements.spinButton.focus({ preventScroll: true });
}

function renderScore() {
  elements.spinCount.textContent = String(state.spins);
  elements.hitCount.textContent = String(state.hits);
}

function toggleSound() {
  state.sound = !state.sound;
  elements.soundToggle.textContent = `SOUND: ${state.sound ? "ON" : "OFF"}`;
  elements.soundToggle.setAttribute("aria-pressed", String(state.sound));
  if (state.sound) {
    ensureAudio();
    tone(440, 0, 0.08, "square", 0.035);
  }
}

async function copyShareText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("copy_failed");
}

async function shareGame() {
  const url = `${window.location.origin}${window.location.pathname}`;
  const result = elements.result.textContent.trim();
  const text = `TRIPLE NOISE / ${result} / SPIN ${state.spins} / HIT ${state.hits}`;
  const shareText = `${text}\n${url}`;
  let label = "SHARE";

  elements.shareButton.disabled = true;
  try {
    if (navigator.share) {
      await navigator.share({ title: "TRIPLE NOISE", text, url });
      label = "SHARED";
    } else {
      await copyShareText(shareText);
      label = "COPIED";
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      try {
        await copyShareText(shareText);
        label = "COPIED";
      } catch {
        label = "COPY FAILED";
      }
    }
  } finally {
    elements.shareButton.textContent = label;
    elements.shareButton.disabled = false;
    if (label !== "SHARE") {
      window.setTimeout(() => {
        elements.shareButton.textContent = "SHARE";
      }, 1600);
    }
  }
}

function preparePoster() {
  const rect = elements.typeStage.getBoundingClientRect();
  const mobile = rect.width < 700;
  const fontSize = mobile ? 12 : 20;
  const lineHeight = mobile ? 14 : 23;
  const font = `900 ${fontSize}px Arial`;
  const cacheKey = `${font}|${posterText}`;

  if (!preparedTextCache.has(cacheKey)) {
    preparedTextCache.set(
      cacheKey,
      prepareWithSegments(posterText, font, {
        wordBreak: "keep-all",
        letterSpacing: mobile ? 0 : -0.8,
      }),
    );
  }

  const maxWidth = Math.max(160, rect.width * (mobile ? 0.62 : 0.34));
  posterLines = layoutWithLines(preparedTextCache.get(cacheKey), maxWidth, lineHeight).lines;
  posterMetrics = { rect, font, lineHeight, mobile };

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  elements.canvas.width = Math.max(1, Math.round(rect.width * dpr));
  elements.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  elements.canvas.style.width = `${rect.width}px`;
  elements.canvas.style.height = `${rect.height}px`;
}

function drawPoster(time = 0) {
  if (!posterMetrics) return;
  const context = elements.canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const { rect, font, lineHeight, mobile } = posterMetrics;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.font = font;
  context.textBaseline = "top";

  posterLines.forEach((line, index) => {
    const speed = prefersReducedMotion.matches ? 0 : 0.018 + (index % 5) * 0.004;
    const y = (index * lineHeight + time * speed) % (rect.height + lineHeight * 3) - lineHeight * 2;
    const column = index % (mobile ? 3 : 5);
    const columnWidth = rect.width / (mobile ? 2.4 : 4.4);
    const jitter = prefersReducedMotion.matches ? 0 : Math.sin(time / 1100 + index) * 16;
    const x = column * columnWidth - columnWidth * 0.18 + jitter;
    context.fillStyle = index % 7 === 0 ? "#ff4033" : index % 5 === 0 ? "#3152ff" : "#dcff00";
    context.save();
    context.translate(x, y);
    context.rotate((index % 5 - 2) * (mobile ? 0.002 : 0.004));
    context.fillText(line.text, 0, 0);
    context.restore();
  });

  if (!prefersReducedMotion.matches) posterFrame = requestAnimationFrame(drawPoster);
}

function refreshPoster() {
  cancelAnimationFrame(posterFrame);
  preparePoster();
  drawPoster();
}

const resizeObserver = new ResizeObserver(refreshPoster);
resizeObserver.observe(elements.typeStage);
prefersReducedMotion.addEventListener("change", () => {
  refreshPoster();
  if (elements.confetti.childElementCount) burstConfetti();
});

elements.spinButton.addEventListener("click", spin);
elements.shareButton.addEventListener("click", shareGame);
elements.soundToggle.addEventListener("click", toggleSound);
window.addEventListener("pointerdown", rememberPointer, { passive: true });
window.addEventListener("pointermove", stirCelebration, { passive: true });
window.addEventListener("pointercancel", () => {
  pointerSample = null;
});
window.addEventListener("blur", () => {
  pointerSample = null;
});
window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat || state.spinning) return;
  if (event.target instanceof HTMLButtonElement) return;
  event.preventDefault();
  spin();
});

renderScore();
refreshPoster();
