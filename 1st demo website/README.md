# Demo Bijli Seva Nigam – Electricity Board Portal (Demo)

A pretend electricity-board website built with plain HTML, CSS and JavaScript (no frameworks, no build step, no backend).
**This is a demo: no real money moves and no real data is stored.**

## Features
- Home page, mega-menu navigation, site search
- Consumer services, tariff calculator, forms (new connection, solar connection, complaints, etc.)
- **Quick Pay flow**
  1. Enter 10-digit consumer account number
  2. View bill details → **Proceed to Pay**
  3. Enter card details (number, holder name, expiry, CVV) with live card preview and validation
  4. Enter a 6-digit OTP within a **5-minute** timer (resend after 30 s, 3 attempts)
  5. Circular-arrow processing screen
  6. Payment receipt with a note that the amount is credited within 24 hours
- Responsive layout, light and dark mode

> In demo mode no SMS is sent, so the OTP is shown on screen. Only dummy card details should be used.

## Project structure
```
.
├── index.html      # page markup
├── css/style.css   # all styles
├── js/app.js       # content data, navigation and payment flow
├── README.md
└── .gitignore
```

## Run locally
Open `index.html` in any browser, or serve the folder:
```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy with GitHub Pages
Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
Your site will appear at `https://<your-username>.github.io/<repo-name>/`.

## Disclaimer
Fictional organisation created for a hackathon/demo. Any resemblance to a real utility is unintentional.
