"""Weight training service.

Provides a home gym exercise library, phase-appropriate session plan generator,
and wTSS (weight Training Stress Score) calculator.
"""
from __future__ import annotations

from typing import TypedDict


# ---------------------------------------------------------------------------
# Exercise library
# ---------------------------------------------------------------------------

class Exercise(TypedDict):
    name: str
    category: str       # squat / hinge / push / pull / core / carry
    primary_muscles: list[str]
    description: str
    equipment: str


EXERCISE_LIBRARY: list[Exercise] = [
    {
        "name": "squat",
        "category": "squat",
        "primary_muscles": ["quads", "glutes", "core"],
        "description": "Stand with feet shoulder-width apart. Descend until thighs are parallel to the floor, keeping chest tall and knees tracking over toes. Drive through heels to stand.",
        "equipment": "barbell / dumbbells / bodyweight",
    },
    {
        "name": "goblet squat",
        "category": "squat",
        "primary_muscles": ["quads", "glutes", "core"],
        "description": "Hold a kettlebell or dumbbell at chest height. Squat deep, elbows inside knees at the bottom. Great for mobility and positioning.",
        "equipment": "kettlebell / dumbbell",
    },
    {
        "name": "deadlift",
        "category": "hinge",
        "primary_muscles": ["hamstrings", "glutes", "lower back", "traps"],
        "description": "Hinge at the hips, grip the bar just outside your legs. Keep back flat, pull the floor away and drive hips forward to stand tall.",
        "equipment": "barbell / dumbbells",
    },
    {
        "name": "single-leg RDL",
        "category": "hinge",
        "primary_muscles": ["hamstrings", "glutes", "core"],
        "description": "Stand on one leg, hinge forward with a flat back until you feel a hamstring stretch, then drive the hip back to stand. Use a light dumbbell for balance.",
        "equipment": "dumbbell / bodyweight",
    },
    {
        "name": "kettlebell swing",
        "category": "hinge",
        "primary_muscles": ["hamstrings", "glutes", "core", "shoulders"],
        "description": "Hinge and hike the kettlebell back between your legs, then snap the hips forward to drive it to chest height. Power from the hips, not the arms.",
        "equipment": "kettlebell",
    },
    {
        "name": "box jump",
        "category": "squat",
        "primary_muscles": ["quads", "glutes", "calves"],
        "description": "Stand in front of a sturdy box. Hinge and swing arms, then explode upward, land softly on both feet with knees slightly bent. Step down — never jump down.",
        "equipment": "box / step",
    },
    {
        "name": "push-up",
        "category": "push",
        "primary_muscles": ["chest", "triceps", "shoulders", "core"],
        "description": "Hands just outside shoulder-width, body in a straight line. Lower chest to the floor under control, then press back up. Keep core tight throughout.",
        "equipment": "bodyweight",
    },
    {
        "name": "pike push-up",
        "category": "push",
        "primary_muscles": ["shoulders", "triceps", "upper chest"],
        "description": "Start in a downward dog position. Bend elbows to lower the top of your head toward the floor, then press back up. Targets shoulders more than standard push-ups.",
        "equipment": "bodyweight",
    },
    {
        "name": "dumbbell press",
        "category": "push",
        "primary_muscles": ["chest", "triceps", "front shoulders"],
        "description": "Lie on a bench or floor. Press dumbbells from chest height until arms are extended, then lower under control. Floor press reduces shoulder stress.",
        "equipment": "dumbbells",
    },
    {
        "name": "pull-up",
        "category": "pull",
        "primary_muscles": ["lats", "biceps", "rear delts", "core"],
        "description": "Hang from a bar with an overhand grip slightly wider than shoulders. Pull until chin clears the bar, then lower fully. Scale with a band if needed.",
        "equipment": "pull-up bar",
    },
    {
        "name": "inverted row",
        "category": "pull",
        "primary_muscles": ["lats", "mid back", "biceps"],
        "description": "Lie under a table or low bar, grip overhand. Keep body rigid and pull chest to the bar. Easier than pull-ups — great regression or volume work.",
        "equipment": "table / low bar / rings",
    },
    {
        "name": "dumbbell row",
        "category": "pull",
        "primary_muscles": ["lats", "rhomboids", "biceps"],
        "description": "Support yourself with one hand on a bench. Pull the dumbbell from a hanging position to hip height, keeping elbow close to the body. Squeeze the shoulder blade at the top.",
        "equipment": "dumbbell",
    },
    {
        "name": "plank",
        "category": "core",
        "primary_muscles": ["transverse abdominis", "obliques", "glutes"],
        "description": "Forearms on the floor, body in a straight line from head to heels. Brace your core and squeeze your glutes. Hold the position without letting hips sag or rise.",
        "equipment": "bodyweight",
    },
    {
        "name": "hollow hold",
        "category": "core",
        "primary_muscles": ["abs", "hip flexors"],
        "description": "Lie on your back, press lower back into the floor. Extend arms overhead and lift legs 15–20 cm off the floor. Hold the 'banana' shape — no arching.",
        "equipment": "bodyweight",
    },
    {
        "name": "farmers carry",
        "category": "carry",
        "primary_muscles": ["grip", "traps", "core", "glutes"],
        "description": "Hold a heavy dumbbell or kettlebell in each hand. Walk tall for the prescribed distance or time, keeping shoulders packed and core braced.",
        "equipment": "dumbbells / kettlebells",
    },
]

# Index by name for fast lookup
EXERCISE_BY_NAME: dict[str, Exercise] = {e["name"]: e for e in EXERCISE_LIBRARY}


# ---------------------------------------------------------------------------
# Phase-appropriate plan generator
# ---------------------------------------------------------------------------

class ExercisePrescription(TypedDict):
    exercise_name: str
    sets: int
    reps: str        # e.g. "8–10" or "30 s" for isometrics
    rest_s: int
    guidance: str


# Each phase: list of (exercise_name, sets, reps_str, rest_s, guidance)
_PHASE_PLANS: dict[str, list[tuple[str, int, str, int, str]]] = {
    "base": [
        ("squat",          4, "8–10", 90, "Controlled tempo — 3 s down, 1 s up. Moderate load."),
        ("deadlift",       4, "8",    120, "Keep lower back flat. Build to a challenging but manageable weight."),
        ("push-up",        3, "10–15", 60, "Full range of motion. Add a weight vest if too easy."),
        ("dumbbell row",   3, "10",   60, "Focus on scapular retraction at the top."),
        ("goblet squat",   3, "12",   60, "Use as a warm-up or accessory after main squat."),
        ("plank",          3, "45 s", 45, "Brace hard — think about pulling elbows toward toes."),
    ],
    "build": [
        ("squat",          3, "12–15", 60, "Reduce load vs. base phase. Pair with goblet squat as a superset."),
        ("kettlebell swing", 3, "15", 45, "Superset with squat. Explosive hip drive."),
        ("push-up",        3, "15–20", 45, "Superset with dumbbell row."),
        ("dumbbell row",   3, "12",   45, "Superset with push-up."),
        ("single-leg RDL", 3, "10/leg", 60, "Balance and posterior chain endurance."),
        ("farmers carry",  3, "30 s", 60, "Walk tall, heavy. Great for running posture."),
        ("hollow hold",    3, "30 s", 45, "Strict position. Regress with knees bent if needed."),
    ],
    "peak": [
        ("box jump",       3, "4–5",  120, "Full recovery between sets — quality over quantity."),
        ("deadlift",       3, "3–5",  150, "Heavy. Aim for 85–90% of 1RM. Perfect form only."),
        ("push-up",        2, "10",   90, "Weighted if available. Keep it sharp, not exhausting."),
        ("pull-up",        3, "4–6",  120, "Add a weight belt if bodyweight is easy."),
        ("plank",          2, "30 s", 60, "Maintenance only."),
    ],
    "taper": [
        ("squat",          2, "6–8",  120, "Moderate load, nothing to failure. Just maintain activation."),
        ("deadlift",       2, "4",    120, "70% of usual load. Focus on technique feel."),
        ("push-up",        2, "8",    90, "Easy. Should feel effortless."),
        ("inverted row",   2, "8",    90, "Light and controlled."),
        ("plank",          2, "20 s", 45, "Short and easy."),
    ],
    "race": [
        ("push-up",        2, "8",    60, "Body-weight activation only. Light and fast."),
        ("goblet squat",   2, "10",   60, "Light dumbbell. Loosen up the legs."),
        ("hollow hold",    2, "20 s", 45, "Core activation — nothing strenuous."),
    ],
    "recovery": [
        ("push-up",        2, "8",    60, "Gentle movement only."),
        ("goblet squat",   2, "10",   60, "Light. Focus on mobility, not load."),
        ("plank",          2, "20 s", 45, "Core wake-up."),
        ("single-leg RDL", 2, "8/leg", 60, "Balance and light hamstring work."),
    ],
    "off": [
        ("squat",          3, "10",  90, "Unstructured — choose weights that feel good today."),
        ("deadlift",       3, "8",   90, "Enjoy the lift without chasing numbers."),
        ("push-up",        3, "10",  60, "Any variation you like."),
        ("pull-up",        3, "6–8", 90, "Easy effort."),
        ("plank",          2, "30 s", 45, "Core maintenance."),
    ],
}


def generate_session_plan(phase: str) -> list[ExercisePrescription]:
    """Return a list of exercise prescriptions for the given training phase."""
    prescriptions = _PHASE_PLANS.get(phase, _PHASE_PLANS["base"])
    return [
        ExercisePrescription(
            exercise_name=name,
            sets=sets,
            reps=reps,
            rest_s=rest_s,
            guidance=guidance,
        )
        for name, sets, reps, rest_s, guidance in prescriptions
    ]


# ---------------------------------------------------------------------------
# wTSS calculator
# ---------------------------------------------------------------------------

def calculate_wtss(duration_min: int | float, rpe: float) -> float:
    """Weight Training Stress Score.

    wTSS = (duration_min / 60) × rpe_factor × 50
    rpe_factor: 0.5 at RPE 1 → 1.5 at RPE 10 (linear)
    """
    rpe = max(1.0, min(10.0, rpe))  # clamp to [1, 10]
    rpe_factor = 0.5 + (rpe - 1) / 9
    return round((duration_min / 60) * rpe_factor * 50, 1)
