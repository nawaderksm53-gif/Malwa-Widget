// Malwa widget crypto: ChaCha20 + HMAC-SHA256 (encrypt-then-MAC), pure JS.
// Runs unchanged in Node and in Scriptable (no WebCrypto there).
// Blob = base64( nonce[12] | ciphertext | tag[32] ).  Key = 32 bytes (64 hex).
(function (root) {
  const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  function sha256(msg) {
    const l = msg.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
    m.set(msg); m[l] = 0x80;
    const bits = l * 8; m[nb - 4] = bits >>> 24; m[nb - 3] = bits >>> 16; m[nb - 2] = bits >>> 8; m[nb - 1] = bits;
    m[nb - 5] = Math.floor(l / 0x20000000);
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    const W = new Uint32Array(64);
    for (let o = 0; o < nb; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = (m[o+4*i] << 24) | (m[o+4*i+1] << 16) | (m[o+4*i+2] << 8) | m[o+4*i+3];
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i-15],7) ^ rotr(W[i-15],18) ^ (W[i-15] >>> 3);
        const s1 = rotr(W[i-2],17) ^ rotr(W[i-2],19) ^ (W[i-2] >>> 10);
        W[i] = (W[i-16] + s0 + W[i-7] + s1) | 0;
      }
      let [a,b,c,d,e,f,g,h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rotr(e,6) ^ rotr(e,11) ^ rotr(e,25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const t2 = ((rotr(a,2) ^ rotr(a,13) ^ rotr(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0]+=a; H[1]+=b; H[2]+=c; H[3]+=d; H[4]+=e; H[5]+=f; H[6]+=g; H[7]+=h;
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i++) { out[4*i] = H[i] >>> 24; out[4*i+1] = H[i] >>> 16; out[4*i+2] = H[i] >>> 8; out[4*i+3] = H[i]; }
    return out;
  }
  const cat = (...a) => { const r = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let o = 0; a.forEach(x => { r.set(x, o); o += x.length; }); return r; };
  function hmac(key, msg) {
    if (key.length > 64) key = sha256(key);
    const k = new Uint8Array(64); k.set(key);
    const ip = k.map(x => x ^ 0x36), op = k.map(x => x ^ 0x5c);
    return sha256(cat(op, sha256(cat(ip, msg))));
  }
  const utf8 = s => { const e = unescape(encodeURIComponent(s)), r = new Uint8Array(e.length); for (let i = 0; i < e.length; i++) r[i] = e.charCodeAt(i); return r; };
  const unutf8 = b => { let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return decodeURIComponent(escape(s)); };
  function chacha20(key, nonce, data) {
    const rd = (b, i) => b[i] | (b[i+1] << 8) | (b[i+2] << 16) | (b[i+3] << 24);
    const st = new Uint32Array(16);
    st[0]=0x61707865; st[1]=0x3320646e; st[2]=0x79622d32; st[3]=0x6b206574;
    for (let i = 0; i < 8; i++) st[4+i] = rd(key, 4*i);
    st[12] = 1; st[13] = rd(nonce,0); st[14] = rd(nonce,4); st[15] = rd(nonce,8);
    const out = new Uint8Array(data.length), x = new Uint32Array(16);
    const rl = (v, n) => (v << n) | (v >>> (32 - n));
    const qr = (a,b,c,d) => { x[a]+=x[b]; x[d]=rl(x[d]^x[a],16); x[c]+=x[d]; x[b]=rl(x[b]^x[c],12); x[a]+=x[b]; x[d]=rl(x[d]^x[a],8); x[c]+=x[d]; x[b]=rl(x[b]^x[c],7); };
    for (let o = 0; o < data.length; o += 64) {
      x.set(st);
      for (let i = 0; i < 10; i++) { qr(0,4,8,12); qr(1,5,9,13); qr(2,6,10,14); qr(3,7,11,15); qr(0,5,10,15); qr(1,6,11,12); qr(2,7,8,13); qr(3,4,9,14); }
      for (let i = 0; i < 16; i++) x[i] += st[i];
      for (let i = 0; i < 64 && o + i < data.length; i++) out[o+i] = data[o+i] ^ ((x[i >> 2] >>> (8 * (i & 3))) & 255);
      st[12]++;
    }
    return out;
  }
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function toB64(b) { let s = ""; for (let i = 0; i < b.length; i += 3) { const n = (b[i] << 16) | ((b[i+1]||0) << 8) | (b[i+2]||0); s += B64[n>>18&63] + B64[n>>12&63] + (i+1 < b.length ? B64[n>>6&63] : "=") + (i+2 < b.length ? B64[n&63] : "="); } return s; }
  function fromB64(s) { s = s.replace(/[^A-Za-z0-9+/]/g, ""); const out = []; let buf = 0, bits = 0; for (const ch of s) { buf = (buf << 6) | B64.indexOf(ch); bits += 6; if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } } return new Uint8Array(out); }
  function hexKey(hex) { if (!/^[0-9a-f]{64}$/.test(hex || "")) throw new Error("key must be 64 lowercase hex"); const k = new Uint8Array(32); for (let i = 0; i < 32; i++) k[i] = parseInt(hex.substr(2*i, 2), 16); return k; }
  const subkeys = k => ({ enc: hmac(k, utf8("malwa-enc")), mac: hmac(k, utf8("malwa-mac")) });
  function seal(hex, obj, nonce) {
    const s = subkeys(hexKey(hex)), ct = chacha20(s.enc, nonce, utf8(JSON.stringify(obj)));
    return toB64(cat(nonce, ct, hmac(s.mac, cat(nonce, ct))));
  }
  function open(hex, blob) {
    const s = subkeys(hexKey(hex)), b = fromB64(blob);
    if (b.length < 44) throw new Error("data too short");
    const nonce = b.slice(0, 12), ct = b.slice(12, b.length - 32), tag = b.slice(b.length - 32), want = hmac(s.mac, cat(nonce, ct));
    let d = 0; for (let i = 0; i < 32; i++) d |= tag[i] ^ want[i];
    if (d) throw new Error("wrong key or damaged data");
    return JSON.parse(unutf8(chacha20(s.enc, nonce, ct)));
  }
  const api = { seal, open, sha256, hmac };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.MWCrypto = api;
})(this);
