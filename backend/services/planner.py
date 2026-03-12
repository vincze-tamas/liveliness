"""Algorithmic weekly training plan generator.

Produces a 7-day session list for the given week based on the athlete's
current fitness (CTL), training phase, primary sport goal, and the season.

The weekly structure follows the template from the app spec:
  Mon — Rest / mobility
  Tue — Quality session (threshold / intervals) for primary sport
  Wed — Weight training
  Thu — Easy aerobic cross-training
  Fri — Easy or rest (rest during taper/race week)
  Sat — Long session (long run/ride; ski in winter)
  Sun — Recovery cross-training
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class PlannedSession:
    day: str               # Mon … Sun
    sport: str             # trail_run / road_bike / mtb / ski_alpine / inline_skate / gym / rest
    session_type: str      # rest / easy / threshold / long / intervals / weights / recovery
    target_duration_min: int
    target_tss: float
    description: str
    is_rest: bool = False


# ---------------------------------------------------------------------------
# Season helper
# ---------------------------------------------------------------------------

def _season(month: int) -> str:
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    return "autumn"


# ---------------------------------------------------------------------------
# Sport selection helpers
# ---------------------------------------------------------------------------

# Complementary cross-training sport per primary sport and season
_CROSS_TRAIN: dict[str, dict[str, str]] = {
    "trail_run":   {"winter": "inline_skate", "spring": "road_bike",  "summer": "road_bike",  "autumn": "inline_skate"},
    "road_bike":   {"winter": "inline_skate", "spring": "trail_run",  "summer": "trail_run",  "autumn": "inline_skate"},
    "mtb":         {"winter": "inline_skate", "spring": "trail_run",  "summer": "trail_run",  "autumn": "road_bike"},
    "ski_alpine":  {"winter": "ski_alpine",   "spring": "trail_run",  "summer": "trail_run",  "autumn": "inline_skate"},
    "inline_skate":{"winter": "road_bike",    "spring": "trail_run",  "summer": "trail_run",  "autumn": "road_bike"},
}
_DEFAULT_CROSS = "trail_run"


def _cross_sport(primary: str, season: str) -> str:
    return _CROSS_TRAIN.get(primary, {}).get(season, _DEFAULT_CROSS)


def _long_sport(primary: str, season: str) -> str:
    """Saturday long session sport — ski in winter when sport allows it."""
    if season == "winter" and primary in ("trail_run", "mtb", "road_bike", "ski_alpine"):
        return "ski_alpine"
    return primary


# ---------------------------------------------------------------------------
# TSS allocation across the week (fractions must sum to ~1.0)
# ---------------------------------------------------------------------------

_TSS_SPLIT: dict[str, float] = {
    "Mon": 0.00,   # rest
    "Tue": 0.25,   # quality
    "Wed": 0.10,   # weights
    "Thu": 0.20,   # easy cross-train
    "Fri": 0.05,   # easy / rest
    "Sat": 0.30,   # long
    "Sun": 0.10,   # recovery
}

# Weekly TSS target = CTL × 7 × phase_factor
_PHASE_TSS_FACTOR: dict[str, float] = {
    "base":     0.85,
    "build":    1.00,
    "peak":     1.10,
    "taper":    0.55,
    "race":     0.20,
    "recovery": 0.40,
    "off":      0.50,
}

# Target duration (minutes) per session type per phase
_DURATION: dict[str, dict[str, int]] = {
    "base":     {"easy": 70,  "long": 150, "threshold": 65,  "intervals": 60,  "weights": 50, "recovery": 45},
    "build":    {"easy": 60,  "long": 180, "threshold": 75,  "intervals": 75,  "weights": 55, "recovery": 45},
    "peak":     {"easy": 50,  "long": 100, "threshold": 65,  "intervals": 80,  "weights": 45, "recovery": 40},
    "taper":    {"easy": 40,  "long": 70,  "threshold": 45,  "intervals": 50,  "weights": 30, "recovery": 30},
    "race":     {"easy": 30,  "long": 30,  "threshold": 25,  "intervals": 25,  "weights": 20, "recovery": 20},
    "recovery": {"easy": 45,  "long": 60,  "threshold": 40,  "intervals": 40,  "weights": 35, "recovery": 40},
    "off":      {"easy": 50,  "long": 60,  "threshold": 50,  "intervals": 50,  "weights": 50, "recovery": 40},
}

# Tuesday quality session type per phase
_TUE_TYPE: dict[str, str] = {
    "base":     "threshold",
    "build":    "intervals",
    "peak":     "intervals",
    "taper":    "easy",
    "race":     "easy",
    "recovery": "easy",
    "off":      "easy",
}

# ---------------------------------------------------------------------------
# Session descriptions
# ---------------------------------------------------------------------------

_DESCRIPTIONS: dict[tuple[str, str], str] = {
    ("base",     "threshold"):  "Steady aerobic build — 20 min warm-up, 3×10 min at threshold effort, cool-down. Controlled breathing; can just hold a conversation.",
    ("base",     "long"):       "Long endurance session at conversational pace (Z2). No watch pressure — just time on feet/wheels. Eat and drink to practice fueling.",
    ("base",     "easy"):       "Easy aerobic — HR zone 2 throughout. Should feel effortless. Good for recovery and aerobic base.",
    ("base",     "intervals"):  "4×8 min at threshold effort with 3 min recovery. Stay controlled and consistent across all sets.",
    ("base",     "recovery"):   "Very easy movement — gentle spin or jog. Focus on circulation, not fitness.",
    ("build",    "threshold"):  "2×20 min tempo or 5×5 min VO2max intervals. HR should hit Z4 on effort sets; recover fully between reps.",
    ("build",    "long"):       "Progressive long session — first 60% at easy pace, last 40% building to steady aerobic. Finish feeling strong, not empty.",
    ("build",    "easy"):       "Easy aerobic recovery. Keep HR in Z1–Z2. Let the legs absorb Tuesday's work.",
    ("build",    "intervals"):  "6×5 min at VO2max effort (Z5), 2 min easy between. Quality matters more than pace — stay smooth.",
    ("build",    "recovery"):   "Easy recovery. Legs should feel better during this session than at the start.",
    ("peak",     "threshold"):  "Race-simulation effort — 40 min at race pace on race terrain if possible. Practice race-day nutrition.",
    ("peak",     "long"):       "Shorter long run/ride at race intensity. Last big confidence builder before taper.",
    ("peak",     "easy"):       "Easy shakeout — short and comfortable. Trust the fitness you've built.",
    ("peak",     "intervals"):  "Short sharp efforts: 8×2 min at max aerobic pace, 90 s rest. Race-specific neuromuscular priming.",
    ("peak",     "recovery"):   "Easy recovery — keep the legs moving but nothing that causes fatigue.",
    ("taper",    "threshold"):  "Single 20 min effort at race pace — just keeping the sharpness. Everything else easy.",
    ("taper",    "long"):       "Easy long session, significantly shorter than usual. Enjoy the lightness.",
    ("taper",    "easy"):       "Very easy — HR Z1 only. Resist the urge to push. Trust the taper.",
    ("taper",    "intervals"):  "4–5 short race-pace strides. Brief and snappy — wake up the fast-twitch fibres.",
    ("taper",    "recovery"):   "Optional very easy movement. Rest is equally valid.",
    ("race",     "easy"):       "Pre-race shakeout — 20–30 min very easy with 4–5 strides. Arrive at the start line fresh.",
    ("race",     "recovery"):   "Rest or very easy walk. Conserve energy for race day.",
    ("recovery", "easy"):       "Gentle movement — blood flow recovery. Very easy effort only.",
    ("recovery", "long"):       "Easy aerobic session. No intensity — just flush the legs out.",
    ("recovery", "recovery"):   "Optional easy spin or walk. Listen to your body — extra rest is fine.",
    ("off",      "easy"):       "Unstructured easy activity. Enjoy moving without a plan.",
    ("off",      "long"):       "Long relaxed outing. No targets, no pressure.",
    ("off",      "recovery"):   "Easy movement. Keep the habit of being active.",
}

_GYM_DESCRIPTIONS: dict[str, str] = {
    "base":     "Home gym — higher volume compound work. 3–4 sets of squats, deadlifts, pull-ups, push press. Aerobic base = hypertrophy focus.",
    "build":    "Home gym — strength endurance. Supersets and circuits. Reduce rest times to build lactate tolerance.",
    "peak":     "Home gym — lower volume, higher intensity. Power-focused: jump squats, heavy deadlifts, 2–3 sets. Preserve energy for endurance work.",
    "taper":    "Abbreviated gym session — 2 sets, moderate weight, nothing to failure. Maintain muscle activation only.",
    "race":     "Light activation — body-weight movements only. 15–20 min. No fatigue.",
    "recovery": "Gentle mobility and light core work only. Foam roll, stretch, activate.",
    "off":      "Free gym session — anything enjoyable. No specific prescription.",
}


def _description(phase: str, session_type: str) -> str:
    if session_type == "weights":
        return _GYM_DESCRIPTIONS.get(phase, "Home gym session.")
    return _DESCRIPTIONS.get(
        (phase, session_type),
        f"{session_type.capitalize()} session — {phase} phase.",
    )


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

import datetime  # noqa: E402  (imported here so dataclasses stay at top)


def generate_weekly_plan(
    primary_sport: str,
    phase: str,
    ctl: float,
    week_start: datetime.date,
) -> tuple[list[PlannedSession], float, float]:
    """Generate a 7-session weekly plan.

    Args:
        primary_sport: e.g. "trail_run"
        phase: e.g. "base"
        ctl: current Chronic Training Load (42-day EWM of TSS)
        week_start: Monday of the target week

    Returns:
        (sessions, planned_tss, planned_hours)
    """
    season = _season(week_start.month)
    cross = _cross_sport(primary_sport, season)
    long_sp = _long_sport(primary_sport, season)
    durations = _DURATION.get(phase, _DURATION["base"])

    # Weekly TSS — floor at 20 so new users with CTL=0 still get a light plan
    weekly_tss = max(20.0, ctl * 7 * _PHASE_TSS_FACTOR.get(phase, 0.85))

    tue_type = _TUE_TYPE.get(phase, "easy")
    fri_is_rest = phase in ("taper", "race")

    sessions: list[PlannedSession] = []

    # Monday — rest
    sessions.append(PlannedSession(
        day="Mon", sport="rest", session_type="rest",
        target_duration_min=0, target_tss=0.0,
        description="Rest day — mobility, stretching, or yoga. No structured training.",
        is_rest=True,
    ))

    # Tuesday — quality
    tue_tss = round(weekly_tss * _TSS_SPLIT["Tue"], 1)
    sessions.append(PlannedSession(
        day="Tue", sport=primary_sport, session_type=tue_type,
        target_duration_min=durations.get(tue_type, 60),
        target_tss=tue_tss,
        description=_description(phase, tue_type),
    ))

    # Wednesday — weights
    wed_tss = round(weekly_tss * _TSS_SPLIT["Wed"], 1)
    sessions.append(PlannedSession(
        day="Wed", sport="gym", session_type="weights",
        target_duration_min=durations.get("weights", 50),
        target_tss=wed_tss,
        description=_description(phase, "weights"),
    ))

    # Thursday — easy cross-training
    thu_tss = round(weekly_tss * _TSS_SPLIT["Thu"], 1)
    sessions.append(PlannedSession(
        day="Thu", sport=cross, session_type="easy",
        target_duration_min=durations.get("easy", 60),
        target_tss=thu_tss,
        description=_description(phase, "easy"),
    ))

    # Friday — easy or rest
    fri_tss = round(weekly_tss * _TSS_SPLIT["Fri"], 1) if not fri_is_rest else 0.0
    sessions.append(PlannedSession(
        day="Fri",
        sport="rest" if fri_is_rest else primary_sport,
        session_type="rest" if fri_is_rest else "easy",
        target_duration_min=0 if fri_is_rest else durations.get("easy", 45),
        target_tss=fri_tss,
        description="Rest — conserve energy for the weekend." if fri_is_rest else _description(phase, "easy"),
        is_rest=fri_is_rest,
    ))

    # Saturday — long session
    sat_tss = round(weekly_tss * _TSS_SPLIT["Sat"], 1)
    sessions.append(PlannedSession(
        day="Sat", sport=long_sp, session_type="long",
        target_duration_min=durations.get("long", 120),
        target_tss=sat_tss,
        description=_description(phase, "long"),
    ))

    # Sunday — recovery
    sun_tss = round(weekly_tss * _TSS_SPLIT["Sun"], 1)
    sessions.append(PlannedSession(
        day="Sun", sport=cross, session_type="recovery",
        target_duration_min=durations.get("recovery", 40),
        target_tss=sun_tss,
        description=_description(phase, "recovery"),
    ))

    total_min = sum(s.target_duration_min for s in sessions)
    planned_hours = round(total_min / 60.0, 1)

    return sessions, round(weekly_tss, 1), planned_hours


def sessions_to_json(sessions: list[PlannedSession]) -> str:
    return json.dumps([asdict(s) for s in sessions])
