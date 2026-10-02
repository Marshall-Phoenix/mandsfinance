# Mukul & Sylwia household money

Private website for managing household money together. Live at https://mandsfinance.netlify.app

- Plain HTML, CSS and JavaScript. No build step.
- Data and sign in: Firebase (Firestore and Authentication), project `mukul-sylwia`.
- `config.js` holds the Firebase web config (public identifiers, not secrets). Access is restricted by Firestore rules to the two household emails.
- `firebase.js` is the Firebase SDK 12.19.0 bundled into one file.
- `demo.js` holds sample numbers used only when `config.js` is null.
- Every push to `main` deploys to Netlify automatically.
