// Usage: node add-sales.js snapshot.json txns.jsonl [YYYY-MM]
// Adds this month's net sales split (cash / KNET / WAMD / credit) to the snapshot, in place.
// txns.jsonl = the Malwa book's `txns` documents for the month, one JSON object per line
// (either {"data":{...},"id":...} as db_query returns them, or the plain data object).
// Invoices imported as opening balances but dated in the month are real sales of the month, so they count.
const fs = require("fs");
const [snapPath, txPath, monthArg] = process.argv.slice(2);
const kwt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
const month = monthArg || kwt.slice(0, 7), today = kwt.slice(0, 10);
const r3 = v => Math.round(v * 1000) / 1000;
const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
const txns = fs.readFileSync(txPath, "utf8").split(/\r?\n/).map(l => { try { const o = JSON.parse(l.trim()); return o && o.data ? o.data : o; } catch (e) { return null; } })
  .filter(t => t && t.status === "ok" && (t.type === "sale" || t.type === "sale_return") && String(t.date || "").slice(0, 7) === month);
const key = m => m === "cash" ? "cash" : m === "knet" ? "knet" : m === "wamd" ? "wamd" : m === "credit" ? "credit" : "other";
const ms = { month, cash: 0, knet: 0, wamd: 0, credit: 0, other: 0, net: 0, returns: 0, invoices: 0, today: 0 };
txns.forEach(t => {
  const a = Number(t.amount) || 0, s = t.type === "sale" ? 1 : -1;
  ms[key(t.method)] += s * a; ms.net += s * a;
  if (s < 0) ms.returns += a; else ms.invoices++;
  if (t.date === today) ms.today += s * a;
});
["cash", "knet", "wamd", "credit", "other", "net", "returns", "today"].forEach(k => ms[k] = r3(ms[k]));
const [y, m] = month.split("-").map(Number);
ms.label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
snap.ms = ms;
fs.writeFileSync(snapPath, JSON.stringify(snap));
console.log("sales", month, "net", ms.net, "cash", ms.cash, "knet", ms.knet, "wamd", ms.wamd, "credit", ms.credit, "other", ms.other, "invoices", ms.invoices, "from", txns.length, "entries");
