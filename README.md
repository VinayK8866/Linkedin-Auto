# LinkedIn Intelligence & Automation Suite

A local-first, human-in-the-loop automation platform for personal LinkedIn growth, surgical outreach, and high-signal feed engagement. Designed for 2026 feed dynamics with strict account safety guards.

---

## Key Highlights

- **Stealth Browser Automation**: Uses your real local Google Chrome binary (`/usr/bin/google-chrome`) with persistent session storage (`data/browser_profile`). Log in once with full 2FA; your session stays valid without storing plain-text passwords.
- **Human-in-the-Loop Review Queue**: AI generates post drafts, personalized connection notes, and comments, but **nothing is published or sent** without your one-click approval.
- **Integrated 2026 Content Engineering**: Built around the 20 proven 2026 hook formulas (F1–F20) and 10 Founder angles (A1–A10) from `sergebulaev/linkedin-skills`.
- **Deterministic Humanizer & Slop Cleaner**: Powered by zero-dependency Python utilities (`humanize.py` & `detect.py`) from `Jakeschincariol/linkedin-agent-skill` that strip zero-width characters, clean 113 corporate AI buzzwords, and score draft burstiness.
- **Document Post (Carousel) Builder**: Generates high-dwell 8–12 slide document posts with cover hooks and screenshot recaps.
- **200-Character Outreach Engine**: Follows the strict `{specific reference} + {who you are} + {no ask}` formula for high connection accept rates.
- **Safety Caps & Working-Hours Throttling**: Hard daily caps (default 15 connections, 20 comments, 2 posts) distributed randomly across your configured working hours (default 9 AM – 6 PM Mon–Fri).

---

## Quick Start

### 1. Start the Local Server
```bash
npm run dev
# Or run with explicit port:
PORT=3000 npx tsx src/backend/server.ts
```

Open your browser to:
```
http://localhost:3000
```

### 2. Log In to LinkedIn Once
1. In the dashboard header, click **"Launch Login Window"**.
2. A real Google Chrome window opens to `https://www.linkedin.com/login`.
3. Log in normally and complete your 2FA verification.
4. Close the browser window. Your authenticated cookies and session tokens are saved permanently to `data/browser_profile`.
5. Click the status badge in the header to confirm **"Session Active"**.

### 3. Configure Your AI Key & Persona
1. Click the **Gear icon** in the top right to open **Settings**.
2. Under **AI Keys**, enter your API key for Google Gemini, OpenAI, or Anthropic Claude.
3. Under **Persona & Voice**, calibrate your professional role, tone keywords, and banned buzzwords.
4. Click **Save Settings**.

---

## Feature Tour

### 1. Review Queue (`/`)
- View cards for all drafted posts, connection notes, and comments.
- One-click **Approve** or **Reject**.
- Click **Edit** to adjust copy directly before approval.
- Hit **"Dispatch Next Approved"** to immediately trigger execution via the stealth runner, or enable **Auto-Schedule** in settings to let the background worker handle distribution across business hours.

### 2. Post Studio (`/composer`)
- Choose from 20 proven 2026 hook formulas (e.g., *F7 Odd-Precision Money Ledger*, *F10 Contrarian Receipts*, *F17 Controlled A/B*).
- Select a Founder Angle (*Reprice the Category*, *Content-to-Pipeline*, *The Delegation Line*).
- Live preview showing the **210-character line-1 fold** ("...see more") and real-time character sweet-spot counters.
- **Run Humanizer Pass**: Strips invisible watermark characters and scores the text against detection heuristics.

### 3. Carousel Builder (`/carousel`)
- Enter any topic or breakdown to generate an 8–12 slide document post.
- Slide-by-slide copy with strict word limits (max 25 words/slide).
- Queues the full deck directly into the Review Queue.

### 4. Prospect Outreach (`/outreach`)
- Enter prospect names, LinkedIn profile URLs, and specific context.
- Generates a disciplined **under-200-character invite note** without sales pitches.
- Queues the connection request for safe delivery.

### 5. Creator Monitor (`/engagement`)
- Add key industry creator profiles to track.
- Click **"Scan & Queue Comment"**: The stealth browser opens the creator's recent activity, grabs their latest post text, drafts a high-signal comment based on 7 tested templates, and places it in your Review Queue.

---

## Architecture

```
/home/user/Private_View/Vinay/LinkedIn/
├── data/
│   ├── linkedin_auto.db          # Local SQLite DB (queue, prospects, logs)
│   └── browser_profile/          # Persistent Google Chrome session
├── .agents/
│   ├── skills/                   # 15 native skills for AI agents
│   │   ├── linkedin-post-writer/
│   │   ├── linkedin-comment-drafter/
│   │   ├── linkedin-humanizer/
│   │   ├── linkedin-carousel/
│   │   ├── linkedin-dm/
│   │   └── ...
│   ├── references/               # Hook formulas (F1-F20), Founder angles (A1-A10)
│   └── scripts/humanizer/        # Python humanize.py & detect.py
├── src/
│   ├── backend/
│   │   ├── server.ts             # Express REST API
│   │   ├── db.ts                 # SQLite schema & transactional queries
│   │   ├── ai.ts                 # Multi-provider LLM engine (Gemini/OpenAI/Claude)
│   │   ├── automation.ts         # Playwright stealth browser driver
│   │   ├── scheduler.ts          # Humanized business-hours background worker
│   │   └── humanizer.ts          # Python bridge for cleanDraft & scoreDraft
│   └── frontend/
│       ├── src/                  # React + Vanilla CSS dashboard
│       └── dist/client/          # Compiled production assets
└── package.json
```

---

## Safety Guarantees

- **No Credential Scraping**: Your LinkedIn password is never stored or read by any script.
- **Hard Daily Caps**: Enforced in the database layer. Connection requests and comments freeze automatically when the quota is reached.
- **Randomized Jitter**: Actions execute with 60–180 second random delays to mirror authentic human browsing.
- **No Rogue Dispatch**: Nothing leaves your machine without explicit approval in the Review Queue.
