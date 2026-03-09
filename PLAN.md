# Liveliness — Application Plan

## Overview

**Liveliness** is a personal endurance sports coaching web application for trail running, MTB, road biking, skiing, and inline roller skating training. It reads health and activity data from Apple Health (via an iOS Shortcut bridge) and Garmin Connect, generates adaptive weekly training plans, provides nutrition and hydration recommendations, and delivers AI-powered coaching insights via the Claude API.

The app is a **Progressive Web App (PWA)** — it runs in any mobile browser (including iPhone Safari), can be pinned to the home screen for an app-like experience, and requires no App Store registration.

---

## Key Requirements Summary

| Dimension | Decision |
|---|---|
| Platform | Progressive Web App (PWA) — browser-based, no iOS app |
| Primary device | iPhone (Safari), also desktop |
| Data: primary source | Apple Health (all health + Garmin-synced activities) |
| Data: secondary source | Garmin Connect (unofficial library) |
| Data bridge | iOS Shortcut automation → HTTP POST to local API |
| Storage | Local-first SQLite; cloud-sync-ready architecture |
| AI | Algorithmic core + Claude API for explanations & coaching |
| Sports | Trail running, MTB, road biking, skiing (alpine), inline roller skating |
| Weight training | Home gym (limited equipment) |
| Nutrition | Macro tracking, endurance fueling, race-day plans |
| User profile | Entered via app UI (age, sex, weight, height, etc.) |
| Training goals | Set via app UI, dynamic periodization |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         iPhone                               │
│  ┌──────────────┐   ┌──────────────────────────────────┐   │
│  │ Apple Health │   │  iOS Shortcut (daily automation)  │   │
│  │   (all data) │──▶│  Reads HealthKit → POST JSON      │   │
│  └──────────────┘   └──────────────────┬─────────────────┘  │
│                                         │ HTTP (local WiFi)  │
│  ┌─────────────────────────────────────▼──────────────────┐ │
│  │              PWA (Next.js — Safari browser)             │ │
│  │   Dashboard / Training / Nutrition / Weight / AI Chat   │ │
│  └─────────────────────────────────────┬────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                                          │ REST API
┌─────────────────────────────────────────▼────────────────────┐
│               Backend (Python FastAPI)                        │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │ Health Data  │  │ Training Engine│  │   Claude API    │  │
│  │ Ingestion    │  │ ATL/CTL/TSB   │  │   (AI Coach)    │  │
│  │ - HealthKit  │  │ Periodization  │  │   Recommendations│  │
│  │   Shortcut   │  │ Zone Analysis  │  │   Narrative     │  │
│  │ - Health XML │  │ Plan Generator │  └─────────────────┘  │
│  │ - Garmin lib │  └────────────────┘                        │
│  └──────────────┘  ┌────────────────┐  ┌─────────────────┐  │
│                    │ Nutrition Engine│  │ Weight Training │  │
│                    │ - Daily macros │  │ Planner         │  │
│                    │ - Race fueling │  │ - Home gym      │  │
│                    │ - Hydration    │  │ - Periodization │  │
│                    └────────────────┘  └─────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                SQLite Database (local-first)          │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                          │
                ┌─────────▼──────────┐
                │  Garmin Connect    │
                │  (unofficial lib)  │
                └────────────────────┘
```

---

## Tech Stack

### Frontend — Next.js 14 PWA
- **Framework:** Next.js 14 (App Router, TypeScript)
- **UI Components:** shadcn/ui + Tailwind CSS (polished, accessible, mobile-first)
- **Charts (primary):** Recharts — lightweight, React-native, excellent mobile touch support; used for all statistics graphs with custom gradients, smooth curves, and branded colour palettes
- **Charts (supplementary):** Nivo — used specifically for the zone distribution donut charts, activity heatmap calendar, and radar charts where Recharts falls short aesthetically
- **Data fetching:** TanStack Query (React Query)
- **PWA:** next-pwa (service worker, offline support, installable)
- **Maps:** Leaflet / react-leaflet (activity route display with elevation-coloured polylines)
- **Icons:** Lucide React
- **Animations:** Framer Motion (chart entrance animations, stat counters)

### Backend — Python FastAPI
- **Framework:** FastAPI (async, OpenAPI docs built-in)
- **Database ORM:** SQLAlchemy 2.0 (async) + aiosqlite
- **Apple Health parsing:** Custom XML parser for Apple Health export format
- **FIT file parsing:** `fitparse` library
- **Garmin Connect:** `garminconnect` (unofficial Python library)
- **AI:** `anthropic` Python SDK (Claude API)
- **Validation:** Pydantic v2
- **Task scheduling:** APScheduler (Garmin sync, daily computations)

### Infrastructure
- **Dev/Run:** Docker Compose (runs both frontend + backend together)
- **Package managers:** pnpm (frontend), uv (backend)
- **Database:** SQLite file (local), schema forward-compatible with PostgreSQL

---

## Project Structure

```
liveliness/
├── backend/
│   ├── main.py                      # FastAPI app entrypoint
│   ├── config.py                    # Settings, env vars
│   ├── database.py                  # SQLAlchemy setup
│   ├── models/                      # Database models
│   │   ├── user.py                  # User profile & body parameters
│   │   ├── activity.py              # Activities (runs, rides)
│   │   ├── health_metrics.py        # Daily HRV, HR, weight, sleep, steps
│   │   ├── training_plan.py         # Weekly plans & planned sessions
│   │   ├── nutrition.py             # Nutrition logs & recommendations
│   │   └── weight_session.py        # Weight training logs
│   ├── api/                         # API route handlers
│   │   ├── health_sync.py           # iOS Shortcut & XML upload endpoints
│   │   ├── activities.py            # Activity CRUD & analysis
│   │   ├── training.py              # Training plan endpoints
│   │   ├── nutrition.py             # Nutrition endpoints
│   │   ├── weight_training.py       # Weight training endpoints
│   │   ├── ai_coach.py              # Claude API chat & coaching
│   │   ├── statistics.py            # Statistics & aggregation endpoints
│   │   └── profile.py               # User profile management
│   ├── services/                    # Business logic
│   │   ├── apple_health_parser.py   # Parse Apple Health XML export
│   │   ├── garmin_service.py        # Garmin Connect data fetching
│   │   ├── training_load.py         # ATL, CTL, TSB, Ramp Rate
│   │   ├── zone_calculator.py       # HR zones, pace zones, power zones
│   │   ├── tss_calculator.py        # TSS, hrTSS, rTSS calculations
│   │   ├── statistics_service.py    # Aggregation queries for all chart data
│   │   ├── planner.py               # Weekly training plan generation
│   │   ├── periodization.py         # Macro cycles: Base/Build/Peak/Race
│   │   ├── nutrition_engine.py      # BMR, TDEE, macros, fueling
│   │   ├── hydration.py             # Sweat rate, fluid needs
│   │   ├── weight_training.py       # Home gym plan generator
│   │   └── ai_service.py            # Claude API integration
│   └── requirements.txt
├── frontend/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout, PWA metadata
│   │   ├── page.tsx                 # Dashboard (home)
│   │   ├── activities/
│   │   │   ├── page.tsx             # Activity list
│   │   │   └── [id]/page.tsx        # Activity detail + per-activity graphs
│   │   ├── statistics/
│   │   │   ├── page.tsx             # Statistics hub (weekly / monthly / all-time)
│   │   │   ├── weekly/page.tsx      # Weekly trend graphs
│   │   │   ├── monthly/page.tsx     # Monthly trend graphs
│   │   │   └── alltime/page.tsx     # Long-term / all-time records & heatmap
│   │   ├── training/
│   │   │   ├── page.tsx             # Training plan overview
│   │   │   └── week/page.tsx        # Current week plan
│   │   ├── nutrition/
│   │   │   ├── page.tsx             # Nutrition overview
│   │   │   └── race/page.tsx        # Race fueling planner
│   │   ├── weights/
│   │   │   └── page.tsx             # Weight training plan
│   │   ├── coach/
│   │   │   └── page.tsx             # AI coaching chat
│   │   └── profile/
│   │       └── page.tsx             # User profile & settings
│   ├── components/
│   │   ├── dashboard/               # Dashboard widgets
│   │   ├── charts/                  # Recharts & Nivo wrappers
│   │   │   ├── ElevationProfileChart.tsx
│   │   │   ├── HeartRateChart.tsx
│   │   │   ├── PaceChart.tsx
│   │   │   ├── ZoneDonutChart.tsx
│   │   │   ├── PmcChart.tsx         # ATL/CTL/TSB performance management
│   │   │   ├── WeeklyVolumeChart.tsx
│   │   │   ├── MonthlyTrendChart.tsx
│   │   │   ├── HrvTrendChart.tsx
│   │   │   ├── WeightTrendChart.tsx
│   │   │   ├── CalendarHeatmap.tsx  # Annual activity heatmap (Nivo)
│   │   │   └── RadarFitnessChart.tsx # Fitness balance radar (Nivo)
│   │   ├── statistics/              # Statistics page sections
│   │   │   ├── WeeklyStats.tsx
│   │   │   ├── MonthlyStats.tsx
│   │   │   └── AllTimeRecords.tsx
│   │   ├── activities/              # Activity cards, route maps
│   │   ├── training/                # Plan cards, calendar
│   │   ├── nutrition/               # Macro rings, fueling tables
│   │   └── ui/                      # shadcn/ui components
│   ├── public/
│   │   ├── manifest.json            # PWA manifest
│   │   └── icons/                   # App icons (for home screen)
│   ├── next.config.ts
│   └── package.json
├── docs/
│   └── ios-shortcut-setup.md        # Step-by-step iOS Shortcut guide
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | |
| sex | TEXT | male / female |
| birth_date | DATE | → age computed |
| weight_kg | REAL | current, updated from Health data |
| height_cm | REAL | |
| max_hr | INTEGER | can be auto-detected from activities |
| resting_hr | INTEGER | from Apple Health |
| vo2max | REAL | from Garmin |
| hrv_baseline | REAL | rolling 7-day average |
| ftp_running_w | REAL | functional threshold pace (for rTSS) |
| ftp_cycling_w | REAL | functional threshold power (for TSS, if power meter) |
| garmin_username | TEXT | for unofficial lib |
| garmin_password | TEXT | encrypted |
| created_at | TIMESTAMP | |

### `activities`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| source | TEXT | garmin / apple_health / manual |
| external_id | TEXT | Garmin activity ID or HealthKit UUID |
| sport | TEXT | trail_run / mtb / road_bike / ski_alpine / inline_skate / gym / other |
| start_time | TIMESTAMP | |
| duration_s | INTEGER | |
| distance_m | REAL | |
| elevation_gain_m | REAL | |
| avg_hr | INTEGER | |
| max_hr | INTEGER | |
| avg_pace_s_per_km | REAL | |
| avg_power_w | REAL | if available |
| normalized_power_w | REAL | if available |
| tss | REAL | Training Stress Score |
| trimp | REAL | HR-based training impulse |
| ski_vertical_m | REAL | total vertical descent (ski_alpine only) |
| ski_runs | INTEGER | number of ski runs/descents (ski_alpine only) |
| gpx_data | TEXT | JSON encoded route |
| fit_file_path | TEXT | path to raw FIT file |
| notes | TEXT | |

### `health_metrics` (daily)
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| date | DATE | |
| hrv_ms | REAL | morning HRV (RMSSD) |
| resting_hr | INTEGER | |
| weight_kg | REAL | |
| sleep_hours | REAL | |
| sleep_score | INTEGER | Garmin sleep score if available |
| steps | INTEGER | |
| active_energy_kcal | REAL | |
| body_battery | INTEGER | Garmin Body Battery |
| stress_score | INTEGER | Garmin stress |
| blood_oxygen_pct | REAL | SpO2 |
| source | TEXT | apple_health / garmin |

### `training_plans`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| week_start | DATE | Monday of the week |
| phase | TEXT | base / build / peak / race / recovery |
| goal_description | TEXT | |
| planned_tss | REAL | weekly TSS target |
| planned_hours | REAL | |
| sessions | TEXT | JSON: list of planned sessions |
| ai_narrative | TEXT | Claude-generated explanation |
| generated_at | TIMESTAMP | |

### `nutrition_profiles` (daily recommendation)
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| date | DATE | |
| training_type | TEXT | rest / easy / moderate / hard / long |
| target_kcal | REAL | |
| target_protein_g | REAL | |
| target_carbs_g | REAL | |
| target_fat_g | REAL | |
| target_fluid_ml | REAL | |
| notes | TEXT | AI-generated tips |

### `weight_sessions`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| date | DATE | |
| session_type | TEXT | strength / power / maintenance |
| exercises | TEXT | JSON: [{name, sets, reps, weight_kg}] |
| duration_min | INTEGER | |
| notes | TEXT | |

---

## Core Algorithms

### Training Load (PMC — Performance Management Chart)
- **ATL** (Acute Training Load / Fatigue) = 7-day exponentially weighted mean of daily TSS
- **CTL** (Chronic Training Load / Fitness) = 42-day exponentially weighted mean of daily TSS
- **TSB** (Training Stress Balance / Form) = CTL − ATL
- **Ramp Rate** = weekly change in CTL; safe range: +3 to +8 TSS/week

### TSS Calculation

All sports feed into the same unified ATL/CTL/TSB model. The method depends on available data:

- **Cycling with power (MTB / road bike):** `TSS = (duration_s × NP × IF) / (FTP × 3600) × 100`
- **Cycling HR-based (MTB / road bike, no power meter):** `hrTSS = duration_h × HR_ratio² × 100`
- **Trail running rTSS (HR-based):** `hrTSS = duration_h × HR_ratio² × 100` where `HR_ratio = avg_HR / LTHR`; apply elevation penalty: effective pace adjusted by +6 s/km per 100 m/km gradient
- **Road running rTSS:** same hrTSS formula, no elevation penalty
- **Inline skating (HR-based):** `hrTSS = duration_h × HR_ratio² × 100` (no power meter standard)
- **Alpine skiing (HR-based):** `hrTSS = duration_h × HR_ratio² × 100`; secondary metric: `Vertical Load Score (VLS) = (ski_vertical_m / 1000) × IF × 100` — used as a ski-specific load proxy when HR data is incomplete (e.g., cold-weather HR strap dropout)
- **Weight training:** `wTSS` estimated from session RPE and duration: `wTSS = duration_min / 60 × RPE_factor × 50` where RPE_factor ranges 0.5 (light) to 1.5 (heavy); contributes to ATL but at reduced weight in CTL (endurance fitness)

### HR & Pace Zones (5-zone model)
| Zone | Name | % Max HR | % Threshold HR |
|---|---|---|---|
| 1 | Recovery | < 68% | < 80% |
| 2 | Aerobic Base | 68–83% | 80–89% |
| 3 | Tempo | 83–88% | 89–94% |
| 4 | Threshold | 88–95% | 94–100% |
| 5 | VO2max | > 95% | > 100% |

### Nutrition Calculations
- **BMR:** Mifflin-St Jeor equation (uses age, sex, weight, height)
- **TDEE:** BMR × activity multiplier (updated daily based on actual activity)
- **Protein:** 1.6–2.2 g/kg body weight (higher on hard training days)
- **Carbs (training day):** 5–10 g/kg depending on volume; ~60 g/hr during activity
- **Race fueling:** 60–90 g carbs/hour for efforts > 90 min; electrolytes every 30–45 min
- **Hydration:** ~500–750 ml/hour during activity (adjusted for heat/sweat rate)

### Periodization Structure
```
Macro cycle (12–16 weeks to target race):
  ├── Base phase (4–6 weeks): high volume, low intensity; aerobic development
  ├── Build phase (4–6 weeks): specific work, threshold, VO2max; race-specific terrain
  ├── Peak phase (2–3 weeks): race-specific intensity, volume reduction begins
  ├── Taper (1–2 weeks): sharp volume reduction, maintain intensity
  └── Race week
      └── Recovery (1–3 weeks post-race)
```

Weekly structure (example hard week — winter/spring multi-sport):
- Monday: Rest / mobility / yoga
- Tuesday: Quality trail run (intervals / threshold) or inline skate speed work
- Wednesday: Weight training (home gym)
- Thursday: Easy aerobic — road bike, MTB, or easy trail run
- Friday: Easy run / rest
- Saturday: Ski day (alpine) OR long trail run (progressive) OR long MTB
- Sunday: Recovery — inline skate, easy road bike, or easy run

The planner adapts the sport selection to season and goal: ski-heavy blocks in winter, trail/MTB peaks in spring/summer, inline skating and road biking used as cross-training year-round.

---

## Apple Health Integration (iOS Shortcut)

Since web apps cannot directly read Apple HealthKit, the bridge uses an **iOS Shortcut** that runs as a daily automation.

### What data the Shortcut reads from HealthKit
- HRV (RMSSD) — last night's morning measurement
- Resting heart rate
- Weight
- Sleep analysis (duration, stages)
- Steps
- Active energy burned
- Workouts synced from Garmin (activities, HR, distance)
- Blood oxygen (SpO2)
- VO2max (if estimated by Garmin/iPhone)

### Shortcut setup (documented in `docs/ios-shortcut-setup.md`)
1. Open **Shortcuts** app on iPhone
2. Create a new shortcut with HealthKit actions (Get Health Samples for each metric)
3. Format results as JSON using "Text" action
4. Add "Get Contents of URL" action → POST to `http://<your-local-ip>:8000/api/health/sync`
5. Add to **Automations**: run daily at 7:00 AM automatically
6. Optional: expose the backend via **Tailscale** so the Shortcut works outside home WiFi

### Fallback: Manual Apple Health XML Export
1. iPhone → Health app → profile icon → Export All Health Data → creates `export.zip`
2. Upload the ZIP file via the app's import page
3. Backend parses `export.xml` (Apple Health XML format) and ingests all historical data

---

## AI Coaching (Claude API)

### Modes of AI interaction
1. **Weekly plan generation:** Claude receives current fitness data (CTL, ATL, TSB, recent activities, goal, phase) and generates a structured weekly plan + narrative explanation
2. **Post-activity debrief:** Claude analyzes the completed session vs. plan, highlights what went well and what to adjust
3. **Nutrition advice:** Claude generates personalized daily nutrition advice based on tomorrow's training schedule
4. **Free-form coaching chat:** User can ask questions; Claude has full context of recent data

### Context provided to Claude
- User profile (age, sex, weight, height, fitness level)
- Last 8 weeks of training load data (ATL, CTL, TSB trend)
- Last 4 weeks of activities (duration, TSS, sport, notes)
- Recent HRV trend (recovery quality)
- Current training phase and goal
- Upcoming events/races
- Nutrition preferences

---

## Statistics & Visualizations

The statistics module is a first-class section of the app, not an afterthought. Every chart uses smooth curves, gradient fills, custom tooltips, and the app's branded colour palette (deep teal primary, amber accent, coral for stress/fatigue). Charts are touch-friendly on iPhone (tap for tooltip, pinch to zoom on time-series).

---

### Per-Activity Graphs (Activity Detail Page)

Shown on the `activities/[id]` page after tapping any activity. Charts are rendered from lap/stream data stored in the FIT file or from Garmin Connect stream API.

#### Trail Run & MTB — shared charts

| Chart | Type | X-axis | Y-axis | Notes |
|---|---|---|---|---|
| **Route Map** | Interactive map | — | — | GPS polyline coloured by gradient/pace; Leaflet |
| **Elevation Profile** | Area chart, gradient fill | Distance (km) | Elevation (m) | Teal-to-white gradient; grade % shown on hover |
| **Heart Rate over Distance** | Line chart | Distance (km) | BPM | HR zone colour bands as background; smooth curve |
| **Pace / Speed over Distance** | Line chart (inverted) | Distance (km) | min/km or km/h | Smoothed; threshold pace reference line |
| **Cadence over Distance** | Line chart | Distance (km) | steps/min (run) or rpm (MTB) | Subtle fill |
| **HR Zone Distribution** | Donut chart | — | % time in zone | 5-zone colour coded (Z1 grey → Z5 red) |
| **Lap Splits Table + Bar** | Bar chart | Lap number | Pace or HR | Diverging bar from average |

#### Trail Run — additional

| Chart | Type | Notes |
|---|---|---|
| **Gradient vs Pace Scatter** | Scatter plot | Shows how pace degrades on climbs; useful for race planning |
| **Vertical Speed** | Line chart | Metres gained per hour over distance; identifies effort on climbs |

#### MTB — additional

| Chart | Type | Notes |
|---|---|---|
| **Power over Distance** | Line chart | Only if power meter connected; NP reference line |
| **Speed Distribution** | Histogram | Distribution of speeds across the ride |

#### Road Biking

| Chart | Type | X-axis | Y-axis | Notes |
|---|---|---|---|---|
| **Route Map** | Interactive map | — | — | GPS polyline coloured by speed or power; Leaflet |
| **Elevation Profile** | Area chart, gradient fill | Distance (km) | Elevation (m) | Indigo gradient fill |
| **Speed over Distance** | Line chart | Distance (km) | km/h | Smoothed; max speed callout |
| **Heart Rate over Distance** | Line chart | Distance (km) | BPM | HR zone colour bands as background |
| **Power over Distance** | Line chart | Distance (km) | Watts | Only if power meter; NP and FTP reference lines |
| **Cadence over Distance** | Line chart | Distance (km) | rpm | Optimal cadence band (85–95 rpm) shaded |
| **HR Zone Distribution** | Donut chart | — | % time in zone | 5-zone colour coded |
| **Lap / Segment Splits** | Bar chart | Lap number | Avg speed or power | Diverging from average |

#### Alpine Skiing

| Chart | Type | X-axis | Y-axis | Notes |
|---|---|---|---|---|
| **GPS Track / Piste Map** | Interactive map | — | — | GPS track overlaid on Leaflet satellite tiles; runs colour-coded by speed |
| **Vertical Descent Profile** | Area chart | Time | Elevation (m) | Sky-blue gradient; valley markers between runs |
| **Speed over Time** | Line chart | Time | km/h | Smoothed; peak speed annotation per run |
| **Heart Rate over Time** | Line chart | Time | BPM | HR zone colour bands; lift-ride periods greyed out |
| **Run-by-Run Breakdown** | Grouped bar chart | Run # | Vertical (m) + Max speed (km/h) | Side-by-side bars; fatigue trend visible across runs |
| **HR Zone Distribution** | Donut chart | — | % time in zone | Active skiing time only (lifts excluded) |
| **Cumulative Vertical** | Step chart | Run # | Total vertical (m) | Milestone lines at 1000 m, 2000 m, etc. |

#### Inline Roller Skating

| Chart | Type | X-axis | Y-axis | Notes |
|---|---|---|---|---|
| **Route Map** | Interactive map | — | — | GPS polyline coloured by speed; Leaflet |
| **Speed over Distance** | Line chart | Distance (km) | km/h | Smoothed; max speed callout; pink gradient fill |
| **Heart Rate over Distance** | Line chart | Distance (km) | BPM | HR zone colour bands as background |
| **Elevation Profile** | Area chart, gradient fill | Distance (km) | Elevation (m) | Useful even on mostly-flat routes |
| **HR Zone Distribution** | Donut chart | — | % time in zone | 5-zone colour coded |

#### Weight Training Session

| Chart | Type | Notes |
|---|---|---|
| **Volume per Exercise** | Horizontal bar chart | Sets × reps × weight; sorted by total volume |
| **Session Volume vs Previous** | Grouped bar | Current vs last same-type session; shows progression |

---

### Weekly Trend Graphs (`/statistics/weekly`)

Time range picker: last 4 weeks / 8 weeks / 12 weeks / custom.

| Chart | Type | Description |
|---|---|---|
| **Weekly Distance by Sport** | Stacked area chart | Trail run (teal) + MTB (amber) + road bike (indigo) + inline skate (pink) stacked; skiing shown as vertical metres (separate axis) since descents don't translate to distance |
| **Weekly Ski Vertical** | Bar chart | Total ski descent metres per week (ski season only; hidden off-season) |
| **Weekly Elevation Gain** | Bar chart | Total ascent per week across all outdoor sports; reference line for weekly elevation goal |
| **Weekly Training Hours** | Bar chart | Hours by sport, stacked (all 6 sports); planned vs actual overlay (dashed line) |
| **Weekly TSS** | Bar + line combo | Bars = weekly TSS; lines = CTL (fitness) and ATL (fatigue) overlaid |
| **Weekly Zone Balance** | 100% stacked bar | % of time in each HR zone per week; shows aerobic/intensity ratio |
| **Average Pace Trend** | Line chart | Rolling 4-week average pace for easy runs and threshold runs separately |
| **Weekly Steps** | Bar chart | Daily steps summed per week; 10 k/day target line |
| **HRV 7-Day Average** | Line chart | Rolling weekly HRV average with ±1 SD band; colour zones (green/amber/red) |

---

### Monthly Trend Graphs (`/statistics/monthly`)

Time range picker: last 3 months / 6 months / 12 months / all time.

| Chart | Type | Description |
|---|---|---|
| **Monthly Volume (Distance)** | Area chart | Separate lines per sport (trail run, MTB, road bike, inline skate); gradient fills; skiing shown as separate vertical-metres chart |
| **Monthly Volume (Hours)** | Area chart | Total training hours per month |
| **Monthly Elevation** | Bar chart | Total elevation gain per month |
| **Monthly TSS** | Bar chart | Total monthly training stress; trend line |
| **Fitness Form (CTL/ATL/TSB)** | Multi-line chart | Three lines with shaded zones; TSB positive = green, negative = red |
| **Body Weight Trend** | Line chart | Daily weight with 7-day smoothing overlay; target weight reference |
| **Resting HR Trend** | Line chart | Monthly average with individual daily dots; downward trend = fitness |
| **HRV Trend** | Line chart | Monthly average HRV with baseline band; upward trend = recovery |
| **Sleep Quality** | Bar chart | Average nightly sleep hours per month; 8h target line |
| **Macro Adherence** | Stacked bar | Avg actual vs target protein/carb/fat per month (if logged) |

---

### Long-Term / All-Time (`/statistics/alltime`)

| Chart | Type | Description |
|---|---|---|
| **Annual Activity Heatmap** | Calendar heatmap (Nivo) | GitHub-style; colour intensity = TSS; each sport shown in its own hue (teal = trail run, amber = MTB, indigo = road bike, sky = ski, pink = inline skate, violet = gym) |
| **Cumulative Distance** | Area chart | All-time cumulative km by sport; milestone markers (500 km, 1000 km, etc.) |
| **VO2max Trend** | Line chart | Garmin-estimated VO2max over time; rolling improvement |
| **Personal Records Table** | Table + sparkline | Sport-specific PRs: running (1 km, 5 km, 10 km, half, marathon), cycling/inline skate (fastest 10 km, 20 km, 50 km, 1-hour power), skiing (most vertical in a day, fastest run speed); date + activity link |
| **Biggest Weeks / Months** | Ranked bar chart | Top 10 highest-TSS weeks and months all-time |
| **Fitness Radar** | Radar chart (Nivo) | Spider: Endurance / Speed / Strength / Recovery / Consistency / Elevation — scored 0–100 vs personal historical average |
| **Year-over-Year Comparison** | Grouped line chart | Monthly volume for each calendar year overlaid; shows improvement trajectory |

---

### Chart Design System

All charts follow a unified visual language:

- **Colour palette — HR zones:**
  - Zone 1: `#94a3b8` (slate)
  - Zone 2: `#22d3ee` (cyan)
  - Zone 3: `#a3e635` (lime)
  - Zone 4: `#fb923c` (orange)
  - Zone 5: `#f43f5e` (rose)

- **Colour palette — sports:**
  - Trail run: `#0d9488` (teal)
  - MTB: `#d97706` (amber)
  - Road bike: `#6366f1` (indigo)
  - Alpine skiing: `#38bdf8` (sky blue — evokes snow/ice)
  - Inline skating: `#f472b6` (pink)
  - Weight training: `#a855f7` (violet)

- **Colour palette — training load:**
  - CTL (fitness): `#6366f1` (indigo)
  - ATL (fatigue): `#f43f5e` (rose)
  - TSB (form): `#10b981` (emerald, positive) / `#f43f5e` (rose, negative)

- **Gradient fills:** Area and elevation charts use a vertical gradient from the series colour at full opacity (top) to transparent (bottom), creating depth.

- **Smooth curves:** All time-series use `type="monotone"` (Recharts) for smooth interpolation — no jagged lines.

- **Custom tooltips:** Floating rounded card showing all values at the cursor point; units labelled; on mobile triggered by tap.

- **Responsive containers:** All charts use `ResponsiveContainer` (Recharts) / `width="100%"` (Nivo) — no fixed pixel widths.

- **Skeleton loading:** Each chart position shows an animated pulse skeleton while data loads; no layout shift.

- **Dark mode ready:** All palettes specified in both light and dark variants via Tailwind `dark:` classes.

---

### Backend Statistics API (`/api/statistics/`)

| Endpoint | Returns |
|---|---|
| `GET /api/statistics/activity/{id}/streams` | Time-series lap/GPS/HR/pace data for per-activity charts |
| `GET /api/statistics/weekly?weeks=12` | Weekly aggregates: distance, elevation, TSS, zone time by sport |
| `GET /api/statistics/monthly?months=12` | Monthly aggregates + body metrics trends |
| `GET /api/statistics/alltime` | PRs, heatmap data, cumulative totals, VO2max history |
| `GET /api/statistics/pmc?days=120` | ATL, CTL, TSB daily series for PMC chart |
| `GET /api/statistics/fitness-radar` | Radar scores (0–100) for each fitness dimension |

All endpoints return pre-aggregated data — no heavy computation on the frontend.

---

## Implementation Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Repository structure setup (Python backend + Next.js frontend)
- [ ] Docker Compose configuration
- [ ] SQLite database setup with SQLAlchemy models
- [ ] User profile creation flow (onboarding UI)
- [ ] Basic dashboard shell (empty state)
- [ ] Environment configuration (.env)

### Phase 2 — Data Ingestion (Week 2–3)
- [ ] iOS Shortcut API endpoint (`POST /api/health/sync`)
- [ ] Apple Health XML export parser (historical data import)
- [ ] Garmin Connect unofficial library integration (activity sync)
- [ ] FIT file upload and parsing
- [ ] Activity storage and deduplication

### Phase 3 — Training Analysis (Week 3–4)
- [ ] TSS / hrTSS / rTSS calculation engine
- [ ] HR zone and pace zone calculator
- [ ] ATL / CTL / TSB computation (daily jobs)
- [ ] Performance Management Chart (interactive visualization)
- [ ] Activity detail view with zone breakdown

### Phase 3.5 — Statistics Module (Week 4–5)
- [ ] Backend `statistics_service.py`: weekly, monthly, all-time aggregation queries
- [ ] Backend `statistics.py` API routes (all endpoints listed above)
- [ ] Chart design system: colour palette tokens, gradient utilities, shared tooltip component
- [ ] **Per-activity charts:** elevation profile, HR over distance, pace over distance, cadence, zone donut, lap splits
- [ ] **Activity route map:** GPS polyline coloured by pace or gradient
- [ ] **Gradient vs pace scatter** (trail run) and **speed distribution histogram** (MTB)
- [ ] **Weight session charts:** volume per exercise bar, session-over-session progression
- [ ] **Weekly trend page:** distance by sport (stacked area), elevation bar, hours bar, TSS + PMC combo, zone balance, HRV 7-day
- [ ] **Monthly trend page:** volume area, fitness form (CTL/ATL/TSB), body weight, resting HR, HRV, sleep
- [ ] **All-time page:** calendar heatmap (Nivo), cumulative distance, VO2max trend, PRs table, fitness radar (Nivo), year-over-year comparison
- [ ] Skeleton loading states for all charts
- [ ] Touch-optimised tooltips (tap on iPhone)

### Phase 4 — Training Planning (Week 4–5)
- [ ] Goal management UI (target races, distances, dates)
- [ ] Periodization engine (phase assignment from race date)
- [ ] Weekly plan generator (algorithmic base)
- [ ] Claude API integration for plan narrative
- [ ] Training calendar view

### Phase 5 — Nutrition (Week 5–6)
- [ ] User profile: dietary preferences (already collected: no restrictions)
- [ ] Daily nutrition calculator (BMR → TDEE → macros)
- [ ] Training-day-specific nutrition recommendations
- [ ] Endurance fueling calculator (per-hour carbs/fluids)
- [ ] Race nutrition planner (aid station strategy)
- [ ] Nutrition overview dashboard

### Phase 6 — Weight Training (Week 6–7)
- [ ] Home gym exercise library
- [ ] Phase-appropriate plan generator (base: volume, peak: power/maintenance)
- [ ] Session logging UI
- [ ] Integration with weekly training plan
- [ ] Progressive overload tracking

### Phase 7 — AI Coach (Week 7–8)
- [ ] Claude API service layer
- [ ] AI coaching chat interface
- [ ] Post-activity debrief generation
- [ ] Weekly plan narrative generation
- [ ] Contextual nutrition advice

### Phase 8 — PWA & Polish (Week 8–9)
- [ ] PWA manifest and service worker (next-pwa)
- [ ] "Add to Home Screen" prompt
- [ ] Offline capability (dashboard works without network)
- [ ] iOS Shortcut setup documentation in-app
- [ ] Responsive design testing on iPhone Safari
- [ ] Push notifications (optional, for training reminders)

### Phase 9 — Future: Cloud Sync (Post v1)
- [ ] User authentication (multi-device)
- [ ] PostgreSQL migration
- [ ] Cloud deployment option (self-hosted VPS)
- [ ] Background Garmin sync (cron job)
- [ ] Sharing & export features

---

## Environment Variables

```env
# Backend
DATABASE_URL=sqlite+aiosqlite:///./liveliness.db
ANTHROPIC_API_KEY=sk-ant-...
GARMIN_USERNAME=                    # optional, for Garmin sync
GARMIN_PASSWORD=                    # optional, encrypted at rest
SECRET_KEY=                         # for session/token signing

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## iOS Shortcut: Key Technical Notes

The Shortcut POSTs the following JSON structure to `/api/health/sync`:

```json
{
  "date": "2026-03-09",
  "hrv_ms": 54.2,
  "resting_hr": 42,
  "weight_kg": 74.5,
  "sleep_hours": 7.8,
  "steps": 8234,
  "active_energy_kcal": 1820,
  "blood_oxygen_pct": 98.0,
  "workouts": [
    {
      "type": "Trail Running",
      "start": "2026-03-08T07:15:00",
      "duration_s": 5400,
      "distance_m": 12500,
      "avg_hr": 148,
      "energy_kcal": 820
    }
  ]
}
```

### HealthKit Workout Type → App Sport Mapping

The backend normalises incoming HealthKit workout type strings to the app's internal sport enum:

| HealthKit `workoutActivityType` | App `sport` value |
|---|---|
| `TrailRunning`, `Running`, `CrossCountryRunning` | `trail_run` |
| `Cycling` (road) | `road_bike` |
| `MountainBiking` | `mtb` |
| `DownhillSkiing`, `Skiing` | `ski_alpine` |
| `SkatingSports`, `RollerSkating` | `inline_skate` |
| `TraditionalStrengthTraining`, `FunctionalStrengthTraining` | `gym` |
| anything else | `other` |

The mapping is configurable in `config.py` so future workout types can be added without code changes.

The Shortcut requires iOS 16+ (HealthKit actions with multiple sample types are available from iOS 16).

---

## Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Garmin unofficial library breaks on API changes | Abstract behind a service layer; fallback to FIT file upload |
| iOS Shortcut only works on same WiFi | Document Tailscale setup for remote access |
| Apple Health XML is very large (100MB+) | Stream parse with iterparse, only import new records |
| Claude API latency | Show skeleton UI, generate plans async, cache results |
| SQLite concurrent writes | Use WAL mode; single-writer pattern (FastAPI async) |

---

## Development Setup (Quick Start)

```bash
# Clone and start
git clone <repo>
cd liveliness

# Copy env
cp .env.example .env
# Fill in ANTHROPIC_API_KEY

# Start everything
docker compose up

# App available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API docs: http://localhost:8000/docs
```

---

## Summary

The Liveliness app is a privacy-first, AI-augmented personal coaching platform purpose-built for trail running, MTB, road biking, skiing, and inline roller skating athletes. It integrates seamlessly with existing devices (Garmin Fenix 6, iPhone) without requiring any native iOS app, using a clever iOS Shortcut as a data bridge. Each sport has its own tailored metrics, chart set, and TSS method, while all activities feed into a unified ATL/CTL/TSB performance model. The algorithmic engine follows established endurance sports science (PMC, periodization, sport nutrition), while Claude API provides the human-readable coaching layer that makes the data actionable and understandable across a full multi-sport training year.
