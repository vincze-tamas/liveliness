# iOS Shortcut Setup Guide

This guide walks you through creating the iOS Shortcut that bridges Apple Health data to Liveliness. The Shortcut runs automatically every morning and sends yesterday's health metrics + any new workouts to the backend.

## Requirements
- iPhone with iOS 16 or later
- Liveliness backend running and reachable from your iPhone
- Shortcuts app (built-in on iOS 16+)

## Option A — Same network (home WiFi)

Your iPhone and the machine running Liveliness must be on the same local network.

1. Find your computer's local IP address:
   - macOS: System Settings → Network → your WiFi adapter → IP address (e.g. `192.168.1.42`)
   - Linux: `ip addr show` or `hostname -I`

2. Your backend endpoint will be: `http://192.168.1.42:8000/api/health/sync`

## Option B — Remote access via Tailscale (recommended)

[Tailscale](https://tailscale.com) creates a private WireGuard network so the Shortcut works anywhere, not just at home.

1. Install Tailscale on your computer and your iPhone.
2. Sign in with the same account on both.
3. Find your computer's Tailscale IP in the Tailscale app (e.g. `100.64.0.5`).
4. Your endpoint: `http://100.64.0.5:8000/api/health/sync`

---

## Creating the Shortcut

### Step 1 — Open Shortcuts and create a new shortcut

1. Open the **Shortcuts** app.
2. Tap **+** (top right) to create a new shortcut.
3. Tap the title at the top and rename it to **"Liveliness Sync"**.

### Step 2 — Add HealthKit data actions

Add one **"Find Health Samples"** action for each metric below.
For each: tap **+** → search "Find Health Samples" → configure as shown.

| Metric | HealthKit type | Date filter |
|---|---|---|
| HRV | Heart Rate Variability (SDNN or RMSSD) | Last 1 day |
| Resting HR | Resting Heart Rate | Last 1 day |
| Weight | Body Mass | Last 1 day |
| Sleep | Sleep Analysis | Last 1 day |
| Steps | Steps | Yesterday (all day) |
| Active Energy | Active Energy Burned | Yesterday (all day) |
| Blood Oxygen | Oxygen Saturation | Last 1 day |

Also add:
- **"Find Workouts"** → Date: Yesterday → Sort by: Start Date descending

### Step 3 — Build the JSON payload

Add a **"Text"** action and paste the following template.
Use "Insert Variable" to replace each `<…>` placeholder with the corresponding HealthKit variable from the actions above.

```
{
  "date": "<Current Date (ISO 8601)>",
  "hrv_ms": <HRV Samples — first value>,
  "resting_hr": <Resting HR Samples — first value>,
  "weight_kg": <Body Mass Samples — first value>,
  "sleep_hours": <Sleep Samples — sum of durations in hours>,
  "steps": <Steps Samples — sum>,
  "active_energy_kcal": <Active Energy Samples — sum>,
  "blood_oxygen_pct": <Oxygen Saturation Samples — first value>,
  "workouts": <Workouts — as JSON>
}
```

> **Tip:** For numeric values where no sample exists, use `null` rather than leaving the field empty — the backend handles null gracefully.

### Step 4 — POST to the backend

1. Add a **"Get Contents of URL"** action.
2. Set **URL** to your backend endpoint (from Option A or B above): `http://<your-ip>:8000/api/health/sync`
3. Set **Method** to `POST`.
4. Set **Request Body** to `JSON`.
5. Add one key `payload` with the **Text** variable from Step 3 as the value.

   Alternatively, set Request Body to **File** and pass the text directly — the backend accepts raw JSON body.

### Step 5 — Add to Automations (runs daily automatically)

1. Go to the **Automation** tab in Shortcuts.
2. Tap **+** → **Personal Automation**.
3. Choose **Time of Day** → set to **7:00 AM** → **Daily**.
4. Add action: **Run Shortcut** → select "Liveliness Sync".
5. Disable **"Ask Before Running"** so it runs silently.

---

## Fallback: Apple Health XML Export (bulk historical import)

Use this to import all your historical data at once.

1. On your iPhone: **Health app** → tap your profile picture (top right) → **Export All Health Data**.
2. This creates an `export.zip` (~100 MB or more). Share it to your computer.
3. In the Liveliness app: go to **Profile → Import Health Data** → upload the ZIP file.
4. The backend will parse `export.xml` in the background (may take several minutes for large exports).

---

## Testing the Shortcut manually

To verify the Shortcut works before setting up automation:

1. Open the **Liveliness Sync** shortcut.
2. Tap the ▶ play button.
3. Check the backend logs: `docker compose logs -f backend`
4. You should see a `POST /api/health/sync 200` log line.
5. Open the Liveliness dashboard — today's health metrics should appear.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Could not connect" error | Verify the IP address; ensure backend is running (`docker compose ps`) |
| Shortcut asks for permission | Approve HealthKit access for Shortcuts in iPhone Settings → Privacy & Security → Health → Shortcuts |
| No HRV data | HRV is only recorded if you use a chest strap or Garmin's morning HRV measurement |
| Workouts not appearing | Ensure Garmin Connect has synced to Apple Health: Garmin Connect app → Settings → Health & Fitness → Share with Health |
