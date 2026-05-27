"use strict";

const canvas = document.getElementById("roomCanvas");
const stage = document.getElementById("roomStage");
const homeZoomTransition = document.getElementById("homeZoomTransition");
const homePreviewFrame = document.getElementById("homePreviewFrame");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WORLD_WIDTH = WIDTH * 3;
const CENTER_SCREEN_X = WIDTH;
const CENTER_WORLD_X = CENTER_SCREEN_X + WIDTH / 2;
const DESK_LIGHT_WORLD_X = 1032;
const FRAME = 96;
const MOVE_SPEED = 240;
const KEY_SPEED = 272;
const FLOOR_TOP = 300;
const FLOOR_BOTTOM = 456;
const PET_FLOOR_Y = 476;
const ROOM_REQUIRES_SATOSHI = /(?:^|[?&])satoshi=required(?:&|$)/.test(window.location.search);
const ROOM_ENTRY_PULLBACK = /(?:^|[?&])entry=pullback(?:&|$)/.test(window.location.search);
const INITIAL_PET_VISIBLE = !ROOM_REQUIRES_SATOSHI;
const ROOM_NAV_TARGETS = {
  left: { x: WIDTH / 2 + 120, y: PET_FLOOR_Y },
  center: { x: DESK_LIGHT_WORLD_X, y: PET_FLOOR_Y },
  right: { x: WORLD_WIDTH - WIDTH / 2 + 28, y: PET_FLOOR_Y },
};
const ROOM_NAV_ORDER = [ROOM_NAV_TARGETS.left, ROOM_NAV_TARGETS.center, ROOM_NAV_TARGETS.right];

const PET_IMAGE = "./assets/pets/shadow-chibi-coin/spritesheet.png";
const CENTER_COMPUTER = { w: 430, h: 303 };
const CENTER_COMPUTER_RIGHT_SHIFT = 70;
const CENTER_COMPUTER_X = CENTER_WORLD_X - CENTER_COMPUTER.w / 2 + CENTER_COMPUTER_RIGHT_SHIFT;
const FULL_RUG = { w: 980, h: 106 };
const RIGHT_BED = { w: 430, h: 162 };
const MONITOR_SCREEN = {
  x: CENTER_COMPUTER_X + 86,
  y: 132,
  w: 260,
  h: 118,
};
const LIGHT_CONTROL = {
  trackX: DESK_LIGHT_WORLD_X - 112,
  y: 32,
  w: 252,
  h: 10,
  hitX: DESK_LIGHT_WORLD_X - 136,
  hitY: 14,
  hitW: 300,
  hitH: 54,
};
const SCREEN_CLOSE_HOLD_MS = 420;
const SCREEN_BLACK_HOLD_MS = 500;

const roomLayers = [
  {
    src: "./assets/rooms/shadow-cyber-room/horizontal/room-panorama.png",
    x: 0,
    y: 0,
    w: WORLD_WIDTH,
    h: HEIGHT,
  },
  {
    src: "./assets/rooms/shadow-cyber-room/horizontal/props/rug-full-overlay.png",
    x: 520,
    y: 376,
    w: FULL_RUG.w,
    h: FULL_RUG.h,
  },
  {
    src: "./assets/rooms/shadow-cyber-room/horizontal/props/front-computer-appm.png",
    x: CENTER_COMPUTER_X,
    y: 115,
    w: CENTER_COMPUTER.w,
    h: CENTER_COMPUTER.h,
  },
  {
    src: "./assets/rooms/shadow-cyber-room/horizontal/props/side-bed.png",
    x: WORLD_WIDTH - RIGHT_BED.w - 24,
    y: 292,
    w: RIGHT_BED.w,
    h: RIGHT_BED.h,
  },
];

const animations = {
  idle: { frames: [0, 1, 2, 3, 4, 5], fps: 4, loop: true },
  blink: { frames: [6, 7, 8, 9], fps: 8, loop: false },
  walk_left: { frames: [10, 11, 12, 13, 14, 15, 16, 17], fps: 8, loop: true },
  walk_right: { frames: [18, 19, 20, 21, 22, 23, 24, 25], fps: 8, loop: true },
  walk_up: { frames: [26, 27, 28, 29, 30, 31, 32, 33], fps: 8, loop: true },
  walk_down: { frames: [34, 35, 36, 37, 38, 39, 40, 41], fps: 8, loop: true },
  coin_trick: {
    frames: [42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
    fps: 10,
    loop: false,
  },
  spawn: { frames: [62, 63, 64, 65, 66, 67, 68, 69], fps: 12, loop: false },
  despawn: { frames: [70, 71, 72, 73, 74, 75, 76, 77], fps: 12, loop: false },
};

const frames = Array.from({ length: 78 }, (_, index) => ({
  x: (index % 8) * FRAME,
  y: Math.floor(index / 8) * FRAME,
  w: FRAME,
  h: FRAME,
}));

const pressed = new Set();
const sprite = new Image();
const layerImages = roomLayers.map((layer) => ({ ...layer, image: new Image() }));

let pet = { x: DESK_LIGHT_WORLD_X, y: PET_FLOOR_Y };
let target = { ...pet };
let animName = INITIAL_PET_VISIBLE ? "spawn" : "idle";
let localFrame = 0;
let frameAccum = 0;
let lastTime = performance.now();
let nextBlinkAt = lastTime + randomBetween(3600, 7600);
let nextCoinAt = lastTime + randomBetween(15000, 27000);
let movingByPointer = false;
let petVisible = INITIAL_PET_VISIBLE;
let satoshiPetAllowed = INITIAL_PET_VISIBLE;
let loadedAssets = 0;
let loopStarted = false;
let cameraX = DESK_LIGHT_WORLD_X - WIDTH / 2;
let roomLightLevel = 0;
let draggingLightControl = false;
let enteringHome = false;
let roomEntryAnimating = false;
let homePreviewLoaded = !homePreviewFrame;
let latestHomePreviewSatoshiStatus = null;
const homePreviewLoadWaiters = [];

function resetRoomView() {
  pet = { x: DESK_LIGHT_WORLD_X, y: PET_FLOOR_Y };
  target = { ...pet };
  movingByPointer = false;
  draggingLightControl = false;
  pressed.clear();
  petVisible = satoshiPetAllowed;
  setAnimation("idle");
  cameraX = clamp(Math.round(DESK_LIGHT_WORLD_X - WIDTH / 2), 0, WORLD_WIDTH - WIDTH);
  render();
  canvas.focus();
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function setAnimation(name) {
  if (animName !== name) {
    animName = name;
    localFrame = 0;
    frameAccum = 0;
  }
  if (name === "spawn" && satoshiPetAllowed) petVisible = true;
}

function noteAssetLoaded() {
  loadedAssets += 1;
  render();
  if (loadedAssets >= layerImages.length + 1) startLoop();
}

function viewportToCanvas(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: cameraX + ((clientX - rect.left) / rect.width) * WIDTH,
    y: ((clientY - rect.top) / rect.height) * HEIGHT,
  };
}

function worldRectToViewport(rect) {
  const canvasRect = canvas.getBoundingClientRect();
  const scaleX = canvasRect.width / WIDTH;
  const scaleY = canvasRect.height / HEIGHT;
  return {
    left: canvasRect.left + (rect.x - cameraX) * scaleX,
    top: canvasRect.top + rect.y * scaleY,
    width: rect.w * scaleX,
    height: rect.h * scaleY,
  };
}

function screenToCanvas(event) {
  return viewportToCanvas(event.clientX, event.clientY);
}

function floorBoundsAtY() {
  return {
    minX: 0,
    maxX: WORLD_WIDTH,
  };
}

function clampToFloor(point) {
  const bounds = floorBoundsAtY();
  return {
    x: Math.max(bounds.minX + 46, Math.min(bounds.maxX - 46, point.x)),
    y: PET_FLOOR_Y,
  };
}

function screenNavigationTarget(clientX) {
  if (!Number.isFinite(clientX)) return null;
  const ratio = clamp(clientX / Math.max(1, window.innerWidth), 0, 1);
  if (ratio >= 1 / 3 && ratio <= 2 / 3) return ROOM_NAV_TARGETS.center;
  const currentIndex = nearestRoomTargetIndex(pet.x);
  const direction = ratio < 1 / 3 ? -1 : 1;
  return ROOM_NAV_ORDER[clamp(currentIndex + direction, 0, ROOM_NAV_ORDER.length - 1)];
}

function nearestRoomTargetIndex(x) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  ROOM_NAV_ORDER.forEach((point, index) => {
    const distance = Math.abs(point.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function directionAnimation(dx) {
  return dx < 0 ? "walk_left" : "walk_right";
}

function isInMonitorScreen(point) {
  return (
    point.x >= MONITOR_SCREEN.x &&
    point.x <= MONITOR_SCREEN.x + MONITOR_SCREEN.w &&
    point.y >= MONITOR_SCREEN.y &&
    point.y <= MONITOR_SCREEN.y + MONITOR_SCREEN.h
  );
}

function proxyNativeBridgeToHomePreview() {
  if (!homePreviewFrame || !homePreviewFrame.contentWindow) return;
  try {
    if (window.ReactNativeWebView) {
      homePreviewFrame.contentWindow.ReactNativeWebView = window.ReactNativeWebView;
    }
  } catch (error) {}
}

function postToHomePreview(payload) {
  if (!homePreviewFrame || !homePreviewFrame.contentWindow) return;
  try {
    homePreviewFrame.contentWindow.postMessage(payload, "*");
  } catch (error) {}
}

function markHomePreviewLoaded() {
  homePreviewLoaded = true;
  proxyNativeBridgeToHomePreview();
  if (latestHomePreviewSatoshiStatus) {
    postToHomePreview(latestHomePreviewSatoshiStatus);
  }
  while (homePreviewLoadWaiters.length) {
    const resolve = homePreviewLoadWaiters.shift();
    resolve();
  }
}

function waitForHomePreview() {
  if (homePreviewLoaded) {
    proxyNativeBridgeToHomePreview();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    homePreviewLoadWaiters.push(resolve);
    setTimeout(resolve, 900);
  }).then(proxyNativeBridgeToHomePreview);
}

async function enterHomeFromMonitor() {
  if (enteringHome) return;
  enteringHome = true;
  movingByPointer = false;
  pressed.clear();

  const overlay = homeZoomTransition || document.getElementById("homeZoomTransition");
  if (!overlay) {
    window.location.href = "../index.html?v=room-entry-staticclass";
    return;
  }

  await waitForHomePreview();

  positionOverlayAtMonitor(overlay);
  overlay.classList.remove("is-home", "is-reverse", "is-contracting");
  overlay.classList.add("is-active");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add("is-expanded"));
  });

  setTimeout(() => {
    overlay.classList.add("is-home");
    proxyNativeBridgeToHomePreview();
    try {
      homePreviewFrame?.contentWindow?.focus();
    } catch (error) {}
  }, 820);
}

function showRoomAfterBlack() {
  const bootCover = document.getElementById("roomBootCover");
  if (bootCover) bootCover.remove();
  document.documentElement.classList.remove(
    "room-entry-pullback",
    "room-entry-closing",
    "room-entry-line-hidden"
  );
  if (stage) {
    stage.style.transition = "";
    stage.style.transform = "";
  }
  roomEntryAnimating = false;
}

function closeEmbeddedHomeToRoom() {
  const overlay = homeZoomTransition || document.getElementById("homeZoomTransition");
  if (!overlay || roomEntryAnimating) return;

  movingByPointer = false;
  draggingLightControl = false;
  pressed.clear();
  roomEntryAnimating = true;

  overlay.classList.remove("is-home", "is-reverse", "is-contracting", "is-line-hidden", "is-cutaway");
  overlay.classList.add("is-active", "is-expanded", "is-screen-close");
  overlay.getBoundingClientRect();

  setTimeout(() => {
    overlay.classList.add("is-line-hidden");
    setTimeout(() => {
      showRoomAfterBlack();
      overlay.classList.add("is-cutaway");
      overlay.getBoundingClientRect();
      overlay.classList.remove("is-active", "is-expanded", "is-screen-close", "is-line-hidden");
      setTimeout(() => overlay.classList.remove("is-cutaway"), 80);
    }, SCREEN_BLACK_HOLD_MS);
  }, SCREEN_CLOSE_HOLD_MS);

  setTimeout(() => {
    enteringHome = false;
    canvas.focus();
  }, SCREEN_CLOSE_HOLD_MS + SCREEN_BLACK_HOLD_MS + 80);
}

window.closeEmbeddedHomeToRoom = closeEmbeddedHomeToRoom;
window.enterRoomFromEmbeddedHome = closeEmbeddedHomeToRoom;

if (homePreviewFrame) {
  homePreviewFrame.addEventListener("load", markHomePreviewLoaded);
  try {
    const previewDocument = homePreviewFrame.contentDocument;
    if (previewDocument && previewDocument.readyState !== "loading") {
      markHomePreviewLoaded();
    }
  } catch (error) {}
}

function positionOverlayAtMonitor(overlay) {
  const rect = worldRectToViewport(MONITOR_SCREEN);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const viewportW = Math.max(1, window.innerWidth);
  const viewportH = Math.max(1, window.innerHeight);
  overlay.style.setProperty("--zoom-shift-x", `${Math.round(centerX - viewportW / 2)}px`);
  overlay.style.setProperty("--zoom-shift-y", `${Math.round(centerY - viewportH / 2)}px`);
  overlay.style.setProperty("--zoom-scale-x", `${Math.max(0.04, rect.width / viewportW).toFixed(4)}`);
  overlay.style.setProperty("--zoom-scale-y", `${Math.max(0.04, rect.height / viewportH).toFixed(4)}`);
}

function runRoomEntryPullback() {
  if (!ROOM_ENTRY_PULLBACK) return;
  movingByPointer = false;
  draggingLightControl = false;
  pressed.clear();
  roomEntryAnimating = true;
  document.documentElement.classList.add("room-entry-pullback");

  requestAnimationFrame(() => {
    document.documentElement.classList.add("room-entry-closing");
  });

  setTimeout(() => {
    document.documentElement.classList.add("room-entry-line-hidden");
  }, SCREEN_CLOSE_HOLD_MS);

  setTimeout(() => {
    showRoomAfterBlack();
    enteringHome = false;
    canvas.focus();
  }, SCREEN_CLOSE_HOLD_MS + SCREEN_BLACK_HOLD_MS);
}

function isTransitioning() {
  return animName === "spawn" || animName === "despawn";
}

function canMovePet() {
  return petVisible && !isTransitioning();
}

function hasMovementKeys() {
  return pressed.has("ArrowLeft") || pressed.has("ArrowRight");
}

function keyboardVector() {
  return {
    x: (pressed.has("ArrowRight") ? 1 : 0) - (pressed.has("ArrowLeft") ? 1 : 0),
    y: 0,
  };
}

function moveTowardTarget(dt) {
  if (!canMovePet()) return;
  const dx = target.x - pet.x;
  const dy = target.y - pet.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1.5) {
    pet = { ...target };
    movingByPointer = false;
    setAnimation("idle");
    return;
  }
  const step = Math.min(distance, MOVE_SPEED * dt);
  pet = clampToFloor({
    x: pet.x + (dx / distance) * step,
    y: PET_FLOOR_Y,
  });
  setAnimation(directionAnimation(dx));
}

function moveByKeyboard(dt) {
  if (!canMovePet()) return false;
  if (!hasMovementKeys()) return false;
  const vector = keyboardVector();
  const length = Math.hypot(vector.x, vector.y);
  if (!length) return false;
  const step = KEY_SPEED * dt;
  pet = clampToFloor({
    x: pet.x + (vector.x / length) * step,
    y: PET_FLOOR_Y,
  });
  target = { ...pet };
  movingByPointer = false;
  setAnimation(directionAnimation(vector.x));
  return true;
}

function updateAnimation(dt, now) {
  const animation = animations[animName] || animations.idle;
  frameAccum += dt;
  const step = 1 / animation.fps;
  while (frameAccum >= step) {
    frameAccum -= step;
    localFrame += 1;
    if (localFrame >= animation.frames.length) {
      if (animation.loop) {
        localFrame = 0;
      } else {
        finishActionAnimation(animName, now);
        break;
      }
    }
  }
}

function finishActionAnimation(name, now) {
  movingByPointer = false;
  if (name === "despawn") {
    petVisible = false;
    setAnimation("idle");
    return;
  }
  setAnimation("idle");
  nextBlinkAt = now + randomBetween(3600, 7600);
}

function maybeIdleActions(now) {
  if (!petVisible || animName !== "idle" || movingByPointer || hasMovementKeys()) return;
  if (now >= nextCoinAt) {
    setAnimation("coin_trick");
    nextCoinAt = now + randomBetween(16000, 28000);
  } else if (now >= nextBlinkAt) {
    setAnimation("blink");
    nextBlinkAt = now + randomBetween(3600, 7600);
  }
}

function isInLightControl(point) {
  return (
    point.x >= LIGHT_CONTROL.hitX &&
    point.x <= LIGHT_CONTROL.hitX + LIGHT_CONTROL.hitW &&
    point.y >= LIGHT_CONTROL.hitY &&
    point.y <= LIGHT_CONTROL.hitY + LIGHT_CONTROL.hitH
  );
}

function setRoomLightFromPoint(point) {
  roomLightLevel = clamp((point.x - LIGHT_CONTROL.trackX) / LIGHT_CONTROL.w, 0, 1);
  render();
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function stroke(points, color, width = 1, closed = true) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x + 0.5, points[0].y + 0.5);
  points.slice(1).forEach((p) => ctx.lineTo(p.x + 0.5, p.y + 0.5));
  if (closed) ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawRoomLayers() {
  rect(0, 0, WORLD_WIDTH, HEIGHT, "#050611");
  layerImages.forEach((layer) => {
    if (!layer.image.complete || !layer.image.naturalWidth) return;
    ctx.drawImage(layer.image, layer.x, layer.y, layer.w, layer.h);
  });
}

function drawRoomLight() {
  if (roomLightLevel <= 0) return;
  const lampX = LIGHT_CONTROL.trackX + LIGHT_CONTROL.w / 2;
  const lampY = LIGHT_CONTROL.y + LIGHT_CONTROL.h / 2;
  const glow = roomLightLevel;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  rect(0, 0, WORLD_WIDTH, HEIGHT, `rgba(255, 164, 52, ${0.065 * glow})`);
  rect(0, FLOOR_TOP - 10, WORLD_WIDTH, FLOOR_BOTTOM - FLOOR_TOP + 58, `rgba(255, 190, 70, ${0.05 * glow})`);

  ctx.globalCompositeOperation = "screen";
  rect(0, 0, WORLD_WIDTH, HEIGHT, `rgba(255, 182, 76, ${0.16 * glow})`);

  const lampGlow = ctx.createRadialGradient(lampX, lampY, 22, lampX, lampY + 170, 520);
  lampGlow.addColorStop(0, `rgba(255, 235, 152, ${0.44 * glow})`);
  lampGlow.addColorStop(0.36, `rgba(255, 178, 64, ${0.24 * glow})`);
  lampGlow.addColorStop(0.72, `rgba(255, 120, 42, ${0.07 * glow})`);
  lampGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = lampGlow;
  ctx.fillRect(lampX - 560, lampY - 60, 1120, 520);

  const deskGlow = ctx.createRadialGradient(DESK_LIGHT_WORLD_X, 265, 12, DESK_LIGHT_WORLD_X, 350, 340);
  deskGlow.addColorStop(0, `rgba(255, 219, 116, ${0.22 * glow})`);
  deskGlow.addColorStop(0.5, `rgba(255, 169, 64, ${0.12 * glow})`);
  deskGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = deskGlow;
  ctx.fillRect(DESK_LIGHT_WORLD_X - 380, 120, 760, 360);
  ctx.restore();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateCamera() {
  cameraX = clamp(Math.round(pet.x - WIDTH / 2), 0, WORLD_WIDTH - WIDTH);
}

function drawTargetMarker() {
  if (!petVisible || !movingByPointer) return;
  const pulse = 6 + Math.floor(Math.sin(performance.now() / 110) * 2);
  rect(target.x - pulse, target.y - 2, pulse * 2, 4, "rgba(125,246,75,0.45)");
  rect(target.x - 2, target.y - pulse, 4, pulse * 2, "rgba(24,230,255,0.36)");
}

function drawPetEffect() {
  if (!petVisible || !["spawn", "despawn", "coin_trick"].includes(animName)) return;
  const animation = animations[animName] || animations.idle;
  const progress = localFrame / Math.max(1, animation.frames.length - 1);
  const pulse = Math.floor(Math.sin(performance.now() / 72) * 2);
  const baseRadius = animName === "despawn" ? 31 - progress * 12 : 13 + progress * 19;
  const radius = Math.max(8, Math.round(baseRadius + pulse));
  const y = Math.round(pet.y + 1);
  const color = animName === "coin_trick" ? "rgba(255,122,53,0.74)" : "rgba(24,230,255,0.64)";

  stroke(
    [
      { x: pet.x, y: y - radius / 3 },
      { x: pet.x + radius, y },
      { x: pet.x, y: y + radius / 3 },
      { x: pet.x - radius, y },
    ],
    color,
    2,
  );
  rect(pet.x - 2, y - radius - 2, 4, 4, color);
  rect(pet.x - radius - 3, y - 2, 4, 4, color);
  rect(pet.x + radius - 1, y - 2, 4, 4, color);
}

function drawPet() {
  if (!petVisible) return;
  const animation = animations[animName] || animations.idle;
  const frameIndex = animation.frames[localFrame] ?? animation.frames[0];
  const frame = frames[frameIndex] || frames[0];
  const x = Math.round(pet.x - FRAME / 2);
  const y = Math.round(pet.y - FRAME + 8);
  const bob = Math.floor(Math.sin(performance.now() / 260) * 2);
  rect(x + 28, y + 82, 42, 8, "rgba(24,230,255,0.11)");
  rect(x + 24, y + 87, 50, 5, "rgba(125,246,75,0.14)");
  rect(x + 27, y + 20 + bob, 42, 35, "rgba(24,230,255,0.1)");
  rect(x + 23, y + 30 + bob, 50, 25, "rgba(255,63,230,0.08)");
  rect(x + 35, y + 12 + bob, 26, 4, "rgba(125,246,75,0.12)");
  if (sprite.complete && sprite.naturalWidth) {
    ctx.drawImage(sprite, frame.x, frame.y, frame.w, frame.h, x, y, FRAME, FRAME);
  }
}

function drawLightControl() {
  const levelX = Math.round(LIGHT_CONTROL.trackX + LIGHT_CONTROL.w * roomLightLevel);
  const y = LIGHT_CONTROL.y;
  const pulse = draggingLightControl ? 1 : Math.max(0, Math.sin(performance.now() / 260));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  rect(levelX - 6, y - 13, 12, LIGHT_CONTROL.h + 26, `rgba(255, 62, 231, ${0.14 + pulse * 0.08})`);
  rect(levelX - 4, y - 12, 8, LIGHT_CONTROL.h + 24, "rgba(13, 6, 35, 0.72)");
  rect(levelX - 3, y - 11, 6, LIGHT_CONTROL.h + 22, `rgba(255, 69, 232, ${0.78 + pulse * 0.14})`);
  rect(levelX - 1, y - 9, 2, LIGHT_CONTROL.h + 18, `rgba(255, 236, 174, ${0.74 + pulse * 0.18})`);
  ctx.restore();
}

function render() {
  updateCamera();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.translate(-cameraX, 0);
  drawRoomLayers();
  drawRoomLight();
  drawTargetMarker();
  drawPetEffect();
  drawPet();
  drawLightControl();
  ctx.restore();
}

function tick(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!moveByKeyboard(dt) && movingByPointer) moveTowardTarget(dt);
  if (!movingByPointer && !hasMovementKeys() && animName.startsWith("walk_")) setAnimation("idle");
  maybeIdleActions(now);
  updateAnimation(dt, now);
  render();
  requestAnimationFrame(tick);
}

function beginPointerAt(point, event, clientX = event?.clientX) {
  if (enteringHome || roomEntryAnimating) return;
  if (isInMonitorScreen(point)) {
    event?.preventDefault?.();
    enterHomeFromMonitor();
    return;
  }
  if (isInLightControl(point)) {
    event?.preventDefault?.();
    draggingLightControl = true;
    movingByPointer = false;
    pressed.clear();
    setRoomLightFromPoint(point);
    if (event?.pointerId !== undefined) {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {}
    }
    canvas.focus();
    return;
  }
  if (!satoshiPetAllowed) {
    canvas.focus();
    return;
  }
  const floorPoint = clampToFloor(screenNavigationTarget(clientX) || point);
  if (animName === "spawn") setAnimation("idle");
  if (isTransitioning()) return;
  if (!petVisible) {
    pet = { ...floorPoint };
    target = { ...floorPoint };
    setAnimation("spawn");
    canvas.focus();
    return;
  }
  target = floorPoint;
  movingByPointer = true;
  setAnimation(directionAnimation(target.x - pet.x));
  canvas.focus();
}

function movePointerAt(point, event) {
  if (draggingLightControl) {
    event?.preventDefault?.();
    setRoomLightFromPoint(point);
    return;
  }
  canvas.style.cursor = isInLightControl(point) ? "ew-resize" : "crosshair";
}

function stopDraggingLightControl(event) {
  if (!draggingLightControl) return;
  draggingLightControl = false;
  if (event?.pointerId !== undefined) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {}
  }
}

function parseMessageData(rawData) {
  if (rawData && typeof rawData === "object") return rawData;
  if (typeof rawData !== "string") return null;
  try {
    return JSON.parse(rawData);
  } catch (error) {
    return null;
  }
}

function applySatoshiStatus(payload) {
  if (!ROOM_REQUIRES_SATOSHI) return;
  const allowed = !!payload.hasSatoshi;
  satoshiPetAllowed = allowed;
  if (!allowed) {
    petVisible = false;
    movingByPointer = false;
    pressed.clear();
    setAnimation("idle");
    render();
    return;
  }
  if (!petVisible) {
    petVisible = true;
    target = { ...pet };
    movingByPointer = false;
    setAnimation("spawn");
    render();
  }
}

canvas.addEventListener("pointerdown", (event) => {
  beginPointerAt(screenToCanvas(event), event);
});

canvas.addEventListener("pointermove", (event) => {
  movePointerAt(screenToCanvas(event), event);
});

canvas.addEventListener("pointerup", stopDraggingLightControl);
canvas.addEventListener("pointercancel", stopDraggingLightControl);
canvas.addEventListener("pointerleave", () => {
  if (!draggingLightControl) canvas.style.cursor = "crosshair";
});

let mouseInputActive = false;

canvas.addEventListener("mousedown", (event) => {
  event.preventDefault();
  mouseInputActive = true;
  beginPointerAt(screenToCanvas(event), event);
});

canvas.addEventListener("mousemove", (event) => {
  if (!mouseInputActive) return;
  event.preventDefault();
  movePointerAt(screenToCanvas(event), event);
});

window.addEventListener("mouseup", (event) => {
  if (!mouseInputActive) return;
  event.preventDefault();
  mouseInputActive = false;
  stopDraggingLightControl(event);
});

canvas.addEventListener("click", (event) => {
  event.preventDefault();
  beginPointerAt(screenToCanvas(event), event);
});

canvas.addEventListener("touchstart", (event) => {
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  event.preventDefault();
  beginPointerAt(viewportToCanvas(touch.clientX, touch.clientY), undefined, touch.clientX);
}, { passive: false });

canvas.addEventListener("touchmove", (event) => {
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  event.preventDefault();
  movePointerAt(viewportToCanvas(touch.clientX, touch.clientY));
}, { passive: false });

canvas.addEventListener("touchend", (event) => {
  event.preventDefault();
  stopDraggingLightControl();
}, { passive: false });

canvas.addEventListener("touchcancel", (event) => {
  event.preventDefault();
  stopDraggingLightControl();
}, { passive: false });

window.addEventListener("message", (event) => {
  const data = parseMessageData(event.data);
  if (!data || typeof data !== "object") return;
  if (data.type === "embedded_home_room") {
    closeEmbeddedHomeToRoom();
    return;
  }
  if (data.type === "room_reset") {
    resetRoomView();
    return;
  }
  if (data.type === "satoshi_status") {
    latestHomePreviewSatoshiStatus = data;
    postToHomePreview(data);
    applySatoshiStatus(data);
    return;
  }
  if (data.type === "home_set_language") {
    postToHomePreview(data);
    return;
  }
  if (typeof data.type === "string" && (data.type.indexOf("electrum_") === 0 || data.type.indexOf("node_services_") === 0)) {
    postToHomePreview(data);
    return;
  }
  if (!["room_pointer_down", "room_pointer_move", "room_pointer_up", "room_pointer_cancel"].includes(data.type)) return;
  const clientX = Number(data.clientX);
  const clientY = Number(data.clientY);
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
  const point = viewportToCanvas(clientX, clientY);
  if (data.type === "room_pointer_down") {
    beginPointerAt(point, undefined, clientX);
  } else if (data.type === "room_pointer_move") {
    movePointerAt(point);
  } else {
    stopDraggingLightControl();
  }
});

window.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Enter", " ", "d", "D"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "d" || event.key === "D") {
    if (!satoshiPetAllowed) return;
    if (isTransitioning()) return;
    pressed.clear();
    movingByPointer = false;
    setAnimation(petVisible ? "despawn" : "spawn");
    canvas.focus();
    return;
  }
  if (!canMovePet()) return;
  if (event.key === "Enter" || event.key === " ") {
    setAnimation("coin_trick");
    nextCoinAt = performance.now() + randomBetween(16000, 28000);
    return;
  }
  pressed.add(event.key);
  canvas.focus();
});

window.addEventListener("keyup", (event) => {
  pressed.delete(event.key);
});

function startLoop() {
  if (loopStarted) return;
  loopStarted = true;
  lastTime = performance.now();
  render();
  requestAnimationFrame(tick);
}

layerImages.forEach((layer) => {
  layer.image.onload = noteAssetLoaded;
  layer.image.onerror = noteAssetLoaded;
  layer.image.src = layer.src;
});
sprite.onload = noteAssetLoaded;
sprite.onerror = noteAssetLoaded;
sprite.src = PET_IMAGE;
render();
requestAnimationFrame(runRoomEntryPullback);
