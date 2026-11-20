// Malwa Financial Summary — Scriptable home-screen widget (small / medium / large).
// Reads data.enc from GitHub (encrypted) and decrypts it on the phone.
// Shows this month's net sales split by Cash / KNET / WAMD / Credit, plus balances.
// Tap opens the Malwa Account Book.
const KEY = "__MW_KEY__";
const URL_DATA = "https://raw.githubusercontent.com/nawaderksm53-gif/Malwa-Widget/main/data.enc";
const APP = "https://claude.ai/artifact/S61xYX8NNjV9vhdLrwz2hL";
// Logo badge: 1 = solid gold, 2 = cream with gold ring, 3 = gold "M" monogram, 4 = your own logo image (set LOGO_URL)
const LOGO_STYLE = 1;
const LOGO_URL = ""; // e.g. a PNG of the Malwa logo; used when LOGO_STYLE = 4

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
C.sky = new Color("#8cc8ff"); C.teal = new Color("#6fd8c9");

/* ---------- number formats ---------- */
const sign = v => (v < 0 ? "−" : "");
const fmt3 = v => sign(v) + Math.abs(v || 0).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmt0 = v => sign(v) + Math.round(Math.abs(v || 0)).toLocaleString("en-US");
const short = v => { const a = Math.abs(v || 0); return sign(v) + (a >= 1e6 ? (a / 1e6).toFixed(2) + "M" : a >= 1e4 ? (a / 1e3).toFixed(1) + "K" : Math.round(a).toLocaleString("en-US")); };

/* ---------- data ---------- */
const fm = FileManager.local(), dir = fm.documentsDirectory();
const CACHE = fm.joinPath(dir, "malwa-widget.enc");
async function load() {
  let blob = null, live = true;
  try { const r = new Request(URL_DATA + "?t=" + Date.now()); r.timeoutInterval = 15; blob = (await r.loadString()).trim(); if (!/^[A-Za-z0-9+/=]+$/.test(blob)) throw 0; fm.writeString(CACHE, blob); }
  catch (e) { live = false; if (fm.fileExists(CACHE)) blob = fm.readString(CACHE).trim(); }
  if (!blob) return { err: "No data yet — check connection" };
  try { return Object.assign(MWCrypto.open(KEY, blob), { live }); } catch (e) { return { err: "Can't read data (" + (e.message || e) + ")" }; }
}
/* ---------- drawing helpers ---------- */
function ctx(w, h) { const c = new DrawContext(); c.size = new Size(w, h); c.opaque = false; c.respectScreenScale = true; return c; }
function round(c, x, y, w, h, r, col) { const p = new Path(); p.addRoundedRect(new Rect(x, y, w, h), r, r); c.addPath(p); c.setFillColor(col); c.fillPath(); }
function splitBar(parts, w, h) { // parts: [{v, col}]
  const c = ctx(w, h), tot = parts.reduce((s, p) => s + Math.max(0, p.v), 0) || 1;
  round(c, 0, 0, w, h, h / 2, C.line); let x = 0;
  parts.forEach(p => { const pw = Math.max(0, p.v) / tot * w; if (pw > 0.5) { round(c, x, 0, Math.max(pw, h), h, h / 2, p.col); } x += pw; });
  return c.getImage();
}
function meter(frac, w, h, col) { const c = ctx(w, h); round(c, 0, 0, w, h, h / 2, C.line); if (frac > 0) round(c, 0, 0, Math.max(h, w * Math.min(1, frac)), h, h / 2, col); return c.getImage(); }
function icon(stack, name, col, size) { const s = SFSymbol.named(name); if (!s) return; s.applyFont(Font.semiboldSystemFont(size)); const i = stack.addImage(s.image); i.tintColor = col; i.imageSize = new Size(size + 2, size + 2); }

/* ---------- background ---------- */
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

/* ---------- building blocks ---------- */
function txt(stack, s, font, col, scale) { const t = stack.addText(s); t.font = font; t.textColor = col; t.lineLimit = 1; if (scale) t.minimumScaleFactor = scale; return t; }
function dateLabel(iso) { const [y, m, dd] = iso.split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
let LOGO_IMG = null;
async function loadLogo() { if (LOGO_STYLE !== 4 || !LOGO_URL) return; try { LOGO_IMG = await new Request(LOGO_URL).loadImage(); } catch (e) { LOGO_IMG = null; } }
function logo(h, small) {
  const z = small ? 24 : 30, b = h.addStack(); b.size = new Size(z, z); b.centerAlignContent();
  const style = LOGO_STYLE === 4 && !LOGO_IMG ? 1 : LOGO_STYLE;
  if (style === 4) { b.cornerRadius = 8; b.backgroundColor = Color.white(); const i = b.addImage(LOGO_IMG); i.imageSize = new Size(z - 4, z - 4); i.applyFittingContentMode(); return; }
  if (style === 3) { b.cornerRadius = z / 2; b.backgroundColor = C.gold; b.addSpacer(); txt(b, "M", new Font("Georgia-Bold", small ? 15 : 18), new Color(C.m3)); b.addSpacer(); return; }
  b.cornerRadius = small ? 7 : 9;
  if (style === 2) { b.backgroundColor = C.text; b.borderColor = C.gold; b.borderWidth = 2; } else b.backgroundColor = C.gold;
  b.addSpacer(); icon(b, "chart.line.uptrend.xyaxis", new Color(style === 2 ? C.m1 : C.m3), small ? 12 : 14); b.addSpacer();
}
function header(w, d, small) {
  const h = w.addStack(); h.centerAlignContent();
  logo(h, small);
  h.addSpacer(7);
  const t = h.addStack(); t.layoutVertically();
  txt(t, "MALWA", Font.heavySystemFont(small ? 12 : 14), C.text);
  if (!small) txt(t, "Financial Summary", Font.mediumSystemFont(10), C.muted);
  h.addSpacer();
  if (!small && d.asOf) {
    const pill = h.addStack(); pill.setPadding(3, 8, 3, 8); pill.cornerRadius = 10; pill.backgroundColor = C.tile; pill.centerAlignContent();
    const dot = pill.addStack(); dot.size = new Size(6, 6); dot.cornerRadius = 3; dot.backgroundColor = d.live ? C.green : C.gold; pill.addSpacer(5);
    txt(pill, dateLabel(new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)), Font.semiboldSystemFont(10), C.muted);
  }
}
// sales split: falls back to the book's own month figures if the split isn't in the data yet
function sales(d) {
  const ms = d.ms;
  if (ms) return { label: ms.label, net: ms.net, parts: [["Cash", ms.cash, C.gold], ["KNET", ms.knet, C.sky], ["WAMD / Link", ms.wamd, C.teal], ["Credit", ms.credit, C.rose]].concat(ms.other ? [["Other", ms.other, C.cream]] : []) };
  const net = d.salesMonth || 0, cr = net * (d.creditPctMonth || 0) / 100;
  return { label: d.month, net, parts: [["Cash / bank", net - cr, C.gold], ["Credit", cr, C.rose]] };
}
const pct = (v, t) => (t > 0 ? Math.round(v / t * 100) : 0) + "%";
function salesHead(w, d, big) {
  const S = sales(d), r = w.addStack(); r.centerAlignContent();
  txt(r, ((S.label || "This month") + " · Net sales").toUpperCase(), Font.semiboldSystemFont(big ? 10 : 9), C.faint, 0.7);
  r.addSpacer();
  if (big) { const pc = (d.profitMonth || 0) < 0 ? C.red : C.green, chip = r.addStack(); chip.setPadding(3, 8, 3, 8); chip.cornerRadius = 9; chip.backgroundColor = new Color(pc.hex, 0.18);
    txt(chip, "Profit " + fmt3(d.profitMonth), Font.semiboldSystemFont(11), pc, 0.7); }
  w.addSpacer(2);
  const n = w.addStack(); n.bottomAlignContent(); const [ip, fp] = fmt3(S.net).split(".");
  txt(n, ip, Font.boldRoundedSystemFont(big ? 30 : 26), C.text, 0.5); txt(n, "." + fp, Font.semiboldRoundedSystemFont(big ? 16 : 14), C.muted);
  n.addSpacer(5); txt(n, "KWD", Font.semiboldSystemFont(big ? 11 : 9), C.faint);
  return S;
}
function legend(w, S, cols, fs, compact) {
  const tot = S.parts.reduce((s, p) => s + Math.max(0, p[1]), 0);
  for (let i = 0; i < S.parts.length; i += cols) {
    const r = w.addStack(); r.centerAlignContent();
    S.parts.slice(i, i + cols).forEach(([l, v, c], j) => {
      if (j) r.addSpacer(10);
      const cell = r.addStack(); cell.centerAlignContent();
      const dot = cell.addStack(); dot.size = new Size(7, 7); dot.cornerRadius = 3.5; dot.backgroundColor = c; cell.addSpacer(5);
      txt(cell, l, Font.mediumSystemFont(fs), C.muted, 0.7); cell.addSpacer();
      txt(cell, (compact ? short(v) : fmt3(v)) + "  ", Font.semiboldRoundedSystemFont(fs), C.text, 0.6);
      txt(cell, pct(v, tot), Font.semiboldSystemFont(fs - 1), c);
    });
    if (i + cols < S.parts.length) w.addSpacer(4);
  }
}
function tile(parent, sym, col, label, value, valCol, w, h) {
  const t = parent.addStack(); t.size = new Size(w, h); t.cornerRadius = 12; t.setPadding(5, 9, 5, 8); t.centerAlignContent();
  t.backgroundColor = new Color(col.hex, 0.16); t.borderColor = new Color(col.hex, 0.45); t.borderWidth = 1;
  const b = t.addStack(); b.size = new Size(24, 24); b.cornerRadius = 12; b.backgroundColor = new Color(col.hex, 0.22); b.centerAlignContent(); b.addSpacer(); icon(b, sym, col, 10); b.addSpacer();
  t.addSpacer(8);
  const v = t.addStack(); v.layoutVertically();
  txt(v, label, Font.semiboldSystemFont(10), col, 0.7);
  v.addSpacer(1);
  txt(v, value, Font.boldRoundedSystemFont(16), C.text, 0.55);
  t.addSpacer();
}
function sup(d) { const v = d.sup || 0; return v < 0 ? { label: "Supplier advance", val: -v, col: C.teal } : { label: "Suppliers owed", val: v, col: C.amber }; }
function footer(w, d) {
  const f = w.addStack(); f.centerAlignContent();
  icon(f, d.live ? "lock.fill" : "wifi.slash", C.faint, 8); f.addSpacer(4);
  const at = d.pub ? new Date(d.pub) : null;
  txt(f, (d.live ? "Encrypted" : "Offline") + " · updated " + (at ? at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"), Font.systemFont(10), C.faint, 0.7);
  f.addSpacer();
  if (d.review) { icon(f, "exclamationmark.triangle.fill", C.gold, 9); f.addSpacer(3); txt(f, d.review + " in Review", Font.semiboldSystemFont(10), C.gold); }
}
function bar(w, S, width, h) { w.addImage(splitBar(S.parts.map(p => ({ v: p[1], col: p[2] })), width, h)).imageSize = new Size(width, h); }

/* ---------- layouts ---------- */
function small(d) {
  const w = base(); w.setPadding(12, 12, 10, 12);
  header(w, d, true); w.addSpacer(6);
  const S = sales(d);
  txt(w, ((S.label || "").split(" ")[0] + " sales").toUpperCase(), Font.semiboldSystemFont(9), C.faint);
  txt(w, fmt0(S.net), Font.boldRoundedSystemFont(24), C.text, 0.5);
  w.addSpacer(4); bar(w, S, 134, 6); w.addSpacer(6);
  const tot = S.parts.reduce((s, p) => s + Math.max(0, p[1]), 0);
  S.parts.slice(0, 4).forEach(([l, v, c], i) => { const r = w.addStack(); r.centerAlignContent();
    const dot = r.addStack(); dot.size = new Size(6, 6); dot.cornerRadius = 3; dot.backgroundColor = c; r.addSpacer(5);
    txt(r, l.split(" ")[0], Font.systemFont(10), C.muted); r.addSpacer(); txt(r, short(v), Font.semiboldRoundedSystemFont(10), C.text); r.addSpacer(4);
    const p = r.addStack(); p.size = new Size(28, 0); p.addSpacer(); txt(p, pct(v, tot), Font.semiboldSystemFont(9), c);
    if (i < 3) w.addSpacer(2); });
  return w;
}
function medium(d) {
  const w = base(); w.setPadding(12, 14, 10, 14);
  header(w, d, false); w.addSpacer(6);
  const S = salesHead(w, d, false); w.addSpacer(5);
  bar(w, S, 310, 7); w.addSpacer(6);
  legend(w, S, 2, 10, true);
  return w;
}
function large(d) {
  const w = base(); w.setPadding(14, 16, 12, 16); const P = sup(d);
  header(w, d, false); w.addSpacer(7);
  const S = salesHead(w, d, true); w.addSpacer(5);
  bar(w, S, 306, 8); w.addSpacer(6);
  legend(w, S, 2, 10, false); w.addSpacer(8);
  const r1 = w.addStack(); tile(r1, "banknote.fill", C.gold, "Cash in hand", fmt3(d.cash), null, 149, 46); r1.addSpacer(8); tile(r1, "building.columns.fill", C.sky, "Bank total", fmt3(d.bankTot), null, 149, 46);
  w.addSpacer(6);
  const r2 = w.addStack(); tile(r2, "person.2.fill", C.green, "Customers owe", fmt3(d.owe), null, 149, 46); r2.addSpacer(8); tile(r2, "shippingbox.fill", P.col, P.label, fmt3(P.val), null, 149, 46);
  w.addSpacer(8);
  const banks = (d.banks || []).slice(0, 3), maxB = Math.max(1, ...banks.map(b => Math.abs(b.v)));
  banks.forEach((b, i) => {
    const r = w.addStack(); r.centerAlignContent();
    const nm = r.addStack(); nm.size = new Size(96, 0); txt(nm, b.n.replace(/\s*-\s*Bank/i, "").replace(/\[.*\]/, "").replace(/\s*-\s*.*/, "").trim(), Font.mediumSystemFont(11), C.muted, 0.7); nm.addSpacer();
    r.addSpacer(6); r.addImage(meter(Math.abs(b.v) / maxB, 120, 6, C.cream)).imageSize = new Size(120, 6);
    r.addSpacer(); txt(r, fmt0(b.v), Font.semiboldRoundedSystemFont(12), C.text);
    if (i < banks.length - 1) w.addSpacer(3);
  });
  w.addSpacer(); footer(w, d);
  return w;
}
function errorWidget(msg) { const w = base(); w.setPadding(14, 14, 14, 14); header(w, {}, false); w.addSpacer(); const r = w.addStack(); icon(r, "exclamationmark.triangle.fill", C.gold, 12); r.addSpacer(6); txt(r, msg, Font.mediumSystemFont(11), C.text, 0.6); w.addSpacer(); return w; }

/* ---------- run ---------- */
await loadLogo();
const data = await load();
const fam = config.widgetFamily || "large"; FAM = fam;
const widget = data.err ? errorWidget(data.err) : fam === "small" ? small(data) : fam === "medium" ? medium(data) : large(data);
if (config.runsInWidget) Script.setWidget(widget);
else if (fam === "small") await widget.presentSmall(); else if (fam === "medium") await widget.presentMedium(); else await widget.presentLarge();
Script.complete();
