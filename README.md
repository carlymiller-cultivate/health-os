# Health OS

Your personal cycle and wellness tracking dashboard. Reads daily Oura data from your Google Sheet (populated by n8n) and shows cycle phase awareness, supplement reminders, Oura metrics, and a daily check-in.

---

## Setup in 4 steps

### Step 1 — Get a Google Sheets API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use your existing n8n project)
3. Go to **APIs & Services → Library**
4. Search for "Google Sheets API" and enable it
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → API key**
7. Copy the key

Your Sheet must be set to "Anyone with the link can view" for the API key to work without OAuth:
- Open your Google Sheet
- Click **Share**
- Change to "Anyone with the link" → Viewer

### Step 2 — Add your API key

Open `src/config.js` and replace:

```js
SHEETS_API_KEY: "YOUR_GOOGLE_SHEETS_API_KEY",
```

with your actual key.

### Step 3 — Make sure your Sheet tabs match

The dashboard reads from:
- Tab named **"Daily Data"** — columns should include: `date`, `readiness`, `hrv_balance`, `temperature_deviation`, `temperature_trend`, `resting_heart_rate`, `sleep_balance`, `activity_balance`
- Tab named **"Cycle History"** — column A is `date` (period start dates)

If your tabs have different names, update `TABS` in `src/config.js`.

### Step 4 — Deploy to Netlify

**Option A: Drag and drop (fastest)**

1. Run `npm install` then `npm run build` in this folder
2. Go to [netlify.com](https://netlify.com) → Sites
3. Drag the `build` folder onto the Netlify drop zone
4. Done — you get a live URL immediately

**Option B: Connect GitHub (recommended for ongoing updates)**

1. Push this folder to a GitHub repo
2. Go to Netlify → Add new site → Import from Git
3. Connect your GitHub repo
4. Build command: `npm run build`
5. Publish directory: `build`
6. Click Deploy

Every time you push a change to GitHub, Netlify redeploys automatically.

---

## Keeping it updated

**Updating cycle start date:**
When your next period starts, open `src/config.js` and update:
```js
lastPeriodStart: "2026-06-07",  // update to your new cycle start
```
Then redeploy (if using GitHub: push the change and Netlify rebuilds automatically).

**Your Oura data:**
n8n populates the Google Sheet daily at 7am. The dashboard reads fresh data every time you open it or click the refresh button — no action needed on your part.

---

## Adding check-in write-back to your Sheet

Currently check-ins are logged to the browser console. To write them back to your Sheet, you need OAuth (not just an API key) because writing requires authentication.

The simplest approach: add a step to your n8n workflow that reads from a separate "Check-ins" sheet. You can paste check-in data there manually, or set up a Google Form that writes to it.

A full OAuth write flow is possible but adds complexity — raise it when you want to tackle it.

---

## File structure

```
health-os/
├── public/
│   └── index.html          # HTML shell
├── src/
│   ├── config.js           # Your personal settings — edit this
│   ├── cycleUtils.js       # All cycle math and phase logic
│   ├── sheetsApi.js        # Google Sheets read/write
│   ├── App.js              # Main dashboard UI
│   ├── App.css             # Styles
│   └── index.js            # React entry point
├── netlify.toml            # Netlify deployment config
└── package.json
```

---

## Weekly debrief

The "Weekly debrief" button opens Claude with a pre-filled prompt containing your current Oura data, cycle day, check-in responses, and cycle history. It asks for pattern analysis and protocol recommendations. Use it once a week, ideally at the same point in your cycle.
