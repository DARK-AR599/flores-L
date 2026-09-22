/* =====================================================
   🌻 ÁRBOL DE GIRASOLES EN FORMA DE CORAZÓN
   Edita solo la parte CONFIG para personalizar.
   ===================================================== */
const CONFIG = {
  title: "🌻 Feliz Día de las Flores Amarillas 🌻",
  message: [
    "Cada girasol que ves aquí es un latido de mi corazón cachetes.",
    "Así como el sol ilumina los campos, tú iluminas mi vida con tus locuras.",
    "Que estas flores te recuerden lo especial que eres para mí.",
    "Tal vez no pueda regalarte un ramo real por la distancia, pero te doy este con mucho cariño.",
    "¡Te amo coshita rica!",
  ],
  signature: "Eres el sol que hace florecer cada uno de mis días ♡.",
  flowerCount: 280, // cantidad de girasoles en el corazón
  trunkColor: "#0e5b57",
  groundColor: "#1b1b1b",
  petalColors: ["#f6b400", "#f9c220", "#eda50a"],

  /* ----- Fotos de fondo -----
     src   = ruta de la foto
     veil  = velo claro sobre esa foto (0 = foto pura, 1 = casi blanco)
     pos   = qué parte de la foto se ve cuando hay que recortarla ("x y")
     fit   = en laptop: "cover" = la foto llena todo su marco (recorta un poco)
                        "contain" = se ve la foto completa, pegada a un lado
                        (con fondo difuminado alrededor)
     align = con "contain": "left", "right" o "center"
     En laptop/horizontal las fotos se ven juntas, lado a lado.
     En celular/vertical se turnan a pantalla completa. */
  photos: [
    { src: "fotos/foto2.jpg", fit: "cover", pos: "88% 45%", veil: 0.4 },
    { src: "fotos/foto1.jpg", fit: "contain", align: "right", pos: "10% 12%", veil: 0.42 },
  ],
  photoInterval: 6000, // solo celular: milisegundos entre foto y foto
};

/* ---------- Línea de tiempo (segundos) ---------- */
const T = {
  seedIn: 0.2,
  seedFall: 1.5,
  line: 2.2,
  trunk: 2.6,
  branch: 4.3,
  bloom: 4.9,
  bloomSpan: 6.0,
  move: 12.6,
  text: 14.0,
  fall: 14.8,
};

/* ---------- Utilidades ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBack = (k) => {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * (1 + amt)), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * (1 + amt)), 0, 255);
  const b = clamp(Math.round((n & 255) * (1 + amt)), 0, 255);
  return `rgb(${r},${g},${b})`;
}

/* ---------- Canvas y layout ---------- */
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const textBox = document.getElementById("text");
const titleEl = document.getElementById("title");
const msgEl = document.getElementById("msg");
const sigEl = document.getElementById("sig");

let W, H, DPR, L;

// mide el "área segura" del celular (notch / barra de inicio)
const probe = document.createElement("div");
probe.style.cssText =
  "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;" +
  "padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
document.body.appendChild(probe);
const safeTop = () => parseFloat(getComputedStyle(probe).paddingTop) || 0;

function layout() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const portrait = H > W * 1.05;
  L = { portrait, startX: W / 2 };

  if (portrait) {
    L.R = Math.min(W * 0.28, H * 0.15);
    L.groundY = H * 0.9;
    L.finalX = W / 2;
  } else {
    L.R = Math.min(H * 0.22, W * 0.17);
    L.groundY = H * 0.84;
    L.finalX = W * 0.64;
  }

  // Posición del texto
  if (portrait) {
    textBox.style.left = W * 0.08 + "px";
    textBox.style.width = W * 0.84 + "px";
    textBox.style.top = Math.max(H * 0.04, safeTop() + 10) + "px";
    sigEl.style.left = W * 0.08 + "px";
    sigEl.style.width = W * 0.84 + "px";
    sigEl.style.top = L.groundY + 10 + "px";
    sigEl.style.bottom = "auto";
  } else {
    textBox.style.left = W * 0.06 + "px";
    textBox.style.width = W * 0.4 + "px";
    textBox.style.top = H * 0.12 + "px";
    sigEl.style.left = W * 0.06 + "px";
    sigEl.style.width = W * 0.44 + "px";
    sigEl.style.top = "auto";
    sigEl.style.bottom = H - L.groundY + 16 + "px";
  }

  updateBg();
}

function geom(t) {
  const move = L.portrait ? 0 : easeInOut(clamp((t - T.move) / 1.8));
  const tx = lerp(L.startX, L.finalX, move);
  const R = L.R;
  const trunkH = R * 1.05;
  const gy = L.groundY;
  const cy = gy - trunkH - R * 0.9; // centro del corazón
  return { tx, gy, R, trunkH, cy };
}

/* ---------- Girasol (sprite pre-dibujado) ---------- */
function makeSprite(color, size = 110) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const m = size / 2;

  const petals = (n, dist, rx, ry, fill, off) => {
    for (let i = 0; i < n; i++) {
      g.save();
      g.translate(m, m);
      g.rotate((i / n) * Math.PI * 2 + off);
      g.fillStyle = fill;
      g.beginPath();
      g.ellipse(0, -size * dist, size * rx, size * ry, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  };
  petals(13, 0.31, 0.075, 0.17, shade(color, -0.18), 0);
  petals(13, 0.3, 0.07, 0.165, color, Math.PI / 13);

  // centro
  const grad = g.createRadialGradient(m, m, 0, m, m, size * 0.2);
  grad.addColorStop(0, "#6b4514");
  grad.addColorStop(1, "#2a1704");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(m, m, size * 0.2, 0, Math.PI * 2);
  g.fill();

  // semillas en espiral
  g.fillStyle = "rgba(232,172,60,0.55)";
  for (let i = 1; i < 60; i++) {
    const r = size * 0.021 * Math.sqrt(i);
    const a = i * 2.39996;
    g.beginPath();
    g.arc(m + Math.cos(a) * r, m + Math.sin(a) * r, size * 0.012, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

const sprites = CONFIG.petalColors.map((c) => makeSprite(c));

function drawSprite(sp, x, y, d, rot = 0) {
  if (d <= 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(sp, -d / 2, -d / 2, d, d);
  ctx.restore();
}

/* ---------- Flores del corazón ---------- */
let flowers = [];

function insideHeart(x, y) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

function buildFlowers() {
  const pts = [];
  const minD = 0.118;
  let tries = 0;
  while (pts.length < CONFIG.flowerCount && tries < 40000) {
    tries++;
    const x = Math.random() * 2.4 - 1.2;
    const y = Math.random() * 2.4 - 1.1;
    if (!insideHeart(x, y)) continue;
    let ok = true;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - x,
        dy = pts[i].y - y;
      if (dx * dx + dy * dy < minD * minD) {
        ok = false;
        break;
      }
    }
    if (ok) pts.push({ x, y });
  }

  // orden aleatorio de aparición
  const order = pts.map((_, i) => i).sort(() => Math.random() - 0.5);
  order.forEach((idx, rank) => {
    const p = pts[idx];
    p.t0 = T.bloom + Math.pow(rank / pts.length, 0.9) * T.bloomSpan;
    p.rot = Math.random() * Math.PI * 2;
    p.k = 0.9 + Math.random() * 0.25;
    p.sp = sprites[(Math.random() * sprites.length) | 0];
    p.ph = Math.random() * Math.PI * 2;
  });
  // las más tardías se dibujan encima
  flowers = pts.sort((a, b) => a.t0 - b.t0);
}

/* ---------- Tronco y ramas ---------- */
const trunkX = (tx, R, u) => tx + Math.sin(u * Math.PI * 1.1) * R * 0.025;

function drawTrunk(g, p) {
  if (p <= 0) return;
  const N = 28;
  const left = [];
  const right = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * p;
    const y = g.gy - u * g.trunkH;
    const cx = trunkX(g.tx, g.R, u);
    const w = g.R * (0.052 + 0.03 * (1 - u) + 0.06 * Math.pow(1 - u, 6));
    left.push([cx - w, y]);
    right.push([cx + w, y]);
  }
  ctx.fillStyle = CONFIG.trunkColor;
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  left.forEach((q) => ctx.lineTo(q[0], q[1]));
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}

const BRANCHES = [
  { u: 0.72, ex: -0.75, ey: 0.1, d: 0.0 },
  { u: 0.78, ex: 0.8, ey: 0.15, d: 0.2 },
  { u: 0.88, ex: -0.45, ey: 0.8, d: 0.4 },
  { u: 0.9, ex: 0.5, ey: 0.85, d: 0.55 },
  { u: 1.0, ex: 0.0, ey: 0.55, d: 0.7 },
  { u: 0.85, ex: -1.0, ey: 0.65, d: 0.9 },
  { u: 0.95, ex: 1.0, ey: 0.7, d: 1.05 },
];

function drawBranch(g, b, p) {
  if (p <= 0) return;
  const bx = trunkX(g.tx, g.R, b.u);
  const by = g.gy - b.u * g.trunkH;
  const ex = g.tx + b.ex * g.R;
  const ey = g.cy - b.ey * g.R;
  const cx = bx + (ex - bx) * 0.1;
  const cyy = by + (ey - by) * 0.7;

  ctx.strokeStyle = CONFIG.trunkColor;
  ctx.lineCap = "round";
  const steps = 26;
  let px = bx,
    py = by;
  for (let i = 1; i <= steps * p; i++) {
    const s = i / steps;
    const x = (1 - s) * (1 - s) * bx + 2 * (1 - s) * s * cx + s * s * ex;
    const y = (1 - s) * (1 - s) * by + 2 * (1 - s) * s * cyy + s * s * ey;
    ctx.lineWidth = Math.max(1.2, g.R * 0.045 * (1 - s) + g.R * 0.006);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
    px = x;
    py = y;
  }
}

/* ---------- Flores que caen ---------- */
let falling = [];
let nextSpawn = 0;

function updateFalling(t, dt) {
  if (t > T.fall && t > nextSpawn && flowers.length) {
    const g = geom(t);
    const f = flowers[(Math.random() * flowers.length) | 0];
    falling.push({
      x: g.tx + f.x * g.R,
      y: g.cy - f.y * g.R,
      vx: -(10 + Math.random() * 30),
      vy: 0,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 2,
      sz: g.R * (0.11 + Math.random() * 0.04),
      landed: false,
      ph: Math.random() * 6.28,
      sp: f.sp,
    });
    nextSpawn = t + 0.7 + Math.random() * 0.8;
    if (falling.length > 24) falling.shift();
  }
  const gy = L.groundY;
  for (const f of falling) {
    if (f.landed) continue;
    f.vy = Math.min(300, f.vy + 260 * dt);
    f.x += (f.vx + Math.sin(t * 2 + f.ph) * 25) * dt;
    f.y += f.vy * dt;
    f.rot += f.vr * dt;
    if (f.y >= gy - f.sz * 0.3) {
      f.y = gy - f.sz * 0.3;
      f.landed = true;
    }
  }
}

/* ---------- Render ---------- */
function render(t) {
  ctx.clearRect(0, 0, W, H);
  const g = geom(t);

  // línea del suelo
  const lp = easeOut(clamp((t - T.line) / 1.2));
  if (lp > 0) {
    const half = W * 0.47 * lp;
    ctx.strokeStyle = CONFIG.groundColor;
    ctx.lineWidth = 2;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(W / 2 - half, g.gy);
    ctx.lineTo(W / 2 + half, g.gy);
    ctx.stroke();
  }

  // semilla (un girasol) que cae
  if (t > T.seedIn && t < 2.8) {
    const size = g.R * 0.5;
    const yTop = Math.max(size, g.gy - H * 0.42);
    const tLand = T.seedFall + 0.8;
    let y, s;
    if (t < T.seedFall) {
      s = easeOutBack(clamp((t - T.seedIn) / 0.9));
      y = yTop;
    } else {
      const k = clamp((t - T.seedFall) / 0.8);
      y = lerp(yTop, g.gy - size * 0.15, k * k);
      s = k < 1 ? lerp(1, 0.35, k) : 0.35 * (1 - clamp((t - tLand) / 0.4));
    }
    drawSprite(sprites[0], W / 2, y, size * s, t * 0.8);
  }

  // tronco
  drawTrunk(g, easeInOut(clamp((t - T.trunk) / 2.0)));

  // ramas
  for (const b of BRANCHES) {
    drawBranch(g, b, easeOut(clamp((t - T.branch - b.d * 0.6) / 1.6)));
  }

  // girasoles del corazón (con latido al final)
  const beat = t > T.move + 2 ? 1 + 0.014 * Math.pow(Math.max(0, Math.sin(t * 3)), 3) : 1;
  const base = g.R * 0.2;
  for (const f of flowers) {
    const a = t - f.t0;
    if (a <= 0) break; // están ordenadas por aparición
    const s = easeOutBack(clamp(a / 0.7));
    const sway = Math.sin(t * 0.9 + f.ph) * 0.06;
    const x = g.tx + f.x * g.R * beat;
    const y = g.cy - f.y * g.R * beat;
    drawSprite(f.sp, x, y, base * f.k * s, f.rot + sway);
  }

  // flores que caen / en el suelo
  for (const f of falling) {
    drawSprite(f.sp, f.x, f.y, f.sz * 1.6, f.rot);
  }
}

/* ---------- Texto que se escribe ---------- */
const cursor = document.createElement("span");
cursor.className = "cursor";
cursor.textContent = "_";

let runId = 0;

async function typeInto(el, str, speed, id) {
  el.appendChild(cursor);
  for (const ch of str) {
    if (id !== runId) return false;
    cursor.before(document.createTextNode(ch));
    await sleep(speed + Math.random() * speed * 0.6);
  }
  return true;
}

async function runText(id) {
  await sleep(T.text * 1000);
  if (id !== runId) return;

  if (!(await typeInto(titleEl, CONFIG.title, 55, id))) return;
  await sleep(350);

  for (const line of CONFIG.message) {
    const p = document.createElement("p");
    msgEl.appendChild(p);
    if (!(await typeInto(p, line, 45, id))) return;
    await sleep(250);
  }

  await sleep(400);
  await typeInto(sigEl, CONFIG.signature, 60, id);
}

/* ---------- Fotos de fondo ---------- */
const bgEl = document.getElementById("bg");
let bgAnims = [];

// Horizontal (laptop): fotos lado a lado.  Vertical (celular): se turnan.
function updateBg() {
  const photos = [...bgEl.children];
  bgEl.classList.toggle("stacked", L.portrait);
  bgAnims.forEach((a) => a.cancel());
  bgAnims = [];
  if (!L.portrait || photos.length < 2) return;

  const I = CONFIG.photoInterval;
  const D = photos.length * I;
  const F = Math.min(1500, I / 3); // duración del cruce
  photos.forEach((el, i) => {
    bgAnims.push(
      el.animate(
        [
          { opacity: 0, offset: 0 },
          { opacity: 1, offset: F / D },
          { opacity: 1, offset: I / D },
          { opacity: 0, offset: (I + F) / D },
          { opacity: 0, offset: 1 },
        ],
        { duration: D, delay: i * I, iterations: Infinity, fill: "both" }
      )
    );
  });
}

function startSlideshow() {
  if (!CONFIG.photos.length || bgEl.childElementCount) return;

  CONFIG.photos.forEach((p) => {
    const d = document.createElement("div");
    d.className = "bg-photo";
    d.style.setProperty("--img", `url("${p.src}")`);
    d.style.setProperty("--pos", p.pos || "center");
    d.style.setProperty("--veil", p.veil ?? 0.4);

    const fg = document.createElement("div");
    fg.className = "fg";
    if (p.fit === "contain") {
      fg.classList.add("contain", p.align || "center");
      // la proporción de la foto define el ancho de su marco
      const im = new Image();
      im.onload = () => d.style.setProperty("--ar", im.naturalWidth / im.naturalHeight);
      im.src = p.src;
    } else {
      new Image().src = p.src; // precarga
    }
    d.appendChild(fg);
    bgEl.appendChild(d);
  });

  updateBg();
  void bgEl.offsetWidth; // fuerza el reflow para que aparezca suave
  bgEl.classList.add("on");
}

/* ---------- Portada: pétalos que caen ---------- */
function startPetals() {
  const c = document.getElementById("petals");
  const g = c.getContext("2d");
  let w, h;
  const resize = () => {
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  const cols = ["#f7b6cb", "#ffd56b", "#f9a8c2", "#ffe08a"];
  const mk = (init) => ({
    x: Math.random() * w,
    y: init ? Math.random() * h : -30,
    s: 10 + Math.random() * 14,
    vy: 25 + Math.random() * 35,
    ph: Math.random() * 6.28,
    rot: Math.random() * 6.28,
    vr: (Math.random() - 0.5) * 1.5,
    c: cols[(Math.random() * cols.length) | 0],
  });
  const ps = Array.from({ length: 22 }, () => mk(true));

  let alive = true;
  (function loop() {
    if (!alive) return;
    g.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.y += p.vy * 0.016;
      p.ph += 0.02;
      p.x += Math.sin(p.ph) * 0.7;
      p.rot += p.vr * 0.016;
      if (p.y > h + 30) Object.assign(p, mk(false));

      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.c;
      g.globalAlpha = 0.9;
      g.beginPath();
      g.moveTo(-p.s, 0);
      g.quadraticCurveTo(0, -p.s * 0.9, p.s, 0);
      g.quadraticCurveTo(0, p.s * 0.7, -p.s, 0);
      g.fill();
      g.restore();
    }
    requestAnimationFrame(loop);
  })();

  return () => {
    alive = false;
    window.removeEventListener("resize", resize);
  };
}

/* ---------- Bucle principal ---------- */
let startTime = performance.now();
let last = startTime;
let looping = false;

function frame(now) {
  const t = (now - startTime) / 1000;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updateFalling(t, dt);
  render(t);
  requestAnimationFrame(frame);
}

function start() {
  runId++;
  titleEl.textContent = "";
  msgEl.textContent = "";
  sigEl.textContent = "";
  falling = [];
  nextSpawn = 0;
  buildFlowers();
  startTime = performance.now();
  last = startTime;
  runText(runId);
  if (!looping) {
    looping = true;
    requestAnimationFrame(frame);
  }
}

/* ---------- Entrada: tocar la carta ---------- */
const intro = document.getElementById("intro");
const stopPetals = startPetals();
let opened = false;

function openLetter() {
  if (opened) return;
  opened = true;
  intro.classList.add("leaving");
  startSlideshow();
  start();
  setTimeout(() => {
    intro.remove();
    stopPetals();
  }, 1100);
}

intro.addEventListener("click", openLetter);
intro.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") openLetter();
});

window.addEventListener("resize", layout);
document.getElementById("replay").addEventListener("click", () => opened && start());
window.addEventListener("keydown", (e) => {
  if (opened && e.key.toLowerCase() === "r") start();
});

layout();
