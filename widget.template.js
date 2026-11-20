// Malwa Financial Summary — Scriptable home-screen widget.
// Reads data.enc from GitHub (encrypted) and decrypts it on the phone.
// Works in small, medium and large sizes. Tap opens the Malwa Account Book.
const KEY = "__MW_KEY__";
const URL_DATA = "https://raw.githubusercontent.com/nawaderksm53-gif/Malwa-Widget/main/data.enc";
const APP = "https://claude.ai/artifact/S61xYX8NNjV9vhdLrwz2hL";

const MWCrypto = (function () { const module = { exports: {} };
/*__MWCRYPTO__*/
return module.exports; })();

const NAVY = new Color("#0f2747"), NAVY2 = new Color("#1c3d6b");
const WHITE = Color.white(), MUTED = new Color("#ffffff", 0.62);
const GREEN = new Color("#6ee7a8"), RED = new Color("#ff8a8a"), GOLD = new Color("#f5c46b");
const fmt = v => (v < 0 ? "−" : "") + Math.abs(v || 0).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmt0 = v => (v < 0 ? "−" : "") + Math.round(Math.abs(v || 0)).toLocaleString("en-US");

async function load() {
  const fm = FileManager.local(), cache = fm.joinPath(fm.documentsDirectory(), "malwa-widget.enc");
  let blob = null, live = true;
  try { const r = new Request(URL_DATA + "?t=" + Date.now()); r.timeoutInterval = 15; blob = await r.loadString(); if (!/^[A-Za-z0-9+/=\s]+$/.test(blob)) throw 0; fm.writeString(cache, blob); }
  catch (e) { live = false; if (fm.fileExists(cache)) blob = fm.readString(cache); }
  if (!blob) return { err: "No data yet" };
  try { return Object.assign(MWCrypto.open(KEY, blob.trim()), { live }); } catch (e) { return { err: String(e.message || e) }; }
}

function row(w, label, value, color, size) {
  const s = w.addStack(); s.centerAlignContent();
  const l = s.addText(label); l.font = Font.systemFont(size - 1); l.textColor = MUTED; l.lineLimit = 1;
  s.addSpacer();
  const v = s.addText(value); v.font = Font.semiboldMonospacedSystemFont(size); v.textColor = color || WHITE; v.lineLimit = 1; v.minimumScaleFactor = 0.6;
  return s;
}

function build(d, fam) {
  const w = new ListWidget(); w.url = APP; w.setPadding(12, 14, 12, 14);
  const g = new LinearGradient(); g.colors = [NAVY, NAVY2]; g.locations = [0, 1]; w.backgroundGradient = g;
  w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);
  const big = fam === "large", small = fam === "small", fs = big ? 13 : small ? 11 : 12;

  const h = w.addStack(); h.centerAlignContent();
  const t = h.addText(small ? "Malwa" : "Malwa Financial Summary"); t.font = Font.boldSystemFont(small ? 13 : 14); t.textColor = GOLD; t.lineLimit = 1;
  h.addSpacer();
  if (d.err) { w.addSpacer(); const e = w.addText(d.err); e.font = Font.systemFont(12); e.textColor = RED; w.addSpacer(); return w; }
  if (!small) { const a = h.addText(d.asOf || ""); a.font = Font.systemFont(10); a.textColor = MUTED; }
  w.addSpacer(small ? 4 : 6);

  const sup = d.sup || 0, supLabel = sup < 0 ? "Advance to suppliers" : "You owe suppliers";
  if (small) {
    const n = w.addText("Net position"); n.font = Font.systemFont(10); n.textColor = MUTED;
    const nv = w.addText(fmt0(d.net)); nv.font = Font.boldMonospacedSystemFont(20); nv.textColor = d.net < 0 ? RED : WHITE; nv.minimumScaleFactor = 0.5;
    w.addSpacer(4);
    row(w, "Cash", fmt0(d.cash), null, fs); row(w, "Bank", fmt0(d.bankTot), null, fs);
    row(w, "Cust. owe", fmt0(d.owe), GREEN, fs);
    row(w, "Profit", fmt0(d.profitMonth), d.profitMonth < 0 ? RED : GREEN, fs);
  } else {
    row(w, "Net position", fmt(d.net), d.net < 0 ? RED : WHITE, fs + 2); w.addSpacer(3);
    row(w, "Cash in hand", fmt(d.cash), null, fs);
    row(w, "Bank total", fmt(d.bankTot), null, fs);
    if (big) (d.banks || []).forEach(b => row(w, "   " + b.n.replace(/\s*-\s*Bank/i, "").slice(0, 34), fmt(b.v), MUTED, fs - 1));
    row(w, "Customers owe you", fmt(d.owe), GREEN, fs);
    row(w, supLabel, fmt(Math.abs(sup)), sup < 0 ? WHITE : RED, fs);
    row(w, "Profit · " + (d.month || "month"), fmt(d.profitMonth), d.profitMonth < 0 ? RED : GREEN, fs);
    if (big) {
      w.addSpacer(4);
      row(w, "Sales this month", fmt(d.salesMonth) + "  (" + (d.creditPctMonth || 0) + "% credit)", null, fs);
      row(w, "Purchases this month", fmt(d.purchMonth), null, fs);
      row(w, "Sales today", fmt(d.salesToday), null, fs);
      row(w, "Received today", fmt(d.received), null, fs);
      if (d.review) row(w, "Waiting for review", String(d.review), GOLD, fs);
    }
  }
  w.addSpacer();
  const f = w.addStack();
  const at = d.pub ? new Date(d.pub) : null;
  const ft = f.addText((d.live ? "" : "offline · ") + "KWD · updated " + (at ? at.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"));
  ft.font = Font.systemFont(9); ft.textColor = MUTED;
  return w;
}

const data = await load();
const fam = config.widgetFamily || "large";
const widget = build(data, fam);
if (config.runsInWidget) Script.setWidget(widget);
else if (fam === "small") await widget.presentSmall(); else if (fam === "medium") await widget.presentMedium(); else await widget.presentLarge();
Script.complete();
