# Saarthi – Your AI Website Guide

**Saarthi (सारथी)** is a simple browser assistant that helps people use websites step by step. It can guide users in **English or Hindi**, explain what to do next, highlight the correct button or box, and read instructions aloud.

The main idea is simple: **Saarthi guides you, but you stay in control.** It never clicks buttons, fills forms, or makes payments for you.

## Main Features

### 1. AI guidance, one step at a time

Tell Saarthi what you want to do, for example, “I want to pay my electricity bill” or “I want to register a complaint”. After you allow AI access, Saarthi looks at the current page and sends the AI the page title, website name, and the names of the visible buttons and form controls.

The AI then:

- Understands your goal and the page you are currently on.
- Suggests **one next step at a time**.
- Tells you whether to click, type, choose an option, scroll, wait, or do something manually.
- Highlights the button or box with a glowing outline, when it can find the right one.
- Finds the next step after you complete the current one. Your progress can continue as you move between pages in the same tab.

Saarthi does not perform the action itself. You must click the highlighted button or enter the information yourself.

### 2. Hindi and English support

You can switch between Hindi and English. The instructions, buttons, risk messages, and voice guidance are available in the selected language.

### 3. Voice guidance and sound effects

Saarthi can speak the current instruction, so you do not have to read every step. Press **“Speak this step”** to hear it. When voice guidance is enabled, later steps can also be spoken. Saarthi uses an AI-generated voice when the voice service is available and can fall back to your browser's speech voice if needed.

It also gives different sound effects for different actions:

- **Bell:** you pressed the correct button or completed the right step.
- **Coins:** the step is related to payment.
- **Buzzer:** you pressed a different button by mistake.
- **Home sound:** the Home option was used or highlighted.

A small message and icon also appear with the sound. On supported devices, Saarthi may give a short vibration too. The sound button lets you turn these effects on or off.

**Voice note:** Each step has its own spoken instruction, and the sound effects change according to the action. The current project uses one configured default AI speaking voice for narration; it does not assign a completely different speaking voice to every single step.

### 4. “What details did I enter?” review

Before pressing the highlighted website button, you can select **“What details did I enter?”**. Saarthi opens two cards:

**Details you entered:** It checks the current page when you press the button and shows information such as ordinary text-box values, selected drop-down options, and ticked checkboxes or radio buttons. It can also show useful bill details and the amount displayed on a payment page.

**What happens next:** It explains what the highlighted website button is expected to do and shows a risk level. You can press **“Check again”** to refresh the details after making changes.

This review button does not click the website button or submit the form. Close the cards when you have checked the information, then press the highlighted website button yourself when you are ready.

### 5. Risk measurement

Saarthi gives the next action a simple risk level to help you pause and check before continuing:

| Risk level | What it generally means |
|---|---|
| 🟢 **Low** | Opening a page, looking at information, or moving to another section. |
| 🟡 **Medium** | Sending or saving details, submitting an application or complaint, or making a change that may take effort to undo. |
| 🔴 **High** | Paying or confirming a payment, a final action that may be hard to undo, or a step where sensitive payment/OTP details have been entered. |

The risk level uses the AI's suggestion, the words on the button, and whether certain sensitive boxes are filled. For example, a payment confirmation is treated as high risk. If an OTP is filled in, or card details are filled along with CVV or expiry, the displayed risk can increase.

Risk measurement is a warning to help you make a careful choice. It is **not a guarantee that a website or transaction is safe**. Always check the website address, details, and amount yourself.

### 6. Privacy and safety

Saarthi is designed to avoid sending private form information to the AI:

- Saarthi never reads the characters typed into password, PIN, OTP, CVV, card-number, or expiry boxes for AI guidance.
- When you open the details review, secret boxes are shown only as **hidden** and whether they are filled or empty. Their actual contents are not displayed.
- Long number strings, such as account or phone numbers, are masked in the review.
- The details review is only prepared when you ask for it. Its contents are shown inside Saarthi and are not saved or sent to the AI.
- The AI receives your goal and information such as the website host, page title, screen name, and visible control labels. It does not receive the values you typed into the website's fields.
- Saarthi asks for permission before using the AI service. If you do not allow it, AI guidance will not start.
- The AI key is kept on the proxy server, not inside the browser extension.

Do not type an OTP, PIN, password, CVV, or card number into Saarthi's goal box. Enter private details only into the correct website yourself.

### 7. More helpful features

- **Where am I?** Helps identify the current page or screen.
- **What have I done?** Shows a short history of the guidance steps completed.
- **Take me home:** Highlights the website's Home link when Saarthi can find it. It does not press the link for you.
- **Text size:** Lets you make the Saarthi panel easier to read.
- **Continue across pages:** In the browser extension, your task can follow you as you move to another page in the same tab.
- **ON/OFF control:** Click the Saarthi extension icon in the browser toolbar to turn it on or off for the current tab.

## How to Use Saarthi

### Install the browser extension

1. Extract the project ZIP file.
2. Open Google Chrome and visit `chrome://extensions`. In Microsoft Edge, visit `edge://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the project's **`saarthi/extension`** folder. Select the folder that contains `manifest.json`, not the whole project folder.
6. Open the website where you need help. Click the Saarthi icon in the browser toolbar. Its badge should show **ON** for that tab.
7. Click the round Saarthi button on the page, choose your language, and tell it what you want to do.
8. The first time AI guidance is needed, read the permission message and choose **“Yes, allow”** to continue.

### Try the demo website

Open `saarthi/saarthi_demowebsite/index.html` in your browser and choose **“Try Demo Bijli Seva”**. The demo includes examples such as bill services, complaints, new connections, tariff information, and solar connection information.

The demo payment flow is only for practice. **Do not enter a real card number, CVV, OTP, or other real payment information. No real money is transferred by the demo.**

## How the AI and Voice Service Work

The browser extension sends a request through the project's background script to a **Cloudflare Worker proxy**. The proxy communicates with **Google Gemini** to choose the next step. The voice feature uses Gemini text-to-speech to create spoken guidance. If cloud voice audio is unavailable, Saarthi tries the browser's built-in speech feature instead.

The extension is already configured with a proxy address in `extension/background.js`. The AI and cloud voice features depend on that proxy being online and having a valid Gemini API key configured. If you deploy your own proxy, keep the API key as a Cloudflare secret and update `PROXY_URL` in `extension/background.js` to your deployed `/api/next-step` address.

For your own proxy deployment, open a terminal in `saarthi/saarthi-proxy/saarthi-ext/proxy` and run:

```bash
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

After deployment, copy the Worker URL and update `PROXY_URL` in `extension/background.js`. Do not put your Gemini API key in the extension or upload it to GitHub.

## Project Structure

```text
saarthi/
├── extension/                     # Chrome / Edge browser extension
│   ├── manifest.json
│   ├── background.js               # Extension controls and safe AI requests
│   ├── raasta.js                   # Saarthi panel, guidance, voice and risk cards
│   └── icons/
├── saarthi-proxy/
│   └── saarthi-ext/proxy/          # Cloudflare Worker and Gemini connection
│       ├── worker.js
│       ├── prompt.js
│       ├── wrangler.toml
│       └── package.json
├── saarthi_demowebsite/            # Demo launcher and electricity-service demo
│   ├── index.html
│   ├── portal.html
│   └── raasta.js
└── tests/                          # Project tests
```

## Technologies Used

- JavaScript, HTML, and CSS
- Chrome Extension Manifest V3
- Google Gemini for next-step guidance
- Gemini text-to-speech for AI voice guidance
- Cloudflare Workers for the AI proxy
- Browser Speech Synthesis as a voice fallback

## Important Reminder

Saarthi is a guide, not an automatic website operator or a payment app. It helps explain the next action, highlights where to go, and warns about possible risks. **You are always responsible for checking the information and deciding whether to press the website button.**
