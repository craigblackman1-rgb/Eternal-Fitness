-- Seeds a "Kneel-to-Stand Progression" workout template — a fall-recovery / rehab
-- progression from a client who cannot get up off the floor at all, through to a full
-- unassisted stand and beyond. Built from a trainer-authored PDF, then reviewed and
-- corrected in session (order of the hand-support sequence, a mislabelled "tall kneeling"
-- vs "half-kneeling" pass mark, an unrealistic "no hands" requirement on the 90/90 test,
-- and a chest-load swapped for a side-load per Esther's read on relative difficulty).
--
-- Repurposes the Exercise{sets,reps,coaching_cue,...} fields the same way the "Client
-- Assessment Results" seed does: `reps` carries what to record (a pass-mark target or a
-- unit), `coaching_cue` carries the pass mark plus coaching notes, `group_label` groups
-- drills under each stage. Side-specific drills are split into separate "— left" / "—
-- right" exercise entries (there is no left/right field on Exercise). Stages that bundle
-- several practice drills under one shared graduation test get an extra synthetic
-- "GRADUATION CHECK" entry carrying that shared pass mark, since coaching_cue is
-- per-exercise and the pass mark isn't tied to any single drill in the group.

INSERT INTO workout_templates (name, data, archetypes, movement_type, muscle_groups, equipment, condition_tags)
SELECT
  'Kneel-to-Stand Progression',
  $data$
  {
    "warm_up": [],
    "main_block": [
      {
        "exercise_name": "Half-kneeling hip flexor stretch, posterior pelvic tuck — left",
        "sets": 3, "reps": "sec held", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Posterior pelvic tuck (tail tucked under, avoid arching the lower back) — isolates the hip flexor rather than the spine.",
        "modification": "", "equipment": [], "log_type": "time", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "Half-kneeling hip flexor stretch, posterior pelvic tuck — right",
        "sets": 3, "reps": "sec held", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Posterior pelvic tuck (tail tucked under, avoid arching the lower back) — isolates the hip flexor rather than the spine.",
        "modification": "", "equipment": [], "log_type": "time", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "Half-kneeling hip flexor stretch with overhead reach — left",
        "sets": 3, "reps": "sec held", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Adds thoracic extension, mirrors the tall position needed at the top of the stand.",
        "modification": "", "equipment": [], "log_type": "time", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "Half-kneeling hip flexor stretch with overhead reach — right",
        "sets": 3, "reps": "sec held", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Adds thoracic extension, mirrors the tall position needed at the top of the stand.",
        "modification": "", "equipment": [], "log_type": "time", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "Kneeling rock-backs",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "From tall kneeling (both knees down), sit hips back toward heels and return to tall, controlled and slow — builds hip flexion/extension range and knee/ankle tolerance together.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "Half-kneeling hip shift — left",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Front foot planted, back knee down — shift the torso/hips side-to-side over the front leg and back to centre (not the knee moving out). Builds the hip stability needed to load that leg during the stand.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "Half-kneeling hip shift — right",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Front foot planted, back knee down — shift the torso/hips side-to-side over the front leg and back to centre (not the knee moving out). Builds the hip stability needed to load that leg during the stand.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "Kneeling hip CARs, both directions — left",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Slow, full-range hip circles from tall kneeling — restores range in every plane rather than just flexion/extension.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "Kneeling hip CARs, both directions — right",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Slow, full-range hip circles from tall kneeling — restores range in every plane rather than just flexion/extension.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Kneeling hip mobility"
      },
      {
        "exercise_name": "GRADUATION CHECK — Kneeling hip mobility",
        "sets": 1, "reps": "20-30 sec each side, then controlled rock-back", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Holds half-kneeling (top-of-lunge), hips fully extended, 20-30 sec each side; rocks back and returns under control, no hand support. This is the shared pass mark for all 5 drills above — not tied to any one individually. Corrected from \"tall kneeling\" in the source PDF, since \"both sides\" and \"top-of-lunge\" only make sense for half-kneeling. Most floor-to-stand failures trace back to the hip not extending into this position. Do on a padded surface if needed.",
        "modification": "Record date achieved", "equipment": [], "log_type": "time", "group_label": "Kneeling hip mobility"
      },

      {
        "exercise_name": "90/90 hip switches",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Build internal/external rotation range. Pass mark: moves through 90/90 switches without pain (not \"without hands\" — some clients can't do this hands-free but can already get up from the floor fine; that would wrongly gate them).",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "General hip mobility"
      },
      {
        "exercise_name": "Standing hip circles (\"open the gates\")",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "General warm-up mobility. Supports the kneeling-specific work rather than replacing it — rotation range here carries over into the hip shift needed mid-stand.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "General hip mobility"
      },

      {
        "exercise_name": "Tall kneeling hold on a padded surface (both knees down)",
        "sets": 3, "reps": "sec held", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Short holds, building duration. Pass mark: comfortable kneeling on a mat for 60 sec without pain or anxiety.",
        "modification": "", "equipment": [], "log_type": "time", "group_label": "Kneeling & floor tolerance"
      },
      {
        "exercise_name": "Side-sit to all-fours transition — left",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Fear of the floor — from a past fall, or simply not trusting they can get back up — is as big a barrier as strength. Build confidence going down before working on coming up.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Kneeling & floor tolerance"
      },
      {
        "exercise_name": "Side-sit to all-fours transition — right",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Fear of the floor — from a past fall, or simply not trusting they can get back up — is as big a barrier as strength. Build confidence going down before working on coming up.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Kneeling & floor tolerance"
      },
      {
        "exercise_name": "Supported lowering to floor (bench/chair/wall)",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "The full controlled descent from standing — through a lunge/half-kneel — all the way down to sitting on the floor, using the support the whole way (more than just the lunge portion). Pass mark: gets down to the floor under control using support.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Kneeling & floor tolerance"
      },

      {
        "exercise_name": "Glute bridge / hip thrust",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Drives the hips forward at the top of the stand.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Foundational strength"
      },
      {
        "exercise_name": "Wall sit / supported squat hold",
        "sets": 3, "reps": "sec held", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Quad endurance — timed hold, log in seconds.",
        "modification": "", "equipment": [], "log_type": "time", "group_label": "Foundational strength"
      },
      {
        "exercise_name": "Sit-to-stand from a raised, stable surface, hands allowed",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "General strength work outside the get-up pattern pays off fastest here — don't rush into pattern practice if this pass mark isn't met yet. Pass mark: 5 clean reps from a raised surface (a one-off test — the set boxes above are for ongoing practice, not the specific number in the test).",
        "modification": "Record date achieved", "equipment": [], "log_type": "reps", "group_label": "Foundational strength"
      },
      {
        "exercise_name": "Bird dog / dead bug — left",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Core stability through the transitional moment of the stand.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Foundational strength"
      },
      {
        "exercise_name": "Bird dog / dead bug — right",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Core stability through the transitional moment of the stand.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Foundational strength"
      },

      {
        "exercise_name": "Get-up, both hands supporting (bench or floor)",
        "sets": 3, "reps": "2-3 each side; 3-5 daily at home", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Teach the pattern in its easiest, most supported form first. Pass mark: tall kneeling to stand with both hands supporting.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Both hands supporting"
      },
      {
        "exercise_name": "One-hand support (floor or low bench)",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Build the stronger side up first so the client feels the pattern working before it gets harder. Pass mark: one hand only, smooth and controlled.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "1 hand"
      },
      {
        "exercise_name": "Get-up with fingertip touch only",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Fingertip touch is a safety net, not a crutch — client should barely be using it. Pass mark: fingertip touch only, smooth and pain-free.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Fingertip touch"
      },
      {
        "exercise_name": "No hands, verbal cue only",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "A verbal cue (\"drive through the front foot\" / \"chest up\") replaces the hand as the confidence prop at this stage. Pass mark: completes with verbal cue only, no hand contact.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "No hands — verbal cue"
      },
      {
        "exercise_name": "Full get-up, no hands",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "GOAL: 3 clean unassisted reps = goal achieved. If progress stalls: usual blockers are knee discomfort in the half-kneel (more padding, or elevate the front foot — a small step or plate under the front foot reduces how far the back knee has to bend and shifts more of the lean onto the front leg, taking pressure off the sore knee) or hip/ankle stiffness, which the cooldown mobility work should address.",
        "modification": "Record date achieved — the confidence milestone client and coach both look for", "equipment": [], "log_type": "reps", "group_label": "Unassisted (GOAL)"
      },

      {
        "exercise_name": "Floor seated to stand",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Seated on the floor (not a kneeling start) to a full stand. Placed right after Unassisted — a client who's hit tall-kneeling-unassisted can usually already do this; it's the real-world entry point (no kneeling set-up after an actual fall), not a harder strength step.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Floor seated to stand"
      },
      {
        "exercise_name": "Slow eccentric — 4 sec lower back down under control",
        "sets": 3, "reps": "reps", "tempo": "4 sec descent", "rest": "n/a",
        "coaching_cue": "Tempo control on the way down builds the strength reserve that protects against a fall, not just the ability to stand. Pass mark: 4-count descent, controlled throughout, both sides.",
        "modification": "", "equipment": [], "log_type": "reps", "group_label": "Slow eccentric"
      },
      {
        "exercise_name": "Add load at the side — 3-6kg DB, suitcase-style",
        "sets": 3, "reps": "reps @ kg", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Swapped from a chest hold — chest-loading blocks both hands at once and was flagged as possibly the hardest thing on the plan. Currently the client's working stage. Pass mark: clean reps at top of load range, both sides even.",
        "modification": "Current block", "equipment": ["Dumbbells"], "log_type": "reps", "group_label": "Add load at side"
      },
      {
        "exercise_name": "Arms overhead — DB or KB extended overhead throughout",
        "sets": 3, "reps": "reps @ kg", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Adds a core/shoulder-stability demand on top of the base pattern — don't progress here until the load-at-side stage is solid. Pass mark: overhead position held stable through the entire get-up, both sides.",
        "modification": "", "equipment": ["Dumbbells", "Kettlebell"], "log_type": "reps", "group_label": "Arms overhead"
      },

      {
        "exercise_name": "Get-up from progressively lower surfaces (thick mat to thin mat to bare floor)",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Mirrors real falls, which rarely happen on a gym mat.",
        "modification": "Set individually against the client's real-world goal", "equipment": [], "log_type": "reps", "group_label": "Beyond: surface & fatigue (optional)"
      },
      {
        "exercise_name": "Get-up on an uneven/soft surface (cushion, grass, wobble cushion)",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Mirrors real falls, which rarely happen on a gym mat.",
        "modification": "Set individually against the client's real-world goal", "equipment": [], "log_type": "reps", "group_label": "Beyond: surface & fatigue (optional)"
      },
      {
        "exercise_name": "Get-up after light fatigue (following 2-3 other exercises)",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Tests whether the pattern holds up outside ideal, rested, planned conditions — the real test of independence.",
        "modification": "Set individually against the client's real-world goal", "equipment": [], "log_type": "reps", "group_label": "Beyond: surface & fatigue (optional)"
      },
      {
        "exercise_name": "Timed / reactive get-up on an unplanned cue",
        "sets": 3, "reps": "reps", "tempo": "n/a", "rest": "n/a",
        "coaching_cue": "Tests whether the pattern holds up outside ideal, rested, planned conditions — the real test of independence. Not required for every client — only add once Unassisted is solid and the goal calls for it.",
        "modification": "Set individually against the client's real-world goal", "equipment": [], "log_type": "reps", "group_label": "Beyond: surface & fatigue (optional)"
      }
    ],
    "cooldown": []
  }
  $data$::jsonb,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY['rehab', 'fall-recovery', 'mobility']::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM workout_templates WHERE name = 'Kneel-to-Stand Progression'
);
