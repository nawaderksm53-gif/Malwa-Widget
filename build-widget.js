// Usage: MW_KEY=<64 hex> node build-widget.js out.js
// Makes the ready-to-paste Scriptable script (key + crypto inlined). Never commit the output.
const fs = require("fs");
const key = process.env.MW_KEY;
if (!/^[0-9a-f]{64}$/.test(key || "")) throw new Error("MW_KEY missing");
const lib = fs.readFileSync(__dirname + "/mwcrypto.js", "utf8");
const out = fs.readFileSync(__dirname + "/widget.template.js", "utf8").replace("__MW_KEY__", key).replace("/*__MWCRYPTO__*/", () => lib);
fs.writeFileSync(process.argv[2], out);
console.log("wrote", process.argv[2]);
