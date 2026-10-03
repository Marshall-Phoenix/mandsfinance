/* The 3D world behind the app.
   Five stations, one per section, each built from your real numbers:
     home      a liquid chrome core; your savings pots orbit it as small moons
     spend     a vortex of glass beads, one per purchase this month
     flow      three pools (Mukul, Sylwia, Joint) joined by flowing rivers of money
     plan      a cluster of ice crystals, one per bill, subscription, debt, budget, pot and upcoming cost
     insights  a field of dots shaped by the two year forecast, with debt and savings lines
   The camera flies between them when you change section, and the picture dissolves
   into text characters on the way (switchable to stay that way in Settings).
   Drag the stage to spin things, tap objects to open them. */
import * as T from "./three.min.js";

const TAU = Math.PI * 2;
const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;

const POST_VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const POST_FRAG = `
precision highp float;
uniform sampler2D tScene; uniform sampler2D tFont; uniform vec2 uRes; uniform float uAscii; uniform float uCell; uniform float uGlyphs; uniform float uLight;
varying vec2 vUv;
vec3 aces(vec3 x){const float a=2.51,b=.03,c=2.43,d=.59,e=.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
vec4 grade(vec4 s){ if(s.a<=0.) return vec4(0.); vec3 c=s.rgb/s.a; c=toSRGB(aces(c*1.1)); return vec4(c*s.a,s.a); }
void main(){
  vec4 col=grade(texture2D(tScene,vUv));
  if(uAscii<.002){gl_FragColor=col;return;}
  vec2 cell=vec2(uCell,uCell*1.7);
  vec2 cid=floor(gl_FragCoord.xy/cell);
  vec4 c=grade(texture2D(tScene,(cid+.5)*cell/uRes));
  vec3 straight=c.a>0.?c.rgb/c.a:vec3(0.);
  float lum=dot(straight,vec3(.299,.587,.114))*c.a;
  lum=uLight>.5?c.a*(1.-.5*dot(straight,vec3(.33))):lum;
  float gi=floor(clamp(lum*1.25,0.,.999)*uGlyphs);
  vec2 inCell=fract(gl_FragCoord.xy/cell);
  float g=texture2D(tFont,vec2((gi+inCell.x)/uGlyphs,inCell.y)).r;
  vec3 tint=uLight>.5?mix(vec3(.12),straight*.6,.6):mix(vec3(.85,.85,1.),straight*1.6,.7);
  float a=g*step(.03,c.a)*min(1.,c.a*1.6+.2);
  vec4 asc=vec4(tint*a,a);
  gl_FragColor=mix(col,asc,uAscii);
}`;

const FLOW_VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FLOW_FRAG = `uniform float uTime;uniform vec3 uColor;uniform float uSpeed;varying vec2 vUv;
void main(){float s=fract(vUv.x*10.-uTime*uSpeed);float a=smoothstep(0.,.25,s)*smoothstep(1.,.55,s);float edge=1.-abs(vUv.y-.5)*1.6;gl_FragColor=vec4(uColor*(1.2+a),(.25+.75*a)*edge);}`;

let R, scene, cam, post, postScene, postCam, target, fontTex, canvas, env, clock, raf = 0, active = false;
const ST = {}; let current = "home", flight = null, asciiAlways = false, light = false, pickables = [], hover = null;
const camPos = new T.Vector3(0, .3, 7), camLook = new T.Vector3(0, 0, 0);
const spin = { x: 0, y: 0, vx: 0, vy: 0, drag: null };
let pulseAt = -10, scrollY0 = 0, frameN = 0, onPickCb = null, lastData = null, lastDraw = 0;

const POS = { home: [0, 0, 0], spend: [16, 3, -12], flow: [31, -2, -3], plan: [44, 4, -20], insights: [58, 0, -8] };
const COL = { m: "#7fd8ff", s: "#ff86dc", j: "#a995ff", good: "#6dffc4", bad: "#ff7a8a", warn: "#ffc46b" };

function envMap() {
  // a room lit by long neon tubes, so chrome picks up violet, ice blue and pink streaks
  const room = new T.Scene();
  const box = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0x06060c, side: T.BackSide }));
  box.scale.set(30, 16, 30); room.add(box);
  const tube = (c, i, x, y, z, sx, sy, sz) => { const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(i) })); m.position.set(x, y, z); room.add(m); };
  tube("#ffffff", 3.2, 0, 7.5, 0, 22, .25, .6);
  tube("#a995ff", 3, -13, 2, -4, .4, 9, .4);
  tube("#7fd8ff", 2.6, 13, 0, 3, .4, 7, .4);
  tube("#ff86dc", 2.6, 4, -3, -13, 10, .3, .3);
  tube("#ffffff", 1.4, -6, 3, 13, 6, 6, .2);
  tube("#140f2e", 1, 0, -7.5, 0, 26, .2, 26);
  tube("#6a4cff", 2.2, -8, -6, 6, 6, .2, 1.2);
  tube("#3fb8ff", 1.8, 9, -5, -7, 1, .2, 7);
  tube("#ff4fc8", 1.6, 0, 4, -14.6, 3, 2, .2);
  const pm = new T.PMREMGenerator(R); const tex = pm.fromScene(room, .02).texture; pm.dispose(); return tex;
}
function fontAtlas() {
  const chars = " .·:-=+*%#@£", W = 32, H = 54, c = document.createElement("canvas"); c.width = W * chars.length; c.height = H;
  const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#fff";
  x.font = "500 40px 'JetBrains Mono', ui-monospace, monospace"; x.textAlign = "center"; x.textBaseline = "middle";
  [...chars].forEach((ch, i) => x.fillText(ch, i * W + W / 2, H / 2 + 2));
  const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; t.magFilter = T.LinearFilter; t.flipY = true; return { t, n: chars.length };
}

/* ---------- materials ---------- */
function chromeMat(color, opts) {
  return new T.MeshPhysicalMaterial(Object.assign({ color: new T.Color(color || "#ffffff"), metalness: 1, roughness: .16, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [180, 820], clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.35 }, opts || {}));
}
function coreMat() {
  const m = chromeMat("#e9e6ff", { iridescence: .75, roughness: .12 });
  m.userData.u = { uTime: { value: 0 }, uAmp: { value: .11 }, uPulse: { value: -10 } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = "uniform float uTime;uniform float uAmp;uniform float uPulse;\n" + NOISE + `
vec3 disp(vec3 p){float n=snoise(p*1.15+vec3(0.,uTime*.22,uTime*.31));float n2=snoise(p*2.2-vec3(uTime*.3));float r=uPulse>=0.?sin(length(p)*9.-uPulse*11.)*.07*exp(-uPulse*1.8):0.;return p*(1.+n*uAmp+n2*uAmp*.28+r);}
` + sh.vertexShader;
    sh.vertexShader = sh.vertexShader.replace("#include <beginnormal_vertex>", `
vec3 p0=position;vec3 dp=disp(p0);vec3 nn=normalize(p0);vec3 tg=normalize(cross(nn,abs(nn.y)<.99?vec3(0.,1.,0.):vec3(1.,0.,0.)));vec3 bt=normalize(cross(nn,tg));
float e=.012;vec3 q1=disp(p0+tg*e);vec3 q2=disp(p0+bt*e);vec3 objectNormal=normalize(cross(q1-dp,q2-dp));if(dot(objectNormal,nn)<0.)objectNormal=-objectNormal;
#ifdef USE_TANGENT
vec3 objectTangent=vec3(tangent.xyz);
#endif`);
    sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "vec3 transformed=dp;");
  };
  return m;
}

/* ---------- stations ---------- */
function station(name) {
  const g = new T.Group(); g.position.fromArray(POS[name]); scene.add(g);
  const s = { name, g, spinner: new T.Group(), anchors: {}, tick: null };
  g.add(s.spinner); ST[name] = s; return s;
}
function clearSpinner(s) {
  pickables = pickables.filter(p => !s.spinner.getObjectById(p.id));
  s.spinner.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== s.keepMat) [].concat(o.material).forEach(m => m.dispose()); });
  s.spinner.clear();
}
function pick(o, info) { o.userData.pick = info; pickables.push(o); return o; }

function buildHome(d) {
  const s = ST.home || station("home"); clearSpinner(s);
  const core = new T.Mesh(new T.IcosahedronGeometry(1, innerWidth < 700 ? 48 : 72), s.keepMat || (s.keepMat = coreMat()));
  const sc = .78 + .42 * Math.max(0, Math.min(1, d.fill));
  core.scale.setScalar(sc); s.core = core; s.spinner.add(pick(core, { type: "core" }));
  s.keepMat.color.set(d.warm ? "#ffb3a6" : "#ece9ff");
  s.keepMat.iridescenceThicknessRange = d.warm ? [400, 700] : [180, 820];
  // pots orbit as moons
  s.moons = (d.pots || []).slice(0, 9).map((p, i) => {
    const m = new T.Mesh(new T.SphereGeometry(1, 32, 24), chromeMat(p.color, { roughness: .18 }));
    m.scale.setScalar(.07 + .11 * Math.sqrt(Math.max(.05, p.pct))); s.spinner.add(pick(m, { type: "item", c: "pots", id: p.id }));
    const ring = new T.Mesh(new T.TorusGeometry(1.75 + i * .2, .0035, 6, 160), new T.MeshBasicMaterial({ color: p.color, transparent: true, opacity: .09 }));
    const tilt = new T.Euler(.5 + i * .37, i * 1.1, .2 * i); ring.rotation.copy(tilt); s.spinner.add(ring);
    return { m, r: 1.75 + i * .2, tilt, speed: .18 + .05 * (i % 3), phase: i * 1.7 };
  });
  s.tick = (t) => {
    s.keepMat.userData.u.uTime.value = t; s.keepMat.userData.u.uPulse.value = t - pulseAt < 4 ? t - pulseAt : -10;
    s.moons.forEach(o => { const a = t * o.speed + o.phase, v = new T.Vector3(Math.cos(a) * o.r, 0, Math.sin(a) * o.r).applyEuler(o.tilt); o.m.position.copy(v); });
  };
}
function buildSpend(d) {
  const s = ST.spend || station("spend"); clearSpinner(s);
  const ex = (d.expenses || []).slice(0, 400), mx = Math.max(1, ...ex.map(e => e.amount));
  const geo = new T.SphereGeometry(1, 20, 14), mat = chromeMat("#ffffff", { roughness: .2, iridescence: .7 });
  const im = new T.InstancedMesh(geo, mat, Math.max(1, ex.length)); im.count = ex.length;
  const M = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color();
  s.items = ex.map((e, i) => {
    const k = Math.min(1, (e.age || 0) / 92), a = k * TAU * 3 + i * .37, h = (.5 - k) * 3.6, r = .9 + k * .5 + ((i * 7919) % 100) / 100 * .35;
    const sz = (.06 + .17 * Math.sqrt(e.amount / mx)) * (1 - k * .45);
    M.compose(new T.Vector3(Math.cos(a) * r, h, Math.sin(a) * r), q, new T.Vector3(sz, sz, sz)); im.setMatrixAt(i, M);
    im.setColorAt(i, c.set(COL[e.who] || COL.j)); return e;
  });
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  s.spinner.add(pick(im, { type: "expense", list: s.items }));
  // a faint spine
  const pts = []; for (let i = 0; i <= 260; i++) { const k = i / 260, a = k * TAU * 3; pts.push(new T.Vector3(Math.cos(a) * (.9 + k * .5), (.5 - k) * 3.6, Math.sin(a) * (.9 + k * .5))); }
  s.spinner.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: "#a995ff", transparent: true, opacity: .25 })));
  s.tick = t => { s.spinner.rotation.y += .0025; };
}
function river(a, b, amount, mx, color, lift) {
  const mid = a.clone().lerp(b, .5); mid.y += lift;
  const curve = new T.QuadraticBezierCurve3(a, mid, b);
  const r = .018 + .07 * Math.sqrt(Math.max(0, amount) / mx);
  const mat = new T.ShaderMaterial({ vertexShader: FLOW_VERT, fragmentShader: FLOW_FRAG, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 }, uColor: { value: new T.Color(color) }, uSpeed: { value: .35 + .25 * (amount / mx) } } });
  return new T.Mesh(new T.TubeGeometry(curve, 80, r, 10, false), mat);
}
function buildFlow(d) {
  const s = ST.flow || station("flow"); clearSpinner(s);
  const P = { m: new T.Vector3(-1.7, 0, .7), s: new T.Vector3(1.7, 0, .7), j: new T.Vector3(0, .1, -1.3), out: new T.Vector3(0, -1.9, .4) };
  const f = d.flow || {}, mx = Math.max(1, f.m2j || 0, f.s2j || 0, f.mOut || 0, f.sOut || 0, f.jOut || 0);
  ["m", "s", "j"].forEach(k => {
    const ring = new T.Mesh(new T.TorusGeometry(.5, .05, 24, 96), chromeMat(COL[k], { roughness: .12 }));
    ring.rotation.x = Math.PI / 2; ring.position.copy(P[k]); s.spinner.add(pick(ring, { type: "account", who: k }));
    const pool = new T.Mesh(new T.CircleGeometry(.47, 64), new T.MeshBasicMaterial({ color: COL[k], transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.copy(P[k]); s.spinner.add(pool);
    s.anchors[k] = P[k].clone().add(new T.Vector3(0, .7, 0));
  });
  const sink = new T.Mesh(new T.TorusGeometry(.3, .02, 12, 64), new T.MeshBasicMaterial({ color: "#8a8ca3", transparent: true, opacity: .5 }));
  sink.rotation.x = Math.PI / 2; sink.position.copy(P.out); s.spinner.add(sink); s.anchors.out = P.out.clone().add(new T.Vector3(0, -.45, 0));
  s.rivers = [];
  const add = (a, b, amt, col, lift) => { if (!(amt > 0)) return; const m = river(P[a], P[b], amt, mx, col, lift); s.spinner.add(m); s.rivers.push(m); };
  add("m", "j", f.m2j, COL.m, .9); add("s", "j", f.s2j, COL.s, .9);
  add("m", "out", f.mOut, COL.m, -.2); add("s", "out", f.sOut, COL.s, -.2); add("j", "out", f.jOut, COL.j, -.4);
  s.tick = t => { s.rivers.forEach(r => { r.material.uniforms.uTime.value = t; }); };
}
function buildPlan(d) {
  const s = ST.plan || station("plan"); clearSpinner(s);
  const items = (d.items || []).slice(0, 80), mx = Math.max(1, ...items.map(i => i.amount || 0));
  const geo = new T.OctahedronGeometry(1, 0);
  s.crystals = items.map((it, i) => {
    const n = items.length, a = i / Math.max(1, n) * TAU + (i % 2) * .2, rr = .25 + (i % 5) * .22;
    const h = .45 + 1.25 * Math.sqrt((it.amount || 0) / mx);
    const m = new T.Mesh(geo, new T.MeshPhysicalMaterial({ color: new T.Color(it.color), metalness: .15, roughness: .04, iridescence: 1, iridescenceIOR: 1.7, transparent: true, opacity: .82, envMapIntensity: 2.6, clearcoat: 1, emissive: new T.Color(it.color), emissiveIntensity: .12 }));
    m.scale.set(.14 + .06 * (i % 3), h, .14 + .06 * ((i + 1) % 3));
    m.position.set(Math.cos(a) * rr, h * .55 - .6, Math.sin(a) * rr);
    m.rotation.set(Math.sin(a) * .35 * (rr + .3), 0, -Math.cos(a) * .35 * (rr + .3));
    s.spinner.add(pick(m, { type: "item", c: it.c, id: it.id })); return { m, base: m.rotation.clone(), ph: i };
  });
  const ice = new T.Mesh(new T.CircleGeometry(2.2, 64), new T.MeshBasicMaterial({ color: "#7fd8ff", transparent: true, opacity: .08, depthWrite: false }));
  ice.rotation.x = -Math.PI / 2; ice.position.y = -.62; s.spinner.add(ice);
  s.tick = t => { s.spinner.rotation.y += .0018; s.crystals.forEach(c => { c.m.position.y += Math.sin(t * .8 + c.ph) * .0006; }); };
}
function buildInsights(d) {
  const s = ST.insights || station("insights"); clearSpinner(s);
  const debt = d.debt || [], pots = d.potsSeries || [], n = Math.max(debt.length, pots.length, 2);
  const mx = Math.max(1, ...debt, ...pots), W = 5.6, X = i => -W / 2 + W * i / (n - 1), Y = v => -.6 + 1.9 * v / mx;
  const net = Array.from({ length: n }, (_, i) => (pots[i] || 0) - (debt[i] || 0)), nmx = Math.max(1, ...net.map(Math.abs));
  const cols = 64, rows = 22, pos = [], colr = [], c1 = new T.Color("#6a4cff"), c2 = new T.Color("#6dffc4"), tmp = new T.Color();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const u = c / (cols - 1), z = (r / (rows - 1) - .5) * 2.6, k = u * (n - 1), i0 = Math.floor(k), fr = k - i0;
    const v = (net[i0] * (1 - fr) + (net[Math.min(n - 1, i0 + 1)] || 0) * fr) / nmx;
    pos.push(-W / 2 + W * u, -1.05 + .5 * v * Math.exp(-z * z * .8), z);
    tmp.copy(c1).lerp(c2, (v + 1) / 2); colr.push(tmp.r, tmp.g, tmp.b);
  }
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(colr, 3));
  s.field = new T.Points(g, new T.PointsMaterial({ size: .028, vertexColors: true, transparent: true, opacity: .85, depthWrite: false, blending: T.AdditiveBlending }));
  s.base = Float32Array.from(pos); s.spinner.add(s.field);
  const line = (arr, col) => {
    if (!arr.length) return;
    const pts = arr.map((v, i) => new T.Vector3(X(i), Y(v), 0));
    s.spinner.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 120, .02, 8, false), new T.MeshBasicMaterial({ color: col })));
    const dots = new T.Points(new T.BufferGeometry().setFromPoints(pts), new T.PointsMaterial({ size: .07, color: col, transparent: true, opacity: .9 }));
    s.spinner.add(dots);
  };
  line(debt, COL.bad); line(pots, COL.good);
  s.anchors.debtEnd = new T.Vector3(X(n - 1), Y(debt[n - 1] || 0) + .25, 0);
  s.anchors.potsEnd = new T.Vector3(X(n - 1), Y(pots[n - 1] || 0) + .25, 0);
  s.anchors.now = new T.Vector3(X(0), -1.35, 0);
  s.tick = t => {
    const p = s.field.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = s.base[i * 3], z = s.base[i * 3 + 2]; p.array[i * 3 + 1] = s.base[i * 3 + 1] + Math.sin(x * 1.6 + t * 1.1) * Math.cos(z * 2 - t * .7) * .05; }
    p.needsUpdate = true;
  };
}
function buildDust() {
  const n = innerWidth < 700 ? 900 : 1800, p = [], c = [], pal = ["#bdb6ff", "#7fd8ff", "#ff86dc", "#ffffff"].map(x => new T.Color(x));
  for (let i = 0; i < n; i++) { p.push(-12 + Math.random() * 84, -9 + Math.random() * 22, -34 + Math.random() * 44); const k = pal[i % 4]; c.push(k.r, k.g, k.b); }
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(p, 3)); g.setAttribute("color", new T.Float32BufferAttribute(c, 3));
  const dust = new T.Points(g, new T.PointsMaterial({ size: .05, vertexColors: true, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending }));
  scene.add(dust); return dust;
}

/* ---------- camera ---------- */
function framing() {
  // where on screen the station sits: in the top stage on phones, to the right on wide screens
  const w = innerWidth, h = innerHeight, wide = w >= 900;
  return { fx: wide ? .7 : .5, fy: wide ? .42 : .2, dist: wide ? 7.6 : (w / h < .62 ? 13 : 10) };
}
function viewFor(name) {
  const p = new T.Vector3().fromArray(POS[name]), f = framing(), narrow = innerWidth < 900;
  const k = { home: 1, spend: narrow ? 1.55 : 1.15, flow: narrow ? 1.75 : 1.25, plan: narrow ? 1.45 : 1.15, insights: narrow ? 1.9 : 1.75 }[name] || 1, D = f.dist * k;
  const off = name === "insights" ? new T.Vector3(0, D * .22, D) : name === "flow" ? new T.Vector3(0, D * .38, D * .92) : name === "plan" ? new T.Vector3(0, D * .12, D) : new T.Vector3(0, .35, D);
  return { pos: p.clone().add(off), look: p.clone().add(new T.Vector3(0, name === "flow" ? (narrow ? -.4 : -.15) : name === "plan" ? .25 : name === "insights" ? -.3 : 0, 0)) };
}
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
function applyCam() {
  const f = framing(), w = innerWidth, h = innerHeight;
  cam.aspect = w / h; cam.updateProjectionMatrix();
  cam.setViewOffset(w, h, -(f.fx - .5) * w, (.5 - f.fy) * h + Math.min(h, scrollY0) * .55, w, h);
  cam.position.copy(camPos); cam.lookAt(camLook);
}

/* ---------- loop ---------- */
function resize() {
  if (!R) return;
  const dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 1.75);
  R.setPixelRatio(dpr); R.setSize(innerWidth, innerHeight, false);
  const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
  target.setSize(w, h); post.uniforms.uRes.value.set(w, h); post.uniforms.uCell.value = Math.round(7 * dpr);
}
function frame() {
  raf = 0; if (!active || document.hidden) return;
  // full speed while flying or being touched; calmer when idle, calmer still when scrolled past the stage
  const now = performance.now(), idleGap = flight || spin.drag ? 0 : scrollY0 > innerHeight * .9 ? 66 : 30;
  if (now - lastDraw < idleGap) { raf = requestAnimationFrame(frame); return; }
  lastDraw = now;
  const t = clock.getElapsedTime(); frameN++;
  let ascii = asciiAlways ? 1 : 0;
  if (flight) {
    const k = Math.min(1, (performance.now() - flight.t0) / flight.dur), e = ease(k);
    camPos.lerpVectors(flight.from.pos, flight.to.pos, e).add(flight.arc.clone().multiplyScalar(Math.sin(Math.PI * e)));
    camLook.lerpVectors(flight.from.look, flight.to.look, e);
    if (!asciiAlways) ascii = Math.pow(Math.sin(Math.PI * k), .55);
    if (k >= 1) { flight = null; }
  } else {
    const v = viewFor(current); camPos.lerp(v.pos, .08); camLook.lerp(v.look, .08);
  }
  // spin with inertia
  const s = ST[current];
  if (s) {
    if (!spin.drag) { spin.vx *= .94; spin.vy *= .94; }
    s.spinner.rotation.y += spin.vx; s.spinner.rotation.x = Math.max(-.6, Math.min(.6, s.spinner.rotation.x + spin.vy));
    if (!spin.drag) s.spinner.rotation.x *= .97;
  }
  Object.values(ST).forEach(x => { if (x.tick && (x.name === current || flight)) x.tick(t); });
  applyCam();
  post.uniforms.uAscii.value = ascii;
  R.setRenderTarget(target); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam);
  R.setRenderTarget(null); R.clear(); R.render(postScene, postCam);
  placeLabels();
  if (!reduce() || flight) raf = requestAnimationFrame(frame);
}
function kick() { if (!raf && active) raf = requestAnimationFrame(frame); }

/* labels in the page that follow points in the world */
function placeLabels() {
  const s = ST[current]; if (!s) return;
  const st = document.querySelector(".stage"), sb = st ? st.getBoundingClientRect().bottom : innerHeight;
  document.querySelectorAll("[data-anchor]").forEach(el => {
    const a = s.anchors[el.dataset.anchor]; if (!a) { el.style.opacity = 0; return; }
    const v = a.clone(); s.spinner.localToWorld(v); v.project(cam);
    const x = (v.x * .5 + .5) * innerWidth, y = (-v.y * .5 + .5) * innerHeight;
    const half = (el.offsetWidth || 80) / 2 + 8, cx = Math.max(half, Math.min(innerWidth - half, x));
    el.style.transform = "translate(" + cx.toFixed(1) + "px," + (y + scrollY).toFixed(1) + "px) translate(-50%,-50%)";
    el.style.opacity = flight || v.z > 1 || y < 40 || y > innerHeight || y > sb - 24 ? 0 : 1;
  });
}

/* ---------- input ---------- */
const ray = new T.Raycaster(), ndc = new T.Vector2();
function hit(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
  const hs = ray.intersectObjects(pickables.filter(p => { let o = p; while (o.parent) o = o.parent; return o === scene && ST[current] && ST[current].spinner.getObjectById(p.id); }), false);
  if (!hs.length) return null;
  const h = hs[0], info = h.object.userData.pick;
  if (info.type === "expense") { const e = info.list[h.instanceId]; return e ? { type: "expense", id: e.id } : null; }
  return info;
}
function stageAt(e) { return e.target && e.target.closest && e.target.closest(".stage") && !e.target.closest("button,a,input,select,textarea,.hchip"); }
document.addEventListener("pointerdown", e => {
  if (!active || !stageAt(e)) return;
  spin.drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }; spin.vx = 0; spin.vy = 0; kick();
});
document.addEventListener("pointermove", e => {
  if (!active) return;
  if (spin.drag) {
    const dx = e.clientX - spin.drag.x, dy = e.clientY - spin.drag.y; spin.drag.x = e.clientX; spin.drag.y = e.clientY;
    if (Math.abs(e.clientX - spin.drag.x0) > Math.abs(e.clientY - spin.drag.y0) || e.pointerType === "mouse") { spin.vx = dx * .006; spin.vy = dy * .003; }
    kick(); return;
  }
  if (e.pointerType === "mouse" && stageAt(e)) { const h = hit(e.clientX, e.clientY); const st = document.querySelector(".stage"); if (st) st.style.cursor = h ? "pointer" : "grab"; }
});
document.addEventListener("pointerup", e => {
  if (!spin.drag) return; const d = spin.drag; spin.drag = null;
  if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6 && performance.now() - d.t < 450) {
    const h = hit(e.clientX, e.clientY);
    if (h && h.type === "core") { pulseAt = clock.getElapsedTime(); try { navigator.vibrate && navigator.vibrate(8); } catch (er) { } }
    else if (h && onPickCb) onPickCb(h);
    else pulseAt = clock.getElapsedTime() - (current === "home" ? 0 : 99);
  }
});
window.addEventListener("scroll", () => { scrollY0 = scrollY; kick(); }, { passive: true });
window.addEventListener("resize", () => { resize(); kick(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

/* ---------- public ---------- */
export const World = {
  ok: false,
  init() {
    if (this.ok || this.failed) return this.ok;
    try {
      canvas = document.createElement("canvas"); canvas.id = "world"; canvas.setAttribute("aria-hidden", "true");
      R = new T.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
      R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.NoToneMapping;
    } catch (e) { this.failed = true; return false; }
    document.body.prepend(canvas);
    scene = new T.Scene(); env = envMap(); scene.environment = env;
    scene.fog = new T.FogExp2(0x07070c, .035);
    cam = new T.PerspectiveCamera(38, innerWidth / innerHeight, .1, 200);
    target = new T.WebGLRenderTarget(2, 2, { samples: 4, type: T.HalfFloatType || undefined });
    const fa = fontAtlas(); fontTex = fa.t;
    post = new T.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: POST_FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: target.texture }, tFont: { value: fontTex }, uRes: { value: new T.Vector2(2, 2) }, uAscii: { value: 0 }, uCell: { value: 8 }, uGlyphs: { value: fa.n }, uLight: { value: 0 } } });
    postScene = new T.Scene(); postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post));
    buildDust(); const t0 = performance.now(); clock = { getElapsedTime: () => (performance.now() - t0) / 1000 };
    if (document.fonts && document.fonts.load) document.fonts.load("500 40px 'JetBrains Mono'").then(() => { const n = fontAtlas(); post.uniforms.tFont.value = n.t; fontTex.dispose(); fontTex = n.t; kick(); }).catch(() => { });
    this.ok = true; active = true;
    const v = viewFor(current); camPos.copy(v.pos); camLook.copy(v.look);
    resize(); kick();
    return true;
  },
  update(d) {
    if (!this.ok) return; lastData = d;
    buildHome(d); buildSpend(d); buildFlow(d); buildPlan(d); buildInsights(d); kick();
  },
  go(name, instant) {
    if (!this.ok || !POS[name]) return;
    if (name === current && !instant) { kick(); return; }
    const from = { pos: camPos.clone(), look: camLook.clone() }, to = viewFor(name);
    current = name; spin.vx = spin.vy = 0;
    if (instant || reduce()) { flight = null; camPos.copy(to.pos); camLook.copy(to.look); kick(); return; }
    const dist = from.pos.distanceTo(to.pos);
    flight = { from, to, t0: performance.now(), dur: Math.min(2100, 1100 + dist * 22), arc: new T.Vector3(0, 2.2 + dist * .05, 3 + dist * .06) };
    kick();
  },
  setLook(opts) {
    if (!this.ok) return;
    asciiAlways = !!opts.ascii; light = !!opts.light;
    post.uniforms.uLight.value = light ? 1 : 0;
    scene.fog.color.set(light ? 0xf3f0e9 : 0x07070c);
    kick();
  },
  onPick(fn) { onPickCb = fn; },
  pulse() { if (clock) { pulseAt = clock.getElapsedTime(); kick(); } },
  get flying() { return !!flight; }
};
