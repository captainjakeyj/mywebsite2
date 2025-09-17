let santa = document.getElementById("santa");
let present = document.getElementById("present");
let scoreDisplay = document.getElementById("score");
let finalScoreDisplay = document.getElementById("final-score");
let startText = document.getElementById("start-text");

// 🎵 Graceful fallback if audio elements are missing
let bgMusic = document.getElementById("bg-music") || new Audio();
let presentSound = document.getElementById("present-sound") || new Audio();

let gameActive = false;
let presentCount = 0;
let presentSpeed = 5;
let santaSpeed = 7;
let presentY = 0;

let keysHeld = {
  ArrowLeft: false,
  ArrowRight: false
};

// 📱 Touch controls
let touchStartX = null;

document.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
});

document.addEventListener("touchmove", (e) => {
  if (!gameActive) return;
  let touchX = e.touches[0].clientX;
  let deltaX = touchX - touchStartX;

  if (Math.abs(deltaX) > 10) {
    if (deltaX < 0) {
      keysHeld["ArrowLeft"] = true;
      keysHeld["ArrowRight"] = false;
    } else {
      keysHeld["ArrowRight"] = true;
      keysHeld["ArrowLeft"] = false;
    }
  }
});

document.addEventListener("touchend", () => {
  keysHeld["ArrowLeft"] = false;
  keysHeld["ArrowRight"] = false;
});

function getPresentSpeed(count) {
  if (count >= 75) return 18;
  if (count >= 50) return 14;
  if (count >= 30) return 11;
  if (count >= 15) return 8;
  return 5;
}

function getSantaSpeed(count) {
  if (count >= 75) return 20;
  if (count >= 50) return 16;
  if (count >= 30) return 13;
  if (count >= 15) return 10;
  return 7;
}

function resetPresent() {
  presentY = 0;
  present.style.top = "0px";
  present.style.left = `${Math.floor(Math.random() * 700)}px`;
}

function movePresent(delta) {
  let normalizedSpeed = presentSpeed * (delta / 16.67); // Normalize to ~60fps
  presentY += normalizedSpeed;
  present.style.top = `${presentY}px`;

  let santaRect = santa.getBoundingClientRect();
  let presentRect = present.getBoundingClientRect();

  if (
    presentRect.bottom >= santaRect.top &&
    presentRect.left < santaRect.right &&
    presentRect.right > santaRect.left
  ) {
    presentCount++;
    scoreDisplay.textContent = `Presents: ${presentCount}`;
    resetPresent();
    try {
      presentSound.currentTime = 0;
      presentSound.play();
    } catch (err) {
      console.warn("Present sound failed:", err);
    }
  } else if (presentY >= 600) {
    gameActive = false;
    finalScoreDisplay.textContent = `Final Presents Caught: ${presentCount}`;
    finalScoreDisplay.classList.remove("hidden");
    resetPresent();
  }
}

function moveSanta() {
  let left = parseInt(santa.style.left || "200");
  if (keysHeld["ArrowLeft"]) left -= santaSpeed;
  if (keysHeld["ArrowRight"]) left += santaSpeed;
  santa.style.left = `${Math.max(0, Math.min(600, left))}px`;
}

document.addEventListener("keydown", (e) => {
  keysHeld[e.code] = true;

  if (!gameActive && e.code === "Space") {
    gameActive = true;
    presentCount = 0;
    scoreDisplay.textContent = "Presents: 0";
    finalScoreDisplay.classList.add("hidden");
    startText.style.display = "none";
    resetPresent();
    try {
      bgMusic.play();
    } catch (err) {
      console.warn("Background music failed:", err);
    }
  }
});

document.addEventListener("keyup", (e) => {
  keysHeld[e.code] = false;
});

let lastTime = performance.now();

function gameLoop(currentTime) {
  let delta = currentTime - lastTime;
  lastTime = currentTime;

  if (gameActive) {
    presentSpeed = getPresentSpeed(presentCount);
    santaSpeed = getSantaSpeed(presentCount);
    movePresent(delta);
    moveSanta();
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
