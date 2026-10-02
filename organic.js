/* Organic shapes and motion.
   Every blob is a parametric closed curve: r(θ) = R · (1 + amp · Σ a_k sin(kθ + φ_k + ω_k t)),
   with harmonics seeded from a string so the same thing always gets the same shape.
   One animation loop morphs the blobs, moves the liquid waves and draws the wavy lines. */

const TAU = Math.PI * 2;
const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }

const HCACHE = new Map();
function harmonics(seed, lobes) {
  const key = seed + ":" + (lobes || 0);
  if (HCACHE.has(key)) return HCACHE.get(key);
  const r = rng(seed), H = [];
  for (let k = 2; k <= 5; k++) H.push({ k, a: (0.45 + r() * 0.55) / (k - 0.6), p: r() * TAU, w: (0.35 + r() * 0.5) * (r() > .5 ? 1 : -1) });
  if (lobes) H.push({ k: lobes, a: 1.6, p: r() * TAU, w: 0.25 });
  HCACHE.set(key, H);
  return H;
}
const f1 = n => (Math.round(n * 10) / 10).toString();
function smooth(pts) {
  const n = pts.length; let d = "M" + f1(pts[0][0]) + " " + f1(pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += "C" + f1(p1[0] + (p2[0] - p0[0]) / 6) + " " + f1(p1[1] + (p2[1] - p0[1]) / 6) + " " + f1(p2[0] - (p3[0] - p1[0]) / 6) + " " + f1(p2[1] - (p3[1] - p1[1]) / 6) + " " + f1(p2[0]) + " " + f1(p2[1]);
  }
  return d + "Z";
}
export function blobPts(seed, cx, cy, R, amp, t, lobes, N) {
  const H = harmonics(seed, lobes), pts = [], n = N || (lobes ? lobes * 6 : 30);
  for (let i = 0; i < n; i++) {
    const th = TAU * i / n; let r = 1;
    for (const h of H) r += amp * h.a * Math.sin(h.k * th + h.p + t * h.w);
    pts.push([cx + R * r * Math.cos(th), cy + R * r * Math.sin(th)]);
  }
  return pts;
}
export function blobD(seed, cx, cy, R, amp, t, lobes) { return smooth(blobPts(seed, cx, cy, R, amp, t || 0, lobes)); }

/* A blob path that the loop keeps morphing. */
export function blobEl(seed, cx, cy, R, amp, attrs, lobes, speed) {
  return '<path data-blob="' + seed + '" data-g="' + [cx, cy, R, amp, lobes || 0, speed || 1].join(",") + '" d="' + blobD(seed, cx, cy, R, amp, 0, lobes) + '" ' + (attrs || "") + '/>';
}

/* Liquid wave filling to a level. */
function waveD(level, w, h, A, t, ph, k) {
  const y0 = h * (1 - level); let d = "M0 " + h + " L0 " + f1(y0 + A * Math.sin(ph + t));
  for (let x = 6; x <= w; x += 6) d += " L" + x + " " + f1(y0 + A * Math.sin((x / w) * TAU * k + ph + t));
  return d + " L" + w + " " + h + "Z";
}

let UID = 0;
/* Replacement for progress rings: a morphing pebble that fills with liquid. */
export function pebble(opts) {
  const id = "pb" + (++UID), seed = hash(opts.label || opts.centre || id), cx = 56, cy = 56, R = 46, amp = .13;
  const segs = [];
  let acc = 0;
  (opts.segs || []).forEach(s => { const f = Math.max(0, Math.min(1 - acc, s.f || 0)); if (f <= 0) return; acc += f; segs.push({ lvl: acc, c: opts.over ? "var(--bad)" : s.c }); });
  if (opts.over && !segs.length) segs.push({ lvl: 1, c: "var(--bad)" });
  const top = R * (1 + amp * 1.4), bottomY = cy + top, topY = cy - top, span = bottomY - topY;
  // waves drawn in a 112 box; level measured against blob's real height
  const toBox = l => Math.max(0, Math.min(1, (112 - bottomY + l * span) / 112));
  const waves = segs.slice().reverse().map((s, i) => {
    const L = toBox(s.lvl), ph = (seed % 100) / 15 + i * 1.7;
    return '<path data-wave="' + L.toFixed(3) + '" data-ph="' + ph.toFixed(2) + '" data-a="' + (s.lvl >= .999 ? 1.5 : 3.2) + '" d="' + waveD(reduce() ? L : 0, 112, 112, 3, 0, ph, 1.1) + '" fill="' + s.c + '"/>';
  }).join("");
  const hasE = !!opts.emoji, txt = 'stroke="var(--bg)" stroke-width="5" stroke-linejoin="round" paint-order="stroke"';
  return '<svg class="pebble" viewBox="0 0 112 112" role="img" aria-label="' + esc(opts.label || "") + '"><defs><clipPath id="' + id + '">' + blobEl(seed, cx, cy, R, amp) + '</clipPath></defs>'
    + blobEl(seed, cx, cy, R, amp, 'fill="url(#hatch)"')
    + '<g clip-path="url(#' + id + ')">' + waves + '</g>'
    + blobEl(seed, cx, cy, R, amp, 'fill="none" stroke="var(--line2)" stroke-width="1.5"')
    + (hasE ? '<text x="56" y="44" text-anchor="middle" font-size="18">' + esc(opts.emoji) + '</text>' : "")
    + '<text x="56" y="' + (hasE ? 66 : (opts.sub ? 56 : 62)) + '" text-anchor="middle" font-family="Big Shoulders Display, Impact, sans-serif" font-weight="900" font-size="' + (hasE ? 21 : 24) + '" fill="var(--ink)" ' + txt + '>' + esc(opts.centre) + '</text>'
    + (opts.sub ? '<text x="56" y="' + (hasE ? 80 : 73) + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink2)" ' + txt + '>' + esc(opts.sub) + '</text>' : "") + '</svg>';
}

/* Soft flower badge (replaces the spiky starburst). */
export function flower(big, small, fill, ink, seedStr) {
  const seed = hash(seedStr || "flower");
  return '<svg class="burst" viewBox="0 0 104 104" aria-hidden="true">' + blobEl(seed, 52, 52, 40, .07, 'fill="' + fill + '"', 7, .8)
    + '<text x="52" y="' + (small ? 54 : 61) + '" text-anchor="middle" font-size="' + (String(big).length > 4 ? 24 : 32) + '" fill="' + ink + '">' + esc(big) + '</text>'
    + (small ? '<text x="52" y="71" text-anchor="middle" font-size="12" fill="' + ink + '" font-family="Instrument Sans, sans-serif" font-weight="600">' + esc(small) + '</text>' : "") + '</svg>';
}

/* Pebble token for challenges (replaces the poker chip). */
export function token(color, emoji, state, seedStr) {
  const seed = hash(seedStr || emoji || "t");
  return '<svg class="disc" viewBox="0 0 80 80" aria-hidden="true">' + blobEl(seed, 40, 40, 33, .16, 'fill="' + color + '"')
    + blobEl(seed + 7, 40, 40, 21, .14, 'fill="#fbf6ee"')
    + '<text x="40" y="48" text-anchor="middle" font-size="22">' + esc(emoji || "🎯") + '</text>'
    + (state === "won" ? blobEl(seed + 3, 64, 16, 11, .1, 'fill="#7bd88f" stroke="#15162b" stroke-width="2.5"') + '<path d="M58 16l4 4 8-8" fill="none" stroke="#15162b" stroke-width="3" stroke-linecap="round"/>' : "") + '</svg>';
}

/* Logo: two overlapping blobs. */
export function mark(cls, style) {
  return '<svg class="' + (cls || "mark") + '"' + (style ? ' style="' + style + '"' : "") + ' viewBox="0 0 40 40" aria-hidden="true">'
    + blobEl(11, 20, 20, 18.5, .07, 'fill="var(--lime)"', 0, .5)
    + blobEl(21, 15.5, 20, 8.6, .14, 'fill="var(--peri)" stroke="#15162b" stroke-width="2.2"', 0, 1.3)
    + blobEl(37, 24.5, 20, 8.6, .14, 'fill="var(--pink)" stroke="#15162b" stroke-width="2.2" style="mix-blend-mode:multiply"', 0, 1.1) + '</svg>';
}

/* Flowing lines (replace the static squiggle). */
export function ribbons(cls) {
  return '<svg class="' + (cls || "squig") + '" viewBox="0 0 170 70" aria-hidden="true" preserveAspectRatio="none">'
    + '<path data-line="0" data-g="170,34,18,1.6,1" fill="none" stroke="#f2652f" stroke-width="4" stroke-linecap="round"/>'
    + '<path data-line="2" data-g="170,52,8,1.1,.7" fill="none" stroke="#2b2f73" stroke-width="3" stroke-linecap="round"/></svg>';
}
function lineD(w, y, A, k, t, ph) {
  let d = "";
  for (let x = 4; x <= w - 3; x += 4) { const e = Math.sin(Math.PI * (x / w)); d += (d ? " L" : "M") + x + " " + f1(y + A * e * Math.sin((x / w) * TAU * k + t + ph)); }
  return d;
}

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ================= the loop ================= */
let items = [], waves = [], lines = [], running = false, last = 0, born = 0, seen = new Set(), io = null;
const visible = new WeakSet();
export function scan(root) {
  root = root || document;
  items = Array.from(root.querySelectorAll("[data-blob]")).map(el => { const g = el.dataset.g.split(",").map(Number); return { el, seed: +el.dataset.blob, g }; });
  waves = Array.from(root.querySelectorAll("[data-wave]")).map(el => ({ el, L: +el.dataset.wave, ph: +el.dataset.ph, A: +el.dataset.a }));
  lines = Array.from(root.querySelectorAll("[data-line]")).map(el => { const g = el.dataset.g.split(",").map(Number); return { el, ph: +el.dataset.line, g }; });
  if (!io && "IntersectionObserver" in window) io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)), { rootMargin: "60px" });
  if (io) { io.disconnect(); root.querySelectorAll("svg").forEach(s => { if (s.querySelector("[data-blob],[data-wave],[data-line]")) io.observe(s); }); }
  const bg = document.getElementById("organic-bg");
  if (bg) { bg.querySelectorAll("[data-blob]").forEach(el => { const g = el.dataset.g.split(",").map(Number); items.push({ el, seed: +el.dataset.blob, g }); }); if (io) bg.querySelectorAll("svg.ob").forEach(s => io.observe(s)); }
  born = performance.now();
  if (reduce()) { tick(born, true); return; }
  if (!running) { running = true; requestAnimationFrame(tick); }
}
function isVis(el) { if (!io) return true; const s = el.ownerSVGElement || el.closest("svg"); return !s || visible.has(s); }
function tick(now, once) {
  if (!once) {
    if (document.hidden) { running = false; return; }
    if (now - last < 33) { requestAnimationFrame(tick); return; }
  }
  last = now;
  const t = now / 1000;
  for (const b of items) {
    if (!once && !isVis(b.el)) continue;
    const [cx, cy, R, amp, lobes, sp] = b.g;
    b.el.setAttribute("d", blobD(b.seed, cx, cy, R, amp, t * sp, lobes || 0));
  }
  for (const w of waves) {
    if (!once && !isVis(w.el)) continue;
    if (!once && w.start == null) w.start = now;
    const k = once ? 1 : Math.min(1, (now - w.start) / 1500), L = w.L * (1 - Math.pow(1 - k, 3));
    w.el.setAttribute("d", waveD(L, 112, 112, w.A, t * 2.1, w.ph, 1.1));
  }
  for (const l of lines) {
    if (!once && !isVis(l.el)) continue;
    const [W, y, A, k, sp] = l.g;
    l.el.setAttribute("d", lineD(W, y, A, k, t * sp * 1.6, l.ph));
  }
  if (!once) requestAnimationFrame(tick);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && !running && !reduce()) { running = true; requestAnimationFrame(tick); } });

/* ================= page transitions ================= */
/* The new page is revealed through a growing blob that starts where you tapped. */
let tapX = innerWidth / 2, tapY = innerHeight / 2;
document.addEventListener("pointerdown", e => { tapX = e.clientX; tapY = e.clientY; }, true);
function blobPolygon(seed, cx, cy, R) {
  return "polygon(" + blobPts(seed, cx, cy, R, .16, 0, 0, 40).map(p => f1(p[0]) + "px " + f1(p[1]) + "px").join(",") + ")";
}
export function transition(update) {
  if (reduce() || !document.startViewTransition) { update(); return; }
  const seed = (Math.random() * 1e9) >>> 0, far = Math.hypot(Math.max(tapX, innerWidth - tapX), Math.max(tapY, innerHeight - tapY)) * 1.35;
  let vt;
  try { vt = document.startViewTransition(update); } catch (e) { update(); return; }
  vt.ready.then(() => {
    document.documentElement.animate({ clipPath: [blobPolygon(seed, tapX, tapY, 8), blobPolygon(seed, tapX, tapY, far * .55), blobPolygon(seed, tapX, tapY, far)] },
      { duration: 620, easing: "cubic-bezier(.65,0,.25,1)", pseudoElement: "::view-transition-new(root)" });
    document.documentElement.animate({ transform: ["none", "scale(.96)"], opacity: [1, .5] },
      { duration: 620, easing: "cubic-bezier(.65,0,.25,1)", pseudoElement: "::view-transition-old(root)" });
  }).catch(() => { });
}

/* Little organic splash where you tap a button. */
document.addEventListener("pointerdown", e => {
  if (reduce()) return;
  const b = e.target.closest && e.target.closest(".btn,.navbtn,.chip-c,.tile,.ptile,.ring,.fab,.hchip,.recapbar");
  if (!b) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 1.2, seed = (Math.random() * 1e9) >>> 0;
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.setAttribute("viewBox", "0 0 100 100"); el.setAttribute("class", "splash");
  el.style.cssText = "left:" + (e.clientX - r.left - s / 2) + "px;top:" + (e.clientY - r.top - s / 2) + "px;width:" + s + "px;height:" + s + "px";
  el.innerHTML = '<path d="' + blobD(seed, 50, 50, 42, .18, 0) + '"/>';
  if (getComputedStyle(b).position === "static") b.style.position = "relative";
  b.appendChild(el); setTimeout(() => el.remove(), 650);
}, { passive: true });

/* Background: slow drifting blobs behind everything. */
export function backdrop() {
  if (document.getElementById("organic-bg")) return;
  const d = document.createElement("div"); d.id = "organic-bg"; d.setAttribute("aria-hidden", "true");
  d.innerHTML = ["lime", "pink", "peri", "orange"].map((c, i) => '<svg class="ob ob' + i + '" viewBox="0 0 200 200">' + blobEl(hash("bg" + i), 100, 100, 80, .2, 'fill="url(#og-' + c + ')"', 0, .25 + i * .07) + '</svg>').join("")
    + '<svg width="0" height="0" style="position:absolute"><defs>' + [["lime", "#d9f15a"], ["pink", "#f6a9cf"], ["peri", "#8f9bf5"], ["orange", "#f2652f"]].map(([k, v]) => '<radialGradient id="og-' + k + '"><stop offset="0" stop-color="' + v + '" stop-opacity=".55"/><stop offset="1" stop-color="' + v + '" stop-opacity="0"/></radialGradient>').join("") + '</defs></svg>';
  document.body.prepend(d);
}
