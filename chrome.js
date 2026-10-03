/* Liquid chrome: a small WebGL scene of melting metal blobs with iridescent light.
   It sits inside the hero card, follows your finger or mouse, ripples when tapped,
   swells when there's plenty of budget left and turns warm when you're over. */

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uFill; uniform float uWarm; uniform float uPulse; uniform vec2 uCenter; uniform float uSpin;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float map(vec3 p){
  p.xz*=rot(uSpin+uMouse.x*.9); p.yz*=rot(uMouse.y*.6);
  float t=uTime*.45, r=.42+.22*uFill;
  float ripple=uPulse>0.?sin(length(p)*14.-uPulse*18.)*.035*exp(-uPulse*2.2):0.;
  vec3 a=vec3(sin(t)*.55,cos(t*1.3)*.32,cos(t*.7)*.3);
  vec3 b=vec3(cos(t*.8+2.)*.5,sin(t*1.1)*.4,sin(t*.9+1.)*.35);
  vec3 c=vec3(sin(t*.6+4.)*.35,cos(t*.75+1.)*.5,sin(t*1.2)*.25);
  float d=length(p-a)-r;
  d=smin(d,length(p-b)-r*.82,.55);
  d=smin(d,length(p-c)-r*.66,.5);
  d=smin(d,length(p)-r*.9,.6);
  d+=sin(p.x*5.+t*2.)*sin(p.y*4.+t*1.6)*sin(p.z*5.-t)*.035+ripple;
  return d;
}
vec3 nor(vec3 p){vec2 e=vec2(.0015,-.0015);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
vec3 env(vec3 r){
  // a dark studio with long light tubes, like neon reflected in chrome
  float y=r.y, x=r.x;
  vec3 col=mix(vec3(.02,.02,.05),vec3(.10,.08,.22),smoothstep(-1.,1.,y));
  col+=vec3(1.)*smoothstep(.985,1.,1.-abs(y-.55))*1.6;
  col+=vec3(.75,.8,1.)*smoothstep(.97,1.,1.-abs(x+.35))*1.1;
  col+=vec3(.9,.7,1.)*smoothstep(.98,1.,1.-abs(y+.25))*.8;
  col+=vec3(.55,.45,1.)*pow(max(0.,r.z),6.)*.6;
  return col;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; uv-=uCenter;
  vec3 ro=vec3(0.,0.,4.6), rd=normalize(vec3(uv,-1.75));
  float t=0.,d,md=1e3,mt=0.; bool hit=false; float glow=0.;
  for(int i=0;i<96;i++){vec3 p=ro+rd*t; d=map(p); if(d<md){md=d;mt=t;} glow+=.008/(.05+abs(d)); if(d<.001*t){hit=true;break;} t+=d*.8; if(t>8.)break;}
  // soft edge: treat a near miss as a partial hit so the outline is smooth, not dotted
  float edge=1.-smoothstep(0.,.012*mt,md);
  if(!hit&&edge>0.){hit=true;t=mt;}
  vec3 col=vec3(0.); float a=0.;
  vec3 warmTint=mix(vec3(.55,.45,1.),vec3(1.,.45,.35),uWarm);
  if(hit){
    vec3 p=ro+rd*t, n=nor(p), r=reflect(rd,n);
    float fr=pow(1.-max(dot(n,-rd),0.),3.);
    vec3 irid=.5+.5*cos(6.2831*(fr*1.2+dot(n,vec3(.3,.5,.2))+vec3(0.,.33,.67)+uTime*.05));
    irid=mix(irid,warmTint,.35);
    col=env(r)*mix(vec3(.85,.88,1.),irid,.55);
    col+=fr*warmTint*1.1;
    col+=pow(max(dot(r,normalize(vec3(.4,.8,.6))),0.),40.)*1.4;
    a=hit?max(edge,step(md,.0011*t)):0.;
  }
  col+=warmTint*glow*.035; a=max(a,clamp(glow*.03,0.,.6));
  col=col/(1.+col*.35);
  gl_FragColor=vec4(col*a,a);
}`;

const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
let gl, prog, canvas, host, U = {}, raf = 0, last = 0, state = { fill: .6, warm: 0 }, mouse = [0, 0], target = [0, 0], pulseAt = -1, spin = 0, spinV = 0, dragX = null, visible = true, io, failed = false;

function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function init() {
  canvas = document.createElement("canvas"); canvas.className = "chrome3d"; canvas.setAttribute("aria-hidden", "true");
  gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "low-power" });
  if (!gl) { failed = true; return false; }
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch (e) { console.warn("chrome", e); failed = true; return false; }
  gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ["uRes", "uTime", "uMouse", "uFill", "uWarm", "uPulse", "uCenter", "uSpin"].forEach(k => U[k] = gl.getUniformLocation(prog, k));
  gl.clearColor(0, 0, 0, 0);
  canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); failed = true; cancelAnimationFrame(raf); canvas.remove(); });
  if ("IntersectionObserver" in window) { io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }); }
  return true;
}
function size() {
  if (!host) return;
  const r = host.getBoundingClientRect(), q = Math.min(window.devicePixelRatio || 1, 1.6) * (innerWidth < 700 ? .7 : .75);
  const w = Math.max(2, Math.round(r.width * q)), h = Math.max(2, Math.round(r.height * q));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
}
function frame(now) {
  raf = 0;
  if (!host || !host.isConnected || document.hidden || !visible) return;
  if (now - last < 32) { raf = requestAnimationFrame(frame); return; }
  last = now; size();
  mouse[0] += (target[0] - mouse[0]) * .08; mouse[1] += (target[1] - mouse[1]) * .08;
  spin += spinV; spinV *= .94; if (Math.abs(spinV) < .0004) spinV = 0;
  const wide = canvas.width / canvas.height;
  gl.uniform2f(U.uRes, canvas.width, canvas.height);
  gl.uniform1f(U.uTime, now / 1000);
  gl.uniform2f(U.uMouse, mouse[0], mouse[1]);
  gl.uniform1f(U.uFill, state.fill); gl.uniform1f(U.uWarm, state.warm);
  gl.uniform1f(U.uPulse, pulseAt < 0 ? -1 : (now - pulseAt) / 1000);
  gl.uniform2f(U.uCenter, wide > 1.25 ? wide * .26 : wide * .26, wide > 1.25 ? .02 : -.2);
  gl.uniform1f(U.uSpin, spin + now / 9000);
  gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (!reduce()) raf = requestAnimationFrame(frame);
}
function kick() { if (!raf && !failed) raf = requestAnimationFrame(frame); }
function onMove(e) {
  if (!host) return; const r = host.getBoundingClientRect();
  target = [((e.clientX - r.left) / r.width - .5) * 2, -((e.clientY - r.top) / r.height - .5) * 2];
  if (dragX != null) { spinV += (e.clientX - dragX) * .0009; dragX = e.clientX; }
}
function onDown(e) { dragX = e.clientX; pulseAt = performance.now(); try { if (navigator.vibrate) navigator.vibrate(6); } catch (er) { } kick(); }
function onUp() { dragX = null; }

/* Put the scene inside an element. Call after every render; it re-attaches to the new hero. */
export function mountChrome(el, opts) {
  if (!el || failed) return false;
  if (!gl && !init()) return false;
  state.fill = Math.max(0, Math.min(1, opts && opts.fill != null ? opts.fill : .6));
  state.warm = opts && opts.warm ? 1 : 0;
  if (host !== el) {
    if (host) { host.removeEventListener("pointermove", onMove); host.removeEventListener("pointerdown", onDown); }
    host = el; el.prepend(canvas);
    el.addEventListener("pointermove", onMove); el.addEventListener("pointerdown", onDown);
    if (io) { io.disconnect(); io.observe(el); }
  }
  kick();
  return true;
}
window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
window.addEventListener("deviceorientation", e => { if (e.gamma == null || !host) return; target = [Math.max(-1, Math.min(1, e.gamma / 35)), Math.max(-1, Math.min(1, (e.beta - 45) / 45))]; }, { passive: true });

/* Cards tilt towards your pointer in 3D, with a light that follows. */
export function tilt(root) {
  if (reduce() || !(window.matchMedia && matchMedia("(hover: hover)").matches)) return;
  root.querySelectorAll(".tilt").forEach(el => {
    if (el._tilt) return; el._tilt = true;
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--rx", ((.5 - y) * 7).toFixed(2) + "deg"); el.style.setProperty("--ry", ((x - .5) * 9).toFixed(2) + "deg");
      el.style.setProperty("--gx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
      el.classList.add("tilting");
    });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); el.classList.remove("tilting"); });
  });
}
