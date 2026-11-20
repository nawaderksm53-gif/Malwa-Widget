# Malwa-Widget

Holds `data.enc`, an encrypted snapshot of the Malwa Account Book, read by a Scriptable home-screen widget ("Malwa Financial Summary") on iPhone. Kept separate from the Nawader widget.

The file is unreadable without the key, which lives only in the widget script on the phone and in the nightly update task — never in this repo.

- `mwcrypto.js` — ChaCha20 + HMAC-SHA256, pure JS (runs in Node and Scriptable)
- `publish.js` — `MW_KEY=<64 hex> node publish.js snapshot.json` → writes `data.enc`
- `widget.template.js` — the widget source, with the key and crypto left as placeholders
- `build-widget.js` — `MW_KEY=<64 hex> node build-widget.js out.js` → ready-to-paste Scriptable script (do not commit)

Snapshot source: the Malwa Account Book's `config/widget` document, refreshed once a day at 11:30 PM Kuwait time.
