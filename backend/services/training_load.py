"""Training load calculation utilities.

Provides TSS estimation and Performance Management Chart (PMC) series
computation (CTL / ATL / TSB) using the Banister impulse-response model.
"""
from __future__ import annotations

import datetime
import math
from collections import defaultdict
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from models.activity import Activity
    from models.health_metrics import HealthMetrics
    from models.user import User


# ---------------------------------------------------------------------------
# TSS estimation
# ---------------------------------------------------------------------------

def estimate_tss(activity: "Activity", user: "User") -> float:
    """Return a TSS estimate for *activity* given the athlete's profile.

    Priority:
    1. If TSS is already stored on the activity – return it directly.
    2. Cycling + power available + FTP set → power-based TSS.
    3. Running + avg pace + threshold pace set → pace-based TSS.
    4. Any sport + avg HR + HR thresholds set → HR-TRIMP normalised to TSS.
    5. Fallback: 50 TSS / hour (moderate aerobic effort assumption).
    """
    if activity.tss is not None:
        return activity.tss

    duration_s = activity.duration_s or 0
    if duration_s <= 0:
        return 0.0

    duration_h = duration_s / 3600.0

    # 1. Power-based TSS (cycling)
    if (
        activity.sport in ("road_bike", "mtb")
        and user.ftp_cycling_w
        and user.ftp_cycling_w > 0
    ):
        power_w = activity.normalized_power_w or activity.avg_power_w
        if power_w and power_w > 0:
            intensity_factor = power_w / user.ftp_cycling_w
            return (duration_s * power_w * intensity_factor) / (user.ftp_cycling_w * 3600) * 100

    # 2. Pace-based TSS (running)
    if (
        activity.sport == "trail_run"
        and user.ftp_running_pace_s_per_km
        and user.ftp_running_pace_s_per_km > 0
        and activity.avg_pace_s_per_km
        and activity.avg_pace_s_per_km > 0
    ):
        # Lower pace (faster) → higher IF; threshold effort → IF = 1
        intensity_factor = user.ftp_running_pace_s_per_km / activity.avg_pace_s_per_km
        return duration_h * intensity_factor ** 2 * 100

    # 3. HR-based TRIMP (Banister model), normalised to TSS scale
    rhr = user.resting_hr or 50
    mhr = user.max_hr or 190
    hr_range = mhr - rhr
    if activity.avg_hr and hr_range > 0:
        hrr = max(0.0, min(1.0, (activity.avg_hr - rhr) / hr_range))
        duration_min = duration_s / 60.0
        trimp = duration_min * hrr * 0.64 * math.exp(1.92 * hrr)
        # Normalise: one hour at lactate threshold (hrr ≈ 0.85) → TSS = 100
        threshold_hrr = 0.85
        trimp_per_hour_at_threshold = 60 * threshold_hrr * 0.64 * math.exp(1.92 * threshold_hrr)
        return trimp * 100.0 / trimp_per_hour_at_threshold

    # 4. Fallback: assume moderate aerobic effort
    return duration_h * 50.0


# ---------------------------------------------------------------------------
# PMC (Performance Management Chart)
# ---------------------------------------------------------------------------

def compute_pmc(
    activities: list["Activity"],
    user: "User",
    days: int = 120,
) -> list[dict[str, Any]]:
    """Compute CTL, ATL, TSB series using the Banister impulse-response model.

    Returns a list of dicts (one per calendar day for the last *days* days),
    ordered ascending by date.
    """
    today = datetime.date.today()
    window_start = today - datetime.timedelta(days=days - 1)

    if not activities:
        return [
            {
                "date": (today - datetime.timedelta(days=days - 1 - i)).isoformat(),
                "tss": 0.0,
                "ctl": 0.0,
                "atl": 0.0,
                "tsb": 0.0,
            }
            for i in range(days)
        ]

    # Build daily TSS totals
    daily_tss: dict[datetime.date, float] = defaultdict(float)
    for act in activities:
        if act.start_time is not None:
            daily_tss[act.start_time.date()] += estimate_tss(act, user)

    # Go back far enough that CTL is well-seeded before the display window
    compute_start = min(
        min(daily_tss.keys()),
        window_start - datetime.timedelta(days=84),  # 2 × 42-day CTL constant
    )

    ctl = 0.0
    atl = 0.0
    result: list[dict[str, Any]] = []

    current = compute_start
    while current <= today:
        tss_today = daily_tss.get(current, 0.0)
        tsb = ctl - atl  # form = yesterday's fitness minus yesterday's fatigue
        ctl = ctl + (tss_today - ctl) / 42.0
        atl = atl + (tss_today - atl) / 7.0
        if current >= window_start:
            result.append(
                {
                    "date": current.isoformat(),
                    "tss": round(tss_today, 1),
                    "ctl": round(ctl, 1),
                    "atl": round(atl, 1),
                    "tsb": round(tsb, 1),
                }
            )
        current += datetime.timedelta(days=1)

    return result


# ---------------------------------------------------------------------------
# Weekly aggregates
# ---------------------------------------------------------------------------

def compute_weekly(
    activities: list["Activity"],
    health_rows: list["HealthMetrics"],
    user: "User",
    weeks: int = 12,
) -> list[dict[str, Any]]:
    """Return weekly training summaries for the last *weeks* ISO weeks."""
    today = datetime.date.today()
    monday = today - datetime.timedelta(days=today.weekday())
    week_starts = [monday - datetime.timedelta(weeks=w) for w in range(weeks - 1, -1, -1)]
    cutoff = week_starts[0]

    # Bin activities by their Monday
    weekly_acts: dict[datetime.date, list["Activity"]] = {ws: [] for ws in week_starts}
    for act in activities:
        if act.start_time is None:
            continue
        d = act.start_time.date()
        if d < cutoff:
            continue
        act_monday = d - datetime.timedelta(days=d.weekday())
        if act_monday in weekly_acts:
            weekly_acts[act_monday].append(act)

    # Bin health metrics by their Monday
    weekly_hrv: dict[datetime.date, list[float]] = {ws: [] for ws in week_starts}
    weekly_rhr: dict[datetime.date, list[int]] = {ws: [] for ws in week_starts}
    for h in health_rows:
        h_monday = h.date - datetime.timedelta(days=h.date.weekday())
        if h_monday in weekly_hrv:
            if h.hrv_ms is not None:
                weekly_hrv[h_monday].append(h.hrv_ms)
            if h.resting_hr is not None:
                weekly_rhr[h_monday].append(h.resting_hr)

    result = []
    for ws in week_starts:
        acts = weekly_acts[ws]
        sport_km: dict[str, float] = defaultdict(float)
        for a in acts:
            if a.sport and a.distance_m:
                sport_km[a.sport] = round(sport_km[a.sport] + a.distance_m / 1000, 1)

        hrv_vals = weekly_hrv[ws]
        rhr_vals = weekly_rhr[ws]
        result.append(
            {
                "week_start": ws.isoformat(),
                "activity_count": len(acts),
                "distance_km": round(sum((a.distance_m or 0) / 1000 for a in acts), 1),
                "elevation_m": round(sum(a.elevation_gain_m or 0 for a in acts)),
                "duration_h": round(sum((a.duration_s or 0) / 3600 for a in acts), 1),
                "tss": round(sum(estimate_tss(a, user) for a in acts), 1),
                "sport_distance_km": dict(sport_km),
                "avg_hrv": round(sum(hrv_vals) / len(hrv_vals), 1) if hrv_vals else None,
                "avg_resting_hr": round(sum(rhr_vals) / len(rhr_vals)) if rhr_vals else None,
            }
        )
    return result


# ---------------------------------------------------------------------------
# Monthly aggregates
# ---------------------------------------------------------------------------

def compute_monthly(
    activities: list["Activity"],
    user: "User",
    months: int = 12,
) -> list[dict[str, Any]]:
    """Return monthly training summaries for the last *months* calendar months."""
    today = datetime.date.today()
    month_keys: list[tuple[int, int]] = []
    y, m = today.year, today.month
    for _ in range(months):
        month_keys.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    month_keys.reverse()  # oldest first

    earliest = datetime.date(month_keys[0][0], month_keys[0][1], 1)
    monthly_acts: dict[tuple[int, int], list["Activity"]] = {mk: [] for mk in month_keys}
    for act in activities:
        if act.start_time is None or act.start_time.date() < earliest:
            continue
        mk = (act.start_time.year, act.start_time.month)
        if mk in monthly_acts:
            monthly_acts[mk].append(act)

    result = []
    for mk in month_keys:
        acts = monthly_acts[mk]
        sport_km: dict[str, float] = defaultdict(float)
        for a in acts:
            if a.sport and a.distance_m:
                sport_km[a.sport] = round(sport_km[a.sport] + a.distance_m / 1000, 1)
        result.append(
            {
                "month": f"{mk[0]:04d}-{mk[1]:02d}",
                "activity_count": len(acts),
                "distance_km": round(sum((a.distance_m or 0) / 1000 for a in acts), 1),
                "elevation_m": round(sum(a.elevation_gain_m or 0 for a in acts)),
                "duration_h": round(sum((a.duration_s or 0) / 3600 for a in acts), 1),
                "tss": round(sum(estimate_tss(a, user) for a in acts), 1),
                "sport_distance_km": dict(sport_km),
            }
        )
    return result


# ---------------------------------------------------------------------------
# All-time totals
# ---------------------------------------------------------------------------

def compute_alltime(activities: list["Activity"]) -> dict[str, Any]:
    """Return all-time totals and personal records."""
    if not activities:
        return {
            "total_activities": 0,
            "total_distance_km": 0.0,
            "total_elevation_m": 0,
            "total_duration_h": 0.0,
            "sport_stats": {},
            "first_activity_date": None,
            "last_activity_date": None,
            "longest_activity_h": 0.0,
            "most_elevation_m": 0,
        }

    sport_stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "distance_km": 0.0, "elevation_m": 0, "duration_h": 0.0}
    )
    total_distance_km = 0.0
    total_elevation_m = 0.0
    total_duration_h = 0.0
    longest = 0.0
    most_elevation = 0
    dates: list[datetime.date] = []

    for act in activities:
        s = act.sport or "other"
        dist_km = (act.distance_m or 0) / 1000
        elev = act.elevation_gain_m or 0
        dur_h = (act.duration_s or 0) / 3600

        sport_stats[s]["count"] += 1
        sport_stats[s]["distance_km"] = round(sport_stats[s]["distance_km"] + dist_km, 1)
        sport_stats[s]["elevation_m"] = round(sport_stats[s]["elevation_m"] + elev)
        sport_stats[s]["duration_h"] = round(sport_stats[s]["duration_h"] + dur_h, 1)

        total_distance_km += dist_km
        total_elevation_m += elev
        total_duration_h += dur_h
        if dur_h > longest:
            longest = dur_h
        if elev > most_elevation:
            most_elevation = round(elev)
        if act.start_time:
            dates.append(act.start_time.date())

    return {
        "total_activities": len(activities),
        "total_distance_km": round(total_distance_km, 1),
        "total_elevation_m": round(total_elevation_m),
        "total_duration_h": round(total_duration_h, 1),
        "sport_stats": {k: dict(v) for k, v in sport_stats.items()},
        "first_activity_date": min(dates).isoformat() if dates else None,
        "last_activity_date": max(dates).isoformat() if dates else None,
        "longest_activity_h": round(longest, 1),
        "most_elevation_m": most_elevation,
    }
