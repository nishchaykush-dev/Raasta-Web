# Learn It First 🛡️

**Practise websites safely before you use the real ones.**

Learn It First is a free practice app for people who are new to the internet, especially first-time and older users. You can practise things like shopping, banking, booking tickets, or using government services on a **practice copy** of a website. Nothing is real. No money moves, and nothing you type leaves the page.

A friendly AI coach guides you step by step, in **English or Hindi**.

---

## ✨ What can it do?

- **Practice websites:** Paste a link to a real website (for example a shopping or government site). The app builds a safe practice version of it for you.
- **Glowing ring guide:** A glowing orange ring shows you exactly where to click or type.
- **Helpful coach:** If you get stuck, the coach gives a short, simple hint. Press **More detail** to get slower, step-by-step help.
- **Ask a question:** Type or speak a question like *"What is an OTP?"* and get a short, simple answer.
- **Voice guidance:** The app can read the instructions out loud.
- **English and Hindi:** Switch language with one button.
- **Adapts to you:** If you go slowly or make mistakes, the coach uses simpler words and gives extra help.
- **Safety tips:** The coach reminds you never to share OTPs, passwords, or card numbers.
- **Featured practice:** A full demo of applying for an *Ayushman Bharat Card* on a government-style portal (menu, OTP, form, and receipt).
- **Light and dark mode** and a **text size / contrast** option.

---

## 🧰 Built with

- **Node.js** and **Express** (the server)
- **Google Gemini** (the AI coach), using the `@google/genai` package
- Plain **HTML, CSS and JavaScript** (the app screen)

---

## 📁 What is inside

```
Learn It First/
├── server.js                      # The server and the AI coach logic
├── package.json                   # Project info and dependencies
├── package-lock.json
├── .env                           # Your secret API key (do NOT share this)
└── public/
    └── safe-website-practice.html # The whole app screen
```

---

## 🚀 How to run it on your computer

### 1. What you need first

- [Node.js](https://nodejs.org/) version **18.18 or newer**
- A free **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)

### 2. Download the project

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
```

### 3. Install the packages

```bash
npm install
```

### 4. Add your API key

Create a file named `.env` in the main folder and add this line:

```
GEMINI_API_KEY=your_key_here
```

You can also choose a different port (optional):

```
PORT=3000
```

### 5. Start the app

```bash
npm start
```

Now open your browser and go to **http://localhost:3000** 🎉

> Tip: Use `npm run dev` while you are making changes. It restarts the server automatically.

---

## 🧑‍🎓 How to use it

1. Open the app.
2. Paste a website link, or tap one of the quick buttons: **Shopping, Banking, Travel, Gov Portal, Gov Services**.
3. Press **Create Mock Site**.
4. Follow the **glowing orange ring** and the coach's instructions.
5. Stuck? Press **More detail** or type your question in the **Ask** box.
6. Finish all steps to earn points and stars ⭐

New here? Press **Show Me How** on the home page for a quick 4-step lesson.

---

## 🔒 Safety and privacy

- Everything in the app is a **practice copy**. Nothing is real.
- Your **API key stays on the server** and is never sent to the browser.
- The app only sends the coach the current step, how long you took, and how many mistakes you made. It does **not** send what you type.
- Website links are checked and cleaned before use. Private or local addresses are blocked.
- There are **rate limits** so nobody can use up your Gemini quota by mistake.
- The AI's answers are checked and rebuilt from allowed pieces only before they are shown.

### ⚠️ Important before you upload to GitHub

Your `.env` file holds your **secret API key**. **Never upload it to GitHub.** Create a file named `.gitignore` in the main folder with this inside:

```
node_modules/
.env
.DS_Store
```

If you have already shared your key by mistake, delete it in Google AI Studio and make a new one.

---

## 🔌 API endpoints (for developers)

| Method | Path | What it does |
|--------|------|--------------|
| `POST` | `/api/adapt-guidance` | Gives a hint or a "More detail" breakdown for the current step |
| `POST` | `/api/ask` | Answers the learner's question |
| `POST` | `/api/plan` | Creates a practice plan for a pasted website link |

The Gemini model name is set at the top of `server.js` (`MODEL`). Change it there if you want to use a different model.

---

## 🤝 Contributing

Ideas and improvements are welcome! Open an issue or send a pull request.

## 📄 License

Add your license here (for example, MIT).

---

*Made to help everyone feel confident and safe online.* 💙
