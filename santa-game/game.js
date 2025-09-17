(() => {
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

  const WIDTH = 800;
  const HEIGHT = 600;

  let gameActive = false;
  let presents = 0;

  const santa = { w: 130, h: 150, x: 100, y: HEIGHT - 150 };
  const present = { w: 100, h: 100, x: 300, y: 0 };

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

  const keys = { ArrowLeft: false, ArrowRight: false };

  window.addEventListener("keydown", e => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = true;
    if (!gameActive && e.code === "Space") startGame();
  });

  window.addEventListener("keyup", e => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = false;
  });

  function bindButton(btn, dir) {
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      keys[dir] = true;
      btn.classList.add("active");
    });
    btn.addEventListener("pointerup", e => {
      e.preventDefault();
      keys[dir] = false;
      btn.classList.remove("active");
    });
    btn.addEventListener("pointerleave", () => {
      keys[dir] = false;
      btn.classList.remove("active");
    });
  }

  bindButton(btnLeft, "ArrowLeft");
  bindButton(btnRight, "ArrowRight");

  // Tap anywhere to start
  menuScreen.addEventListener("pointerdown", () => {
    if (!gameActive) startGame();
  });

  function startGame() {
    gameActive = true;
    presents = 0;
    scoreEl.textContent = "PRESENTS: 0";
    finalScore.classList.add("hidden");
    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    resetPresent();
    try { bgMusic.play().catch(() => {}); } catch {}
  }

  function resetPresent() {
    present.y = 0;
    const mid = randInt(50, 750);
    present.x = mid - present.w / 2;
    syncPresent();
  }

  function moveSanta(dt) {
    const speed = getSantaSpeed(presents);
    const scaled = speed * (dt / 16.67);
    if (keys.ArrowLeft)  santa.x -= scaled;
    if (keys.ArrowRight) santa.x += scaled;
    santa.x = clamp(santa.x, 1, WIDTH - santa.w - 1);
    syncSanta();
  }

  function movePresent(dt) {
    const speed = getPresentSpeed(presents);
    const scaled = speed * (dt / 16.67);
    present.y += scaled;
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

  function syncSanta() {
    santaEl.style.left = `${santa.x}px`;
  }

  function syncPresent() {
    presentEl.style.left = `${present.x}px`;
    presentEl.style.top  = `${present.y}px`;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  }

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

    let lastTime = performance.now();

  function loop(now) {
    const dt = now - lastTime;
    lastTime = now;

    if (gameActive) {
      moveSanta(dt);
      movePresent(dt);
    }

    drawSnow();
    requestAnimationFrame(loop);
  }

  syncSanta();
  syncPresent();
  requestAnimationFrame(loop);
})();

