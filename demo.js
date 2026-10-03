// Sample numbers for the preview. None of this is real.
export function demoData() {
  const pad = n => String(n).padStart(2, "0");
  const now = new Date();
  const ymOf = (k) => { const d = new Date(now.getFullYear(), now.getMonth() + k, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
  const cur = ymOf(0);
  const map = (arr) => Object.fromEntries(arr.map((x, i) => [x.id, Object.assign({ order: i }, x, { id: undefined })]));
  const budgets = [
    { id: "b1", name: "Food shop", who: "j", amount: 450, emoji: "🛒" },
    { id: "b2", name: "Eating out", who: "m", amount: 200, emoji: "🥡", color: "orange" },
    { id: "b3", name: "Transport", who: "m", amount: 150, emoji: "🚕" },
    { id: "b4", name: "Beauty & wellbeing", who: "s", amount: 100, emoji: "💅", color: "purple" },
    { id: "b5", name: "Fuel", who: "s", amount: 80, emoji: "⛽" },
    { id: "b6", name: "Misty", who: "j", amount: 40, emoji: "🐱", color: "teal" },
    { id: "b7", name: "Car repairs and upcoming stuff", who: "j", amount: 200 },
    { id: "b8", name: "Gifts and occasions for family", who: "s", amount: 1250 }
  ];
  const notes = { b7: ["Garage"], b8: ["Gift"], b1: ["Tesco", "Aldi", "Asda", "Lidl"], b2: ["Takeaway", "Lunch", "Pizza"], b3: ["Taxi", "Train"], b4: ["Hair", "Boots"], b5: ["Fuel"], b6: ["Cat litter", "Treats"] };
  const amts = { b7: [120], b8: [340, 95], b1: [38, 62, 24, 71, 45], b2: [14, 26, 9, 31], b3: [11, 9, 24], b4: [35, 18], b5: [40, 38], b6: [12, 8] };
  const expenses = [];
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  [-2, -1, 0].forEach(k => {
    const ym = ymOf(k), days = k === 0 ? now.getDate() : 28;
    budgets.forEach(b => {
      const n = Math.round((k === 0 ? days / 30 : 1) * (amts[b.id].length + 2));
      for (let i = 0; i < n; i++) {
        const day = 1 + Math.floor(rnd() * days), a = amts[b.id][i % amts[b.id].length] * (0.8 + rnd() * 0.5);
        expenses.push({ id: "e" + k + b.id + i, ym, date: ym + "-" + pad(day), amount: Math.round(a * 100) / 100, budgetId: b.id, who: b.who === "j" ? (rnd() > .5 ? "m" : "s") : b.who, note: notes[b.id][i % notes[b.id].length], ts: i });
      }
    });
  });
  [["Haircut", 28, 0], ["Parking", 6, 0], ["Parking", 4, -1], ["Haircut", 25, -1], ["Vet", 60, -2]].forEach((o, i) => { const ym = ymOf(o[2]); expenses.push({ id: "o" + i, ym, date: ym + "-" + pad(o[2] === 0 ? Math.min(now.getDate(), 1 + i) : 3 + i), amount: o[1], budgetId: "", who: i % 2 ? "m" : "s", note: o[0], ts: 99 + i }); });
  return {
    settings: { main: { names: { m: "Mukul", s: "Sylwia" }, payday: { m: 15, s: 28 }, jointDay: { m: 15, s: 28 }, split: "income", jointPayDay: 28, fx: { inr: 118.4, at: new Date().toISOString(), manual: true } } },
    meta: { state: { lastClosed: ymOf(-3) } },
    income: {
      m: { gross: 3600, deductions: [{ name: "Tax", amount: 520 }, { name: "National Insurance", amount: 170 }, { name: "Pension", amount: 180 }], extras: [] },
      s: { gross: 2900, deductions: [{ name: "Tax", amount: 400 }, { name: "National Insurance", amount: 150 }, { name: "Pension", amount: 115 }, { name: "Student loan", amount: 40 }], extras: [] }
    },
    bills: map([
      { id: "x1", name: "Buildings and contents insurance", cost: 38.5, acct: "j", day: 1 },
      { id: "x2", name: "Council tax", cost: 150, acct: "j", day: 7 },
      { id: "x3", name: "Gas & electric", cost: 140, acct: "j", day: 28 },
      { id: "x4", name: "Internet", cost: 35, acct: "j", day: 21 },
      { id: "x5", name: "Car insurance", cost: 80, acct: "s", day: 28 },
      { id: "x6", name: "Phone", cost: 12, acct: "m", day: 24 }
    ]),
    subs: map([
      { id: "u1", name: "Spotify Duo", cost: 17, freq: "monthly", who: "j", day: 1 },
      { id: "u2", name: "Netflix", cost: 13, freq: "monthly", who: "s", day: 12 },
      { id: "u3", name: "iCloud storage", cost: 9, freq: "monthly", who: "m", day: 19 },
      { id: "u4", name: "Amazon Prime", cost: 95, freq: "yearly", who: "m", day: 13, month: 3 }
    ]),
    debts: map([
      { id: "d1", name: "Bank loan", who: "s", borrowed: 10000, apr: 7, balance: 8200, monthly: 175, day: 1, interestPaid: 610 },
      { id: "d2", name: "Credit card", who: "s", borrowed: 1500, apr: 23.9, balance: 1200, monthly: 90, day: 30, interestPaid: 140, emoji: "💳" },
      { id: "d3", name: "Family loan", who: "m", borrowed: 4000, apr: 0, balance: 3500, monthly: 250, day: 17, interestPaid: 0, emoji: "🇮🇳", inr: true, notes: "Sent to Mum, who passes it to my aunt." },
      { id: "d4", name: "Overdraft", who: "s", borrowed: 0, apr: 0, balance: 1500, monthly: 0, day: 1, interestPaid: 0 },
      { id: "d5", name: "Mortgage", who: "j", borrowed: 165000, apr: 4.4, balance: 161048.37, monthly: 1012.55, day: 1, interestPaid: 3944.82 }
    ]),
    budgets: map(budgets),
    pots: map([
      { id: "p1", name: "Emergency fund", who: "j", goal: 15000, monthly: 500, current: 11250.75, day: 28, emoji: "🛟" },
      { id: "p5", name: "House deposit", who: "j", goal: 30000, monthly: 0, current: 0, day: 28 },
      { id: "p2", name: "Holiday", who: "j", goal: 5000, monthly: 100, current: 1180, day: 28, emoji: "✈️" },
      { id: "p3", name: "Visa fund", who: "m", goal: 3000, monthly: 200, current: 700, day: 15, emoji: "🛂", inr: true },
      { id: "p4", name: "Wedding", who: "j", goal: 0, monthly: 0, current: 0, day: 28, emoji: "💍" }
    ]),
    expenses: Object.fromEntries(expenses.map(e => [e.id, Object.assign({}, e, { id: undefined })])),
    yearly: map([
      { id: "y1", name: "Christmas", who: "j", amount: 600, month: 12, saved: 350, emoji: "🎄" },
      { id: "y2", name: "Car MOT and service", who: "s", amount: 240, month: 4, saved: 120, emoji: "🚗" },
      { id: "y3", name: "Birthdays", who: "j", amount: 300, month: 9, saved: 25, emoji: "🎂" },
      { id: "y4", name: "Visa application", who: "m", amount: 1600, repeat: "once", month: 1, year: 2028, saved: 300, emoji: "🛂" },
      { id: "y5", name: "MOT", who: "s", amount: 55, repeat: "yearly", month: (now.getMonth() + 2) % 12 + 1, saved: 20, emoji: "🔧" }
    ]),
    assets: map([
      { id: "a1", name: "Workplace pension", who: "m", kind: "pension", value: 6200, monthly: 380, growth: 5, autoAdd: true, emoji: "🏦" },
      { id: "a2", name: "Workplace pension", who: "s", kind: "pension", value: 9100, monthly: 230, growth: 5, autoAdd: true, emoji: "🏦" },
      { id: "a3", name: "Stocks and shares ISA", who: "s", kind: "investment", value: 1400, monthly: 50, growth: 6, autoAdd: true, emoji: "📈" }
    ]),
    challenges: map([
      { id: "c1", name: "No takeaway week", kind: "nospend", budgetId: "b2", days: 7, start: (function () { const d = new Date(); d.setDate(d.getDate() - 2); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); })(), emoji: "🥡" }
    ]),
    rules: {}, statements: {}, ticks: {}, ledger: {}, backups: {}
  };
}
