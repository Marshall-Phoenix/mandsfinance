import { firebaseConfig } from "./config.js";
import { demoData } from "./demo.js";
import { pebble, mark, contours, smoothPath, scan, transition, backdrop, blobD, hash } from "./organic.js";
import { mountChrome, tilt } from "./chrome.js";
import { World } from "./world.js";

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sum = a => a.reduce((x, y) => x + (+y || 0), 0);
const r2 = n => Math.round((+n || 0) * 100) / 100;
const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/[£,\s%]/g, "")); return isFinite(n) ? r2(n) : 0; };
const F0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const F2 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const FI = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const gbp = (n, dp) => (dp ? F2 : F0).format(Math.abs(n) < 0.005 ? 0 : Math.abs(n));
const gbpx = n => (Math.abs(n % 1) > 0.004 ? F2 : F0).format(Math.abs(n));
const pad = n => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const thisYM = () => todayISO().slice(0, 7);
const addM = (ym, n) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
const addD = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const dDiff = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const dim = ym => { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const dayIn = (ym, day) => Math.max(1, Math.min(dim(ym), +day || 1));
const isoOf = (ym, day) => ym + "-" + pad(dayIn(ym, day));
const ymLabel = (ym, short) => { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-GB", short ? { month: "short", year: "numeric" } : { month: "long", year: "numeric" }); };
const monthName = m => new Date(2026, (+m || 1) - 1, 1).toLocaleDateString("en-GB", { month: "long" });
const dateLabel = iso => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dayLabel = iso => { if (iso === todayISO()) return "Today"; if (iso === addD(todayISO(), -1)) return "Yesterday"; return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); };
const ordinal = n => { n = +n; const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

const WHO = ["m", "s", "j"];
const PEOPLE = ["m", "s"];
const FREQ = { monthly: "Monthly", yearly: "Yearly", quarterly: "Quarterly", weekly: "Weekly" };
const COLORS = ["blue", "rose", "ochre", "green", "purple", "teal", "orange", "slate"];
const EMOJIS = "🛒 🍽️ 🍕 ☕ 🥡 🚕 🚗 ⛽ 🚆 ✈️ 🏖️ 🏝️ 🏠 🛠️ 💡 📱 💻 🎮 🎬 🎵 🎁 🎄 🎂 💍 👰 👶 🐱 🐾 💊 💇 💅 🛍️ 👕 📚 🎓 💰 🏦 🛟 🧾 💸 📈 🏋️ 🎉 🇮🇳 🇵🇱 🇬🇧 🛂 👵 🌍 ⚽".split(" ");
const ASSET_KINDS = { savings: "Savings account", pension: "Pension", investment: "Investments", cash: "Current account", property: "Property", other: "Other" };
const ICON = {
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
  spend: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  flow: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  plan: '<path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3"/>',
  insight: '<path d="M4 19h16M6 16l4-5 3 3 5-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  bin: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  minus: '<path d="M5 12h14"/>',
  note: '<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h4"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>'
};
const svg = (k, size) => '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>';
const MARK = mark();

/* ================= state ================= */
const S = {
  settings: null, income: {}, bills: [], subs: [], debts: [], budgets: [], pots: [], expenses: [], statements: [], meta: null, ticks: {},
  assets: [], yearly: [], challenges: [], rules: [],
  got: new Set(), user: null, mode: firebaseConfig ? "live" : "demo"
};
const COLLS = ["bills", "subs", "debts", "budgets", "pots", "assets", "yearly", "challenges", "rules"];
const NEEDED = ["settings", "income", "statements", "meta", "ticks", "expenses"].concat(COLLS);
const ui = { route: "home", sub: "", spendYM: thisYM(), spendWho: "all", flowYM: thisYM(), sheet: null, confirm: null, importData: null, closing: false, animate: true, fx: { debt: {}, pot: {} }, csv: null, insTab: "forecast" };

function st() {
  const s = S.settings || {};
  return {
    names: Object.assign({ m: "Mukul", s: "Sylwia" }, s.names || {}),
    payday: Object.assign({ m: 28, s: 28 }, s.payday || {}),
    jointDay: Object.assign({}, s.payday || { m: 28, s: 28 }, s.jointDay || {}),
    split: s.split || "income",
    custom: Object.assign({ m: 0, s: 0 }, s.custom || {}),
    jointPayDay: +s.jointPayDay || 28,
    emails: s.emails || {},
    fx: s.fx || {}
  };
}
const nm = k => k === "j" ? "Joint" : (st().names[k] || "?");
function me() {
  const em = S.user && S.user.email;
  if (em) { const e = st().emails; for (const p of PEOPLE) if ((e[p] || "").toLowerCase() === em.toLowerCase()) return p; return null; }
  const v = LS.get("ms-me"); return v === "s" ? "s" : v === "m" ? "m" : null;
}
const whoFromEmail = em => { if (!em) return null; const dm = String(em).match(/^demo:([ms])$/); if (dm) return dm[1]; const e = st().emails; for (const p of PEOPLE) if ((e[p] || "").toLowerCase() === String(em).toLowerCase()) return p; return null; };
const whoTag = k => '<span class="who ' + esc(k) + '"><span class="dot ' + esc(k) + '"></span>' + esc(nm(k)) + '</span>';
const itemColor = x => x && x.color && COLORS.includes(x.color) ? "var(--c-" + x.color + ")" : "var(--" + ((x && (x.who || x.acct)) || "j") + ")";
const emo = x => x && x.emoji ? '<span class="emo">' + esc(x.emoji) + '</span> ' : "";

/* ================= data layer ================= */
let DB = null;
function memoryDB() {
  const KEY = "ms-demo-v4";
  let data;
  try { data = JSON.parse(LS.get(KEY) || "null"); } catch (e) { data = null; }
  if (!data) data = demoData();
  const subs = [];
  const save = () => LS.set(KEY, JSON.stringify(data));
  const list = c => Object.keys(data[c] || {}).map(id => Object.assign({}, data[c][id], { id }));
  const emit = () => { save(); subs.forEach(s => s.fn(s.filter ? list(s.c).filter(s.filter) : list(s.c))); };
  const deepMerge = (a, b) => { const o = Object.assign({}, a || {}); Object.keys(b).forEach(k => { o[k] = (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) ? deepMerge(o[k], b[k]) : b[k]; }); return o; };
  return {
    kind: "demo",
    watch(c, fn) { const s = { c, fn }; subs.push(s); setTimeout(() => fn(list(c)), 0); },
    watchExpenses(fromYM, fn) { const s = { c: "expenses", fn, filter: e => e.ym >= fromYM }; subs.push(s); setTimeout(() => fn(list("expenses").filter(s.filter)), 0); },
    async set(c, id, d) { data[c] = data[c] || {}; data[c][id] = JSON.parse(JSON.stringify(d)); emit(); },
    async merge(c, id, d) { data[c] = data[c] || {}; data[c][id] = deepMerge(data[c][id], d); emit(); },
    async remove(c, id) { if (data[c]) delete data[c][id]; emit(); },
    async add(c, d) { const id = uid(); await this.set(c, id, d); return id; },
    async batch(ops) { ops.forEach(o => { data[o.c] = data[o.c] || {}; if (o.op === "delete") delete data[o.c][o.id]; else if (o.op === "update" && data[o.c][o.id]) Object.assign(data[o.c][o.id], JSON.parse(JSON.stringify(o.d))); else data[o.c][o.id || uid()] = JSON.parse(JSON.stringify(o.d)); }); emit(); },
    async getAll(c) { return list(c); },
    async expensesFor(ym) { return list("expenses").filter(e => e.ym === ym); },
    async closeMonth(expected, m, build) {
      const meta = (data.meta || {}).state || {};
      if ((meta.lastClosed || "") !== expected) return false;
      const ex = await this.expensesFor(m);
      const w = build({ debts: list("debts"), pots: list("pots"), yearly: list("yearly"), assets: list("assets") }, ex);
      w.forEach(o => { data[o.c] = data[o.c] || {}; if (o.op === "update") data[o.c][o.id] = Object.assign({}, data[o.c][o.id], o.d); else data[o.c][o.id || uid()] = o.d; });
      data.meta = data.meta || {}; data.meta.state = Object.assign({}, meta, { lastClosed: m });
      emit(); return true;
    },
    async wipe(all) { data = all ? {} : { meta: data.meta || {}, settings: data.settings || {} }; emit(); },
    reset() { LS.del(KEY); location.reload(); },
    async exportAll() { return JSON.parse(JSON.stringify(data)); }
  };
}

async function firebaseDB() {
  const FB = await import("./firebase.js");
  const app = FB.initializeApp(firebaseConfig);
  const auth = FB.getAuth(app);
  let db;
  try { db = FB.initializeFirestore(app, { localCache: FB.persistentLocalCache({ tabManager: FB.persistentMultipleTabManager() }) }); }
  catch (e) { db = FB.initializeFirestore(app, {}); }
  const docs = snap => snap.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
  const onErr = e => { console.error(e); if (e && e.code === "permission-denied") toast("This account isn't allowed to see this data"); };
  const ALL = ["settings", "income", "bills", "subs", "debts", "budgets", "pots", "assets", "yearly", "challenges", "rules", "expenses", "statements", "ledger", "meta", "ticks", "backups"];
  return {
    kind: "live", FB, auth,
    watch(c, fn) { FB.onSnapshot(FB.collection(db, c), s => fn(docs(s)), onErr); },
    watchExpenses(fromYM, fn) { FB.onSnapshot(FB.query(FB.collection(db, "expenses"), FB.where("ym", ">=", fromYM)), s => fn(docs(s)), onErr); },
    set(c, id, d) { return FB.setDoc(FB.doc(db, c, id), d); },
    merge(c, id, d) { return FB.setDoc(FB.doc(db, c, id), d, { merge: true }); },
    remove(c, id) { return FB.deleteDoc(FB.doc(db, c, id)); },
    async add(c, d) { const r = await FB.addDoc(FB.collection(db, c), d); return r.id; },
    async batch(ops) {
      for (let i = 0; i < ops.length; i += 400) {
        const b = FB.writeBatch(db);
        ops.slice(i, i + 400).forEach(o => { const ref = o.id ? FB.doc(db, o.c, o.id) : FB.doc(FB.collection(db, o.c)); if (o.op === "delete") b.delete(ref); else if (o.op === "update") b.update(ref, o.d); else b.set(ref, o.d); });
        await b.commit();
      }
    },
    async getAll(c) { return docs(await FB.getDocs(FB.collection(db, c))); },
    async expensesFor(ym) { return docs(await FB.getDocs(FB.query(FB.collection(db, "expenses"), FB.where("ym", "==", ym)))); },
    async closeMonth(expected, m, build) {
      const ex = await this.expensesFor(m);
      const metaRef = FB.doc(db, "meta", "state");
      return FB.runTransaction(db, async tx => {
        const ms = await tx.get(metaRef);
        const meta = ms.exists() ? ms.data() : {};
        if ((meta.lastClosed || "") !== expected) return false;
        const read = async (c, arr) => (await Promise.all(arr.map(x => tx.get(FB.doc(db, c, x.id))))).filter(x => x.exists()).map(x => Object.assign({}, x.data(), { id: x.id }));
        const cur = { debts: await read("debts", S.debts), pots: await read("pots", S.pots), yearly: await read("yearly", S.yearly), assets: await read("assets", S.assets) };
        const w = build(cur, ex);
        w.forEach(o => { const ref = o.id ? FB.doc(db, o.c, o.id) : FB.doc(FB.collection(db, o.c)); if (o.op === "update") tx.update(ref, o.d); else tx.set(ref, o.d); });
        tx.set(metaRef, { lastClosed: m }, { merge: true });
        return true;
      });
    },
    async wipe(all) {
      const ops = [];
      for (const c of ALL.filter(c => all || (c !== "settings" && c !== "meta"))) { const sn = await FB.getDocs(FB.collection(db, c)); sn.docs.forEach(d => ops.push({ op: "delete", c, id: d.id })); }
      await this.batch(ops);
    },
    async exportAll() { const out = {}; for (const c of ALL) { const sn = await FB.getDocs(FB.collection(db, c)); out[c] = {}; sn.docs.forEach(d => { out[c][d.id] = d.data(); }); } return out; }
  };
}

function startWatching() {
  const got = k => { S.got.add(k); afterData(); render(); };
  DB.watch("settings", l => { S.settings = (l.find(x => x.id === "main") || null); got("settings"); });
  DB.watch("income", l => { S.income = {}; l.forEach(x => { S.income[x.id] = x; }); got("income"); });
  COLLS.forEach(c => DB.watch(c, l => { S[c] = l.sort(byOrder); got(c); }));
  DB.watch("statements", l => { S.statements = l.sort((a, b) => a.id < b.id ? 1 : -1); got("statements"); });
  DB.watch("meta", l => { S.meta = l.find(x => x.id === "state") || null; got("meta"); });
  DB.watch("ticks", l => { S.ticks = {}; l.forEach(x => { S.ticks[x.id] = x.done || {}; }); got("ticks"); });
  DB.watchExpenses(addM(thisYM(), -12), l => { S.expenses = l; got("expenses"); });
}
function byOrder(a, b) { return ((a.order || 0) - (b.order || 0)) || String(a.name || "").localeCompare(String(b.name || "")); }
const ready = () => NEEDED.every(k => S.got.has(k));
let rolled = false, fxTried = false;
function afterData() {
  if (!ready()) return;
  if (!rolled && S.meta && S.meta.lastClosed) { rolled = true; setTimeout(rollover, 300); }
  if (!fxTried && S.meta && S.meta.lastClosed) { fxTried = true; setTimeout(refreshFx, 1500); }
  setTimeout(checkMilestones, 400);
}

/* ================= money maths ================= */
function takeHome(p) {
  const i = S.income[p] || {};
  const ded = sum((i.deductions || []).map(a => a.amount));
  const ex = sum((i.extras || []).map(a => a.amount));
  const base = (+i.gross > 0) ? (+i.gross - ded) : (+i.manual || 0);
  return r2(base + ex);
}
function subMonthly(x) { const c = +x.cost || 0; return x.freq === "yearly" ? c / 12 : x.freq === "quarterly" ? c / 3 : x.freq === "weekly" ? c * 52 / 12 : c; }
const debtActive = d => (+d.balance || 0) > 0.004;
const potActive = p => !(+p.goal > 0) || (+p.current || 0) < (+p.goal);
function potMonthly(p, mo) { if (!potActive(p)) return 0; const m = mo != null ? mo : (+p.monthly || 0); return +p.goal > 0 ? Math.min(m, (+p.goal) - (+p.current || 0)) : m; }
function debtMonthly(d, extra) { if (!debtActive(d)) return 0; const bal = +d.balance || 0, i = bal * (+d.apr || 0) / 1200; return Math.min((+d.monthly || 0) + (extra || 0), bal + i); }
/* Upcoming costs: either every year in a given month, or just once in a given month and year. */
const isOnce = y => y.repeat === "once";
function dueYM(y, from) {
  from = from || thisYM();
  if (isOnce(y)) return (+y.year || +from.slice(0, 4)) + "-" + pad(+y.month || 1);
  const fy = +from.slice(0, 4), fm = +from.slice(5, 7), m = +y.month || 1;
  return (m >= fm ? fy : fy + 1) + "-" + pad(m);
}
const monthsBetween = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
function yearlyMonthly(y, from) {
  if (y.done) return 0;
  if (!isOnce(y)) return r2((+y.amount || 0) / 12);
  const left = Math.max(0, (+y.amount || 0) - (+y.saved || 0)), n = monthsBetween(from || thisYM(), dueYM(y));
  return n > 0 ? r2(left / n) : 0;
}

function totalsFor(k, fx) {
  fx = fx || { debt: {}, pot: {} };
  return {
    bills: sum(S.bills.filter(b => b.acct === k).map(b => b.cost)),
    subs: sum(S.subs.filter(x => x.who === k).map(subMonthly)),
    debts: sum(S.debts.filter(d => d.who === k).map(d => debtMonthly(d, fx.debt[d.id] || 0))),
    pots: sum(S.pots.filter(p => p.who === k).map(p => potMonthly(p, fx.pot[p.id]))),
    yearly: sum(S.yearly.filter(y => y.who === k).map(yearlyMonthly)),
    budgets: sum(S.budgets.filter(b => b.who === k).map(b => b.amount))
  };
}
const committedOf = t => t.bills + t.subs + t.debts + t.pots + t.yearly + t.budgets;
function jointNeed(fx) { return committedOf(totalsFor("j", fx)); }
function jointShares(fx) {
  const s = st(), need = jointNeed(fx);
  if (s.split === "custom") return { m: +s.custom.m || 0, s: +s.custom.s || 0 };
  if (s.split === "equal") return { m: need / 2, s: need / 2 };
  const a = takeHome("m"), b = takeHome("s"), t = a + b;
  return t > 0 ? { m: need * a / t, s: need * b / t } : { m: need / 2, s: need / 2 };
}
function columns(fx) {
  const sh = jointShares(fx), out = {};
  PEOPLE.forEach(p => { const t = totalsFor(p, fx), inc = takeHome(p), committed = committedOf(t) + sh[p]; out[p] = Object.assign(t, { income: inc, joint: sh[p], committed, left: inc - committed, util: inc > 0 ? committed / inc : 0 }); });
  const t = totalsFor("j", fx), inc = sh.m + sh.s, committed = committedOf(t);
  out.j = Object.assign(t, { income: inc, joint: 0, committed, left: inc - committed, util: inc > 0 ? committed / inc : 0 });
  return out;
}
function debtPlan(d, extra) {
  let bal = +d.balance || 0; const r = (+d.apr || 0) / 1200, pay = (+d.monthly || 0) + (extra || 0);
  if (bal <= 0.004) return { months: 0, interest: 0, done: true, path: [] };
  if (pay <= 0) return { months: null, interest: null, reason: "Set a monthly repayment", path: [] };
  let months = 0, interest = 0; const path = [];
  while (bal > 0.004 && months < 600) {
    const i = bal * r;
    if (pay <= i + 0.001) return { months: null, interest: null, reason: "Repayment doesn't cover the interest", path: [] };
    bal += i; interest += i; bal -= Math.min(pay, bal); months++; path.push(Math.max(0, bal));
  }
  return { months, interest: r2(interest), path };
}
function debtInfo(d, extra) {
  const plan = debtPlan(d, extra), cur = thisYM();
  const finishYM = plan.months ? addM(cur, plan.months - 1) : null;
  const borrowed = +d.borrowed || 0, bal = +d.balance || 0;
  return {
    plan, finishYM, finishISO: finishYM ? isoOf(finishYM, d.day) : null,
    totalWithInterest: borrowed > 0 ? (plan.interest != null ? r2(borrowed + (+d.interestPaid || 0) + plan.interest) : r2(borrowed * (1 + (+d.apr || 0) / 100))) : null,
    totalIsEstimate: borrowed > 0 && plan.interest == null && (+d.apr || 0) > 0,
    pct: borrowed > 0 ? Math.max(0, Math.min(1, (borrowed - bal) / borrowed)) : (bal <= 0 ? 1 : 0)
  };
}
function potInfo(p, mo) {
  const goal = +p.goal || 0, cur = +p.current || 0, m = mo != null ? mo : (+p.monthly || 0);
  const remaining = Math.max(0, goal - cur);
  const months = goal > 0 && remaining > 0 && m > 0 ? Math.ceil(remaining / m) : (goal > 0 && remaining <= 0 ? 0 : null);
  const ym = months ? addM(thisYM(), months - 1) : null;
  return { goal, cur, remaining, months, ym, iso: ym ? isoOf(ym, p.day) : null, pct: goal > 0 ? Math.min(1, cur / goal) : 0 };
}
const expensesOf = ym => S.expenses.filter(e => e.ym === ym);
const budgetSpent = (b, ym) => sum(expensesOf(ym).filter(e => e.budgetId === b.id).map(e => e.amount));
function safeToSpend(who) {
  const ym = thisYM(), daysLeft = dim(ym) - new Date().getDate() + 1;
  const bs = S.budgets.filter(b => !who || b.who === who || b.who === "j");
  const left = sum(bs.map(b => (+b.amount || 0) - budgetSpent(b, ym)));
  const todaySpent = sum(S.expenses.filter(e => e.date === todayISO() && bs.some(b => b.id === e.budgetId)).map(e => e.amount));
  const perDay = (left + todaySpent) / daysLeft - todaySpent;
  return { left, daysLeft, perDay, total: sum(bs.map(b => b.amount)), todaySpent };
}
function loggingStreak() {
  const days = new Set(S.expenses.filter(e => !e.imported).map(e => e.date));
  let d = todayISO(), n = 0;
  if (!days.has(d)) d = addD(d, -1);
  while (days.has(d) && n < 400) { n++; d = addD(d, -1); }
  return n;
}
function netWorthNow() {
  const pots = sum(S.pots.map(p => p.current)), assets = sum(S.assets.map(a => a.value)), debts = sum(S.debts.map(d => d.balance)), yearly = sum(S.yearly.map(y => y.saved));
  return { pots, assets, debts, yearly, net: r2(pots + assets + yearly - debts) };
}
function frequentShortcuts() {
  const since = addD(todayISO(), -120), map = {};
  S.expenses.filter(e => e.date >= since && e.note && e.budgetId).forEach(e => {
    const k = e.note.toLowerCase() + "|" + e.budgetId;
    const m = map[k] || (map[k] = { note: e.note, budgetId: e.budgetId, who: e.who, n: 0, last: "", amount: 0 });
    m.n++; if ((e.date + (e.ts || 0)) > m.last) { m.last = e.date + (e.ts || 0); m.amount = e.amount; m.who = e.who; }
  });
  return Object.values(map).filter(x => x.n >= 2 && S.budgets.some(b => b.id === x.budgetId)).sort((a, b) => b.n - a.n).slice(0, 8);
}
function challengeStatus(c) {
  const start = c.start, end = addD(start, (+c.days || 7) - 1), today = todayISO();
  const ex = S.expenses.filter(e => e.date >= start && e.date <= end && (!c.budgetId || e.budgetId === c.budgetId));
  const spent = sum(ex.map(e => e.amount));
  const limit = c.kind === "nospend" ? 0 : (+c.limit || 0);
  const over = spent > limit + 0.004;
  const finished = today > end;
  const dayNo = Math.min(+c.days || 7, Math.max(0, dDiff(start, today) + 1));
  const state = over ? "lost" : finished ? "won" : today < start ? "soon" : "on";
  return { start, end, spent, limit, state, dayNo, daysLeft: Math.max(0, dDiff(today, end) + 1) };
}

/* cash flow */
function subOccurs(x, ym) { const mo = +ym.slice(5, 7), start = +x.month || mo; if (x.freq === "yearly") return mo === start; if (x.freq === "quarterly") return ((mo - start) % 3 + 3) % 3 === 0; return true; }
function flowItems(ym) {
  const s = st(), sh = jointShares(), items = [];
  PEOPLE.forEach(p => {
    const th = takeHome(p);
    if (th > 0) items.push({ key: "pay-" + p, day: dayIn(ym, s.payday[p]), type: "in", to: p, amount: th, label: "Pay day" });
    if (sh[p] > 0.004) items.push({ key: "joint-" + p, day: dayIn(ym, s.jointDay[p]), type: "move", from: p, to: "j", amount: sh[p], label: "Transfer to the joint account" });
  });
  S.bills.forEach(b => items.push({ key: "bill-" + b.id, day: dayIn(ym, b.day), type: "bill", from: b.acct, amount: +b.cost || 0, label: b.name, emoji: b.emoji }));
  S.subs.filter(x => subOccurs(x, ym)).forEach(x => items.push({ key: "sub-" + x.id, day: dayIn(ym, x.day), type: "sub", from: x.who, amount: x.freq === "weekly" ? subMonthly(x) : (+x.cost || 0), label: x.name, freq: x.freq, month: x.month }));
  S.debts.filter(d => debtMonthly(d) > 0).forEach(d => items.push({ key: "debt-" + d.id, day: dayIn(ym, d.day), type: "debt", from: d.who, amount: debtMonthly(d), label: "Pay " + d.name, emoji: d.emoji }));
  S.pots.filter(p => potMonthly(p) > 0).forEach(p => items.push({ key: "pot-" + p.id, day: dayIn(ym, p.day || s.payday[p.who] || s.jointPayDay), type: "pot", from: p.who, amount: potMonthly(p), label: "Save into " + p.name, emoji: p.emoji }));
  WHO.forEach(k => { const t = sum(S.yearly.filter(y => y.who === k).map(y => yearlyMonthly(y, ym))); if (t > 0) items.push({ key: "yearly-" + k, day: dayIn(ym, k === "j" ? s.jointPayDay : s.payday[k]), type: "pot", from: k, amount: t, label: "Set aside for upcoming costs", emoji: "🗓️" }); });
  S.yearly.filter(y => !y.done && (isOnce(y) ? dueYM(y) === ym : +y.month === +ym.slice(5, 7))).forEach(y => items.push({ key: "due-" + y.id, day: dayIn(ym, +y.day || 15), type: "due", from: y.who, amount: +y.amount || 0, label: y.name + " (estimate)", emoji: y.emoji || "📌" }));
  items.forEach(i => { i.amount = r2(i.amount); });
  const rank = { in: 0, move: 1, debt: 2, pot: 3, bill: 4, sub: 5, due: 6 };
  return items.sort((a, b) => a.day - b.day || rank[a.type] - rank[b.type]);
}
const isManual = i => i.type === "move" || i.type === "debt" || i.type === "pot";
const ticked = (ym, key) => !!(S.ticks[ym] || {})[key];

/* ================= monthly rollover ================= */
function buildClose(m) {
  return (cur, ex) => {
    const w = [], dRows = [], pRows = [], yRows = [];
    cur.debts.forEach(d => {
      const bal = +d.balance || 0, r = (+d.apr || 0) / 1200, mo = +d.monthly || 0;
      if (bal > 0.004 && mo > 0) {
        const i = r2(bal * r), pay = r2(Math.min(mo, bal + i)), nb = r2(bal + i - pay);
        w.push({ op: "update", c: "debts", id: d.id, d: { balance: nb, interestPaid: r2((+d.interestPaid || 0) + i), paidTotal: r2((+d.paidTotal || 0) + pay) } });
        w.push({ op: "set", c: "ledger", d: { ym: m, date: isoOf(m, d.day), kind: "debt", refId: d.id, name: d.name, who: d.who, amount: pay, interest: i, auto: true } });
        dRows.push({ name: d.name, emoji: d.emoji || "", who: d.who, paid: pay, interest: i, balance: nb, apr: +d.apr || 0, cleared: nb <= 0.004 });
      } else dRows.push({ name: d.name, emoji: d.emoji || "", who: d.who, paid: 0, interest: 0, balance: bal, apr: +d.apr || 0, cleared: false });
    });
    cur.pots.forEach(p => {
      const add = r2(potMonthly(p)), total = r2((+p.current || 0) + add);
      if (add > 0) {
        w.push({ op: "update", c: "pots", id: p.id, d: { current: total } });
        w.push({ op: "set", c: "ledger", d: { ym: m, date: isoOf(m, p.day), kind: "pot", refId: p.id, name: p.name, who: p.who, amount: add, auto: true } });
      }
      pRows.push({ name: p.name, emoji: p.emoji || "", who: p.who, paid: add, total, goal: +p.goal || 0 });
    });
    const mo = +m.slice(5, 7);
    cur.yearly.forEach(y => {
      if (y.done) return;
      const add = Math.min(yearlyMonthly(y, m), Math.max(0, (+y.amount || 0) - (+y.saved || 0)));
      let saved = r2((+y.saved || 0) + add);
      const due = isOnce(y) ? dueYM(y) <= m : +y.month === mo;
      if (due) saved = 0;
      w.push({ op: "update", c: "yearly", id: y.id, d: isOnce(y) && due ? { saved, done: true } : { saved } });
      yRows.push({ name: y.name, who: y.who, paid: r2(add), due, amount: +y.amount || 0 });
    });
    let assetsTotal = 0;
    cur.assets.forEach(a => {
      const add = a.autoAdd !== false ? (+a.monthly || 0) : 0, v = r2((+a.value || 0) + add);
      assetsTotal += v;
      if (add) w.push({ op: "update", c: "assets", id: a.id, d: { value: v } });
    });
    const cols = columns();
    const budgets = S.budgets.map(b => ({ name: b.name, emoji: b.emoji || "", who: b.who, amount: +b.amount || 0, spent: r2(sum(ex.filter(e => e.budgetId === b.id).map(e => e.amount))) }));
    const spentBy = {}; WHO.forEach(k => { spentBy[k] = r2(sum(ex.filter(e => e.who === k).map(e => e.amount))); });
    const debtLeft = r2(sum(dRows.map(d => d.balance))), potsTotal = r2(sum(pRows.map(p => p.total))), yearlySaved = r2(sum(cur.yearly.map(y => +y.saved || 0)));
    const chalDone = S.challenges.filter(c => { const s = challengeStatus(c); return s.end >= m + "-01" && s.end <= m + "-31"; }).map(c => ({ name: c.name, emoji: c.emoji || "", state: challengeStatus(c).state }));
    w.push({
      op: "set", c: "statements", id: m, d: {
        ym: m, closedAt: new Date().toISOString(), names: st().names, cols: JSON.parse(JSON.stringify(cols)),
        budgets, spentBy, spentTotal: r2(sum(ex.map(e => e.amount))), entries: ex.length,
        debts: dRows, pots: pRows, yearly: yRows, challenges: chalDone,
        debtLeft, potsTotal, assetsTotal: r2(assetsTotal), netWorth: r2(potsTotal + assetsTotal + yearlySaved - debtLeft),
        bills: S.bills.map(b => ({ name: b.name, acct: b.acct, cost: +b.cost || 0 })),
        subs: S.subs.map(x => ({ name: x.name, who: x.who, monthly: r2(subMonthly(x)) }))
      }
    });
    w.push({ op: "set", c: "backups", id: m, d: { at: new Date().toISOString(), plan: JSON.parse(JSON.stringify({ settings: S.settings, income: S.income, bills: S.bills, subs: S.subs, debts: cur.debts, budgets: S.budgets, pots: cur.pots, yearly: cur.yearly, assets: cur.assets, challenges: S.challenges })) } });
    return w;
  };
}
async function rollover() {
  if (ui.closing) return; ui.closing = true;
  try {
    let n = 0;
    while (S.meta && S.meta.lastClosed && addM(S.meta.lastClosed, 1) < thisYM() && n < 24) {
      const expected = S.meta.lastClosed, m = addM(expected, 1);
      const ok = await DB.closeMonth(expected, m, buildClose(m));
      if (!ok) break;
      S.meta = Object.assign({}, S.meta, { lastClosed: m }); n++;
    }
    if (n) toast(plural(n, "month") + " closed. Your recap is ready.");
  } catch (e) { console.error(e); toast("Couldn't close last month. It will try again next time."); }
  ui.closing = false;
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && ready()) rollover(); });

/* exchange rate (GBP to INR) */
async function refreshFx(force) {
  const fx = st().fx;
  if (!force) {
    if (fx.manual) return;
    if (fx.at && Date.now() - new Date(fx.at).getTime() < 12 * 3600e3) return;
    if (!S.bills.concat(S.debts, S.pots, S.yearly).some(x => x.inr)) return;
  }
  const find = o => { if (!o || typeof o !== "object") return null; if (Array.isArray(o)) { for (const x of o) { const v = find(x); if (v) return v; } return null; }
    for (const k of Object.keys(o)) { if (/^inr$/i.test(k) && +o[k] > 0) return +o[k]; }
    if (/^inr$/i.test(String(o.quote || o.currency || o.symbol || "")) && +(o.rate || o.value) > 0) return +(o.rate || o.value);
    for (const k of Object.keys(o)) { const v = find(o[k]); if (v) return v; } return null; };
  for (const url of ["https://api.frankfurter.dev/v1/latest?base=GBP&symbols=INR", "https://api.frankfurter.dev/v2/rates?base=gbp&quotes=inr"]) {
    try { const j = await (await fetch(url)).json(); const rate = find(j); if (rate > 10 && rate < 1000) { await DB.merge("settings", "main", { fx: { inr: rate, at: new Date().toISOString(), manual: false } }); return; } } catch (e) { /* try the next one */ }
  }
}
const inrOf = gbpAmt => { const r = +st().fx.inr; return r > 0 ? '<span class="note">≈ ' + FI.format(gbpAmt * r) + '</span>' : ""; };

/* ================= milestones & confetti ================= */
function checkMilestones() {
  if (!ready() || !S.meta || !S.meta.lastClosed) return;
  const hits = [];
  S.pots.forEach(p => {
    const inf = potInfo(p); if (!(inf.goal > 0)) return;
    const mstone = Math.floor(inf.pct * 4) * 25, k = "ms-pot-" + p.id, prev = LS.get(k);
    if (prev == null) { LS.set(k, String(mstone)); return; }
    if (mstone > +prev) { LS.set(k, String(mstone)); hits.push((p.emoji ? p.emoji + " " : "") + p.name + (mstone >= 100 ? " is fully saved!" : " just passed " + mstone + "%!")); }
    else if (mstone < +prev) LS.set(k, String(mstone));
  });
  S.debts.forEach(d => {
    const k = "ms-debt-" + d.id, prev = LS.get(k), now = debtActive(d) ? "open" : "done";
    if (prev == null) { LS.set(k, now); return; }
    if (prev === "open" && now === "done") hits.push((d.emoji ? d.emoji + " " : "") + d.name + " is paid off!");
    LS.set(k, now);
  });
  S.challenges.forEach(c => {
    const s = challengeStatus(c), k = "ms-chal-" + c.id, prev = LS.get(k);
    if (prev == null) { LS.set(k, s.state); return; }
    if (prev !== "won" && s.state === "won") hits.push((c.emoji ? c.emoji + " " : "") + c.name + " complete!");
    LS.set(k, s.state);
  });
  if (hits.length) { confetti(); toast(hits[0]); }
}
function confetti() {
  if (reduceMotion()) return;
  let cv = $("#confetti"); if (cv) cv.remove();
  cv = document.createElement("canvas"); cv.id = "confetti"; document.body.appendChild(cv);
  const ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const cols = ["#d9f15a", "#f6a9cf", "#8f9bf5", "#f2652f", "#7bd88f", "#fbebdd"], shapes = [1, 2, 3, 4, 5].map(k => new Path2D(blobD(hash("cf" + k), 0, 0, 1, .28, 0)));
  const P = Array.from({ length: 140 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, r: Math.random() * 5 + 4, sh: Math.floor(Math.random() * 5), a: Math.random() * 6, va: (Math.random() - .5) * .4, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  (function frame(t) {
    const el = t - t0; ctx.clearRect(0, 0, innerWidth, innerHeight);
    P.forEach(p => { p.vy += .38; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.max(0, 1 - el / 2200); ctx.fillStyle = p.c; ctx.scale(p.r, p.r * (.6 + .4 * Math.abs(Math.sin(p.a * 2)))); ctx.fill(shapes[p.sh]); ctx.restore(); });
    if (el < 2200) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}
function countUp() {
  if (reduceMotion()) return;
  document.querySelectorAll("[data-count]").forEach(el => {
    const to = +el.dataset.count, neg = to < 0, abs = Math.abs(to), t0 = performance.now(), dur = 900;
    (function f(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = F0.format(abs * e); if (k < 1) requestAnimationFrame(f); })(t0);
  });
}

function applyTheme() {
  let t = LS.get("ms-theme") || "chrome";
  if (t === "night") t = "chrome";
  if (t === "auto") t = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "chrome" : "paper";
  document.documentElement.dataset.theme = t;
  const want = LS.get("ms-world") !== "off";
  if (want && World.init()) { document.body.classList.add("world"); World.setLook({ ascii: LS.get("ms-ascii") === "on", light: t === "paper" }); }
  else document.body.classList.remove("world");
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t === "chrome" ? "#050507" : "#f3f0e9";
}
applyTheme();
World.onPick(h => {
  if (h.type === "item") openItem(h.c, h.id);
  else if (h.type === "expense") openExpense(h.id);
  else if (h.type === "account") { const el = document.querySelector(".acct." + h.who); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.animate([{ boxShadow: "0 0 0 0 rgba(169,149,255,0)" }, { boxShadow: "0 0 0 3px rgba(169,149,255,.7)" }, { boxShadow: "0 0 0 0 rgba(169,149,255,0)" }], { duration: 1400 }); } }
});
if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

/* ================= pop out for numbers still to set ================= */
let pop = null;
function openPop(btn) {
  closePop();
  const r = btn.getBoundingClientRect(), el = document.createElement("div");
  el.className = "pop"; el.setAttribute("role", "dialog");
  el.innerHTML = '<label class="field">' + esc(btn.dataset.l) + '<input id="pop-in" inputmode="decimal" placeholder="0.00"></label><div class="row"><button class="btn small" data-act="popclose">Cancel</button><button class="btn small primary" data-act="popsave">Save</button></div>';
  document.body.appendChild(el);
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + "px";
  el.style.top = (r.bottom + h + 16 < innerHeight ? r.bottom + 8 : Math.max(12, r.top - h - 8)) + "px";
  pop = { el, c: btn.dataset.c, id: btn.dataset.id, f: btn.dataset.f };
  setTimeout(() => { const i = $("#pop-in"); if (i) i.focus(); }, 30);
}
function closePop() { if (pop) { pop.el.remove(); pop = null; } }
async function savePop() {
  if (!pop) return; const v = num($("#pop-in").value);
  if (!(v > 0)) { toast("Type a number"); return; }
  const { c, id, f } = pop; closePop();
  try { await DB.merge(c, id, { [f]: v }); toast("Saved"); } catch (e) { fail(e); }
}
document.addEventListener("keydown", e => { if (!pop) return; if (e.key === "Enter" && e.target.id === "pop-in") { e.preventDefault(); e.stopPropagation(); savePop(); } if (e.key === "Escape") closePop(); }, true);
document.addEventListener("pointerdown", e => { if (pop && !pop.el.contains(e.target) && !e.target.closest(".unset")) closePop(); });
window.addEventListener("scroll", () => closePop(), { passive: true });

/* ================= drag to reorder ================= */
let drag = null, justDragged = 0;
document.addEventListener("pointerdown", e => {
  const g = e.target.closest("[data-grip]");
  const card = !g && ui.arrange ? e.target.closest("[data-sort] > [data-id]") : null;
  if (!g && !card) return;
  const item = g ? g.closest("[data-id]") : card, list = item && item.parentElement;
  if (!list || !list.dataset.sort) return;
  e.preventDefault();
  drag = { item, list, c: list.dataset.sort, x0: e.clientX, y0: e.clientY, moved: false };
}, { passive: false });
document.addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.moved) { if (Math.hypot(dx, dy) < 5) return; drag.moved = true; drag.item.classList.add("dragging"); document.body.classList.add("is-dragging"); }
  e.preventDefault();
  drag.item.style.transform = "translate(" + dx + "px," + dy + "px)";
  drag.item.style.pointerEvents = "none";
  const under = document.elementFromPoint(e.clientX, e.clientY), t = under && under.closest("[data-id]");
  if (!t || t === drag.item || t.parentElement !== drag.list) return;
  const tr = t.getBoundingClientRect(), row = drag.item.tagName === "TR";
  const after = row ? e.clientY > tr.top + tr.height / 2 : (Math.abs(e.clientY - (tr.top + tr.height / 2)) < tr.height / 2 ? e.clientX > tr.left + tr.width / 2 : e.clientY > tr.top + tr.height / 2);
  const ref = after ? t.nextSibling : t;
  if (ref === drag.item || ref === drag.item.nextSibling) return;
  // FLIP: remember where everything was, move, then animate from there
  const sibs = Array.from(drag.list.children).filter(x => x !== drag.item), before = new Map(sibs.map(x => [x, x.getBoundingClientRect()]));
  const r1 = drag.item.getBoundingClientRect();
  drag.list.insertBefore(drag.item, ref);
  drag.item.style.transform = "none";
  const r2 = drag.item.getBoundingClientRect();
  const ndx = r1.left - r2.left, ndy = r1.top - r2.top;
  drag.x0 = e.clientX - ndx; drag.y0 = e.clientY - ndy;
  drag.item.style.transform = "translate(" + ndx + "px," + ndy + "px)";
  sibs.forEach(x => { const a = before.get(x), b = x.getBoundingClientRect(); const mx = a.left - b.left, my = a.top - b.top; if (!mx && !my) return; x.style.transition = "none"; x.style.transform = "translate(" + mx + "px," + my + "px)"; x.getBoundingClientRect(); x.style.transition = "transform .45s var(--spring)"; x.style.transform = ""; });
}, { passive: false });
function endDrag() {
  if (!drag) return;
  const d = drag; drag = null;
  document.body.classList.remove("is-dragging");
  d.item.classList.remove("dragging"); d.item.style.transform = ""; d.item.style.pointerEvents = "";
  if (!d.moved) return;
  justDragged = Date.now();
  const ids = Array.from(d.list.children).map(x => x.dataset.id).filter(Boolean);
  const coll = S[d.c] || [];
  const ops = ids.map((id, i) => ({ op: "update", c: d.c, id, d: { order: i } })).filter(o => coll.some(x => x.id === o.id));
  coll.forEach(x => { const i = ids.indexOf(x.id); if (i >= 0) x.order = i; }); coll.sort(byOrder);
  DB.batch(ops).catch(fail);
  ui.keepScroll = true; render();
}
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);

/* ================= render ================= */
let rq = 0, pendingDraw = false;
function render() { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; draw(); }); }
function draw() {
  const app = $("#app");
  const ae = document.activeElement;
  if (ae && app.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName) && ae.closest("[data-keep]")) { pendingDraw = true; return; }
  if (drag && drag.moved) { pendingDraw = true; return; }
  pendingDraw = false;
  if (S.mode === "live" && !S.user) { app.innerHTML = vLogin(); scan(app); return; }
  if (!ready()) { app.innerHTML = '<div class="boot">' + BOOT + 'Loading your money…</div>'; scan(app); return; }
  if (!S.meta || !S.meta.lastClosed) { app.innerHTML = vWelcome(); scan(app); return; }
  const r = ui.route;
  const body = r === "spend" ? vSpend() : r === "flow" ? vFlow() : r === "plan" ? vPlan() : r === "insights" ? vInsights() : r === "statement" ? vStatement(ui.sub) : r === "settings" ? vSettings() : r === "import" ? vImport() : vHome();
  const y = window.scrollY;
  app.innerHTML = shell(body);
  app.classList.toggle("anim", !!ui.animate);
  if (ui.animate) Array.from(app.querySelectorAll(".main > *, .bento > *, .rings > *, .people > *, .challenge-row > *")).forEach((el, i) => el.style.setProperty("--i", Math.min(i, 14)));
  placeNav();
  scan(app);
  app.querySelectorAll(".tile,.ptile,.ring,.chip-c,.up,.recapbar").forEach(el => el.classList.add("tilt"));
  tilt(app);
  const hero = app.querySelector(".b-hero");
  fitNumbers(app);
  // tables become labelled cards on small screens
  app.querySelectorAll("table").forEach(tb => {
    const hs = Array.from(tb.querySelectorAll("thead th")).map(th => th.textContent.trim());
    // follow colspans so every cell gets the heading of the column it really sits in
    tb.querySelectorAll("tbody tr, tfoot tr").forEach(tr => { let col = 0; Array.from(tr.children).forEach(td => { if (hs[col] && !td.dataset.label && td.textContent.trim()) td.dataset.label = hs[col]; col += +td.getAttribute("colspan") || 1; }); });
  });
  if (worldOn()) { syncWorld(); World.go(STATION[ui.route] || "home"); scramble(app); }
  else if (hero && document.documentElement.dataset.theme === "chrome") { if (mountChrome(hero, ui.hero)) hero.classList.add("has3d"); }
  if (ui.animate) { countUp(); setTimeout(() => app.classList.remove("anim"), 1100); }
  ui.animate = false;
  if (ui.keepScroll) window.scrollTo(0, y);
  ui.keepScroll = false;
}
document.addEventListener("focusout", () => setTimeout(() => { if (pendingDraw) { const ae = document.activeElement; if (!(ae && ae.closest && ae.closest("[data-keep]") && /INPUT|SELECT|TEXTAREA/.test(ae.tagName))) { ui.keepScroll = true; render(); } } }, 0));

const BOOT = '<svg class="bootblob" viewBox="0 0 100 100" aria-hidden="true"><path data-blob="77" data-g="50,50,34,.2,0,2.4" fill="var(--lime)" d="' + blobD(77, 50, 50, 34, .2, 0) + '"/></svg>';
let navPos = null;
function placeNav() {
  document.querySelectorAll(".navblob").forEach(nb => {
    const on = nb.parentElement.querySelector(".navbtn.on"); if (!on) { nb.style.opacity = 0; return; }
    const pr = nb.parentElement.getBoundingClientRect(), r = on.getBoundingClientRect();
    const to = { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height }, key = nb.dataset.k;
    const from = navPos && navPos[key];
    const set = p => { nb.style.transform = "translate(" + p.x + "px," + p.y + "px)"; nb.style.width = p.w + "px"; nb.style.height = p.h + "px"; };
    if (from) { nb.style.transition = "none"; set(from); nb.getBoundingClientRect(); nb.style.transition = ""; }
    set(to); navPos = Object.assign(navPos || {}, { [key]: to });
  });
}
window.addEventListener("resize", () => { navPos = null; placeNav(); });
/* ================= the 3D world, its stage and the dial ================= */
const STATION = { home: "home", spend: "spend", import: "spend", flow: "flow", plan: "plan", insights: "insights", statement: "insights", settings: "home" };
const ITEMCOL = { bills: "#7fd8ff", subs: "#a995ff", debts: "#ff7a8a", budgets: "#ffd36b", pots: "#6dffc4", yearly: "#ffb38a" };
const worldOn = () => !!World.ok && document.body.classList.contains("world");
function worldData() {
  const who = me(), safe = safeToSpend(who), c = columns(), sh = jointShares(), ym = thisYM();
  const out = k => { const t = totalsFor(k); return t.bills + t.subs + t.debts + t.pots + t.yearly; };
  const items = [];
  [["bills", "cost"], ["subs", "cost"], ["debts", "balance"], ["budgets", "amount"], ["pots", "goal"], ["yearly", "amount"]].forEach(([k, f]) => S[k].forEach(x => items.push({ c: k, id: x.id, amount: +x[f] || +x.current || +x.monthly || 1, color: ITEMCOL[k] })));
  return {
    fill: safe.total > 0 ? Math.max(0, safe.left) / safe.total : .5, warm: safe.total > 0 && safe.left < 0,
    pots: S.pots.map(p => ({ id: p.id, pct: potInfo(p).pct, color: p.who === "m" ? "#7fd8ff" : p.who === "s" ? "#ff86dc" : "#6dffc4" })),
    expenses: S.expenses.filter(e => e.ym >= addM(ym, -2)).map(e => ({ id: e.id, amount: +e.amount || 0, who: e.who, age: Math.max(0, dDiff(e.date, todayISO())) })).sort((a, b) => a.age - b.age),
    flow: { m2j: sh.m, s2j: sh.s, mOut: out("m"), sOut: out("s"), jOut: c.j.committed },
    items, debt: forecastDebt(null, 24), potsSeries: forecastPots(null, 24)
  };
}
let worldKey = "";
function syncWorld() {
  if (!World.ok) return;
  const d = worldData(), k = JSON.stringify(d);
  if (k !== worldKey) { worldKey = k; World.update(d); }
}
function stageHTML() {
  const r = ui.route, ym = thisYM(), mon = ymLabel(ym).split(" ")[0];
  const t = (k, title, extra) => '<section class="stage st-' + r + '" aria-label="' + esc(title) + '"><div class="stage-in"><span class="mono">' + k + '</span><h1 class="stage-title scramble">' + esc(title) + '</h1>' + (extra || "") + '</div><span class="stage-hint mono">' + (r === "home" ? "Drag to spin, tap to ripple" : r === "spend" ? "Each bead is a purchase. Tap one" : r === "plan" ? "Each crystal is an item. Tap one" : r === "flow" ? "Money flowing between your accounts" : "") + '</span></section>';
  if (r === "spend") { const tot = sum(expensesOf(ui.spendYM).map(e => e.amount)); return t("01 / Spending", "Spending", '<div class="stage-num num">' + gbp(tot) + '</div><span class="mono dim">spent in ' + esc(ymLabel(ui.spendYM)) + '</span>'); }
  if (r === "flow") { const c = columns(), sh = jointShares(); return t("02 / Cash flow", "Cash flow", '<span class="mono dim">' + esc(ymLabel(ui.flowYM)) + '</span>')
      + '<span class="wlabel" data-anchor="m"><b>' + esc(nm("m")) + '</b>' + gbp(takeHome("m")) + ' in</span><span class="wlabel" data-anchor="s"><b>' + esc(nm("s")) + '</b>' + gbp(takeHome("s")) + ' in</span><span class="wlabel" data-anchor="j"><b>Joint</b>' + gbp(sh.m + sh.s) + ' moved in</span><span class="wlabel dim" data-anchor="out"><b>Out</b>bills, debts, savings</span>'; }
  if (r === "plan") { const n = S.bills.length + S.subs.length + S.debts.length + S.budgets.length + S.pots.length + S.yearly.length; return t("03 / Plan", "Plan", '<span class="mono dim">' + plural(n, "item") + ' in your plan</span>'); }
  if (r === "insights" || r === "statement") { const d = forecastDebt(null, 24), p = forecastPots(null, 24); return t("04 / Insights", r === "statement" ? "Statement" : "Insights", '<span class="mono dim">Two years from now</span>')
      + '<span class="wlabel" data-anchor="debtEnd" style="--c:var(--bad)"><b>Debt</b>' + gbp(d[24] || 0) + '</span><span class="wlabel" data-anchor="potsEnd" style="--c:var(--good)"><b>Saved</b>' + gbp(p[24] || 0) + '</span><span class="wlabel dim" data-anchor="now"><b>Now</b></span>'; }
  if (r === "settings") return t("05 / Settings", "Settings");
  if (r === "import") return t("01 / Spending", "Import");
  if (r === "home") return ui.homeStage || "";
  return "";
}
const DIAL = [["home", "Home"], ["spend", "Spending"], ["flow", "Cash flow"], ["plan", "Plan"], ["insights", "Insights"], ["settings", "Settings"]];
const DIAL_STEP = 34;
function dialIndex() { const r = ui.route === "statement" ? "insights" : ui.route === "import" ? "spend" : ui.route; return Math.max(0, DIAL.findIndex(d => d[0] === r)); }
function dialHTML() {
  const idx = dialIndex(); let ticks = "";
  for (let i = 0; i < 180; i++) { const a = i * 2, major = i % 17 === 0; ticks += '<line x1="0" y1="' + (major ? -192 : -188) + '" x2="0" y2="-179" transform="rotate(' + a + ')" class="' + (major ? "mj" : "") + '"/>'; }
  return '<nav class="dial" aria-label="Sections"><div class="dial-disc"><div class="dial-spec"></div><div class="dial-rot" style="--rot:' + (-idx * DIAL_STEP) + 'deg"><svg viewBox="-200 -200 400 400" aria-hidden="true"><g class="ticks">' + ticks + '</g><circle r="172" class="ring"/></svg>'
    + DIAL.map((d, i) => '<a class="dl' + (i === idx ? " on" : "") + '" href="#' + d[0] + '" style="--a:' + (i * DIAL_STEP) + 'deg" data-i="' + i + '">' + esc(d[1]) + '</a>').join("") + '</div>'
    + '<span class="dial-pin" aria-hidden="true"></span><button class="dial-add" data-act="addexp" aria-label="Add spending">' + svg("plus") + '</button></div></nav>';
}
/* drag the dial round to change section */
let dialDrag = null;
document.addEventListener("pointerdown", e => {
  const d = e.target.closest(".dial-disc"); if (!d || e.target.closest(".dial-add")) return;
  const r = d.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  dialDrag = { cx, cy, a0: Math.atan2(e.clientX - cx, cy - e.clientY), base: -dialIndex() * DIAL_STEP, rot: d.querySelector(".dial-rot"), moved: false, x0: e.clientX };
});
document.addEventListener("pointermove", e => {
  if (!dialDrag) return; const a = Math.atan2(e.clientX - dialDrag.cx, dialDrag.cy - e.clientY), da = (a - dialDrag.a0) * 180 / Math.PI;
  if (Math.abs(e.clientX - dialDrag.x0) > 6) dialDrag.moved = true; if (!dialDrag.moved) return;
  const r = Math.max(-(DIAL.length - 1) * DIAL_STEP - 10, Math.min(10, dialDrag.base + da));
  dialDrag.rot.style.transition = "none"; dialDrag.rot.style.setProperty("--rot", r + "deg"); dialDrag.cur = r;
});
document.addEventListener("pointerup", () => {
  if (!dialDrag) return; const d = dialDrag; dialDrag = null; d.rot.style.transition = "";
  if (!d.moved) return; justDragged = Date.now();
  const i = Math.max(0, Math.min(DIAL.length - 1, Math.round(-d.cur / DIAL_STEP)));
  d.rot.style.setProperty("--rot", (-i * DIAL_STEP) + "deg");
  if (DIAL[i][0] !== (ui.route === "statement" ? "insights" : ui.route)) location.hash = "#" + DIAL[i][0];
});
/* shrink any big number that would not fit its box, instead of cutting it off */
function fitNumbers(root) {
  root.querySelectorAll(".ptile .left, .huge, .spendbig, .stage-num, .up .big, .item .amt, .kv span, .bigstat").forEach(el => {
    el.style.fontSize = "";
    let fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
    const box = el.parentElement; if (!box) return;
    while (n++ < 14 && (el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > box.getBoundingClientRect().right - parseFloat(getComputedStyle(box).paddingRight) + 1)) { fs *= .92; el.style.fontSize = fs.toFixed(1) + "px"; }
  });
}
window.addEventListener("resize", () => { const a = $("#app"); if (a) fitNumbers(a); });
/* the dial tucks away while you scroll down and comes back when you scroll up */
let lastSY = 0;
window.addEventListener("scroll", () => {
  const y = scrollY, d = document.querySelector(".dial"); if (!d) return;
  const atEnd = innerHeight + y >= document.documentElement.scrollHeight - 40;
  if (y > lastSY + 6 && y > 200 && !atEnd) d.classList.add("tucked"); else if (y < lastSY - 6 || atEnd || y < 120) d.classList.remove("tucked");
  lastSY = y;
}, { passive: true });
/* headings resolve from random characters, like a display warming up */
function scramble(root) {
  if (reduceMotion()) return;
  const G = "£#%&*+=:.0123456789ABCDEFX";
  root.querySelectorAll(".scramble").forEach(el => {
    const txt = el.textContent, t0 = performance.now(), dur = 520 + txt.length * 28;
    (function f(now) { const k = Math.min(1, (now - t0) / dur), n = Math.floor(k * txt.length);
      el.textContent = txt.slice(0, n) + [...txt.slice(n)].map(ch => ch === " " ? " " : G[Math.floor(Math.random() * G.length)]).join("");
      if (k < 1) requestAnimationFrame(f); else el.textContent = txt; })(t0);
  });
}
function shell(body) {
  const nav = [["home", "Home", "home"], ["spend", "Spending", "spend"], ["flow", "Cash flow", "flow"], ["plan", "Plan", "plan"], ["insights", "Insights", "insight"]];
  const cur = ui.route === "statement" ? "insights" : ui.route === "import" ? "spend" : ui.route;
  const links = () => nav.map(n => '<a class="navbtn' + (cur === n[0] ? " on" : "") + '" href="#' + n[0] + '">' + svg(n[2]) + n[1] + '</a>').join("");
  const brand = '<a class="brand" href="#home">' + MARK + '<span><b>' + esc(nm("m")) + ' &amp; ' + esc(nm("s")) + '</b><small>Household money</small></span></a>';
  if (worldOn()) {
    const canBack = ui.route !== "home" || (ui.hist && ui.hist.length);
    const top = '<header class="wtop">' + (canBack ? '<button class="wback" data-act="back" aria-label="Back">' + svg("back", 18) + '<span class="mono">Back</span></button>' : "") + '<a class="brand" href="#home">' + MARK + '<span class="mono">' + esc(nm("m")) + ' &amp; ' + esc(nm("s")) + '</span></a><span class="mono dim wclock">' + esc(new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })) + '</span><a class="mono wlink" href="#settings">Settings</a></header>';
    return '<div class="wshell">' + top + stageHTML() + '<main class="main">' + (S.mode === "demo" ? '<div class="banner info noprint" style="margin-bottom:14px">Sample numbers only. Nothing here is real or shared.</div>' : "") + body + '</main></div>' + dialHTML();
  }
  return '<div class="shell"><aside class="side">' + brand + '<div class="sidenav"><span class="navblob" data-k="side"></span>' + links() + '</div><span class="grow"></span><a class="navbtn' + (cur === "settings" ? " on" : "") + '" href="#settings">' + svg("gear") + 'Settings</a></aside>'
    + '<main class="main"><header class="top">' + brand + '<span class="grow"></span><a class="roundbtn" href="#settings" aria-label="Settings">' + svg("gear", 20) + '</a></header>'
    + (S.mode === "demo" ? '<div class="banner info noprint" style="margin-bottom:14px">Sample numbers only. Nothing here is real or shared.</div>' : "")
    + body + '</main></div>'
    + '<nav class="bottom"><div class="in"><span class="navblob" data-k="bottom"></span>' + links() + '</div></nav>'
    + (["home", "spend"].includes(ui.route) ? '<button class="fab" data-act="addexp" aria-label="Add spending">' + svg("plus") + 'Add spending</button>' : "");
}

/* ---- login / welcome ---- */
function vLogin() {
  return '<div class="login"><form class="card" id="loginForm" data-keep>' + MARK.replace('class="mark"', 'class="mark" style="width:52px;height:52px"')
    + '<div><h1>Mukul &amp; Sylwia</h1><p class="sub">Sign in to see your household money.</p></div>'
    + '<label class="field">Email<input type="email" id="lg-email" autocomplete="username" required></label>'
    + '<label class="field">Password<input type="password" id="lg-pass" autocomplete="current-password" required></label>'
    + '<p class="note" id="lg-msg" role="status"></p>'
    + '<button class="btn primary" type="submit" style="justify-content:center">Sign in</button>'
    + '<button class="btn ghost small" type="button" data-act="reset" style="justify-content:center">Send me a password reset email</button></form></div>';
}
function vWelcome() {
  return '<div class="login"><div class="card">' + MARK + '<div><h1>Set up your money</h1><p class="sub">Start with a blank setup and add your own numbers, or load a starting file.</p></div>'
    + '<button class="btn primary" data-act="blank" style="justify-content:center">Start blank</button>'
    + '<label class="field">Or load a starting file (.json)<input type="file" id="importFile" accept=".json,application/json"></label>'
    + '<p class="note" id="imp-msg"></p>'
    + (ui.importData ? '<button class="btn" data-act="doimport" style="justify-content:center">Load this file</button>' : "")
    + (S.mode === "live" ? '<button class="btn ghost small" data-act="signout">Sign out</button>' : "") + '</div></div>';
}

/* ---- rings ---- */
function ring(opts) { return pebble(opts); }
function jointSegs(frac, item) {
  if (item.who !== "j" || item.color) return [{ f: frac, c: itemColor(item) }];
  const sh = jointShares(), t = sh.m + sh.s; const a = t > 0 ? sh.m / t : .5;
  return [{ f: frac * a, c: "var(--m)" }, { f: frac * (1 - a), c: "var(--s)" }];
}

/* ---- home ---- */
function vHome() {
  const c = columns(), ym = thisYM(), who = me(), hr = new Date().getHours();
  const hi = (hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening") + ", " + new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const safe = safeToSpend(who), both = who ? safeToSpend(null) : null, streak = loggingStreak();
  let h = worldOn() ? "" : '<div class="hello"><div><span class="hello-k">' + esc(hi) + '</span><h1 class="hello-name">Hello <b>' + esc(who ? nm(who) : nm("m") + " & " + nm("s")) + '</b>!</h1></div></div>';
  if (!who) h += '<section class="card" style="margin-bottom:12px"><h3>Which one are you?</h3><p class="sub">So it greets you and fills in who paid.</p><div class="row wrap">' + PEOPLE.map(p => '<button class="btn" data-act="iam" data-v="' + p + '"><span class="dot ' + p + '"></span>' + esc(nm(p)) + '</button>').join("") + '</div></section>';
  const last = S.statements[0];
  if (last && LS.get("ms-recap-seen") !== last.id) h += '<button class="recapbar" data-act="recap" data-v="' + esc(last.id) + '"><span class="play">▶</span><span class="grow"><b>Your ' + esc(ymLabel(last.id).split(" ")[0]) + ' recap is ready</b><br><span style="opacity:.75">Tap to see how the month went</span></span></button>';
  h += '<div class="bento">';
  // hero
  const perDay = Math.max(0, safe.perDay);
  ui.hero = { fill: safe.total > 0 ? Math.max(0, safe.left) / safe.total : .5, warm: safe.left < 0 };
  h += '<section class="tile t-lime b-hero">' + contours("hero" + ym, "contours hero-c", 9) 
    + (S.budgets.length
      ? '<div class="herohead"><span class="k">Safe to spend today</span><span class="daysleft"><b>' + safe.daysLeft + '</b> ' + (safe.daysLeft === 1 ? "day" : "days") + ' left in ' + esc(ymLabel(ym).split(" ")[0]) + '</span></div>' + '<span class="huge num' + (safe.perDay < 0 ? " neg" : "") + '" data-count="' + perDay.toFixed(0) + '">' + gbp(perDay) + '</span>'
        + '<p class="subl">' + (safe.left >= 0 ? gbp(safe.left) + ' left in ' + (who ? 'your and joint budgets' : 'your budgets') + ' this month' + (both ? '. Together it’s ' + gbp(Math.max(0, both.perDay)) + ' a day.' : '.') : 'Budgets are ' + gbp(-safe.left) + ' over for this month.') + '</p>'
      : '<div class="herohead"><span class="k">Safe to spend today</span><span class="daysleft"><b>' + safe.daysLeft + '</b> ' + (safe.daysLeft === 1 ? "day" : "days") + ' left in ' + esc(ymLabel(ym).split(" ")[0]) + '</span></div>' + '<span class="huge">£?</span><p class="subl">Add your budgets in Plan and this shows what you can spend each day.</p>')
    + '<div class="hchips">' + (streak ? '<span class="hchip"><i class="spark"></i>' + plural(streak, "day") + ' streak</span>' : '<span class="hchip"><i class="spark"></i>Log a purchase to start a streak</span>') + '<a class="hchip" href="#flow">' + esc(nextMoveText(ym)) + '</a></div></section>';
  if (worldOn()) {
    const perDay2 = Math.max(0, safe.perDay);
    ui.homeStage = '<section class="stage st-home" aria-label="Today"><div class="stage-in"><span class="mono">' + esc(hi) + '</span><h1 class="stage-title hello-name">Hello <b class="scramble">' + esc(who ? nm(who) : nm("m") + " & " + nm("s")) + '</b></h1>'
      + '<div class="stage-hero"><span class="mono">Safe to spend today</span>' + (S.budgets.length ? '<span class="huge num' + (safe.perDay < 0 ? " neg" : "") + '" data-count="' + perDay2.toFixed(0) + '">' + gbp(perDay2) + '</span>' : '<span class="huge">£?</span>')
      + '<span class="mono dim">' + plural(safe.daysLeft, "day") + ' left in ' + esc(ymLabel(ym).split(" ")[0]) + (S.budgets.length ? ' · ' + (safe.left >= 0 ? gbp(safe.left) + ' left in budgets' : gbp(-safe.left) + ' over budget') : ' · add budgets in Plan') + '</span>'
      + '<div class="hchips">' + (streak ? '<span class="hchip"><i class="spark"></i>' + plural(streak, "day") + ' streak</span>' : '<span class="hchip"><i class="spark"></i>Log a purchase to start a streak</span>') + '<a class="hchip" href="#flow">' + esc(nextMoveText(ym)) + '</a></div></div></div>'
      + '<span class="stage-hint mono">Drag to spin. Tap the core. Moons are your savings pots</span></section>';
    h = h.replace(/<section class="tile t-lime b-hero">[\s\S]*?<\/section>/, "");
  }
  // spend tile
  const months = [5, 4, 3, 2, 1, 0].map(i => addM(ym, -i)), vals = months.map(m => sum(expensesOf(m).map(e => e.amount))), mx = Math.max(1, ...vals);
  const day = new Date().getDate(), lastSame = sum(expensesOf(addM(ym, -1)).filter(e => +e.date.slice(8, 10) <= day).map(e => e.amount)), cur = vals[5];
  h += '<section class="tile t-ink b-spend"><div class="spendhead"><div><span class="k" style="opacity:1;color:var(--muted)">Spent in ' + esc(ymLabel(ym).split(" ")[0]) + '</span><div class="spendbig num" data-count="' + cur.toFixed(0) + '">' + gbp(cur) + '</div></div>'
    + (lastSame > 0 ? '<span class="pill ' + (cur <= lastSame ? "good" : "warn") + '">' + (cur <= lastSame ? "↓ " + gbp(lastSame - cur) + " less" : "↑ " + gbp(cur - lastSame) + " more") + ' than this time last month</span>' : '<a class="btn small" href="#spend">See purchases</a>') + '</div>'
    + flowSpark(months, vals) + '</section>';
  // people
  const ptile = k => { const x = c[k], name = k === "j" ? "Joint" : nm(k), ini = k === "j" ? "&" : name.charAt(0);
    return '<div class="ptile ' + k + '"><div class="row between"><span class="av">' + esc(ini) + '</span><span class="tiny num">' + (x.income > 0 ? Math.round(x.util * 100) + "% used" : "") + '</span></div><span class="nm">' + esc(name) + '</span><span class="left num">' + (x.income > 0 ? gbp(Math.abs(x.left)) : "£0") + '</span><span class="tiny">' + (x.income > 0 ? (x.left < 0 ? "short" : "left") + " of " + gbp(x.income) : (k === "j" ? "Nothing moved in yet" : "Add income in Plan")) + '</span><div class="bar"><i style="width:' + Math.min(100, x.util * 100).toFixed(0) + '%"></i></div><span class="tiny">Bills ' + gbp(x.bills) + ', subs ' + gbp(x.subs) + '</span></div>'; };
  h += '<section class="b-people"><div class="people">' + ptile("s") + ptile("m") + ptile("j") + '</div></section>';
  h += '</div>';
  const al = alerts(c);
  if (al.length) h += '<div class="section-head"><h2>Worth a look</h2></div><section class="card"><ul class="alerts">' + al.map(a => '<li><span class="ic pill ' + a[0] + '" style="padding:0">' + a[1] + '</span><span>' + a[2] + '</span></li>').join("") + '</ul></section>';
  // challenges as chips
  const act = S.challenges.map(x => Object.assign({ x }, challengeStatus(x))).filter(s => s.state === "on" || s.state === "soon" || (s.end >= addD(todayISO(), -3)));
  h += '<div class="section-head"><h2>Challenges</h2></div><div class="challenge-row">' + act.map((s, i) => {
    const x = s.x, st2 = s.state === "won" ? "Done!" : s.state === "lost" ? "Missed" : s.state === "soon" ? "Starts " + dayLabel(s.start) : plural(s.daysLeft, "day") + " left";
    const days = +x.days || 7, frac = s.state === "soon" ? 0 : Math.min(1, s.dayNo / days);
    return '<button class="chip-c ' + s.state + '" data-act="editchal" data-id="' + esc(x.id) + '"><span class="cstate">' + esc(st2) + '</span><b>' + (x.emoji ? '<span class="cemo">' + esc(x.emoji) + '</span>' : "") + esc(x.name) + '</b><span class="note">' + (x.kind === "under" ? gbp(s.spent) + " of " + gbp(s.limit) : s.spent > 0 ? gbp(s.spent) + " spent, so it’s missed" : "Nothing spent so far") + '</span><span class="bar"><i style="width:' + (frac * 100).toFixed(0) + '%"></i></span></button>';
  }).join("") + '<button class="chip-c add" data-act="newchal"><span class="cstate">Try one</span><b>New challenge</b><span class="note">No takeaway week, £50 food shop…</span></button></div>';
  // budgets
  // coming up
  const ups = S.yearly.filter(y => !y.done && +y.amount > 0).map(y => ({ y, due: dueYM(y), n: monthsBetween(ym, dueYM(y)) })).filter(u => u.n >= 0 && u.n <= 6).sort((a, b) => a.n - b.n).slice(0, 4);
  if (ups.length) h += '<div class="section-head"><h2>Coming up</h2><a class="btn small" href="#plan/yearly">All upcoming</a></div><div class="upcoming">' + ups.map(u => { const pct = Math.min(1, (+u.y.saved || 0) / (+u.y.amount || 1));
    return '<button class="up" data-act="edit" data-c="yearly" data-id="' + esc(u.y.id) + '"><span class="when">' + (u.n === 0 ? "This month" : u.n === 1 ? "Next month" : "In " + u.n + " months") + '</span><span class="what">' + (u.y.emoji ? esc(u.y.emoji) + " " : "") + esc(u.y.name) + '</span><span class="num big">' + gbp(u.y.amount) + '</span><span class="bar"><i style="width:' + (pct * 100).toFixed(0) + '%"></i></span><span class="tiny">' + gbp(+u.y.saved || 0) + ' set aside, ' + esc(ymLabel(u.due, true)) + '</span></button>'; }).join("") + '</div>';
  const arrBtn = '<button class="btn small' + (ui.arrange ? " primary" : "") + '" data-act="arrange">' + (ui.arrange ? "Done" : "Arrange") + '</button>';
  h += '<div class="section-head"><h2>Budgets</h2><div class="row">' + arrBtn + '<a class="btn small" href="#plan/budgets">Edit</a></div></div>';
  h += S.budgets.length ? '<div class="rings' + (ui.arrange ? " arranging" : "") + '" data-sort="budgets">' + S.budgets.map(b => {
    const sp = budgetSpent(b, ym), a = +b.amount || 0, over = sp > a && a > 0;
    return '<div class="ring" data-act="openbudget" data-id="' + esc(b.id) + '">' + ring({ segs: [{ f: a ? sp / a : 0, c: itemColor(b) }], over, emoji: b.emoji, centre: over ? gbp(sp - a) : gbp(Math.max(0, a - sp)), sub: over ? "over" : "left", label: b.name })
      + '<div class="t">' + esc(b.name) + '</div>' + whoTag(b.who) + '<div class="k num">' + gbp(sp) + ' of ' + gbp(a) + ' spent</div></div>';
  }).join("") + '</div>' : '<div class="empty">No budgets yet. <a href="#plan/budgets">Add one</a></div>';
  h += '<div class="section-head"><h2>Debt</h2><div class="row">' + arrBtn + '<a class="btn small" href="#plan/debts">Edit</a></div></div>';
  const ds = S.debts.slice();
  h += ds.length ? '<div class="rings' + (ui.arrange ? " arranging" : "") + '" data-sort="debts">' + ds.map(d => {
    const inf = debtInfo(d);
    return '<div class="ring" data-act="edit" data-c="debts" data-id="' + esc(d.id) + '">' + ring({ segs: [{ f: inf.pct, c: itemColor(d) }], emoji: d.emoji, centre: gbp(d.balance), sub: "left", label: d.name })
      + '<div class="t">' + esc(d.name) + '</div>' + whoTag(d.who)
      + '<div class="facts"><span>Months left</span><span>' + (inf.plan.done ? "Paid off" : inf.plan.months != null ? inf.plan.months : "Not set") + '</span><span>Finished</span><span>' + (inf.plan.done ? "Done" : inf.finishISO ? dateLabel(inf.finishISO) : "Not set") + '</span><span>Interest paid</span><span>' + gbp(+d.interestPaid || 0, 1) + '</span></div>' + (d.inr ? inrOf(+d.balance || 0) : "") + '</div>';
  }).join("") + '</div>' : '<div class="empty">No debts. Nice.</div>';
  h += '<div class="section-head"><h2>Saving goals</h2><div class="row">' + arrBtn + '<a class="btn small" href="#plan/pots">Edit</a></div></div>';
  h += S.pots.length ? '<div class="rings' + (ui.arrange ? " arranging" : "") + '" data-sort="pots">' + S.pots.map(p => {
    const inf = potInfo(p);
    return '<div class="ring" data-act="edit" data-c="pots" data-id="' + esc(p.id) + '">' + ring({ segs: jointSegs(inf.pct, p), emoji: p.emoji, centre: gbp(inf.cur), sub: inf.goal ? "of " + gbp(inf.goal) : "saved", label: p.name })
      + '<div class="t">' + esc(p.name) + '</div>' + whoTag(p.who)
      + '<div class="k">' + (inf.goal <= 0 ? "Set a goal" : inf.remaining <= 0 ? "Reached 🎉" : inf.iso ? "Complete " + dateLabel(inf.iso) : "Set a monthly amount") + '</div>' + (p.inr ? inrOf(inf.cur) : "") + '</div>';
  }).join("") + '</div>' : '<div class="empty">No saving goals yet. <a href="#plan/pots">Add one</a></div>';
  return h;
}
function nextMoveText(ym) {
  const today = new Date().getDate(), who = me();
  const next = flowItems(ym).find(i => i.day >= today && i.type !== "in" && !ticked(ym, i.key) && (!who || i.from === who || i.from === "j"));
  return next ? "Next: " + next.label + " " + gbp(next.amount) + (next.day === today ? " today" : " on the " + ordinal(next.day)) : "Nothing else due this month";
}
function alerts(c) {
  const out = [], ym = thisYM();
  PEOPLE.forEach(p => { if (c[p].income > 0 && c[p].left < 0) out.push(["bad", "!", "<b>" + esc(nm(p)) + "</b> has committed " + gbp(-c[p].left) + " more than they take home each month."]); });
  if (c.j.committed > 0 && c.j.left < -0.5) out.push(["bad", "!", "The joint account needs " + gbp(c.j.committed) + " a month but only " + gbp(c.j.income) + " goes in. Change the split in Settings."]);
  S.budgets.forEach(b => { const sp = budgetSpent(b, ym); if (+b.amount > 0 && sp > +b.amount) out.push(["warn", "↑", "<b>" + esc(b.name) + "</b> is " + gbp(sp - b.amount) + " over budget."]); });
  const hi = S.debts.filter(d => debtActive(d) && +d.apr > 10).sort((a, b) => b.apr - a.apr)[0];
  if (hi) out.push(["warn", "%", "<b>" + esc(hi.name) + "</b> charges " + hi.apr + "% interest, the most expensive debt. Try its slider in Insights to see what overpaying saves."]);
  S.debts.filter(d => debtActive(d) && !(+d.monthly > 0)).slice(0, 2).forEach(d => out.push(["plain", "?", "<b>" + esc(d.name) + "</b> has no monthly repayment set, so it can't show a finish date."]));
  const soon = S.yearly.filter(y => !y.done && monthsBetween(ym, dueYM(y)) <= 1 && monthsBetween(ym, dueYM(y)) >= 0 && (+y.saved || 0) < (+y.amount || 0) * .9);
  soon.forEach(y => out.push(["warn", "🗓", "<b>" + esc(y.name) + "</b> is due in " + esc(ymLabel(dueYM(y))) + " and only " + gbp(+y.saved || 0) + " of " + gbp(y.amount) + " is set aside."]));
  return out.slice(0, 5);
}

/* ---- spending ---- */
function vSpend() {
  const ym = ui.spendYM;
  let E = expensesOf(ym);
  if (ui.spendWho !== "all") E = E.filter(e => e.who === ui.spendWho);
  E.sort((a, b) => (b.date + (b.ts || 0)) > (a.date + (a.ts || 0)) ? 1 : -1);
  const total = sum(E.map(e => e.amount));
  let h = '<div class="stack"><div class="section-head wrap"><div class="monthnav"><button class="btn small" data-act="spm" data-v="-1" aria-label="Previous month">‹</button><h2>' + esc(ymLabel(ym)) + '</h2><button class="btn small" data-act="spm" data-v="1" aria-label="Next month"' + (ym >= thisYM() ? " disabled" : "") + '>›</button></div>'
    + '<a class="btn small" href="#import">Import a bank statement</a></div>'
    + '<div class="chips">' + [["all", "Everyone"], ["m", nm("m")], ["s", nm("s")], ["j", "Joint"]].map(o => '<button class="chip' + (ui.spendWho === o[0] ? " on" : "") + '" data-act="spwho" data-v="' + o[0] + '">' + (o[0] !== "all" ? '<span class="dot ' + o[0] + '"></span>' : "") + esc(o[1]) + '</button>').join("") + '</div>';
  const rows = S.budgets.filter(b => ui.spendWho === "all" || b.who === ui.spendWho).map(b => {
    const sp = budgetSpent(b, ym), a = +b.amount || 0;
    return '<tr class="click" data-act="openbudget" data-id="' + esc(b.id) + '"><td class="name">' + emo(b) + esc(b.name) + '</td><td>' + whoTag(b.who) + '</td><td class="r">' + gbp(a, 1) + '</td><td class="r">' + gbp(sp, 1) + '</td><td class="r" style="color:' + (sp > a ? "var(--bad)" : "inherit") + '">' + (sp > a ? gbp(sp - a, 1) + " over" : gbp(a - sp, 1)) + '</td></tr>';
  }).join("");
  const known = new Set(S.budgets.map(b => b.id)), isOther = e => !e.budgetId || !known.has(e.budgetId);
  const oth = E.filter(isOther), othSum = sum(oth.map(e => e.amount));
  const rowsAll = rows + (oth.length ? '<tr class="other-row"><td class="name">Other, not in a budget</td><td></td><td class="r"><span class="muted">None</span></td><td class="r">' + gbp(othSum, 1) + '</td><td class="r"></td></tr>' : "");
  h += '<section class="card"><div class="row between"><h3>Running budgets</h3><span class="num"><b>' + gbp(total, 1) + '</b> <span class="muted">spent</span></span></div><div class="tablewrap"><table><thead><tr><th>Name</th><th>Whose</th><th class="r">Budget</th><th class="r">Running cost</th><th class="r">Budget left</th></tr></thead><tbody>' + rowsAll + '</tbody></table></div></section>';
  { // what keeps turning up outside the budgets, over the last 3 months
    const since = addM(ym, -2), groups = {};
    S.expenses.filter(e => e.ym >= since && e.ym <= ym && isOther(e) && (ui.spendWho === "all" || e.who === ui.spendWho)).forEach(e => {
      const k = (merchantKey(e.note) || String(e.note || "Unnamed").toUpperCase()).trim() || "UNNAMED";
      const g = groups[k] || (groups[k] = { name: e.note || "Unnamed", total: 0, n: 0, months: new Set() });
      g.total += +e.amount || 0; g.n++; g.months.add(e.ym);
    });
    const gl = Object.values(groups).sort((a, b) => b.total - a.total).slice(0, 6);
    if (gl.length) h += '<section class="card"><div><h3>Outside your budgets</h3><p class="sub">Spending logged as Other over the last 3 months. If something keeps coming up, it probably deserves its own budget.</p></div><div class="list">'
      + gl.map(g => '<div class="item"><div class="grow"><div class="t">' + esc(g.name) + '</div><div class="m">' + plural(g.n, "time") + ' in ' + plural(g.months.size, "month") + '</div></div><div class="amt num">' + gbp(g.total, 1) + '</div>' + (g.months.size >= 2 || g.n >= 3 ? '<button class="btn small" data-act="budfromother" data-v="' + esc(g.name) + '">Make a budget</button>' : "") + '</div>').join("") + '</div></section>';
  }
  if (!E.length) return h + '<div class="empty">Nothing logged for ' + esc(ymLabel(ym)) + '. Tap Add spending to log a purchase.</div></div>';
  let cur = "", body = "";
  E.forEach(e => {
    if (e.date !== cur) { if (cur) body += '</div>'; cur = e.date; body += '<div class="daylab">' + esc(dayLabel(e.date)) + '</div><div class="list">'; }
    const b = S.budgets.find(x => x.id === e.budgetId), by = whoFromEmail(e.by);
    const reacts = e.react ? Object.values(e.react).filter(Boolean).join("") : "";
    body += '<div class="srow" data-id="' + esc(e.id) + '"><div class="acts"><button class="e" data-act="editexp" data-id="' + esc(e.id) + '">Edit</button><button class="d" data-act="swdel" data-id="' + esc(e.id) + '">Delete</button></div><div class="sin"><div class="item" data-act="editexp" data-id="' + esc(e.id) + '" style="cursor:pointer">'
      + (b && b.emoji ? '<span class="emo">' + esc(b.emoji) + '</span>' : '<span class="dot ' + esc(e.who) + '"></span>')
      + '<div class="grow"><div class="t">' + esc(e.note || (b ? b.name : "Spending")) + (reacts ? '<span class="react">' + esc(reacts) + '</span>' : "") + ((e.comments || []).length ? ' <span class="note">💬' + e.comments.length + '</span>' : "") + '</div><div class="m">' + esc((b ? b.name : "Other") + " · from " + nm(e.who) + (by ? " · added by " + nm(by) : e.imported ? " · imported" : "")) + '</div></div><div class="amt num">' + gbp(e.amount, 1) + '</div></div></div></div>';
  });
  body += '</div>';
  return h + '<section class="card"><div class="row between"><h3>Every purchase</h3><span class="note">Swipe left to edit or delete</span></div>' + body + '</section></div>';
}

/* ---- cash flow ---- */
function flowRow(i, ym, withTick) {
  const done = ticked(ym, i.key);
  const route = i.type === "in" ? "Into " + nm(i.to) : i.type === "move" ? nm(i.from) + " to Joint" : "From " + nm(i.from);
  const kind = { in: "Income", move: "Transfer", bill: "Bill", sub: "Subscription", debt: "Debt payment", pot: "Saving", due: "Upcoming cost" }[i.type];
  return '<div class="item' + (done ? " done" : "") + '"><div class="dayno"><b>' + i.day + '</b><span>' + esc(new Date(isoOf(ym, i.day) + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" })) + '</span></div>'
    + '<div class="grow"><div class="t">' + (i.emoji ? esc(i.emoji) + " " : "") + esc(i.label) + '</div><div class="flowto"><span class="dot ' + esc(i.type === "in" ? i.to : i.from) + '"></span><span>' + esc(route) + ' · ' + kind + (isManual(i) ? ", you move this" : i.type === "in" ? "" : i.type === "due" ? ", paid from what you set aside" : ", automatic") + '</span></div></div>'
    + '<div class="amt num" style="color:' + (i.type === "in" ? "var(--good)" : "inherit") + '">' + (i.type === "in" ? "+" : "") + gbp(i.amount, 1) + '</div>'
    + (withTick !== false ? '<button class="tick' + (done ? " on" : "") + '" data-act="tick" data-ym="' + ym + '" data-k="' + esc(i.key) + '" aria-label="Mark as done">' + (done ? svg("check", 14) : "") + '</button>' : "") + '</div>';
}
function vFlow() {
  const ym = ui.flowYM, items = flowItems(ym), s = st(), c = columns();
  let h = '<div class="stack"><div class="section-head wrap"><div class="monthnav"><button class="btn small" data-act="flm" data-v="-1" aria-label="Previous month">‹</button><h2>' + esc(ymLabel(ym)) + '</h2><button class="btn small" data-act="flm" data-v="1" aria-label="Next month">›</button></div>'
    + '<div class="row wrap"><button class="btn small" data-act="ics" data-v="all">📅 Add all to my calendar</button>' + (me() ? '<button class="btn small" data-act="ics" data-v="' + me() + '">Just mine</button>' : "") + '</div></div>';
  h += '<div class="grid g2">' + PEOPLE.map(p => {
    const mine = items.filter(i => i.from === p && isManual(i)), tot = sum(mine.map(i => i.amount));
    return '<section class="card acct ' + p + '"><div><h3>' + esc(nm(p)) + '’s pay day moves</h3><p class="sub">On the ' + ordinal(dayIn(ym, s.payday[p])) + ', ' + esc(nm(p)) + ' gets ' + gbp(takeHome(p), 1) + ' and moves:</p></div>'
      + (mine.length ? '<div class="list">' + mine.map(i => flowRow(i, ym)).join("") + '</div><div class="row between"><span class="sub">Moved in total</span><b class="num">' + gbp(tot, 1) + '</b></div>' : '<p class="note">Nothing to move by hand.</p>') + '</section>';
  }).join("") + '</div>';
  h += '<div class="section-head"><h2>Each account this month</h2></div><div class="grid g3">' + ["s", "m", "j"].map(k => {
    const x = c[k];
    const lines = [["Comes in", x.income], ["Bills", x.bills], ["Subscriptions", x.subs], ["Debt payments", x.debts], ["Savings pots", x.pots], ["Upcoming costs set aside", x.yearly], ["Budgets for spending", x.budgets]];
    if (k !== "j") lines.splice(1, 0, ["To the joint account", x.joint]);
    return '<section class="card acct ' + k + '"><h3>' + esc(k === "j" ? "Joint account" : nm(k) + "’s account") + '</h3><div class="kv num">' + lines.map((l, i) => '<span class="' + (i ? "sub" : "") + '">' + l[0] + '</span><span>' + (i ? gbp(l[1], 1) : "+" + gbp(l[1], 1)) + '</span>').join("")
      + '<span class="tot">' + (x.left >= 0 ? "Left over" : "Short by") + '</span><span class="tot" style="color:' + (x.left < 0 ? "var(--bad)" : "inherit") + '">' + gbp(x.left, 1) + '</span></div></section>';
  }).join("") + '</div>';
  h += '<section class="card"><h3>Every payment, by date</h3>' + (items.length ? '<div class="list">' + items.map(i => flowRow(i, ym)).join("") + '</div>' : '<p class="note">Add your income, bills and debts in Plan to build the calendar.</p>') + '</section>';
  return h + '</div>';
}

/* ---- plan ---- */
const PLAN_TABS = [["income", "Income"], ["bills", "Bills"], ["subs", "Subscriptions"], ["debts", "Debt"], ["budgets", "Budgets"], ["pots", "Savings pots"], ["yearly", "Upcoming costs"]];
function vPlan() {
  const t = PLAN_TABS.some(x => x[0] === ui.sub) ? ui.sub : "income";
  let h = '<div class="stack"><div class="section-head"><h1>Plan</h1></div><div class="tabs">' + PLAN_TABS.map(x => '<a class="tab' + (t === x[0] ? " on" : "") + '" href="#plan/' + x[0] + '">' + x[1] + '</a>').join("") + '</div>';
  h += ({ income: pIncome, bills: pBills, subs: pSubs, debts: pDebts, budgets: pBudgets, pots: pPots, yearly: pYearly })[t]();
  return h + '</div>';
}
function pIncome() {
  const col = p => {
    const i = S.income[p] || {}, ded = i.deductions && i.deductions.length ? i.deductions : [{ name: "Tax", amount: 0 }, { name: "National Insurance", amount: 0 }, { name: "Pension", amount: 0 }, { name: "Student loan", amount: 0 }, { name: "Salary sacrifice", amount: 0 }];
    const ex = i.extras || [];
    const line = (grp, l) => '<div class="row" data-line="' + grp + '"><input class="inp grow" data-f="name" value="' + esc(l.name) + '" aria-label="Name"><input class="inp" style="width:120px;text-align:right" data-f="amount" inputmode="decimal" value="' + (l.amount ? l.amount : "") + '" placeholder="0.00" aria-label="Amount"><button class="iconbtn" data-act="rmline" aria-label="Remove line">' + svg("bin", 18) + '</button></div>';
    return '<section class="card acct ' + p + '" data-keep data-income="' + p + '"><h2>' + esc(nm(p)) + '</h2>'
      + '<label class="field">Monthly before tax<input id="gross-' + p + '" inputmode="decimal" value="' + (i.gross || "") + '" placeholder="0.00"></label>'
      + '<div class="field">Taken off your pay<div class="stack" style="gap:8px" data-group="ded">' + ded.map(l => line("ded", l)).join("") + '</div></div>'
      + '<button class="addrow" data-act="addline" data-g="ded">+ Add a deduction</button>'
      + '<div class="field">Other income<div class="stack" style="gap:8px" data-group="ext">' + ex.map(l => line("ext", l)).join("") + '</div></div>'
      + '<button class="addrow" data-act="addline" data-g="ext">+ Add other income</button>'
      + '<label class="field">Take home, if you don’t have the breakdown<input id="manual-' + p + '" inputmode="decimal" value="' + (i.manual || "") + '" placeholder="Used when before tax is empty"></label>'
      + '<label class="field">Pay day<input id="payday-' + p + '" inputmode="numeric" value="' + st().payday[p] + '"></label>'
      + '<div class="row between"><span class="sub">Total left (take home)</span><b class="num" style="font-size:20px">' + gbp(takeHome(p), 1) + '</b></div>'
      + '<button class="btn primary" data-act="saveincome" data-p="' + p + '" style="align-self:flex-start">Save ' + esc(nm(p)) + '’s income</button></section>';
  };
  return '<div class="grid g2">' + col("s") + col("m") + '</div>';
}
const noteMark = x => x.notes ? '<span class="nmark" title="Has notes" aria-label="Has notes">' + svg("note", 14) + '</span>' : "";
const handleCell = (c, id) => '<td class="hcell"><span class="grip" data-grip="' + c + '" aria-label="Drag to reorder" title="Drag to reorder">' + svg("grip", 16) + '</span></td>';
const unsetPill = (c, id, f, label) => '<button class="unset" data-act="setfield" data-c="' + c + '" data-id="' + esc(id) + '" data-f="' + f + '" data-l="' + esc(label) + '">Not set</button>';
function colsHidden(t) { try { return JSON.parse(LS.get("ms-cols-" + t) || "{}"); } catch (e) { return {}; } }
function tableCard(title, intro, head, rows, foot, c, addLabel, opts) {
  opts = opts || {};
  const hid = colsHidden(c), css = [];
  const th = head.map((x, i) => {
    const key = x[2] && x[2].startsWith("x:") ? x[2].slice(2) : null, cls = (x[1] ? "r" : "") + (x[2] === "h" ? " hcell" : "");
    if (key && hid[key]) { css.push(".tbl-" + c + " tr>:nth-child(" + (i + 1) + ")"); return '<th class="colx shut"><button class="colbtn" data-act="togglecol" data-t="' + c + '" data-k="' + key + '" title="Show ' + esc(x[0]) + '" aria-label="Show ' + esc(x[0]) + '">' + svg("plus", 13) + '<span>' + esc(x[0]) + '</span></button></th>'; }
    if (key) return '<th class="colx ' + cls + '"><button class="colbtn" data-act="togglecol" data-t="' + c + '" data-k="' + key + '" title="Hide this column" aria-label="Hide ' + esc(x[0]) + '">' + esc(x[0]) + '<i>' + svg("minus", 12) + '</i></button></th>';
    return '<th' + (cls ? ' class="' + cls.trim() + '"' : "") + '>' + x[0] + '</th>';
  }).join("");
  const style = css.length ? '<style>' + css.join(",") + '{width:30px;max-width:30px;padding-left:4px!important;padding-right:4px!important}' + css.map(x => x + ":not(th)").join(",") + '{font-size:0!important;color:transparent}' + css.map(x => x + ":not(th) *").join(",") + '{display:none}</style>' : "";
  return '<section class="card"><div><h2>' + title + '</h2>' + (intro ? '<p class="sub">' + intro + '</p>' : "") + '</div>'
    + (rows ? style + '<div class="tablewrap"><table class="tbl-' + c + '"><thead><tr>' + th + '</tr></thead><tbody' + (opts.sort ? ' data-sort="' + opts.sort + '"' : "") + '>' + rows + '</tbody>' + (foot ? '<tfoot><tr>' + foot + '</tr></tfoot>' : "") + '</table></div>' + (opts.sort ? '<p class="note">Drag ' + svg("grip", 13) + ' to change the order. It changes on Home too, for both of you.</p>' : "") : '<div class="empty">Nothing here yet.</div>')
    + '<button class="addrow" data-act="new" data-c="' + c + '">+ ' + addLabel + '</button></section>';
}
const inrCell = (x, v) => x.inr && +st().fx.inr > 0 ? '<span class="sm">≈ ' + FI.format(v * st().fx.inr) + '</span>' : "";
function pBills() {
  const rows = S.bills.map(b => '<tr class="click" data-act="edit" data-c="bills" data-id="' + esc(b.id) + '">' + handleCell("bills", b.id) + '<td class="name">' + emo(b) + esc(b.name) + noteMark(b) + '</td><td class="r">' + (+b.cost ? gbp(b.cost, 1) : unsetPill("bills", b.id, "cost", "Cost each month (£)")) + inrCell(b, +b.cost || 0) + '</td><td>' + whoTag(b.acct) + '</td><td>' + ordinal(b.day || 1) + ' of the month</td></tr>').join("");
  return tableCard("Stable bills", "Standard monthly bills that don’t change often.", [["", 0, "h"], ["Name"], ["Cost", 1], ["Account going from"], ["Date of the bill"]], rows, '<td></td><td>Total</td><td class="r">' + gbp(sum(S.bills.map(b => b.cost)), 1) + '</td><td colspan="2"></td>', "bills", "Add a bill", { sort: "bills" });
}
function pSubs() {
  const rows = S.subs.map(x => '<tr class="click" data-act="edit" data-c="subs" data-id="' + esc(x.id) + '">' + handleCell("subs", x.id) + '<td class="name">' + emo(x) + esc(x.name) + noteMark(x) + '</td><td class="r">' + gbp(x.cost, 1) + '</td><td>' + FREQ[x.freq || "monthly"] + '</td><td class="r">' + gbp(subMonthly(x), 1) + '</td><td>' + whoTag(x.who) + '</td><td>' + ordinal(x.day || 1) + (x.freq === "yearly" || x.freq === "quarterly" ? " " + monthName(x.month).slice(0, 3) : "") + '</td></tr>').join("");
  return tableCard("Subscriptions", "", [["", 0, "h"], ["Name"], ["Cost", 1], ["Payment type"], ["Per month", 1], ["Whose"], ["Day charged"]], rows, '<td></td><td>Total</td><td></td><td></td><td class="r">' + gbp(sum(S.subs.map(subMonthly)), 1) + '</td><td colspan="2"></td>', "subs", "Add a subscription", { sort: "subs" });
}
function pDebts() {
  const rows = S.debts.map(d => {
    const inf = debtInfo(d), months = inf.plan.done ? "Paid off" : inf.plan.months != null ? inf.plan.months : (+d.monthly > 0 ? '<span class="unset static" title="' + esc(inf.plan.reason) + '">Too low</span>' : "");
    return '<tr class="click" data-act="edit" data-c="debts" data-id="' + esc(d.id) + '">' + handleCell("debts", d.id) + '<td class="name">' + emo(d) + esc(d.name) + noteMark(d) + '</td><td>' + whoTag(d.who) + '</td>'
      + '<td class="r">' + (+d.borrowed ? gbp(d.borrowed, 1) : unsetPill("debts", d.id, "borrowed", "Total amount borrowed (£)")) + '</td>'
      + '<td class="r">' + (+d.apr || 0) + '%</td>'
      + '<td class="r">' + (inf.totalWithInterest != null ? gbp(inf.totalWithInterest, 1) + (inf.totalIsEstimate ? '<span class="sm">estimate</span>' : "") : "") + '</td>'
      + '<td class="r"><b>' + gbp(d.balance, 1) + '</b>' + inrCell(d, +d.balance || 0) + '</td>'
      + '<td class="r">' + (+d.monthly > 0 || !debtActive(d) ? gbp(d.monthly, 1) : unsetPill("debts", d.id, "monthly", "Monthly repayment (£)")) + '</td>'
      + '<td class="r">' + months + '</td><td>' + (inf.finishISO ? dateLabel(inf.finishISO) : inf.plan.done ? "Done" : "") + '</td><td>' + (d.day ? ordinal(d.day) : "") + '</td><td class="r">' + gbp(+d.interestPaid || 0, 1) + '</td></tr>';
  }).join("");
  return tableCard("Debt", "Total left updates itself on the 1st of each month: the month’s interest is added and the repayment taken off. Tap a column name to fold it away. Anything in pink still needs a number.",
    [["", 0, "h"], ["Name"], ["Whose"], ["Total borrowed", 1, "x:borrowed"], ["Interest rate", 1, "x:apr"], ["Total + interest", 1, "x:total"], ["Total left", 1], ["Monthly repayment", 1], ["Months left", 1], ["Date finished"], ["Paid on"], ["Interest paid to date", 1]],
    rows, '<td></td><td>Total</td><td></td><td class="r">' + gbp(sum(S.debts.map(d => d.borrowed)), 1) + '</td><td></td><td class="r">' + gbp(sum(S.debts.map(d => debtInfo(d).totalWithInterest || 0)), 1) + '</td><td class="r">' + gbp(sum(S.debts.map(d => d.balance)), 1) + '</td><td class="r">' + gbp(sum(S.debts.map(d => debtMonthly(d))), 1) + '</td><td colspan="3"></td><td class="r">' + gbp(sum(S.debts.map(d => +d.interestPaid || 0)), 1) + '</td>', "debts", "Add a debt", { sort: "debts" });
}
function pBudgets() {
  const ym = thisYM();
  const rows = S.budgets.map(b => { const sp = budgetSpent(b, ym), a = +b.amount || 0; return '<tr class="click" data-act="edit" data-c="budgets" data-id="' + esc(b.id) + '">' + handleCell("budgets", b.id) + '<td class="name">' + emo(b) + esc(b.name) + noteMark(b) + '</td><td>' + whoTag(b.who) + '</td><td class="r">' + (a ? gbp(a, 1) : unsetPill("budgets", b.id, "amount", "Budget for each month (£)")) + '</td><td class="r">' + gbp(sp, 1) + '</td><td class="r" style="color:' + (sp > a ? "var(--bad)" : "inherit") + '">' + (sp > a ? gbp(sp - a, 1) + " over" : gbp(a - sp, 1)) + '</td></tr>'; }).join("");
  return tableCard("Running budgets", "Spending money for " + esc(ymLabel(ym)) + ". Running cost comes from what you log, and resets on the 1st.", [["", 0, "h"], ["Name"], ["Whose"], ["Budget for this month", 1], ["Running cost", 1], ["Budget left", 1]], rows, '<td></td><td>Total</td><td></td><td class="r">' + gbp(sum(S.budgets.map(b => b.amount)), 1) + '</td><td class="r">' + gbp(sum(S.budgets.map(b => budgetSpent(b, ym))), 1) + '</td><td></td>', "budgets", "Add a budget", { sort: "budgets" });
}
function pPots() {
  const rows = S.pots.map(p => { const inf = potInfo(p); return '<tr class="click" data-act="edit" data-c="pots" data-id="' + esc(p.id) + '">' + handleCell("pots", p.id) + '<td class="name">' + emo(p) + esc(p.name) + noteMark(p) + '</td><td>' + whoTag(p.who) + '</td><td class="r">' + (inf.goal ? gbp(inf.goal, 1) : unsetPill("pots", p.id, "goal", "Goal (£)")) + '</td><td class="r">' + (+p.monthly > 0 || (inf.goal && inf.remaining <= 0) ? gbp(p.monthly, 1) : unsetPill("pots", p.id, "monthly", "Monthly commitment (£)")) + '</td><td class="r">' + (inf.months === 0 ? "Reached" : inf.months != null ? inf.months : "") + '</td><td class="r"><b>' + gbp(inf.cur, 1) + '</b>' + inrCell(p, inf.cur) + '</td><td>' + (inf.iso ? dateLabel(inf.iso) : "") + '</td></tr>'; }).join("");
  return tableCard("Savings pots", "The monthly commitment is added to each pot on the 1st, and stops when the goal is reached.", [["", 0, "h"], ["Name"], ["Whose"], ["Goal", 1], ["Monthly commitment", 1], ["Months left", 1], ["Current total", 1], ["Date achievable"]], rows, '<td></td><td>Total</td><td></td><td class="r">' + gbp(sum(S.pots.map(p => p.goal)), 1) + '</td><td class="r">' + gbp(sum(S.pots.map(p => potMonthly(p))), 1) + '</td><td></td><td class="r">' + gbp(sum(S.pots.map(p => p.current)), 1) + '</td><td></td>', "pots", "Add a savings pot", { sort: "pots" });
}
function pYearly() {
  const ym = thisYM(), list = S.yearly.slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || byOrder(a, b));
  const rows = list.map(y => { const due = dueYM(y), n = monthsBetween(ym, due);
    return '<tr class="click' + (y.done ? " done" : "") + '" data-act="edit" data-c="yearly" data-id="' + esc(y.id) + '">' + handleCell("yearly", y.id) + '<td class="name">' + emo(y) + esc(y.name) + noteMark(y) + '</td><td>' + whoTag(y.who) + '</td><td class="r">' + (+y.amount ? gbp(y.amount, 1) : unsetPill("yearly", y.id, "amount", "Estimated cost (£)")) + inrCell(y, +y.amount || 0) + '</td><td>' + (y.done ? "Paid" : isOnce(y) ? esc(ymLabel(due)) : "Every " + monthName(y.month)) + '</td><td class="r">' + (y.done ? "" : n <= 0 ? "This month" : plural(n, "month")) + '</td><td class="r">' + gbp(yearlyMonthly(y), 1) + '</td><td class="r"><b>' + gbp(+y.saved || 0, 1) + '</b></td></tr>'; }).join("");
  return tableCard("Upcoming costs", "Things you know are coming: MOT, car service, Christmas, a visa fee, flights. Add a rough cost and when it lands, and the right amount is set aside each month so that month isn’t a shock. Set it to repeat every year, or just once.", [["", 0, "h"], ["Name"], ["Whose"], ["Estimated cost", 1], ["Due"], ["Months away", 1], ["Set aside monthly", 1], ["Saved so far", 1]], rows, '<td></td><td>Total</td><td></td><td class="r">' + gbp(sum(S.yearly.filter(y => !y.done).map(y => y.amount)), 1) + '</td><td></td><td></td><td class="r">' + gbp(sum(S.yearly.map(y => yearlyMonthly(y))), 1) + '</td><td class="r">' + gbp(sum(S.yearly.map(y => +y.saved || 0)), 1) + '</td>', "yearly", "Add an upcoming cost", { sort: "yearly" });
}

/* ---- insights ---- */
function vInsights() {
  const tabs = [["forecast", "Forecast"], ["networth", "Net worth"], ["statements", "Statements"]];
  const t = tabs.some(x => x[0] === ui.sub) ? ui.sub : "forecast";
  let h = '<div class="stack"><div class="section-head"><h1>Insights</h1></div><div class="tabs">' + tabs.map(x => '<a class="tab' + (t === x[0] ? " on" : "") + '" href="#insights/' + x[0] + '">' + x[1] + '</a>').join("") + '</div>';
  return h + ({ forecast: iForecast, networth: iNetWorth, statements: iStatements })[t]() + '</div>';
}
/* Pick which x labels to show so none of them touch. w = chart width in the same units as x(). */
function pickLabels(labels, x, fontPx, gap) {
  const wOf = t => String(t).length * fontPx * .56, n = labels.length, out = [];
  const box = i => { const w = wOf(labels[i]), cx = x(i); return i === 0 && n > 1 ? [cx, cx + w] : i === n - 1 ? [cx - w, cx] : [cx - w / 2, cx + w / 2]; };
  const fits = i => { const b = box(i); return out.every(j => { const c = box(j); return b[1] + gap <= c[0] || c[1] + gap <= b[0]; }); };
  out.push(n - 1); if (n > 1 && fits(0)) out.push(0);
  const target = Math.min(6, n), step = Math.max(1, Math.round((n - 1) / (target - 1 || 1)));
  for (let i = step; i < n - 1; i += step) if (fits(i)) out.push(i);
  return out.sort((a, b) => a - b);
}
let CHART_ID = 0;
function lineChart(series, labels, opts) {
  opts = opts || {};
  const W = 640, H = 270, R = 18, T = 16, B = 38, FS = 14;
  const axisTxt = v => Math.abs(v) >= 1000 ? (v < 0 ? "minus " : "") + "£" + (Math.abs(v) / 1000) + "k" : gbp(v);
  const all = series.flatMap(s => s.points).filter(v => v != null);
  if (!all.length) return '<div class="empty">Not enough data yet.</div>';
  let max = Math.max(...all, 0), min = Math.min(...all, 0);
  if (max === min) max = min + 1;
  const step = Math.pow(10, Math.floor(Math.log10((max - min) / 4 || 1))), nice = [1, 2, 2.5, 5, 10].map(m => m * step).find(s => (max - min) / s <= 5) || step * 10;
  max = Math.ceil(max / nice) * nice; min = Math.floor(min / nice) * nice;
  let longest = 0; for (let v = min; v <= max + 1e-9; v += nice) longest = Math.max(longest, axisTxt(v).length);
  const L = Math.max(52, Math.round(longest * FS * .58 + 18));
  const n = labels.length, x = i => L + (W - L - R) * (n > 1 ? i / (n - 1) : 0), y = v => T + (H - T - B) * (1 - (v - min) / (max - min));
  const cid = "lc" + (++CHART_ID);
  let g = "";
  for (let v = min; v <= max + 1e-9; v += nice) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="var(--line)" stroke-width="1"' + (Math.abs(v) > 1e-9 ? ' stroke-dasharray="2 5"' : "") + '/><text x="' + (L - 10) + '" y="' + (y(v) + 4.5).toFixed(1) + '" text-anchor="end" font-size="' + FS + '" fill="var(--muted)">' + axisTxt(v) + '</text>';
  pickLabels(labels, x, FS, 14).forEach(i => { g += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="' + (i === n - 1 && n > 1 ? "end" : i === 0 ? "start" : "middle") + '" font-size="' + FS + '" fill="var(--muted)">' + esc(labels[i]) + '</text>'; });
  let defs = "";
  const lines = series.map((s, si) => {
    const P = s.points.map((v, i) => v == null ? null : [x(i), y(v)]).filter(Boolean);
    if (!P.length) return "";
    const d = smoothPath(P), last = s.points.length - 1, base = y(Math.max(min, 0));
    let out = "";
    if (!s.dash && P.length > 1) {
      defs += '<linearGradient id="' + cid + "g" + si + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + s.color + ';stop-opacity:.22"/><stop offset="1" style="stop-color:' + s.color + ';stop-opacity:0"/></linearGradient>';
      out += '<path class="area" d="' + d + ' L' + P[P.length - 1][0].toFixed(1) + ' ' + base.toFixed(1) + ' L' + P[0][0].toFixed(1) + ' ' + base.toFixed(1) + 'Z" fill="url(#' + cid + "g" + si + ')"/>';
    }
    out += '<path class="ln" pathLength="1" d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.6" stroke-linecap="round"' + (s.dash ? ' stroke-dasharray="4 7" opacity=".65"' : "") + '/>';
    if (!s.dash && s.points[last] != null) out += '<circle class="pt" cx="' + x(last).toFixed(1) + '" cy="' + y(s.points[last]).toFixed(1) + '" r="5" fill="' + s.color + '" stroke="var(--card)" stroke-width="2.5"/>';
    return out;
  }).join("");
  return '<div class="legend">' + series.filter(s => !s.hideLegend).map(s => '<span><i style="background:' + s.color + (s.dash ? ';opacity:.6' : '') + '"></i>' + esc(s.name) + '</span>').join("") + '</div><div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || "Chart") + '"><defs>' + defs + '</defs>' + g + lines + '</svg></div>';
}
/* Six months of spending as one flowing line. */
function flowSpark(months, vals) {
  const W = 320, H = 130, T = 18, B = 26, Lp = 12, Rp = 12, mx = Math.max(1, ...vals);
  const x = i => Lp + (W - Lp - Rp) * i / (vals.length - 1), y = v => T + (H - T - B) * (1 - v / mx);
  const P = vals.map((v, i) => [x(i), y(v)]), d = smoothPath(P), cid = "fs" + (++CHART_ID), last = P[P.length - 1];
  return '<svg class="flowspark" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Spending over six months"><defs><linearGradient id="' + cid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>'
    + '<path class="area" d="' + d + ' L' + last[0].toFixed(1) + ' ' + (H - B) + ' L' + P[0][0].toFixed(1) + ' ' + (H - B) + 'Z" fill="url(#' + cid + ')"/>'
    + '<path class="ln" pathLength="1" d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>'
    + P.slice(0, -1).map((p, i) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.6" fill="var(--accent)" opacity=".5"><title>' + esc(ymLabel(months[i])) + ': ' + gbp(vals[i]) + '</title></circle>').join("")
    + '<circle class="pulse" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="9" fill="var(--accent)" opacity=".18"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4.5" fill="var(--accent)" stroke="var(--card)" stroke-width="2"/>'
    + months.map((m, i) => '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? "start" : i === months.length - 1 ? "end" : "middle") + '" font-size="11" fill="var(--muted)"' + (i === months.length - 1 ? ' font-weight="700"' : "") + '>' + esc(ymLabel(m, true).split(" ")[0]) + '</text>').join("") + '</svg>';
}
function forecastDebt(extraMap, months) { const arr = Array(months + 1).fill(0); S.debts.forEach(d => { const p = debtPlan(d, extraMap ? extraMap[d.id] || 0 : 0); arr[0] += +d.balance || 0; for (let i = 1; i <= months; i++) arr[i] += p.path.length ? (i <= p.path.length ? p.path[i - 1] : 0) : (+d.balance || 0); }); return arr.map(r2); }
function forecastPots(moMap, months) { const arr = Array(months + 1).fill(0); S.pots.forEach(p => { let c = +p.current || 0; arr[0] += c; const mo = moMap && moMap[p.id] != null ? moMap[p.id] : +p.monthly || 0; for (let i = 1; i <= months; i++) { const add = +p.goal > 0 ? Math.min(mo, Math.max(0, p.goal - c)) : mo; c += add; arr[i] += c; } }); return arr.map(r2); }
function iForecast() {
  const fx = ui.fx, months = 24, labels = Array.from({ length: months + 1 }, (_, i) => i === 0 ? "Now" : ymLabel(addM(thisYM(), i - 1), true));
  const debtSeries = m => forecastDebt(m, months), potSeries = m => forecastPots(m, months);
  const _unusedD = extraMap => { const arr = Array(months + 1).fill(0); S.debts.forEach(d => { const p = debtPlan(d, extraMap ? extraMap[d.id] || 0 : 0); arr[0] += +d.balance || 0; for (let i = 1; i <= months; i++) arr[i] += p.path.length ? (i <= p.path.length ? p.path[i - 1] : 0) : (+d.balance || 0); }); return arr.map(r2); };
  const _unusedP = moMap => { const arr = Array(months + 1).fill(0); S.pots.forEach(p => { let c = +p.current || 0; arr[0] += c; const mo = moMap && moMap[p.id] != null ? moMap[p.id] : +p.monthly || 0; for (let i = 1; i <= months; i++) { const add = +p.goal > 0 ? Math.min(mo, Math.max(0, p.goal - c)) : mo; c += add; arr[i] += c; } }); return arr.map(r2); };
  const base = columns(), now = columns(fx);
  const spareBase = base.m.left + base.s.left, spareNow = now.m.left + now.s.left;
  const changed = Object.keys(fx.debt).some(k => fx.debt[k]) || Object.keys(fx.pot).some(k => { const p = S.pots.find(x => x.id === k); return p && +p.monthly !== fx.pot[k]; });
  let h = '<section class="card"><div class="row between wrap"><div><h2>Next two years</h2><p class="sub">Drag the sliders below to try changes. Nothing is saved until you press Save to plan.</p></div>'
    + (changed ? '<div class="row"><button class="btn small" data-act="fxreset">Reset</button><button class="btn small primary" data-act="fxapply">Save to plan</button></div>' : "") + '</div>'
    + lineChart([
      { name: "Debt left" + (changed ? " (with changes)" : ""), color: "var(--bad)", points: debtSeries(fx.debt) },
      { name: "Saved in pots" + (changed ? " (with changes)" : ""), color: "var(--good)", points: potSeries(fx.pot) }
    ].concat(changed ? [{ name: "Before changes", color: "var(--muted)", dash: true, points: debtSeries(null) }, { name: "", hideLegend: true, color: "var(--muted)", dash: true, points: potSeries(null) }] : []), labels, { label: "Debt and savings over the next two years" })
    + '<div class="row between wrap"><span class="sub">Left over each month for both of you</span><b class="num" style="color:' + (spareNow < 0 ? "var(--bad)" : "inherit") + '">' + (spareNow < 0 ? "Short by " : "") + gbp(spareNow) + (changed ? ' <span class="note">(was ' + gbp(spareBase) + ')</span>' : "") + '</b></div></section>';
  const ds = S.debts.filter(debtActive).sort((a, b) => (+b.apr || 0) - (+a.apr || 0));
  if (ds.length) h += '<section class="card" data-keep><h3>Overpay a debt</h3>' + ds.map(d => {
    const ex = fx.debt[d.id] || 0, b = debtInfo(d, 0), n = debtInfo(d, ex), saved = b.plan.interest != null && n.plan.interest != null ? b.plan.interest - n.plan.interest : null;
    return '<div class="slider"><div class="row between"><b>' + emo(d) + esc(d.name) + '</b><span class="num">+' + gbp(ex) + ' a month</span></div><input type="range" min="0" max="500" step="10" value="' + ex + '" data-fx="debt" data-id="' + esc(d.id) + '" aria-label="Extra monthly payment for ' + esc(d.name) + '">'
      + '<div class="res"><span>Finished: <b>' + (n.finishISO ? dateLabel(n.finishISO) : esc(n.plan.reason || "")) + '</b>' + (ex && b.finishISO && n.finishISO && b.finishYM !== n.finishYM ? ' <span class="note">(was ' + dateLabel(b.finishISO) + ')</span>' : "") + '</span>' + (ex && saved > 0 ? '<span class="pill good">Saves ' + gbp(saved) + ' interest</span>' : "") + '</div></div>';
  }).join("") + '</section>';
  const ps = S.pots.filter(p => +p.goal > 0 && potActive(p));
  if (ps.length) h += '<section class="card" data-keep><h3>Change what goes into each pot</h3>' + ps.map(p => {
    const mo = fx.pot[p.id] != null ? fx.pot[p.id] : (+p.monthly || 0), inf = potInfo(p, mo), b = potInfo(p);
    const maxv = Math.max(1000, Math.ceil((+p.monthly || 0) * 2 / 50) * 50);
    return '<div class="slider"><div class="row between"><b>' + emo(p) + esc(p.name) + '</b><span class="num">' + gbp(mo) + ' a month</span></div><input type="range" min="0" max="' + maxv + '" step="10" value="' + mo + '" data-fx="pot" data-id="' + esc(p.id) + '" aria-label="Monthly amount for ' + esc(p.name) + '">'
      + '<div class="res"><span>Reached: <b>' + (inf.iso ? ymLabel(inf.ym) : "never at " + gbp(0)) + '</b>' + (b.iso && inf.ym !== b.ym ? ' <span class="note">(was ' + ymLabel(b.ym) + ')</span>' : "") + '</span><span class="note">' + gbp(inf.remaining) + ' to go</span></div></div>';
  }).join("") + '</section>';
  if (!ds.length && !ps.length) h += '<div class="empty">Add debts or savings pots with a goal in Plan to try changes here.</div>';
  return h;
}
function iNetWorth() {
  const nw = netWorthNow();
  const hist = S.statements.filter(x => x.netWorth != null).slice().reverse();
  const pts = hist.map(x => x.netWorth).concat([nw.net]), labels = hist.map(x => ymLabel(x.id, true)).concat(["Now"]);
  let h = '<section class="card"><span class="sub">Net worth today</span><span class="bigstat num" style="color:' + (nw.net < 0 ? "var(--bad)" : "inherit") + '">' + (nw.net < 0 ? "minus " : "") + gbp(nw.net) + '</span>'
    + '<div class="kv num"><span class="sub">Savings pots</span><span>' + gbp(nw.pots, 1) + '</span><span class="sub">Yearly costs set aside</span><span>' + gbp(nw.yearly, 1) + '</span><span class="sub">Pensions, investments and other things you own</span><span>' + gbp(nw.assets, 1) + '</span><span class="sub">Debts</span><span>minus ' + gbp(nw.debts, 1) + '</span></div>'
    + (pts.length >= 2 ? lineChart([{ name: "Net worth", color: "var(--brand)", points: pts }], labels, { label: "Net worth by month" }) : '<p class="note">The timeline fills in as each month closes.</p>') + '</section>';
  h += '<section class="card"><div><h2>Pensions, investments and other things you own</h2><p class="sub">Your pots already count, so add accounts that aren’t pots: pensions, ISAs, shares, current accounts.</p></div>';
  if (S.assets.length) {
    h += '<div class="tablewrap"><table><thead><tr><th>Name</th><th>Whose</th><th>Type</th><th class="r">Value</th><th class="r">Added monthly</th><th class="r">Growth a year</th><th class="r">In 5 years</th><th class="r">In 10 years</th><th class="r">In 20 years</th></tr></thead><tbody>'
      + S.assets.map(a => { const f = yrs => project(+a.value || 0, +a.monthly || 0, +a.growth || 0, yrs); return '<tr class="click" data-act="edit" data-c="assets" data-id="' + esc(a.id) + '"><td class="name">' + emo(a) + esc(a.name) + '</td><td>' + whoTag(a.who) + '</td><td>' + esc(ASSET_KINDS[a.kind] || "Other") + '</td><td class="r"><b>' + gbp(a.value, 1) + '</b></td><td class="r">' + gbp(a.monthly) + '</td><td class="r">' + (+a.growth || 0) + '%</td><td class="r">' + gbp(f(5)) + '</td><td class="r">' + gbp(f(10)) + '</td><td class="r">' + gbp(f(20)) + '</td></tr>'; }).join("")
      + '</tbody></table></div><p class="note">Forecasts assume steady growth and contributions, so treat them as a rough guide rather than a promise.</p>';
  }
  return h + '<button class="addrow" data-act="new" data-c="assets">+ Add a pension, investment or account</button></section>';
}
function project(v, mo, g, yrs) { const r = g / 1200; for (let i = 0; i < yrs * 12; i++) v = v * (1 + r) + mo; return v; }
function iStatements() {
  const ym = thisYM();
  let h = '<a class="card" href="#statement/live" style="text-decoration:none"><div class="row between"><div><h3>' + esc(ymLabel(ym)) + ' so far</h3><p class="sub">Live, until the month closes on the 1st</p></div><span class="pill plain">Open</span></div></a>';
  if (!S.statements.length) return h + '<div class="empty">Your first statement and recap appear on 1 ' + esc(ymLabel(addM(ym, 1))) + '.</div>';
  h += '<section class="card"><div class="tablewrap"><table><thead><tr><th>Month</th><th class="r">Spent</th><th class="r">Into pots</th><th class="r">Debt repaid</th><th class="r">Debt left</th><th class="r">Net worth</th><th></th></tr></thead><tbody>'
    + S.statements.map(x => '<tr class="click" data-act="go" data-v="statement/' + esc(x.id) + '"><td class="name">' + esc(ymLabel(x.id)) + '</td><td class="r">' + gbp(x.spentTotal, 1) + '</td><td class="r">' + gbp(sum((x.pots || []).map(p => p.paid)), 1) + '</td><td class="r">' + gbp(sum((x.debts || []).map(d => d.paid)), 1) + '</td><td class="r">' + gbp(x.debtLeft, 1) + '</td><td class="r">' + (x.netWorth != null ? (x.netWorth < 0 ? "minus " : "") + gbp(x.netWorth, 1) : "") + '</td><td><button class="btn small" data-act="recap" data-v="' + esc(x.id) + '">▶ Recap</button></td></tr>').join("")
    + '</tbody></table></div></section>';
  return h;
}
function liveStatement() {
  const ym = thisYM(), ex = expensesOf(ym), cols = columns();
  const spentBy = {}; WHO.forEach(k => { spentBy[k] = sum(ex.filter(e => e.who === k).map(e => e.amount)); });
  return {
    ym, live: true, names: st().names, cols, spentBy, spentTotal: sum(ex.map(e => e.amount)), entries: ex.length,
    budgets: S.budgets.map(b => ({ name: b.name, who: b.who, amount: +b.amount || 0, spent: budgetSpent(b, ym) })),
    debts: S.debts.map(d => { const i = r2((+d.balance || 0) * (+d.apr || 0) / 1200); return { name: d.name, who: d.who, paid: debtMonthly(d), interest: i, balance: r2((+d.balance || 0) + i - debtMonthly(d)), apr: +d.apr || 0 }; }),
    pots: S.pots.map(p => ({ name: p.name, who: p.who, paid: potMonthly(p), total: r2((+p.current || 0) + potMonthly(p)), goal: +p.goal || 0 }))
  };
}
function vStatement(id) {
  const x = id === "live" ? liveStatement() : S.statements.find(s => s.id === id);
  if (!x) return '<div class="empty">That statement doesn’t exist. <a href="#insights/statements">Back to statements</a></div>';
  const N = k => k === "j" ? "Joint" : ((x.names || {})[k] || nm(k));
  const c = x.cols || {};
  const rowsCols = [["Income", "income"], ["To the joint account", "joint"], ["Bills", "bills"], ["Subscriptions", "subs"], ["Debt payments", "debts"], ["Savings pots", "pots"], ["Yearly costs set aside", "yearly"], ["Budgets", "budgets"], ["Left over", "left"]];
  const tbl = (head, rows, foot) => '<div class="tablewrap"><table><thead><tr>' + head.map(hh => '<th' + (hh[1] ? ' class="r"' : "") + '>' + hh[0] + '</th>').join("") + '</tr></thead><tbody>' + rows + '</tbody>' + (foot ? '<tfoot><tr>' + foot + '</tr></tfoot>' : "") + '</table></div>';
  let h = '<div class="stack"><div class="row noprint wrap"><a class="btn small" href="#insights/statements">‹ Statements</a><span class="grow"></span>' + (x.live ? "" : '<button class="btn small" data-act="recap" data-v="' + esc(x.ym) + '">▶ Recap</button>') + '<button class="btn small" data-act="print">Print or save as PDF</button></div><article class="stmt">';
  h += '<header><div><h1>' + esc(N("m")) + ' &amp; ' + esc(N("s")) + '</h1><p class="sub">Household statement</p></div><div style="text-align:right"><h2>' + esc(ymLabel(x.ym)) + '</h2><p class="note">' + (x.live ? "Live, not closed yet" : "Closed " + esc(dateLabel(String(x.closedAt).slice(0, 10)))) + '</p></div></header>';
  h += '<section><h3>Summary</h3>' + tbl([["", 0], [esc(N("s")), 1], [esc(N("m")), 1], ["Joint", 1]], rowsCols.map(r => '<tr><td' + (r[1] === "left" ? ' style="font-weight:700"' : "") + '>' + r[0] + '</td>' + ["s", "m", "j"].map(k => { const v = (c[k] || {})[r[1]]; return '<td class="r"' + (r[1] === "left" ? ' style="font-weight:700"' : "") + '>' + (r[1] === "joint" && k === "j" ? "" : (v < 0 ? "short " : "") + gbp(v || 0, 1)) + '</td>'; }).join("") + '</tr>').join("")) + '</section>';
  h += '<section><h3>Spending against budgets</h3>' + tbl([["Budget"], ["Whose"], ["Budget", 1], ["Spent", 1], ["Difference", 1]], (x.budgets || []).map(b => '<tr><td>' + esc((b.emoji ? b.emoji + " " : "") + b.name) + '</td><td>' + esc(N(b.who)) + '</td><td class="r">' + gbp(b.amount, 1) + '</td><td class="r">' + gbp(b.spent, 1) + '</td><td class="r">' + (b.spent > b.amount ? gbp(b.spent - b.amount, 1) + " over" : gbp(b.amount - b.spent, 1) + " under") + '</td></tr>').join(""), '<td>Total (' + plural(x.entries || 0, "purchase") + ' logged)</td><td></td><td class="r">' + gbp(sum((x.budgets || []).map(b => b.amount)), 1) + '</td><td class="r">' + gbp(x.spentTotal, 1) + '</td><td></td>') + '</section>';
  h += '<section><h3>Debt</h3>' + tbl([["Debt"], ["Whose"], ["Rate", 1], ["Repaid", 1], ["Interest", 1], ["Left", 1]], (x.debts || []).map(d => '<tr><td>' + esc(d.name) + '</td><td>' + esc(N(d.who)) + '</td><td class="r">' + d.apr + '%</td><td class="r">' + gbp(d.paid, 1) + '</td><td class="r">' + gbp(d.interest, 1) + '</td><td class="r">' + gbp(d.balance, 1) + '</td></tr>').join(""), '<td>Total</td><td></td><td></td><td class="r">' + gbp(sum((x.debts || []).map(d => d.paid)), 1) + '</td><td class="r">' + gbp(sum((x.debts || []).map(d => d.interest)), 1) + '</td><td class="r">' + gbp(sum((x.debts || []).map(d => d.balance)), 1) + '</td>') + '</section>';
  h += '<section><h3>Savings pots</h3>' + tbl([["Pot"], ["Whose"], ["Paid in", 1], ["Total", 1], ["Goal", 1]], (x.pots || []).map(p => '<tr><td>' + esc(p.name) + '</td><td>' + esc(N(p.who)) + '</td><td class="r">' + gbp(p.paid, 1) + '</td><td class="r">' + gbp(p.total, 1) + '</td><td class="r">' + (p.goal ? gbp(p.goal, 1) : "") + '</td></tr>').join(""), '<td>Total</td><td></td><td class="r">' + gbp(sum((x.pots || []).map(p => p.paid)), 1) + '</td><td class="r">' + gbp(sum((x.pots || []).map(p => p.total)), 1) + '</td><td></td>') + '</section>';
  if (x.netWorth != null) h += '<section><h3>Net worth at month end</h3><p class="bigstat num">' + (x.netWorth < 0 ? "minus " : "") + gbp(x.netWorth, 1) + '</p></section>';
  if (x.live) h += '<p class="note">Debt and pot figures show where they’ll be once this month’s payments go out.</p>';
  return h + '</article></div>';
}

/* ---- CSV import ---- */
function vImport() {
  const c = ui.csv;
  let h = '<div class="stack">' + (worldOn() ? "" : '<div class="row noprint"><a class="btn small" href="#spend">‹ Spending</a></div>') + '<section class="card"><div><h1>Import a bank statement</h1><p class="sub">In your banking app or website, download your transactions as a CSV file, then choose it here. Bank of Scotland lets you do this under Statements, Export. Purchases you’ve already logged are skipped, and it remembers which budget each shop belongs to.</p></div>'
    + '<div class="fgrid"><div class="field">Whose account is this<div class="chips">' + WHO.map(k => '<button class="chip' + ((c ? c.who : (me() || "m")) === k ? " on" : "") + '" data-act="csvwho" data-v="' + k + '"><span class="dot ' + k + '"></span>' + esc(nm(k)) + '</button>').join("") + '</div></div>'
    + '<label class="field">CSV file<input type="file" id="csvFile" accept=".csv,text/csv"></label></div></section>';
  if (!c || !c.rows) return h + '</div>';
  if (!c.rows.length) return h + '<div class="empty">No spending found in that file. Check it’s the CSV download, not a PDF.</div></div>';
  const on = c.rows.filter(r => r.on).length, tot = sum(c.rows.filter(r => r.on).map(r => r.amount));
  h += '<section class="card"><div class="row between wrap"><div><h3>' + plural(c.rows.length, "purchase") + ' found</h3><p class="note">' + c.skipped + ' skipped: already logged, money coming in, or transfers. Untick anything that’s a bill or a move between accounts.</p></div><button class="btn primary" data-act="csvgo"' + (on ? "" : " disabled") + '>Import ' + on + ' for ' + gbp(tot, 1) + '</button></div>'
    + '<div class="tablewrap"><table><thead><tr><th></th><th>Date</th><th>Description</th><th class="r">Amount</th><th>Budget</th></tr></thead><tbody>'
    + c.rows.map((r, i) => '<tr class="improw' + (r.on ? "" : " off") + '"><td><input type="checkbox" data-csvon="' + i + '"' + (r.on ? " checked" : "") + ' aria-label="Import this"></td><td>' + esc(dateLabel(r.date)) + '</td><td class="name">' + esc(r.desc) + (r.guess ? '<span class="sm">' + esc(r.guess) + '</span>' : "") + '</td><td class="r">' + gbp(r.amount, 1) + '</td><td><select data-csvbud="' + i + '"><option value="">No budget</option>' + S.budgets.map(b => '<option value="' + esc(b.id) + '"' + (r.budgetId === b.id ? " selected" : "") + '>' + esc((b.emoji ? b.emoji + " " : "") + b.name + " (" + nm(b.who) + ")") + '</option>').join("") + '</select></td></tr>').join("")
    + '</tbody></table></div></section>';
  return h + '</div>';
}
function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { row.push(f); f = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; } else f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
const merchantKey = s => String(s || "").toUpperCase().replace(/[\*#].*$/, "").replace(/[^A-Z& ]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 2).join(" ");
const KEYWORDS = [
  [/groc|food|shop(ping)? ?(food)?|household/i, /TESCO|ASDA|ALDI|LIDL|SAINSBURY|MORRISONS|CO-OP|COOP|ICELAND|M&S|MARKS|CALDER|WAITROSE|FARMFOODS|SPAR/],
  [/eat|takeaway|dining|restaurant|lunch/i, /JUST EAT|UBER \*EATS|UBER EATS|DELIVEROO|GREGGS|STARBUCKS|COSTA|MCDONALD|KFC|NANDO|DOMINO|PIZZA|BURGER|SUBWAY|PRET/],
  [/transport|fuel|travel|car|taxi/i, /UBER|TRAINLINE|SCOTRAIL|FIRST GLASGOW|SHELL|BP |ESSO|TEXACO|CAB|TAXI|PENNY CARS|LNER|STAGECOACH|PARKING/],
  [/shop|cloth|stuff/i, /AMAZON|AMZN|NEXT|PRIMARK|ASOS|SHEIN|ZARA|H&M|SPORTSDIRECT|ARGOS|CURRYS|EBAY/],
  [/fun|game|enjoy|leisure/i, /STEAM|CINEWORLD|ODEON|PLAYSTATION|XBOX|NINTENDO|TICKETMASTER/],
  [/pet|misty|cat|vet/i, /PETS AT HOME|VET|BELLA|ZOOPLUS/],
  [/beauty|well|health|hair/i, /BOOTS|SUPERDRUG|SALON|BARBER/]
];
function guessBudget(desc) {
  const key = merchantKey(desc);
  const rule = S.rules.find(r => r.key === key && S.budgets.some(b => b.id === r.budgetId));
  if (rule) return { id: rule.budgetId, why: "Remembered" };
  const past = S.expenses.slice().reverse().find(e => e.budgetId && merchantKey(e.note) === key);
  if (past) return { id: past.budgetId, why: "Same as before" };
  const up = String(desc).toUpperCase();
  for (const [bud, shop] of KEYWORDS) { if (shop.test(up)) { const b = S.budgets.find(x => bud.test(x.name)); if (b) return { id: b.id, why: "Guessed" }; } }
  return { id: "", why: "" };
}
function readCSV(file) {
  const fr = new FileReader();
  fr.onload = () => {
    const rows = parseCSV(String(fr.result || ""));
    if (rows.length < 2) { ui.csv = Object.assign(ui.csv || {}, { rows: [], skipped: 0 }); render(); return; }
    const head = rows[0].map(x => x.trim().toLowerCase());
    const col = re => head.findIndex(x => re.test(x));
    const iDate = col(/date/), iDesc = col(/desc|narrative|details|merchant|payee|reference/), iDebit = col(/debit|paid out|money out|withdrawal/), iCredit = col(/credit|paid in|money in/), iAmt = col(/^amount|value/), iType = col(/type/);
    const who = (ui.csv && ui.csv.who) || me() || "m";
    const out = []; let skipped = 0;
    rows.slice(1).forEach(r => {
      const ds = (r[iDate] || "").trim(); const m = ds.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/) || ds.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) { skipped++; return; }
      const date = m[1].length === 4 ? m[1] + "-" + m[2] + "-" + m[3] : (m[3].length === 2 ? "20" + m[3] : m[3]) + "-" + pad(m[2]) + "-" + pad(m[1]);
      let amount = 0;
      if (iDebit >= 0) amount = num(r[iDebit]); else if (iAmt >= 0) { const v = num(r[iAmt]); amount = v < 0 ? -v : 0; }
      const type = iType >= 0 ? (r[iType] || "").trim().toUpperCase() : "";
      const desc = (r[iDesc] || "").trim();
      if (!(amount > 0)) { skipped++; return; }
      if (["TFR", "FPO", "SO", "DD", "BGC", "FPI"].includes(type) && !/AMAZON|PAYPAL/.test(desc.toUpperCase())) { skipped++; return; }
      if (S.expenses.some(e => e.date === date && Math.abs(e.amount - amount) < 0.005 && e.who === who)) { skipped++; return; }
      const g = guessBudget(desc);
      const pretty = desc.replace(/\s+/g, " ").replace(/[\*#].*$/, "").replace(/\s\d{3,}.*$/, "").trim();
      out.push({ date, desc: pretty.toUpperCase() === pretty ? pretty.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : pretty, raw: desc, amount, budgetId: g.id, guess: g.why, on: true });
    });
    out.sort((a, b) => a.date < b.date ? 1 : -1);
    ui.csv = { who, rows: out, skipped };
    render();
  };
  fr.readAsText(file);
}

/* ---- settings ---- */
function vSettings() {
  const s = st(), sh = jointShares(), need = jointNeed();
  let h = '<div class="stack"><div class="section-head"><h1>Settings</h1></div>';
  const th = (LS.get("ms-theme") || "chrome").replace("night", "chrome");
  const wo = LS.get("ms-world") !== "off", as = LS.get("ms-ascii") === "on";
  h += '<section class="card"><h2>Look</h2><p class="sub">Just for this phone or computer. The other person keeps their own choice.</p><div class="chips">' + [["chrome", "Liquid chrome, dark"], ["paper", "Paper, light and calm"], ["auto", "Match my phone"]].map(o => '<button class="chip' + (th === o[0] ? " on" : "") + '" data-act="theme" data-v="' + o[0] + '">' + o[1] + '</button>').join("") + '</div>'
    + '<div class="field">3D world<div class="chips"><button class="chip' + (wo ? " on" : "") + '" data-act="worldset" data-v="on">On</button><button class="chip' + (!wo ? " on" : "") + '" data-act="worldset" data-v="off">Off, simpler and lighter</button></div></div>'
    + (wo ? '<div class="field">Picture style<div class="chips"><button class="chip' + (!as ? " on" : "") + '" data-act="asciiset" data-v="off">Smooth 3D</button><button class="chip' + (as ? " on" : "") + '" data-act="asciiset" data-v="on">Drawn in text characters</button></div></div>' : "") + '</section>';
  h += '<section class="card" data-keep><h2>The two of you</h2><div class="fgrid">'
    + PEOPLE.map(p => '<label class="field">Name<input id="nm-' + p + '" value="' + esc(s.names[p]) + '"></label><label class="field">Pay day<input id="pd-' + p + '" inputmode="numeric" value="' + s.payday[p] + '"></label><label class="field full">' + esc(nm(p)) + '’s sign in email<input id="em-' + p + '" type="email" value="' + esc(s.emails[p] || "") + '" placeholder="Used to greet you and show who added what"></label>').join("")
    + '</div><button class="btn primary" data-act="savepeople" style="align-self:flex-start">Save</button></section>';
  h += '<section class="card" data-keep><h2>Joint account</h2><p class="sub">The joint account needs <b>' + gbp(need, 1) + '</b> a month for its bills, subscriptions, debts, pots, yearly costs and budgets.</p>'
    + '<div class="chips">' + [["income", "Split by take home pay"], ["equal", "Split 50/50"], ["custom", "Fixed amounts"]].map(o => '<button class="chip' + (s.split === o[0] ? " on" : "") + '" data-act="split" data-v="' + o[0] + '">' + o[1] + '</button>').join("") + '</div>'
    + '<div class="fgrid">' + PEOPLE.map(p => '<label class="field">' + esc(nm(p)) + ' pays in' + (s.split === "custom" ? '<input id="cu-' + p + '" inputmode="decimal" value="' + (s.custom[p] || "") + '">' : '<input value="' + gbp(sh[p], 1) + '" disabled>') + '</label><label class="field">On the<input id="jd-' + p + '" inputmode="numeric" value="' + s.jointDay[p] + '"></label>').join("")
    + '<label class="field full">Day the joint account pays into joint pots<input id="jpd" inputmode="numeric" value="' + s.jointPayDay + '"></label></div>'
    + '<button class="btn primary" data-act="savejoint" style="align-self:flex-start">Save joint account</button></section>';
  h += '<section class="card" data-keep><h2>Rupees</h2><p class="sub">Tick “Show in rupees too” on any bill, debt, pot or yearly cost to see its amount in ₹. The rate updates itself twice a day, or you can type your own.</p>'
    + '<div class="fgrid"><label class="field">₹ for every £1<input id="fx-inr" inputmode="decimal" value="' + (s.fx.inr ? (+s.fx.inr).toFixed(2) : "") + '" placeholder="Not loaded yet"></label><div class="field">Updated<span class="sub" style="padding-top:10px">' + (s.fx.at ? esc(dayLabel(String(s.fx.at).slice(0, 10))) + (s.fx.manual ? ", typed in" : ", automatic") : "Not yet") + '</span></div></div>'
    + '<div class="row wrap"><button class="btn" data-act="savefx">Use my rate</button><button class="btn ghost" data-act="autofx">Update automatically</button></div></section>';
  h += '<section class="card"><h2>Your data</h2><p class="sub">Download a backup file of everything. A copy of your plan is also saved automatically each time a month closes.</p><div class="row wrap"><button class="btn" data-act="export">Download a backup</button><button class="btn ghost" data-act="listbackups">See monthly backups</button></div>'
    + (ui.backups ? (ui.backups.length ? '<div class="list">' + ui.backups.map(b => '<div class="item"><div class="grow"><div class="t">' + esc(ymLabel(b.id)) + '</div><div class="m">Saved ' + esc(dateLabel(String(b.at).slice(0, 10))) + '</div></div><button class="btn small" data-act="dlbackup" data-id="' + esc(b.id) + '">Download</button></div>').join("") + '</div>' : '<p class="note">No monthly backups yet. The first one is saved when this month closes.</p>') : "")
    + '<label class="btn" style="cursor:pointer;align-self:flex-start">Load a starting file<input type="file" id="importFile2" accept=".json,application/json" hidden></label>'
    + (ui.importData ? '<div class="banner">Loading this file replaces your plan and spending with what’s in it. <div class="row" style="margin-top:8px"><button class="btn small danger" data-act="doimport">Replace my data</button><button class="btn small" data-act="cancelimport">Cancel</button></div></div>' : "")
    + (S.mode === "demo" ? '<button class="btn ghost small" data-act="resetdemo" style="align-self:flex-start">Reset the sample numbers</button>' : "")
    + '<p class="note">Months closed up to: ' + esc(S.meta && S.meta.lastClosed ? ymLabel(S.meta.lastClosed) : "none") + '</p></section>';
  h += '<section class="card"><h2>Start again from blank</h2><p class="sub">Deletes every bill, subscription, debt, budget, pot, purchase and statement for both of you. Download a backup first if you might want any of it back.</p>'
    + (ui.confirm === "wipe" ? '<div class="banner">This can’t be undone and clears it on both your phones. <div class="row wrap" style="margin-top:8px"><button class="btn small danger" data-act="wipeall">Yes, clear everything</button><button class="btn small" data-act="cancelwipe">Keep my data</button></div></div>' : '<button class="btn danger" data-act="askwipe" style="align-self:flex-start">Clear everything</button>') + '</section>';
  if (S.mode === "live") h += '<section class="card"><h2>Account</h2><p class="sub">Signed in as ' + esc(S.user && S.user.email) + '</p><button class="btn" data-act="signout" style="align-self:flex-start">Sign out</button></section>';
  return h + '</div>';
}

/* ================= sheets ================= */
const FORMS = {
  bills: { title: "bill", fields: [["name", "Name", "text", "Council tax"], ["cost", "Cost each month (£)", "money"], ["acct", "Account going from", "who"], ["day", "Day of the month it goes out", "day"], ["emoji", "Icon", "emoji"], ["inr", "Show in rupees too", "check"], ["notes", "Notes", "notes"]] },
  subs: { title: "subscription", fields: [["name", "Name", "text", "Spotify"], ["cost", "Cost each time (£)", "money"], ["freq", "Payment type", "freq"], ["who", "Whose", "who"], ["day", "Day charged", "day"], ["month", "Month charged (yearly or quarterly)", "month"], ["emoji", "Icon", "emoji"], ["notes", "Notes", "notes"]] },
  debts: { title: "debt", fields: [["name", "Name", "text", "Barclays loan"], ["who", "Whose", "who"], ["borrowed", "Total amount borrowed (£)", "money"], ["apr", "Interest rate (APR %)", "pct"], ["balance", "Total left today (£)", "money"], ["monthly", "Monthly repayment (£)", "money"], ["day", "Day it’s paid", "day"], ["interestPaid", "Interest paid to date (£)", "money"], ["emoji", "Icon", "emoji"], ["color", "Colour", "color"], ["inr", "Show in rupees too", "check"], ["notes", "Notes", "notes"]] },
  budgets: { title: "budget", fields: [["name", "Name", "text", "Food"], ["who", "Whose", "who"], ["amount", "Budget for each month (£)", "money"], ["emoji", "Icon", "emoji"], ["color", "Colour", "color"], ["notes", "Notes", "notes"]] },
  pots: { title: "savings pot", fields: [["name", "Name", "text", "Holiday"], ["who", "Whose", "who"], ["goal", "Goal (£)", "money"], ["monthly", "Monthly commitment (£)", "money"], ["current", "Current total (£)", "money"], ["day", "Day you pay in", "day"], ["emoji", "Icon", "emoji"], ["color", "Colour", "color"], ["inr", "Show in rupees too", "check"], ["notes", "Notes", "notes"]] },
  yearly: { title: "upcoming cost", fields: [["name", "Name", "text", "MOT and service"], ["who", "Whose", "who"], ["amount", "Estimated cost (£)", "money"], ["repeat", "How often", "repeat"], ["month", "Month it’s due", "month"], ["year", "Year", "year"], ["saved", "Set aside so far (£)", "money"], ["emoji", "Icon", "emoji"], ["inr", "Show in rupees too", "check"], ["notes", "Notes", "notes"]] },
  assets: { title: "pension, investment or account", fields: [["name", "Name", "text", "Workplace pension"], ["who", "Whose", "who"], ["kind", "Type", "kind"], ["value", "Value today (£)", "money"], ["monthly", "Added each month (£)", "money"], ["growth", "Expected growth a year (%)", "pct"], ["autoAdd", "Add the monthly amount automatically on the 1st", "check"], ["emoji", "Icon", "emoji"]] },
  challenges: { title: "challenge", fields: [["name", "Name", "text", "No takeaway week"], ["kind", "Type", "chalkind"], ["budgetId", "Which budget", "budget"], ["limit", "Spend no more than (£)", "money"], ["days", "How many days", "day"], ["start", "Starts", "date"], ["emoji", "Icon", "emoji"]] }
};
function openSheet(html) { const p = $("#panel"); p.innerHTML = '<div class="grab"></div>' + html; $("#sheet").hidden = false; p.scrollTop = 0; }
function closeSheet() { $("#sheet").hidden = true; ui.sheet = null; ui.confirm = ui.confirm === "wipe" ? "wipe" : null; }
function fieldHTML(f, v) {
  const [k, label, type, ph] = f, id = "f-" + k;
  if (type === "who") return '<label class="field">' + label + '<select id="' + id + '">' + WHO.map(w => '<option value="' + w + '"' + (v === w ? " selected" : "") + '>' + esc(nm(w)) + '</option>').join("") + '</select></label>';
  if (type === "freq") return '<label class="field">' + label + '<select id="' + id + '">' + Object.keys(FREQ).map(w => '<option value="' + w + '"' + ((v || "monthly") === w ? " selected" : "") + '>' + FREQ[w] + '</option>').join("") + '</select></label>';
  if (type === "kind") return '<label class="field">' + label + '<select id="' + id + '">' + Object.keys(ASSET_KINDS).map(w => '<option value="' + w + '"' + ((v || "savings") === w ? " selected" : "") + '>' + ASSET_KINDS[w] + '</option>').join("") + '</select></label>';
  if (type === "chalkind") return '<label class="field">' + label + '<select id="' + id + '"><option value="nospend"' + (v !== "under" ? " selected" : "") + '>Spend nothing</option><option value="under"' + (v === "under" ? " selected" : "") + '>Stay under an amount</option></select></label>';
  if (type === "budget") return '<label class="field">' + label + '<select id="' + id + '"><option value="">All spending</option>' + S.budgets.map(b => '<option value="' + esc(b.id) + '"' + (v === b.id ? " selected" : "") + '>' + esc((b.emoji ? b.emoji + " " : "") + b.name) + '</option>').join("") + '</select></label>';
  if (type === "month") return '<label class="field">' + label + '<select id="' + id + '">' + Array.from({ length: 12 }, (_, i) => '<option value="' + (i + 1) + '"' + (+v === i + 1 ? " selected" : "") + '>' + monthName(i + 1) + '</option>').join("") + '</select></label>';
  if (type === "notes") return '<label class="field full">' + label + '<textarea id="' + id + '" rows="3" placeholder="Anything worth remembering. Only shown here, not in the tables.">' + esc(v || "") + '</textarea></label>';
  if (type === "repeat") return '<label class="field">' + label + '<select id="' + id + '" data-act-change="syncrepeat"><option value="yearly"' + (v !== "once" ? " selected" : "") + '>Every year</option><option value="once"' + (v === "once" ? " selected" : "") + '>Just once</option></select></label>';
  if (type === "year") { const y0 = new Date().getFullYear(); return '<label class="field">' + label + '<select id="' + id + '">' + Array.from({ length: 6 }, (_, i) => y0 + i).map(y => '<option value="' + y + '"' + ((+v || y0) === y ? " selected" : "") + '>' + y + '</option>').join("") + '</select></label>'; }
  if (type === "date") return '<label class="field">' + label + '<input type="date" id="' + id + '" value="' + esc(v || todayISO()) + '"></label>';
  if (type === "check") return '<label class="checkrow full"><input type="checkbox" id="' + id + '"' + (v ? " checked" : "") + '> ' + label + '</label>';
  if (type === "emoji") return '<div class="field full">' + label + '<input type="hidden" id="' + id + '" value="' + esc(v || "") + '"><div class="emogrid" data-pick="' + id + '"><button type="button" data-act="pickemo" data-v=""' + (!v ? ' class="on"' : "") + ' aria-label="No icon">∅</button>' + EMOJIS.map(e => '<button type="button" data-act="pickemo" data-v="' + e + '"' + (v === e ? ' class="on"' : "") + '>' + e + '</button>').join("") + '</div></div>';
  if (type === "color") return '<div class="field full">' + label + '<input type="hidden" id="' + id + '" value="' + esc(v || "") + '"><div class="swatches" data-pick="' + id + '"><button type="button" class="sw' + (!v ? " on" : "") + '" data-act="pickcol" data-v="" style="background:conic-gradient(var(--m) 0 50%,var(--s) 0)" aria-label="Person colour"></button>' + COLORS.map(cn => '<button type="button" class="sw' + (v === cn ? " on" : "") + '" data-act="pickcol" data-v="' + cn + '" style="background:var(--c-' + cn + ')" aria-label="' + cn + '"></button>').join("") + '</div></div>';
  const mode = type === "text" ? "text" : type === "day" ? "numeric" : "decimal";
  return '<label class="field' + (type === "text" ? " full" : "") + '">' + label + '<input id="' + id + '" inputmode="' + mode + '" value="' + esc(v == null || (v === 0 && type !== "text") ? "" : v) + '" placeholder="' + esc(ph || (type === "day" ? "1 to 31" : "0.00")) + '"></label>';
}
function openItem(c, id, preset) {
  const F = FORMS[c], it = id ? S[c].find(x => x.id === id) : null;
  ui.sheet = { c, id };
  const defaults = Object.assign({ repeat: "yearly", year: new Date().getFullYear(), who: me() || "j", acct: "j", freq: "monthly", day: c === "challenges" ? 7 : 1, month: new Date().getMonth() + 1, kind: c === "challenges" ? "nospend" : "savings", autoAdd: true, start: todayISO() }, preset || {});
  let h = '<h2>' + (it ? "Edit " : "Add a ") + F.title + '</h2>';
  if (c === "challenges" && !it) h += '<div class="quick">' + [["🥡", "No takeaway week", "nospend", /eat|takeaway/i, 7, 0], ["🛒", "£50 food shop week", "under", /groc|food/i, 7, 50], ["🛍️", "No spend weekend", "nospend", null, 2, 0], ["☕", "No coffee out for 2 weeks", "nospend", /eat|coffee/i, 14, 0]].map((t, i) => '<button type="button" class="qbtn" data-act="chaltpl" data-v="' + i + '"><b>' + t[0] + ' ' + esc(t[1]) + '</b>' + plural(t[4], "day") + '</button>').join("") + '</div>';
  h += '<form id="itemForm" class="fgrid">' + F.fields.map(f => fieldHTML(f, it ? it[f[0]] : defaults[f[0]])).join("") + '</form>';
  if (c === "debts" && it) h += '<p class="note">Total left changes by itself on the 1st. Only change it here if the real balance is different.</p>';
  if (c === "pots" && it) h += '<p class="note">The monthly commitment is added on the 1st. Change the current total here if you paid in more or took money out.</p>';
  h += '<div class="actions">' + (it ? '<button class="btn ghost danger" data-act="del" style="margin-right:auto">Delete</button>' : "") + '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="saveitem">' + (it ? "Save changes" : "Add " + F.title) + '</button></div>';
  openSheet(h);
  if (c === "challenges") syncChalForm();
  if (c === "yearly") syncRepeat();
}
function syncRepeat() { const r = $("#f-repeat"), y = $("#f-year"); if (r && y) y.closest(".field").hidden = r.value !== "once"; }
function syncChalForm() { const k = $("#f-kind"); const l = $("#f-limit"); if (k && l) l.closest(".field").hidden = k.value !== "under"; }
async function saveItem() {
  const { c, id } = ui.sheet, F = FORMS[c], d = {};
  for (const [k, , type] of F.fields) {
    const el = $("#f-" + k); if (!el) continue;
    d[k] = type === "text" || type === "notes" ? el.value.trim() : ["who", "freq", "kind", "chalkind", "budget", "date", "emoji", "color", "repeat"].includes(type) ? el.value : type === "year" ? +el.value : type === "check" ? el.checked : type === "day" ? Math.max(1, Math.min(c === "challenges" ? 90 : 31, parseInt(el.value, 10) || 1)) : type === "month" ? +el.value : num(el.value);
  }
  if (!d.name) { toast("Give it a name"); $("#f-name").focus(); return; }
  try {
    const old = id ? S[c].find(x => x.id === id) : {};
    const body = Object.assign({}, old, d); delete body.id;
    if (id) await DB.set(c, id, body); else { body.order = Date.now(); await DB.add(c, body); }
    closeSheet(); toast(id ? "Saved" : "Added " + d.name);
    if (body.inr) refreshFx();
  } catch (e) { fail(e); }
}

/* expense sheet with number pad */
function openExpense(id, budgetId) {
  const e = id ? S.expenses.find(x => x.id === id) : null;
  const myWho = me() || "m";
  const b0 = e ? (e.budgetId || "") : budgetId != null ? budgetId : (S.budgets[0] || {}).id || "";
  const bud = S.budgets.find(b => b.id === b0);
  ui.sheet = { exp: true, id, budgetId: b0, who: e ? e.who : (bud && bud.who !== "j" ? bud.who : myWho), amt: e ? String(e.amount) : "" };
  const quick = !e ? frequentShortcuts() : [];
  let h = (quick.length ? '<div class="quick">' + quick.map((q, i) => { const b = S.budgets.find(x => x.id === q.budgetId); return '<button class="qbtn" data-act="quick" data-v="' + i + '"><b>' + (b && b.emoji ? esc(b.emoji) + " " : "") + esc(q.note) + '</b>' + gbpx(q.amount) + '</button>'; }).join("") + '</div>' : "")
    + '<div class="amtshow num" id="x-show" aria-live="polite">' + amtHTML() + '</div>'
    + '<div class="pad">' + ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(k => '<button type="button" data-act="padkey" data-v="' + k + '" aria-label="' + (k === "⌫" ? "Delete" : k) + '">' + k + '</button>').join("") + '</div>'
    + '<div class="field">Budget<div class="chips" id="x-buds">' + budChips() + '</div></div>'
    + '<div class="field">Paid from<div class="chips" id="x-who">' + whoChips() + '</div></div>'
    + '<div class="fgrid"><label class="field">Date<input type="date" id="x-date" value="' + (e ? e.date : todayISO()) + '"></label><label class="field">What it was<input id="x-note" value="' + esc(e ? e.note : "") + '" placeholder="Tesco, train, takeaway"></label></div>';
  if (e) {
    const by = whoFromEmail(e.by), mine = me();
    h += '<p class="note">' + (by ? "Added by " + esc(nm(by)) : e.imported ? "Imported from a bank statement" : "Added before names were set") + (e.ts > 1e12 ? " on " + esc(dateLabel(new Date(e.ts).toISOString().slice(0, 10))) : "") + '</p>';
    h += '<div class="field">React<div class="reacts">' + ["❤️", "👍", "😂", "😬", "🤑"].map(r => '<button type="button" class="' + (mine && (e.react || {})[mine] === r ? "on" : "") + '" data-act="react" data-v="' + r + '">' + r + '</button>').join("") + '</div>' + (e.react ? '<span class="note">' + PEOPLE.filter(p => e.react[p]).map(p => esc(nm(p)) + " " + e.react[p]).join(" · ") + '</span>' : "") + '</div>';
    h += '<div class="field">Notes' + (e.comments || []).map(cm => '<div class="cmt"><b>' + esc(nm(cm.who)) + '</b>' + esc(cm.text) + '</div>').join("") + '<div class="row"><input class="inp grow" id="x-cmt" placeholder="Add a note for each other"><button type="button" class="btn small" data-act="addcmt">Add</button></div></div>';
  }
  h += '<div class="actions">' + (e ? '<button class="btn ghost danger" data-act="delexp" style="margin-right:auto">Delete</button>' : "") + '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="saveexp">' + (e ? "Save changes" : "Save") + '</button></div>';
  openSheet(h);
}
const amtHTML = () => '<span>£</span>' + esc(ui.sheet.amt || "0");
const budChips = () => S.budgets.map(b => '<button type="button" class="chip' + (ui.sheet.budgetId === b.id ? " on" : "") + '" data-act="xbud" data-v="' + esc(b.id) + '">' + (b.emoji ? esc(b.emoji) : '<span class="dot ' + esc(b.who) + '"></span>') + esc(b.name) + '</button>').join("")
  + '<button type="button" class="chip other' + (!ui.sheet.budgetId ? " on" : "") + '" data-act="xbud" data-v=""><span class="dot dash"></span>Other, not in a budget</button>';
const whoChips = () => WHO.map(k => '<button type="button" class="chip' + (ui.sheet.who === k ? " on" : "") + '" data-act="xwho" data-v="' + k + '"><span class="dot ' + k + '"></span>' + esc(nm(k)) + '</button>').join("");
function padPress(k) {
  let a = ui.sheet.amt || "";
  if (k === "⌫" || k === "Backspace") a = a.slice(0, -1);
  else if (k === ".") { if (!a.includes(".")) a = (a || "0") + "."; }
  else if (/^\d$/.test(k)) { if (a.includes(".") && a.split(".")[1].length >= 2) return; if (a === "0") a = ""; if (a.replace(".", "").length >= 7) return; a += k; }
  ui.sheet.amt = a; const el = $("#x-show"); if (el) el.innerHTML = amtHTML();
}
async function saveExpense() {
  const amount = num(ui.sheet.amt);
  if (amount <= 0) { toast("Type an amount on the number pad"); return; }
  if (!ui.sheet.budgetId && !$("#x-note").value.trim()) { toast("Say what it was, so Other spending shows what you might need a budget for"); $("#x-note").focus(); return; }
  const date = $("#x-date").value || todayISO();
  const old = ui.sheet.id ? S.expenses.find(x => x.id === ui.sheet.id) : null;
  const d = Object.assign({}, old || {}, { amount, budgetId: ui.sheet.budgetId || "", who: ui.sheet.who, date, ym: date.slice(0, 7), note: $("#x-note").value.trim() });
  if (!old) { d.ts = Date.now(); d.by = S.user ? S.user.email : ("demo:" + (me() || "m")); }
  delete d.id;
  try {
    if (ui.sheet.id) await DB.set("expenses", ui.sheet.id, d); else await DB.add("expenses", d);
    learnRule(d.note, d.budgetId);
    const b = S.budgets.find(x => x.id === d.budgetId);
    closeSheet(); toast(gbpx(amount) + (b ? " on " + b.name : " saved"));
  } catch (e) { fail(e); }
}
async function learnRule(note, budgetId) {
  if (!note || !budgetId) return; const key = merchantKey(note); if (!key || key.length < 3) return;
  const ex = S.rules.find(r => r.key === key);
  if (ex && ex.budgetId === budgetId) return;
  try { await DB.set("rules", "r-" + key.replace(/[^A-Z0-9]/g, "_").slice(0, 60), { key, budgetId }); } catch (e) { }
}

/* ================= recap story ================= */
function recapSlides(id) {
  const x = S.statements.find(s => s.id === id); if (!x) return [];
  const prev = S.statements.find(s => s.id === addM(id, -1));
  const N = k => k === "j" ? "Joint" : ((x.names || {})[k] || nm(k));
  const month = ymLabel(id).split(" ")[0], slides = [];
  slides.push({ cls: "s1", html: '<span class="k">' + esc(ymLabel(id)) + ' recap</span><h2>Here’s how ' + esc(month) + ' went for ' + esc(N("m")) + ' and ' + esc(N("s")) + '.</h2><span class="k">' + plural(x.entries || 0, "purchase") + ' logged</span><span class="huge num">' + gbp(x.spentTotal || 0) + '</span><span class="k">spent from your budgets' + (prev ? (x.spentTotal <= prev.spentTotal ? ", " + gbp(prev.spentTotal - x.spentTotal) + " less than " + esc(ymLabel(prev.id).split(" ")[0]) : ", " + gbp(x.spentTotal - prev.spentTotal) + " more than " + esc(ymLabel(prev.id).split(" ")[0])) : "") + '</span>' });
  const bs = (x.budgets || []).filter(b => b.spent > 0).sort((a, b) => b.spent - a.spent);
  if (bs.length) slides.push({ cls: "s2", html: '<span class="k">Top spot</span><span class="emo">' + esc(bs[0].emoji || "🏆") + '</span><h2>' + esc(bs[0].name) + ' took the most</h2><span class="huge num">' + gbp(bs[0].spent) + '</span><span class="k">' + (bs[0].amount ? (bs[0].spent > bs[0].amount ? gbp(bs[0].spent - bs[0].amount) + " over its budget" : gbp(bs[0].amount - bs[0].spent) + " under its budget") : "") + '</span>' + bs.slice(1, 4).map(b => '<div class="row2"><span>' + esc((b.emoji ? b.emoji + " " : "") + b.name) + '</span><b>' + gbp(b.spent) + '</b></div>').join("") });
  const wins = (x.budgets || []).filter(b => b.amount > 0 && b.spent <= b.amount).sort((a, b) => (b.amount - b.spent) - (a.amount - a.spent));
  if (wins.length) slides.push({ cls: "s3", html: '<span class="k">Biggest win</span><span class="emo">🌟</span><h2>' + esc(wins[0].name) + ' came in ' + gbp(wins[0].amount - wins[0].spent) + ' under budget</h2><span class="k">' + plural(wins.length, "budget") + ' stayed on track this month' + ((x.budgets || []).length > wins.length ? ", " + ((x.budgets || []).length - wins.length) + " went over" : "") + '.</span>' });
  const dpaid = sum((x.debts || []).map(d => d.paid)), dint = sum((x.debts || []).map(d => d.interest)), cleared = (x.debts || []).filter(d => d.cleared);
  if ((x.debts || []).length) slides.push({ cls: "s4", html: '<span class="k">Debt</span>' + (cleared.length ? '<span class="emo">🎉</span><h2>' + esc(cleared.map(d => d.name).join(" and ")) + ' paid off!</h2>' : '<span class="emo">📉</span>') + '<span class="huge num">' + gbp(dpaid) + '</span><span class="k">repaid this month, ' + gbp(dint) + ' of it interest. ' + gbp(x.debtLeft || 0) + ' left in total.</span>' });
  const ps = (x.pots || []).filter(p => p.goal > 0 || p.total > 0);
  if (ps.length) slides.push({ cls: "s1", html: '<span class="k">Savings pots</span><h2>' + gbp(sum(ps.map(p => p.paid))) + ' went into your pots</h2>' + ps.slice(0, 6).map(p => '<div class="row2"><span>' + esc((p.emoji ? p.emoji + " " : "") + p.name) + '</span><b>' + (p.goal ? Math.round(Math.min(1, p.total / p.goal) * 100) + "%" : gbp(p.total)) + '</b></div>').join("") });
  const ch = x.challenges || [];
  if (ch.length || x.netWorth != null) slides.push({ cls: "s2", html: (x.netWorth != null ? '<span class="k">Net worth at month end</span><span class="huge num">' + (x.netWorth < 0 ? "minus " : "") + gbp(x.netWorth) + '</span>' + (prev && prev.netWorth != null ? '<span class="k">' + (x.netWorth >= prev.netWorth ? "Up " + gbp(x.netWorth - prev.netWorth) : "Down " + gbp(prev.netWorth - x.netWorth)) + ' on last month</span>' : "") : "") + (ch.length ? '<h2 style="margin-top:18px">Challenges</h2>' + ch.map(c => '<div class="row2"><span>' + esc((c.emoji ? c.emoji + " " : "") + c.name) + '</span><b>' + (c.state === "won" ? "✓ Done" : c.state === "lost" ? "Missed" : "Ongoing") + '</b></div>').join("") : "") });
  slides.push({ cls: "s3", html: '<span class="emo">🤝</span><h2>That’s ' + esc(month) + '.</h2><span class="k">Have a look at the full statement together, and grab a backup while you’re here.</span><div class="row wrap"><button class="btn" data-act="storygo" data-v="statement/' + esc(id) + '">See the statement</button><button class="btn" data-act="export">Download a backup</button></div>' });
  return slides;
}
function openRecap(id) {
  const slides = recapSlides(id); if (!slides.length) return;
  ui.story = { id, i: 0, slides }; LS.set("ms-recap-seen", id);
  let el = $("#story"); if (!el) { el = document.createElement("div"); el.id = "story"; document.body.appendChild(el); }
  drawStory();
}
function drawStory() {
  const s = ui.story, el = $("#story"); if (!s || !el) return;
  const sl = s.slides[s.i];
  el.className = "story " + sl.cls; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = '<div class="bars">' + s.slides.map((_, i) => '<i class="' + (i <= s.i ? "on" : "") + '"></i>').join("") + '</div><button class="close" data-act="storyclose" aria-label="Close">×</button><div class="slide" data-act="storytap">' + sl.html + '</div><div class="navs">' + (s.i > 0 ? '<button class="p" data-act="storyprev">Back</button>' : "") + '<button class="n" data-act="' + (s.i < s.slides.length - 1 ? "storynext" : "storyclose") + '">' + (s.i < s.slides.length - 1 ? "Next" : "Done") + '</button></div>';
  if (s.i === s.slides.length - 1 || sl.html.includes("paid off")) confetti();
}
function closeStory() { const el = $("#story"); if (el) el.remove(); ui.story = null; render(); }

/* ================= calendar (.ics) ================= */
function downloadICS(whoFilter) {
  const ym = thisYM(), items = flowItems(ym).filter(i => i.type !== "in" || whoFilter === "all").filter(i => whoFilter === "all" || i.from === whoFilter || i.to === whoFilter || i.from === "j");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const escI = s => String(s).replace(/[\\,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
  let out = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Mukul and Sylwia//Money//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:Money\r\n";
  items.forEach(i => {
    const start = isoOf(ym, i.day).replace(/-/g, ""), end = addD(isoOf(ym, i.day), 1).replace(/-/g, "");
    const yearly = i.freq === "yearly", quarterly = i.freq === "quarterly";
    const rule = yearly ? "FREQ=YEARLY" : quarterly ? "FREQ=MONTHLY;INTERVAL=3" : (i.day >= 29 ? "FREQ=MONTHLY;BYMONTHDAY=-1" : "FREQ=MONTHLY;BYMONTHDAY=" + i.day);
    const who = i.type === "in" ? nm(i.to) : nm(i.from);
    const title = (i.type === "in" ? "Pay day " + who : i.label + " (" + who + ")") + " " + gbpx(i.amount);
    out += "BEGIN:VEVENT\r\nUID:" + i.key + "-" + whoFilter + "@mandsfinance\r\nDTSTAMP:" + stamp + "\r\nDTSTART;VALUE=DATE:" + start + "\r\nDTEND;VALUE=DATE:" + end + "\r\nRRULE:" + rule + "\r\nSUMMARY:" + escI(title) + "\r\nDESCRIPTION:" + escI((isManual(i) ? "Move this yourself. " : "") + "From mandsfinance.netlify.app") + "\r\nTRANSP:TRANSPARENT\r\n"
      + (isManual(i) ? "BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:" + escI(title) + "\r\nTRIGGER:PT9H\r\nEND:VALARM\r\n" : "") + "END:VEVENT\r\n";
  });
  out += "END:VCALENDAR\r\n";
  saveFile("money-calendar" + (whoFilter === "all" ? "" : "-" + nm(whoFilter).toLowerCase()) + ".ics", out, "text/calendar");
  toast("Calendar file downloaded. Open it to add the dates.");
}
function saveFile(name, text, type) {
  const blob = new Blob([text], { type }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ================= swipe ================= */
let sw = null;
document.addEventListener("touchstart", e => {
  const row = e.target.closest(".srow"); document.querySelectorAll(".srow .sin").forEach(x => { if (!row || !row.contains(x)) { x.style.transform = ""; x.parentElement.classList.remove("open", "moving"); } });
  if (!row) return; sw = { row, x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, lock: null, base: row.querySelector(".sin").style.transform ? -144 : 0 };
}, { passive: true });
document.addEventListener("touchmove", e => {
  if (!sw) return; const dx = e.touches[0].clientX - sw.x0, dy = e.touches[0].clientY - sw.y0;
  if (sw.lock == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) sw.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
  if (sw.lock !== "x") return;
  sw.dx = Math.max(-160, Math.min(0, sw.base + dx)); const el = sw.row.querySelector(".sin"); el.style.transition = "none"; el.style.transform = "translateX(" + sw.dx + "px)"; sw.row.classList.add("moving");
}, { passive: true });
document.addEventListener("touchend", () => {
  if (!sw) return; const el = sw.row.querySelector(".sin"); el.style.transition = "";
  if (sw.lock === "x") { el.style.transform = sw.dx < -60 ? "translateX(-144px)" : ""; el.parentElement.classList.toggle("open", sw.dx < -60); el.parentElement.classList.remove("moving"); sw.swiped = true; ui.justSwiped = Date.now(); }
  sw = null;
});

/* ================= actions ================= */
function toast(m, action) {
  const t = $("#toast"); t.innerHTML = esc(m) + (action ? '<button data-act="toastact">' + esc(action.label) + '</button>' : ""); t.hidden = false; ui.toastAction = action || null;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; ui.toastAction = null; }, action ? 5000 : 2800);
}
function fail(e) { console.error(e); toast(e && e.code === "permission-denied" ? "This account isn't allowed to change the data" : "Couldn't save. Check your connection and try again."); }

async function onAct(el) {
  const a = el.dataset.act, v = el.dataset.v, id = el.dataset.id;
  if (ui.justSwiped && Date.now() - ui.justSwiped < 350 && a === "editexp" && el.classList.contains("item")) return;
  if (justDragged && Date.now() - justDragged < 400) return;
  if (ui.arrange && el.closest("[data-sort]") && a !== "arrange") return;
  switch (a) {
    case "theme": LS.set("ms-theme", v); applyTheme(); ui.keepScroll = true; render(); break;
    case "worldset": LS.set("ms-world", v); applyTheme(); ui.keepScroll = true; render(); break;
    case "asciiset": LS.set("ms-ascii", v); applyTheme(); ui.keepScroll = true; render(); break;
    case "togglecol": { const t = el.dataset.t, k = el.dataset.k, h = colsHidden(t); h[k] = !h[k]; LS.set("ms-cols-" + t, JSON.stringify(h)); ui.keepScroll = true; render(); break; }
    case "setfield": openPop(el); break;
    case "popsave": savePop(); break;
    case "popclose": closePop(); break;
    case "arrange": ui.arrange = !ui.arrange; ui.keepScroll = true; render(); if (ui.arrange) toast("Drag the cards into the order you like, then tap Done"); break;
    case "budfromother": openItem("budgets", null, { name: v }); break;
    case "addexp": openExpense(); break;
    case "openbudget": openExpense(null, id); break;
    case "editexp": openExpense(id); break;
    case "padkey": padPress(v); break;
    case "xbud": ui.sheet.budgetId = v; { const b = S.budgets.find(x => x.id === v); if (b && b.who !== "j") ui.sheet.who = b.who; } $("#x-buds").innerHTML = budChips(); $("#x-who").innerHTML = whoChips(); if (!v) { const n = $("#x-note"); n.placeholder = "What was it? e.g. Haircut, parking, vet"; } break;
    case "xwho": ui.sheet.who = v; $("#x-who").innerHTML = whoChips(); break;
    case "saveexp": saveExpense(); break;
    case "quick": {
      const q = frequentShortcuts()[+v]; if (!q) return;
      const d = { amount: q.amount, budgetId: q.budgetId, who: q.who, date: todayISO(), ym: thisYM(), note: q.note, ts: Date.now(), by: S.user ? S.user.email : ("demo:" + (me() || "m")) };
      try { const nid = await DB.add("expenses", d); closeSheet(); toast(gbpx(q.amount) + " on " + q.note, { label: "Undo", fn: () => DB.remove("expenses", nid) }); } catch (e) { fail(e); }
      break;
    }
    case "toastact": if (ui.toastAction) { const f = ui.toastAction.fn; ui.toastAction = null; $("#toast").hidden = true; try { await f(); toast("Undone"); } catch (e) { fail(e); } } break;
    case "swdel": {
      const ex = S.expenses.find(x => x.id === id); if (!ex) return;
      const copy = Object.assign({}, ex); delete copy.id;
      try { await DB.remove("expenses", id); toast("Deleted " + gbpx(ex.amount), { label: "Undo", fn: () => DB.set("expenses", id, copy) }); } catch (e) { fail(e); }
      break;
    }
    case "delexp":
      if (ui.confirm !== "exp") { ui.confirm = "exp"; el.textContent = "Tap again to delete"; return; }
      try { await DB.remove("expenses", ui.sheet.id); closeSheet(); toast("Deleted"); } catch (e) { fail(e); } break;
    case "react": { const mine = me() || "m", ex = S.expenses.find(x => x.id === ui.sheet.id); const cur = ((ex && ex.react) || {})[mine]; try { await DB.merge("expenses", ui.sheet.id, { react: { [mine]: cur === v ? "" : v } }); openExpense(ui.sheet.id); } catch (e) { fail(e); } break; }
    case "addcmt": { const t = ($("#x-cmt").value || "").trim(); if (!t) return; const ex = S.expenses.find(x => x.id === ui.sheet.id); const list = ((ex && ex.comments) || []).concat([{ who: me() || "m", text: t, ts: Date.now() }]); try { await DB.merge("expenses", ui.sheet.id, { comments: list }); openExpense(ui.sheet.id); } catch (e) { fail(e); } break; }
    case "close": closeSheet(); break;
    case "new": openItem(el.dataset.c); break;
    case "edit": openItem(el.dataset.c, id); break;
    case "newchal": openItem("challenges"); break;
    case "editchal": openItem("challenges", id); break;
    case "chaltpl": {
      const t = [["🥡", "No takeaway week", "nospend", /eat|takeaway/i, 7, 0], ["🛒", "£50 food shop week", "under", /groc|food/i, 7, 50], ["🛍️", "No spend weekend", "nospend", null, 2, 0], ["☕", "No coffee out for 2 weeks", "nospend", /eat|coffee/i, 14, 0]][+v];
      const b = t[3] ? S.budgets.find(x => t[3].test(x.name)) : null;
      $("#f-name").value = t[1]; $("#f-kind").value = t[2]; $("#f-budgetId").value = b ? b.id : ""; $("#f-days").value = t[4]; $("#f-limit").value = t[5] || "";
      if (t[1] === "No spend weekend") { const d = new Date(); const sat = addD(todayISO(), (6 - d.getDay() + 7) % 7); $("#f-start").value = sat; }
      $("#f-emoji").value = t[0]; document.querySelectorAll('[data-pick="f-emoji"] button').forEach(x => x.classList.toggle("on", x.dataset.v === t[0]));
      syncChalForm(); break;
    }
    case "pickemo": { const box = el.closest("[data-pick]"); $("#" + box.dataset.pick).value = v; box.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === el)); break; }
    case "pickcol": { const box = el.closest("[data-pick]"); $("#" + box.dataset.pick).value = v; box.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === el)); break; }
    case "saveitem": saveItem(); break;
    case "del":
      if (ui.confirm !== "item") { ui.confirm = "item"; el.textContent = "Tap again to delete"; return; }
      try { await DB.remove(ui.sheet.c, ui.sheet.id); closeSheet(); toast("Deleted"); } catch (e) { fail(e); } break;
    case "spm": ui.spendYM = addM(ui.spendYM, +v); if (ui.spendYM > thisYM()) ui.spendYM = thisYM(); render(); break;
    case "spwho": ui.spendWho = v; render(); break;
    case "flm": ui.flowYM = addM(ui.flowYM, +v); render(); break;
    case "tick": { const ym = el.dataset.ym, k = el.dataset.k; try { await DB.merge("ticks", ym, { done: { [k]: !ticked(ym, k) } }); } catch (e) { fail(e); } break; }
    case "go": location.hash = "#" + v; break;
    case "back": { const h = ui.hist || []; location.hash = "#" + (h.length ? h[h.length - 1] : "home"); break; }
    case "print": window.print(); break;
    case "iam": {
      if (S.mode === "demo") { LS.set("ms-me", v); render(); break; }
      try { await DB.merge("settings", "main", { emails: Object.assign({}, st().emails, { [v]: S.user.email }) }); toast("Hi " + nm(v)); } catch (e) { fail(e); } break;
    }
    case "recap": openRecap(v); break;
    case "storynext": if (ui.story && ui.story.i < ui.story.slides.length - 1) { ui.story.i++; drawStory(); } break;
    case "storyprev": if (ui.story && ui.story.i > 0) { ui.story.i--; drawStory(); } break;
    case "storytap": break;
    case "storyclose": closeStory(); break;
    case "storygo": closeStory(); location.hash = "#" + v; break;
    case "ics": downloadICS(v); break;
    case "fxreset": ui.fx = { debt: {}, pot: {} }; render(); break;
    case "fxapply": {
      const ops = [];
      Object.keys(ui.fx.debt).forEach(k => { const d = S.debts.find(x => x.id === k); if (d && ui.fx.debt[k]) { const b = Object.assign({}, d, { monthly: r2((+d.monthly || 0) + ui.fx.debt[k]) }); delete b.id; ops.push({ op: "set", c: "debts", id: k, d: b }); } });
      Object.keys(ui.fx.pot).forEach(k => { const p = S.pots.find(x => x.id === k); if (p && +p.monthly !== ui.fx.pot[k]) { const b = Object.assign({}, p, { monthly: ui.fx.pot[k] }); delete b.id; ops.push({ op: "set", c: "pots", id: k, d: b }); } });
      try { await DB.batch(ops); ui.fx = { debt: {}, pot: {} }; toast("Saved to your plan"); render(); } catch (e) { fail(e); } break;
    }
    case "csvwho": ui.csv = Object.assign(ui.csv || {}, { who: v }); if (ui.csv.rows) ui.csv.rows = null; render(); break;
    case "csvgo": {
      const c = ui.csv, rows = c.rows.filter(r => r.on); if (!rows.length) return;
      const ops = rows.map((r, i) => ({ op: "set", c: "expenses", id: "csv-" + uid() + i, d: { amount: r.amount, budgetId: r.budgetId, who: c.who, date: r.date, ym: r.date.slice(0, 7), note: r.desc, ts: Date.now() + i, by: S.user ? S.user.email : "demo:" + (me() || "m"), imported: true } }));
      const seen = {}; rows.filter(r => r.budgetId).forEach(r => { const key = merchantKey(r.raw); if (key.length >= 3 && !seen[key]) { seen[key] = 1; ops.push({ op: "set", c: "rules", id: "r-" + key.replace(/[^A-Z0-9]/g, "_").slice(0, 60), d: { key, budgetId: r.budgetId } }); } });
      try { await DB.batch(ops); toast("Imported " + plural(rows.length, "purchase")); ui.csv = null; location.hash = "#spend"; } catch (e) { fail(e); } break;
    }
    case "addline": { const card = el.closest("[data-income]"); const g = card.querySelector('[data-group="' + el.dataset.g + '"]'); g.insertAdjacentHTML("beforeend", '<div class="row" data-line="' + el.dataset.g + '"><input class="inp grow" data-f="name" placeholder="Name" aria-label="Name"><input class="inp" style="width:120px;text-align:right" data-f="amount" inputmode="decimal" placeholder="0.00" aria-label="Amount"><button class="iconbtn" data-act="rmline" aria-label="Remove line">' + svg("bin", 18) + '</button></div>'); g.lastElementChild.querySelector("input").focus(); break; }
    case "rmline": el.closest("[data-line]").remove(); break;
    case "saveincome": {
      const p = el.dataset.p, card = el.closest("[data-income]");
      const lines = g => [...card.querySelectorAll('[data-group="' + g + '"] [data-line]')].map(r => ({ name: r.querySelector('[data-f="name"]').value.trim(), amount: num(r.querySelector('[data-f="amount"]').value) })).filter(l => l.name || l.amount);
      const d = { gross: num($("#gross-" + p).value), deductions: lines("ded"), extras: lines("ext"), manual: num($("#manual-" + p).value) };
      try { await DB.set("income", p, d); await DB.merge("settings", "main", { payday: Object.assign({}, st().payday, { [p]: Math.max(1, Math.min(31, parseInt($("#payday-" + p).value, 10) || 28)) }) }); document.activeElement && document.activeElement.blur(); toast(nm(p) + "’s income saved"); render(); } catch (e) { fail(e); } break;
    }
    case "savepeople": {
      const names = {}, payday = {}, emails = {};
      PEOPLE.forEach(p => { names[p] = $("#nm-" + p).value.trim() || st().names[p]; payday[p] = Math.max(1, Math.min(31, parseInt($("#pd-" + p).value, 10) || 28)); emails[p] = $("#em-" + p).value.trim(); });
      try { await DB.merge("settings", "main", { names, payday, emails }); document.activeElement && document.activeElement.blur(); toast("Saved"); render(); } catch (e) { fail(e); } break;
    }
    case "split": try { await DB.merge("settings", "main", { split: v }); } catch (e) { fail(e); } break;
    case "savejoint": {
      const d = { jointDay: {}, jointPayDay: Math.max(1, Math.min(31, parseInt($("#jpd").value, 10) || 28)) };
      PEOPLE.forEach(p => { d.jointDay[p] = Math.max(1, Math.min(31, parseInt($("#jd-" + p).value, 10) || 28)); });
      if (st().split === "custom") { d.custom = {}; PEOPLE.forEach(p => { d.custom[p] = num($("#cu-" + p).value); }); }
      try { await DB.merge("settings", "main", d); document.activeElement && document.activeElement.blur(); toast("Joint account saved"); render(); } catch (e) { fail(e); } break;
    }
    case "savefx": { const r = num($("#fx-inr").value); if (!(r > 0)) { toast("Type the number of rupees for each pound"); return; } try { await DB.merge("settings", "main", { fx: { inr: r, at: new Date().toISOString(), manual: true } }); toast("Rate saved"); } catch (e) { fail(e); } break; }
    case "autofx": try { await DB.merge("settings", "main", { fx: { manual: false, at: "" } }); await refreshFx(true); toast(+st().fx.inr ? "Rate updated" : "Couldn't load the rate right now"); } catch (e) { fail(e); } break;
    case "export": { const data = await DB.exportAll(); saveFile("money-backup-" + todayISO() + ".json", JSON.stringify(data, null, 1), "application/json"); toast("Backup downloaded"); break; }
    case "listbackups": try { ui.backups = (await DB.getAll("backups")).sort((a, b) => a.id < b.id ? 1 : -1); render(); } catch (e) { fail(e); } break;
    case "dlbackup": { const b = (ui.backups || []).find(x => x.id === id); if (b) saveFile("money-plan-" + b.id + ".json", JSON.stringify(b, null, 1), "application/json"); break; }
    case "cancelimport": ui.importData = null; render(); break;
    case "doimport": await doImport(); break;
    case "blank": {
      try { await DB.batch([{ op: "set", c: "settings", id: "main", d: { names: { m: "Mukul", s: "Sylwia" }, payday: { m: 28, s: 28 }, split: "income", emails: {} } }, { op: "set", c: "meta", id: "state", d: { lastClosed: addM(thisYM(), -1) } }]); toast("Ready. Start in Plan."); location.hash = "#plan/income"; } catch (e) { fail(e); } break;
    }
    case "resetdemo": DB.reset(); break;
    case "askwipe": ui.confirm = "wipe"; render(); break;
    case "cancelwipe": ui.confirm = null; render(); break;
    case "wipeall": {
      el.disabled = true; el.textContent = "Clearing…";
      try { await DB.wipe(true); ui.confirm = null; S.meta = null; S.settings = null; location.hash = "#home"; toast("Everything cleared. Start blank to begin."); render(); }
      catch (e) { fail(e); el.disabled = false; el.textContent = "Yes, clear everything"; }
      break;
    }
    case "signout": try { await DB.FB.signOut(DB.auth); } catch (e) { } location.hash = "#home"; location.reload(); break;
    case "reset": {
      const em = $("#lg-email").value.trim(); if (!em) { $("#lg-msg").textContent = "Type your email above first."; return; }
      try { await DB.FB.sendPasswordResetEmail(DB.auth, em); $("#lg-msg").textContent = "Reset email sent to " + em + ". Check your inbox."; } catch (e) { $("#lg-msg").textContent = "Couldn't send the email. Check the address."; } break;
    }
  }
}
async function doImport() {
  const d = ui.importData; if (!d) return;
  const ops = [];
  try {
    await DB.wipe(false);
    ops.push({ op: "set", c: "settings", id: "main", d: d.settings || {} });
    Object.keys(d.income || {}).forEach(p => ops.push({ op: "set", c: "income", id: p, d: d.income[p] }));
    ["bills", "subs", "debts", "budgets", "pots", "expenses", "yearly", "assets", "challenges"].forEach(c => (d[c] || []).forEach((x, i) => { const o = Object.assign({ order: i }, x); const id = o.id; delete o.id; ops.push({ op: "set", c, id: id || uid() + i, d: o }); }));
    ops.push({ op: "set", c: "meta", id: "state", d: { lastClosed: (d.meta && d.meta.lastClosed) || addM(thisYM(), -1) } });
    await DB.batch(ops);
    ui.importData = null; toast("Loaded"); location.hash = "#home"; render();
  } catch (e) { fail(e); }
}
function readImport(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try { const d = JSON.parse(fr.result); if (!d || typeof d !== "object" || !d.settings) throw 0; ui.importData = d; render(); const m = $("#imp-msg"); if (m) m.textContent = "Ready: " + (d.bills || []).length + " bills, " + (d.debts || []).length + " debts, " + (d.pots || []).length + " pots, " + (d.expenses || []).length + " purchases."; }
    catch (e) { toast("That file isn't a starting file from this site"); }
  };
  fr.readAsText(file);
}

document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  if (el.tagName === "BUTTON" && el.type !== "submit") e.preventDefault();
  onAct(el);
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "importFile" || t.id === "importFile2") { if (t.files[0]) readImport(t.files[0]); }
  else if (t.id === "csvFile") { if (t.files[0]) readCSV(t.files[0]); }
  else if (t.dataset.csvon != null) { ui.csv.rows[+t.dataset.csvon].on = t.checked; ui.keepScroll = true; render(); }
  else if (t.dataset.csvbud != null) { const r = ui.csv.rows[+t.dataset.csvbud]; r.budgetId = t.value; r.guess = t.value ? "You chose" : ""; }
  else if (t.id === "f-kind" && ui.sheet && ui.sheet.c === "challenges") syncChalForm();
  else if (t.id === "f-repeat") syncRepeat();
  else if (t.dataset.fx) { t.blur(); ui.keepScroll = true; render(); }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.fx) { ui.fx[t.dataset.fx][t.dataset.id] = +t.value; const lab = t.closest(".slider").querySelector(".row .num"); if (lab) lab.textContent = (t.dataset.fx === "debt" ? "+" : "") + gbp(+t.value) + " a month"; }
});
document.addEventListener("submit", async e => {
  if (e.target.id === "loginForm") {
    e.preventDefault(); const msg = $("#lg-msg"); msg.textContent = "Signing in…";
    try { await DB.FB.signInWithEmailAndPassword(DB.auth, $("#lg-email").value.trim(), $("#lg-pass").value); }
    catch (err) { msg.textContent = /invalid|wrong|not-found|credential/.test(err.code || "") ? "That email and password don’t match. Try again or reset your password." : "Couldn't sign in. Check your connection."; }
  } else if (e.target.id === "itemForm") { e.preventDefault(); saveItem(); }
});
document.addEventListener("keydown", e => {
  if (ui.story) { if (e.key === "ArrowRight") onAct({ dataset: { act: "storynext" } }); else if (e.key === "ArrowLeft") onAct({ dataset: { act: "storyprev" } }); else if (e.key === "Escape") closeStory(); return; }
  if ($("#sheet").hidden) return;
  if (e.key === "Escape") { closeSheet(); return; }
  if (ui.sheet && ui.sheet.exp && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
    if (/^[\d.]$/.test(e.key) || e.key === "Backspace") { e.preventDefault(); padPress(e.key); return; }
    if (e.key === "Enter") { e.preventDefault(); saveExpense(); return; }
  }
  if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "file" && e.target.id !== "x-cmt") { e.preventDefault(); if (ui.sheet && ui.sheet.exp) saveExpense(); else if (ui.sheet) saveItem(); }
  if (e.key === "Enter" && e.target.id === "x-cmt") { e.preventDefault(); onAct({ dataset: { act: "addcmt" } }); }
});
$("#sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });

function route() {
  const was = ui.lastHash, now = (location.hash || "#home").slice(1);
  ui.hist = ui.hist || [];
  if (was && was !== now) {
    // going to the page we just came from counts as going back (also covers the phone's own back gesture)
    if (ui.hist.length && ui.hist[ui.hist.length - 1] === now) ui.hist.pop();
    else { ui.hist.push(was); if (ui.hist.length > 30) ui.hist.shift(); }
  }
  ui.lastHash = now;
  const h = (location.hash || "#home").slice(1).split("/");
  ui.route = ["home", "spend", "flow", "plan", "insights", "statement", "settings", "import"].includes(h[0]) ? h[0] : (h[0] === "statements" ? "insights" : "home");
  ui.sub = h[0] === "statements" ? "statements" : (h[1] || "");
  ui.animate = true; ui.arrange = false; closePop();
  const go = () => { closeSheet(); window.scrollTo(0, 0); if (rq) { cancelAnimationFrame(rq); rq = 0; } draw(); };
  if (worldOn()) {
    World.go(STATION[ui.route] || "home");
    const old = Array.from(document.querySelectorAll(".main > *, .stage-in > *"));
    if (reduceMotion() || !old.length) { go(); return; }
    old.forEach((el, i) => el.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "translateY(-14px)", filter: "blur(6px)" }], { duration: 260, delay: Math.min(i, 8) * 22, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }));
    clearTimeout(ui.routeT); ui.routeT = setTimeout(go, 300);
    return;
  }
  transition(go);
}
window.addEventListener("hashchange", route);

/* ================= boot ================= */
(async function boot() {
  ui.lastHash = (location.hash || "#home").slice(1); ui.hist = [];
  const h = (location.hash || "#home").slice(1).split("/"); ui.route = h[0] || "home"; ui.sub = h[1] || "";
  if (ui.route === "statements") { ui.route = "insights"; ui.sub = "statements"; }
  backdrop();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => { });
  if (S.mode === "demo") { DB = memoryDB(); startWatching(); render(); return; }
  try { DB = await firebaseDB(); } catch (e) { console.error(e); $("#app").innerHTML = '<div class="boot">Couldn’t load. Check your internet connection and refresh.</div>'; return; }
  DB.FB.onAuthStateChanged(DB.auth, u => { S.user = u; if (u && !S.started) { S.started = true; startWatching(); } render(); });
})();
