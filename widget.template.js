// Malwa Financial Summary — Scriptable home-screen widget (small / medium / large).
// Reads data.enc from GitHub (encrypted) and decrypts it on the phone.
// Keeps a short history on the phone for the trend line and day-on-day change.
// Tap opens the Malwa Account Book.
const KEY = "__MW_KEY__";
const URL_DATA = "https://raw.githubusercontent.com/nawaderksm53-gif/Malwa-Widget/main/data.enc";
const APP = "https://claude.ai/artifact/S61xYX8NNjV9vhdLrwz2hL";

const MWCrypto = (function () { const module = { exports: {} };
/*__MWCRYPTO__*/
return module.exports; })();

/* ---------- palette (Malwa Account Book: maroon + gold) ---------- */
const C = {
  m1: "#8a1c22", m2: "#6e1a1e", m3: "#4a0d11",
  tile: new Color("#ffffff", 0.08), line: new Color("#ffffff", 0.12),
  text: new Color("#fff8ee"), muted: new Color("#f1ebe5", 0.78), faint: new Color("#f1ebe5", 0.52),
  gold: new Color("#f2d43d"), gold2: new Color("#e9c400"), green: new Color("#6cc795"), red: new Color("#ff9a8f"),
  cream: new Color("#f6e3c4"), rose: new Color("#f0a7a0"), amber: new Color("#eba27a"),
};
C.blue = C.cream; C.violet = C.rose; C.teal = C.cream; // roles used below

/* ---------- number formats ---------- */
const sign = v => (v < 0 ? "−" : "");
const fmt3 = v => sign(v) + Math.abs(v || 0).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmt0 = v => sign(v) + Math.round(Math.abs(v || 0)).toLocaleString("en-US");
const short = v => { const a = Math.abs(v || 0); return sign(v) + (a >= 1e6 ? (a / 1e6).toFixed(2) + "M" : a >= 1e4 ? (a / 1e3).toFixed(1) + "K" : Math.round(a).toLocaleString("en-US")); };

/* ---------- data ---------- */
const fm = FileManager.local(), dir = fm.documentsDirectory();
const CACHE = fm.joinPath(dir, "malwa-widget.enc"), HIST = fm.joinPath(dir, "malwa-widget-history.json");
async function load() {
  let blob = null, live = true;
  try { const r = new Request(URL_DATA + "?t=" + Date.now()); r.timeoutInterval = 15; blob = (await r.loadString()).trim(); if (!/^[A-Za-z0-9+/=]+$/.test(blob)) throw 0; fm.writeString(CACHE, blob); }
  catch (e) { live = false; if (fm.fileExists(CACHE)) blob = fm.readString(CACHE).trim(); }
  if (!blob) return { err: "No data yet — check connection" };
  try { return Object.assign(MWCrypto.open(KEY, blob), { live }); } catch (e) { return { err: "Can't read data (" + (e.message || e) + ")" }; }
}
function history(d) {
  let h = {}; try { if (fm.fileExists(HIST)) h = JSON.parse(fm.readString(HIST)); } catch (e) { h = {}; }
  if (d && d.asOf && typeof d.net === "number") h[d.asOf] = { net: d.net, owe: d.owe, cash: (d.cash || 0) + (d.bankTot || 0) };
  const days = Object.keys(h).sort().slice(-30), keep = {}; days.forEach(k => keep[k] = h[k]);
  try { fm.writeString(HIST, JSON.stringify(keep)); } catch (e) {}
  return days.map(k => Object.assign({ d: k }, keep[k]));
}

/* ---------- drawing helpers ---------- */
function ctx(w, h) { const c = new DrawContext(); c.size = new Size(w, h); c.opaque = false; c.respectScreenScale = true; return c; }
function round(c, x, y, w, h, r, col) { const p = new Path(); p.addRoundedRect(new Rect(x, y, w, h), r, r); c.addPath(p); c.setFillColor(col); c.fillPath(); }
function sparkImage(vals, w, h, col) {
  const c = ctx(w, h);
  if (vals.length < 2) { c.setStrokeColor(C.line); c.setLineWidth(1.5); const p = new Path(); p.move(new Point(0, h * 0.6)); p.addLine(new Point(w, h * 0.6)); c.addPath(p); c.strokePath();
    c.setFont(Font.systemFont(9)); c.setTextColor(C.faint); c.drawTextInRect("trend builds daily", new Rect(0, h * 0.6 + 3, w, 12)); return c.getImage(); }
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1, pad = 3;
  const pts = vals.map((v, i) => new Point(pad + i * (w - 2 * pad) / (vals.length - 1), pad + (h - 2 * pad) * (1 - (v - lo) / span)));
  const area = new Path(); area.move(new Point(pts[0].x, h)); pts.forEach(p => area.addLine(p)); area.addLine(new Point(pts[pts.length - 1].x, h)); area.closeSubpath();
  c.addPath(area); c.setFillColor(new Color(col.hex, 0.16)); c.fillPath();
  const line = new Path(); line.move(pts[0]); pts.slice(1).forEach(p => line.addLine(p));
  c.addPath(line); c.setStrokeColor(col); c.setLineWidth(2); c.strokePath();
  const e = pts[pts.length - 1]; c.setFillColor(col); c.fillEllipse(new Rect(e.x - 3, e.y - 3, 6, 6));
  return c.getImage();
}
function splitBar(parts, w, h) { // parts: [{v, col}]
  const c = ctx(w, h), tot = parts.reduce((s, p) => s + Math.max(0, p.v), 0) || 1;
  round(c, 0, 0, w, h, h / 2, C.line); let x = 0;
  parts.forEach(p => { const pw = Math.max(0, p.v) / tot * w; if (pw > 0.5) { round(c, x, 0, Math.max(pw, h), h, h / 2, p.col); } x += pw; });
  return c.getImage();
}
function meter(frac, w, h, col) { const c = ctx(w, h); round(c, 0, 0, w, h, h / 2, C.line); if (frac > 0) round(c, 0, 0, Math.max(h, w * Math.min(1, frac)), h, h / 2, col); return c.getImage(); }
function icon(stack, name, col, size) { const s = SFSymbol.named(name); if (!s) return; s.applyFont(Font.semiboldSystemFont(size)); const i = stack.addImage(s.image); i.tintColor = col; i.imageSize = new Size(size + 2, size + 2); }

/* ---------- building blocks ---------- */
function txt(stack, s, font, col, scale) { const t = stack.addText(s); t.font = font; t.textColor = col; t.lineLimit = 1; if (scale) t.minimumScaleFactor = scale; return t; }
function header(w, d, small) {
  const h = w.addStack(); h.centerAlignContent();
  const badge = h.addStack(); badge.size = new Size(22, 22); badge.cornerRadius = 7; badge.backgroundColor = new Color("#e9c400", 0.22); badge.centerAlignContent();
  badge.addSpacer(); icon(badge, "chart.line.uptrend.xyaxis", C.gold, 11); badge.addSpacer();
  h.addSpacer(7);
  const t = h.addStack(); t.layoutVertically();
  txt(t, "MALWA", Font.heavySystemFont(small ? 12 : 13), C.text);
  if (!small) txt(t, "Financial Summary", Font.mediumSystemFont(9), C.muted);
  h.addSpacer();
  if (!small && d.asOf) {
    const pill = h.addStack(); pill.setPadding(3, 8, 3, 8); pill.cornerRadius = 9; pill.backgroundColor = C.tile; pill.centerAlignContent();
    const dot = pill.addStack(); dot.size = new Size(6, 6); dot.cornerRadius = 3; dot.backgroundColor = d.live ? C.green : C.gold; pill.addSpacer(5);
    txt(pill, dateLabel(d.asOf), Font.semiboldSystemFont(10), C.muted);
  }
}
function dateLabel(iso) { const [y, m, dd] = iso.split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
function hero(parent, d, hist, big) {
  const s = parent.addStack(); s.layoutVertically();
  txt(s, "NET POSITION", Font.semiboldSystemFont(9), C.faint);
  s.addSpacer(1);
  const n = s.addStack(); n.bottomAlignContent();
  const [ip, fp] = fmt3(d.net).split(".");
  txt(n, ip, Font.boldRoundedSystemFont(big ? 30 : 26), d.net < 0 ? C.red : C.text, 0.5);
  txt(n, "." + fp, Font.semiboldRoundedSystemFont(big ? 15 : 13), C.muted);
  n.addSpacer(4); txt(n, "KWD", Font.semiboldSystemFont(9), C.faint);
  const prev = hist.length > 1 ? hist[hist.length - 2] : null;
  const ch = s.addStack(); ch.centerAlignContent(); ch.setPadding(2, 0, 0, 0);
  if (prev) {
    const diff = d.net - prev.net, up = diff >= 0, col = up ? C.green : C.red;
    const chip = ch.addStack(); chip.setPadding(2, 6, 2, 6); chip.cornerRadius = 7; chip.backgroundColor = new Color(col.hex, 0.16); chip.centerAlignContent();
    icon(chip, up ? "arrow.up.right" : "arrow.down.right", col, 8); chip.addSpacer(3);
    txt(chip, short(Math.abs(diff)), Font.semiboldSystemFont(10), col);
    ch.addSpacer(5); txt(ch, "since " + dateLabel(prev.d).split(" ").slice(1).join(" "), Font.systemFont(9), C.faint);
  } else txt(ch, "if everything is collected and paid", Font.systemFont(9), C.faint, 0.7);
}
function tile(parent, sym, col, label, value, sub, w, h) {
  const t = parent.addStack(); t.layoutVertically(); t.size = new Size(w, h); t.cornerRadius = 12; t.backgroundColor = C.tile; t.setPadding(6, 8, 6, 8);
  const top = t.addStack(); top.centerAlignContent();
  const b = top.addStack(); b.size = new Size(16, 16); b.cornerRadius = 8; b.backgroundColor = new Color(col.hex, 0.18); b.centerAlignContent(); b.addSpacer(); icon(b, sym, col, 9); b.addSpacer();
  top.addSpacer(5); txt(top, label, Font.mediumSystemFont(9), C.muted, 0.7);
  t.addSpacer();
  txt(t, value, Font.boldRoundedSystemFont(15), C.text, 0.55);
  if (sub) txt(t, sub, Font.systemFont(8), C.faint, 0.7);
}
function sup(d) { const v = d.sup || 0; return v < 0 ? { label: "Supplier adv.", val: -v, sub: "you paid ahead", col: C.teal } : { label: "Payable", val: v, sub: "you owe suppliers", col: C.amber }; }
function footer(w, d) {
  const f = w.addStack(); f.centerAlignContent();
  icon(f, d.live ? "lock.fill" : "wifi.slash", C.faint, 7); f.addSpacer(4);
  const at = d.pub ? new Date(d.pub) : null;
  txt(f, (d.live ? "Encrypted" : "Offline") + " · updated " + (at ? at.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"), Font.systemFont(8), C.faint);
  f.addSpacer();
  if (d.review) { txt(f, d.review + " to review", Font.semiboldSystemFont(8), C.gold); }
}

/* ---------- layouts ---------- */
function hexRGB(h) { return [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); }
function mix(a, b, t) { const A = hexRGB(a), B = hexRGB(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
function backdrop(fam) { // maroon gradient + the book's gold hexagon motif
  const [W, H] = fam === "small" ? [170, 170] : fam === "medium" ? [364, 170] : [364, 382];
  const c = ctx(W, H), N = 64;
  for (let i = 0; i < N; i++) { const t = i / (N - 1), col = t < 0.55 ? mix(C.m1, C.m2, t / 0.55) : mix(C.m2, C.m3, (t - 0.55) / 0.45);
    c.setFillColor(new Color(col)); c.fillRect(new Rect(0, Math.floor(i * H / N), W, Math.ceil(H / N) + 1)); }
  const hex = (cx, cy, rx, ry, col, lw) => { const p = new Path(); p.move(new Point(cx - rx, cy)); p.addLine(new Point(cx - rx * 0.6, cy - ry)); p.addLine(new Point(cx + rx * 0.6, cy - ry));
    p.addLine(new Point(cx + rx, cy)); p.addLine(new Point(cx + rx * 0.6, cy + ry)); p.addLine(new Point(cx - rx * 0.6, cy + ry)); p.closeSubpath(); c.addPath(p); c.setStrokeColor(col); c.setLineWidth(lw); c.strokePath(); };
  const cx = W * 0.86, cy = H * 0.9, r = Math.min(W, H) * 0.55;
  hex(cx, cy, r, r * 0.6, new Color("#ffffff", 0.05), 5); hex(cx, cy, r * 0.73, r * 0.42, new Color("#e9c400", 0.16), 4);
  c.setFillColor(new Color("#e9c400", 0.9)); c.fillRect(new Rect(0, 0, W * 0.7, 2)); c.setFillColor(new Color("#ffffff", 0.35)); c.fillRect(new Rect(W * 0.7, 0, W * 0.3, 2));
  return c.getImage();
}
let FAM = "large";
function base() {
  const w = new ListWidget(); w.url = APP; w.backgroundColor = new Color(C.m2); w.backgroundImage = backdrop(FAM);
  w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000); return w;
}
function small(d, hist) {
  const w = base(); w.setPadding(12, 12, 10, 12);
  header(w, d, true); w.addSpacer(8);
  hero(w, d, hist, false); w.addSpacer();
  const rows = [["banknote.fill", C.gold, "Cash + bank", short((d.cash || 0) + (d.bankTot || 0))], ["person.2.fill", C.green, "Receivable", short(d.owe)], ["chart.bar.fill", (d.profitMonth || 0) < 0 ? C.red : C.blue, "Profit (mo)", short(d.profitMonth)]];
  rows.forEach(([s, c, l, v], i) => { const r = w.addStack(); r.centerAlignContent(); icon(r, s, c, 8); r.addSpacer(5); txt(r, l, Font.systemFont(10), C.muted); r.addSpacer(); txt(r, v, Font.semiboldRoundedSystemFont(11), C.text); if (i < 2) w.addSpacer(3); });
  return w;
}
function medium(d, hist) {
  const w = base(); w.setPadding(12, 14, 10, 14);
  header(w, d, false); w.addSpacer(6);
  const body = w.addStack(); body.centerAlignContent();
  const left = body.addStack(); left.layoutVertically(); left.size = new Size(130, 0);
  hero(left, d, hist, false); left.addSpacer(6);
  left.addImage(sparkImage(hist.map(x => x.net), 124, 24, (d.net || 0) >= 0 ? C.green : C.red)).imageSize = new Size(124, 24);
  body.addSpacer(10);
  const grid = body.addStack(); grid.layoutVertically(); const S = sup(d);
  const r1 = grid.addStack(); tile(r1, "banknote.fill", C.gold, "Cash", short(d.cash), null, 80, 46); r1.addSpacer(6); tile(r1, "building.columns.fill", C.blue, "Bank", short(d.bankTot), null, 80, 46);
  grid.addSpacer(5);
  const r2 = grid.addStack(); tile(r2, "person.2.fill", C.green, "Receivable", short(d.owe), null, 80, 46); r2.addSpacer(6); tile(r2, "shippingbox.fill", S.col, S.label, short(S.val), null, 80, 46);
  w.addSpacer();
  return w;
}
function large(d, hist) {
  const w = base(); w.setPadding(14, 16, 12, 16); const S = sup(d);
  header(w, d, false); w.addSpacer(8);
  const top = w.addStack(); top.centerAlignContent();
  hero(top, d, hist, true); top.addSpacer();
  top.addImage(sparkImage(hist.map(x => x.net), 110, 44, (d.net || 0) >= 0 ? C.green : C.red)).imageSize = new Size(110, 44);
  w.addSpacer(10);
  const r1 = w.addStack(); tile(r1, "banknote.fill", C.gold, "Cash in hand", fmt0(d.cash), null, 148, 46); r1.addSpacer(8); tile(r1, "building.columns.fill", C.blue, "Bank total", fmt0(d.bankTot), null, 148, 46);
  w.addSpacer(6);
  const r2 = w.addStack(); tile(r2, "person.2.fill", C.green, "Customers owe", fmt0(d.owe), null, 148, 46); r2.addSpacer(8); tile(r2, "shippingbox.fill", S.col, S.label, fmt0(S.val), null, 148, 46);
  w.addSpacer(10);

  // this month
  const m = w.addStack(); m.layoutVertically(); m.cornerRadius = 12; m.backgroundColor = C.tile; m.setPadding(8, 10, 8, 10);
  const mh = m.addStack(); mh.centerAlignContent();
  txt(mh, (d.month || "This month").toUpperCase(), Font.semiboldSystemFont(9), C.faint); mh.addSpacer();
  const pc = (d.profitMonth || 0) < 0 ? C.red : C.green;
  const pchip = mh.addStack(); pchip.setPadding(2, 7, 2, 7); pchip.cornerRadius = 7; pchip.backgroundColor = new Color(pc.hex, 0.16);
  txt(pchip, "Profit " + fmt3(d.profitMonth), Font.semiboldSystemFont(10), pc);
  m.addSpacer(6);
  const sl = m.addStack(); sl.centerAlignContent();
  txt(sl, "Sales", Font.mediumSystemFont(10), C.muted); sl.addSpacer(); txt(sl, fmt3(d.salesMonth), Font.semiboldRoundedSystemFont(11), C.text);
  m.addSpacer(4);
  const cr = (d.creditPctMonth || 0) / 100;
  m.addImage(splitBar([{ v: 1 - cr, col: C.gold }, { v: cr, col: C.violet }], 280, 6)).imageSize = new Size(280, 6);
  m.addSpacer(3);
  const lg = m.addStack(); lg.centerAlignContent();
  const key = (col, s) => { const k = lg.addStack(); k.size = new Size(6, 6); k.cornerRadius = 3; k.backgroundColor = col; lg.addSpacer(4); txt(lg, s, Font.systemFont(8), C.faint); };
  key(C.gold, Math.round((1 - cr) * 100) + "% cash/card"); lg.addSpacer(10); key(C.violet, Math.round(cr * 100) + "% credit");
  lg.addSpacer(); txt(lg, "Purchases " + fmt0(d.purchMonth), Font.systemFont(8), C.faint);
  w.addSpacer(8);

  // banks
  const banks = (d.banks || []).slice(0, 3), maxB = Math.max(1, ...banks.map(b => Math.abs(b.v)));
  banks.forEach((b, i) => {
    const r = w.addStack(); r.centerAlignContent();
    const nm = r.addStack(); nm.size = new Size(110, 0); txt(nm, b.n.replace(/\s*-\s*Bank/i, "").replace(/\[.*\]/, "").trim(), Font.mediumSystemFont(9), C.muted, 0.7); nm.addSpacer();
    r.addSpacer(6); r.addImage(meter(Math.abs(b.v) / maxB, 110, 5, C.blue)).imageSize = new Size(110, 5);
    r.addSpacer(); txt(r, fmt0(b.v), Font.semiboldRoundedSystemFont(10), C.text);
    if (i < banks.length - 1) w.addSpacer(3);
  });
  w.addSpacer(); footer(w, d);
  return w;
}
function errorWidget(msg) { const w = base(); w.setPadding(14, 14, 14, 14); header(w, {}, false); w.addSpacer(); const r = w.addStack(); icon(r, "exclamationmark.triangle.fill", C.gold, 12); r.addSpacer(6); txt(r, msg, Font.mediumSystemFont(11), C.text, 0.6); w.addSpacer(); return w; }

/* ---------- run ---------- */
const data = await load();
const fam = config.widgetFamily || "large"; FAM = fam;
const hist = data.err ? [] : history(data);
const widget = data.err ? errorWidget(data.err) : fam === "small" ? small(data, hist) : fam === "medium" ? medium(data, hist) : large(data, hist);
if (config.runsInWidget) Script.setWidget(widget);
else if (fam === "small") await widget.presentSmall(); else if (fam === "medium") await widget.presentMedium(); else await widget.presentLarge();
Script.complete();
