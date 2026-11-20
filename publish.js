// Usage: MW_KEY=<64 hex> node publish.js snapshot.json   -> writes data.enc
const fs = require("fs"), crypto = require("crypto"), { seal } = require("./mwcrypto.js");
const key = process.env.MW_KEY;
if (!/^[0-9a-f]{64}$/.test(key || "")) throw new Error("MW_KEY missing");
const snap = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (snap.biz !== "Malwa") throw new Error("snapshot is not the Malwa book");
snap.pub = Date.now();
fs.writeFileSync(__dirname + "/data.enc", seal(key, snap, new Uint8Array(crypto.randomBytes(12))) + "\n");
console.log("ok", snap.asOf);
