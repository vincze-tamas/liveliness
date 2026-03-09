"""Periodization engine.

Given a target race date and today's date, returns the current training
phase and cycle metadata used by the planner and the training UI.
"""
from __future__ import annotations

import datetime
import math
from dataclasses import dataclass


@dataclass
class CycleInfo:
    phase: str           # base / build / peak / taper / race / recovery / off
    weeks_to_race: int   # negative = post-race
    week_of_phase: int   # 1-based week within the current phase
    phase_label: str     # e.g. "Base Week 3"
    phase_display: str   # e.g. "Base"


# Each entry: (min_weeks_inclusive, max_weeks_inclusive, phase, display_name)
_PHASE_THRESHOLDS: list[tuple[int, int, str, str]] = [
    (12, 9999, "base",     "Base"),
    (7,  11,   "build",    "Build"),
    (3,  6,    "peak",     "Peak"),
    (1,  2,    "taper",    "Taper"),
    (0,  0,    "race",     "Race"),
]
_RECOVERY_WEEKS = 3  # weeks post-race before "off-season"

# Phase start week (weeks_to_race at which the phase begins)
_PHASE_START: dict[str, int] = {
    "base":     12,
    "build":    11,
    "peak":     6,
    "taper":    2,
    "race":     0,
}


def get_phase(race_date: datetime.date, today: datetime.date | None = None) -> str:
    """Return the current training phase string."""
    return compute_cycle_info(race_date, today).phase


def compute_cycle_info(
    race_date: datetime.date,
    today: datetime.date | None = None,
) -> CycleInfo:
    """Return full periodization context for the given race date."""
    if today is None:
        today = datetime.date.today()

    days_to_race = (race_date - today).days
    weeks_to_race = math.ceil(days_to_race / 7)

    # Determine phase
    phase = "off"
    phase_display = "Off-Season"

    if weeks_to_race < -_RECOVERY_WEEKS:
        phase = "off"
        phase_display = "Off-Season"
    elif weeks_to_race < 0:
        phase = "recovery"
        phase_display = "Recovery"
    else:
        for min_w, max_w, p, label in _PHASE_THRESHOLDS:
            if min_w <= weeks_to_race <= max_w:
                phase = p
                phase_display = label
                break

    # Compute week-of-phase (1-based)
    start_weeks = _PHASE_START.get(phase, 0)
    if phase == "base":
        # base can stretch indefinitely before week 12
        week_of_phase = max(1, start_weeks - weeks_to_race + 1)
    elif phase in ("build", "peak", "taper", "race"):
        week_of_phase = max(1, start_weeks - weeks_to_race + 1)
    elif phase == "recovery":
        week_of_phase = max(1, abs(weeks_to_race))
    else:
        week_of_phase = 1

    phase_label = f"{phase_display} Week {week_of_phase}"

    return CycleInfo(
        phase=phase,
        weeks_to_race=weeks_to_race,
        week_of_phase=week_of_phase,
        phase_label=phase_label,
        phase_display=phase_display,
    )
