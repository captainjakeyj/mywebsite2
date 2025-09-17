(() => {
  // Elements
  const menuScreen = document.getElementById("menu-screen");
  const gameScreen = document.getElementById("game-screen");
  const startText = document.getElementById("start-text");
  const finalScore = document.getElementById("final-score");
  const scoreEl = document.getElementById("score");
  const santaEl = document.getElementById("santa");
  const presentEl = document.getElementById("present");
  const snowCanvas = document.getElementById("snow");
  const bgMusic = document.getElementById("bg-music");
  const presentSound = document.getElementById("present-sound");

  const btnLeft = document.getElementById("btn-left");
  const btnRight = document.getElementById("btn-right");

  // Game constants
  const WIDTH = 800;
  const HEIGHT = 600;

  // State
  let gameActive = false;
  let presents = 0;

  // Santa (visual size in CSS: 130x150). Logic uses game-space coordinates
  const santa = { w: 130, h: 150, x: 100, y: HEIGHT - 150 };

  // Present
  const present = { w: 100, h: 100, x: 300, y: 0 };

  // Difficulty levels (same tuning)
  const levels = [
    { threshold: 0,  speed: 5,  santaSpeed: 7  },
    { threshold: 15, speed: 8,  santaSpeed: 10 },
    { threshold: 30, speed: 11, santaSpeed: 13 },
    { threshold: 50, speed: 14, santaSpeed: 16 },
    { threshold: 75, speed: 18, santaSpeed: 20 }
  ];

  function getPresentSpeed(c) {
    for (let i = levels.length - 1; i >= 0; i--) if (c >= levels[i].threshold) return levels[i].speed;
    return levels[0].speed;
  }
  function getSantaSpeed(c) {
    for (let i = levels.length - 1; i >= 0; i--) if (c >= levels[i].threshold) return levels[i].santaSpeed;
    return levels[0].santaSpeed;
  }

  // Input state
  const keys = { ArrowLeft: false, ArrowRight: false };
  let touchState = { left: false, right: false, pointerId: null, startX: 0, startY: 0 };

  // Keyboard handlers (desktop)
  window.addEventListener("keydown", e => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      keys[e.code] = true;
      e.preventDefault();
    }
    if (!gameActive && e.code === "Space") startGame();
  }, { passive: false });

  window.addEventListener("keyup", e => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      keys[e.code] = false;
      e.preventDefault();
    }
  }, { passive: false });

  // Touch / pointer helpers
  function setTouchDirection(dir, on) {
    if (dir === "left") touchState.left = on;
    if (dir === "right") touchState.right = on;
    // mirror to keys so move logic can read one source
    keys.ArrowLeft = touchState.left;
    keys.ArrowRight = touchState.right;
    // update visual active state
    btnLeft.classList.toggle("active", touchState.left);
    btnRight.classList.toggle("active", touchState.right);
  }

  // Button touch/click handlers
  function bindButton(btn, dir) {
    // pointer events (covers mouse + touch + pen)
    btn.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      btn.setPointerCapture(ev.pointerId);
      setTouchDirection(dir, true);
    });
    btn.addEventListener("pointerup", (ev) => {
      ev.preventDefault();
      try { btn.releasePointerCapture(ev.pointerId); } catch {}
      setTouchDirection(dir, false);
    });
    btn.addEventListener("pointercancel", (ev) => {
      ev.preventDefault();
      setTouchDirection(dir, false);
    });
    // ensure leaving button area cancels movement
    btn.addEventListener("pointerleave", (ev) => {
      if (ev.pressure === 0 || ev.buttons === 0) setTouchDirection(dir, false);
    });
  }

  bindButton(btnLeft, "left");
  bindButton(btnRight, "right");

  // Full-screen drag & swipe support on the game area
  // - short horizontal swipe will move Santa a fixed amount (responsively)
  // - dragging left/right will translate to continuous movement while dragging
  const gameArea = document.getElementById("game-area");

  let dragging = false;
  let dragPointerId = null;

  gameArea.addEventListener("pointerdown", (ev) => {
    // only start drag on touch / pen / primary mouse
    if (ev.isPrimary) {
      dragging = true;
      dragPointerId = ev.pointerId;
      touchState.pointerId = ev.pointerId;
      touchState.startX = ev.clientX;
      touchState.startY = ev.clientY;
      // For drag, compute local X relative to game area center:
      updateDragMovement(ev.clientX);
      gameArea.setPointerCapture(ev.pointerId);
    }
  });

  gameArea.addEventListener("pointermove", (ev) => {
    if (!dragging || ev.pointerId !== dragPointerId) return;
    ev.preventDefault();
    // Update continuous movement based on horizontal delta from start or screen center
    updateDragMovement(ev.clientX);
  });

  gameArea.addEventListener("pointerup", (ev) => {
    if (ev.pointerId !== dragPointerId) return;
    endDrag(ev);
  });

  gameArea.addEventListener("pointercancel", (ev) => {
    if (ev.pointerId !== dragPointerId) return;
    endDrag(ev);
  });

  function endDrag(ev) {
    dragging = false;
    dragPointerId = null;
    touchState.pointerId = null;
    touchState.startX = 0;
    touchState.startY = 0;
    setTouchDirection("left", false);
    setTouchDirection("right", false);
    try { gameArea.releasePointerCapture(ev.pointerId); } catch {}
  }

  // Map pointer X to left/right pressed. This gives responsive control:
  // - touch left half => move left
  // - touch right half => move right
  // - a small central deadzone stops movement
  function updateDragMovement(clientX) {
    const rect = gameArea.getBoundingClientRect();
    const localX = clientX - rect.left;
    const dead = 24; // px deadzone around center
    const center = rect.width / 2;
    if (localX < center - dead) {
      setTouchDirection("left", true);
      setTouchDirection("right", false);
    } else if (localX > center + dead) {
      setTouchDirection("left", false);
      setTouchDirection("right", true);
    } else {
      setTouchDirection("left", false);
      setTouchDirection("right", false);
    }
  }

  // Swipe detection for quick moves (optional): if quick horizontal swipe, move Santa a step
  let lastPointer = { time: 0, x: 0, y: 0 };
  gameArea.addEventListener("pointerdown", (e) => {
    lastPointer.time = performance.now();
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
  });
  gameArea.addEventListener("pointerup", (e) => {
    const dt = performance.now() - lastPointer.time;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    const velX = Math.abs(dx) / Math.max(1, dt);
    const minVel = 0.5; // px per ms threshold
    const minDx = 40;
    if (Math.abs(dx) > minDx && Math.abs(dy) < 80 && velX > minVel) {
      // quick swipe horizontally => nudge santa
      if (dx > 0) nudgeSanta(60); else nudgeSanta(-60);
    }
  });

  function nudgeSanta(px) {
    santa.x += px;
    santa.x = clamp(santa.x, 1, WIDTH - santa.w - 1);
    syncSanta();
  }

  // Start game (menu -> play)
  function startGame() {
    gameActive = true;
    presents = 0;
    scoreEl.textContent = "PRESENTS: 0";
    finalScore.classList.add("hidden");
    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    resetPresent();
    // user interaction required for audio on mobile; play tries safely
    try { bgMusic.play().catch(() => {}); } catch {}
  }

  // Present helpers
  function resetPresent() {
    present.y = 0;
    const mid = randInt(50, 750);
    present.x = mid - present.w / 2;
    syncPresent();
  }

  // Movement & logic
  function moveSanta() {
    const speed = getSantaSpeed(presents);
    if (keys.ArrowLeft)  santa.x -= speed;
    if (keys.ArrowRight) santa.x += speed;
    santa.x = clamp(santa.x, 1, WIDTH - santa.w - 1);
    syncSanta();
  }

  function movePresent() {
    present.y += getPresentSpeed(presents);
    syncPresent();

    if (rectsOverlap(santa, present)) {
      presents++;
      scoreEl.textContent = `PRESENTS: ${presents}`;
      resetPresent();
      try { presentSound.currentTime = 0; presentSound.play().catch(() => {}); } catch {}
    } else if (present.y >= HEIGHT + present.h) {
      gameActive = false;
      finalScore.textContent = `FINAL PRESENTS CAUGHT: ${presents}`;
      finalScore.classList.remove("hidden");
      menuScreen.classList.remove("hidden");
      gameScreen.classList.add("hidden");
      resetPresent();
    }
  }

  // DOM sync
  function syncSanta() {
    santaEl.style.left = `${santa.x}px`;
  }
  function syncPresent() {
    presentEl.style.left = `${present.x}px`;
    presentEl.style.top  = `${present.y}px`;
  }

  // Utils
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // Snow (same lightweight implementation)
  const snow = {
    ctx: snowCanvas.getContext("2d"),
    flakes: Array.from({ length: 120 }, () => newFlake())
  };
  function newFlake() {
    return {
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      r: 1 + Math.random() * 2.2,
      s: 0.5 + Math.random() * 1.2,
      w: (Math.random() - 0.5) * 0.6
    };
  }
  function drawSnow() {
    const { ctx, flakes } = snow;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const f of flakes) {
      f.y += f.s;
      f.x += f.w;
      if (f.y > HEIGHT) { f.y = -4; f.x = Math.random() * WIDTH; }
      if (f.x < -4) f.x = WIDTH + 4;
      if (f.x > WIDTH + 4) f.x = -4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Main loop
  let last = performance.now();
  function loop(t) {
    const dt = t - last;
    last = t;

    if (gameActive) {
      moveSanta();
      movePresent();
    }

    drawSnow();
    requestAnimationFrame(loop);
  }

  // Initial sync
  syncSanta();
  syncPresent();
  requestAnimationFrame(loop);

  // Expose start via menu overlay (space or touch)
  // Start also on tapping the menu screen
  menuScreen.addEventListener("pointerdown", () => {
    // Guard: if pointerdown happens because of accidental drag, require a short delay? keep simple:
    startGame();
  });

  // Improve accessibility: allow screen tap to start even on mobile
  startText.addEventListener("pointerdown", () => startGame());
})();
