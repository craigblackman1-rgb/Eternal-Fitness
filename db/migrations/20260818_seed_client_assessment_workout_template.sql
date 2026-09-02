-- Seeds a "Client Assessment Results" workout template so Esther can apply it as a
-- session (once at the start of a block, once at the end) and log results through the
-- existing set-logging flow — the Day 1 vs end-of-block comparison then comes from
-- diffing the two logged sessions, not from columns baked into the template itself.
--
-- Repurposes the Exercise{sets,reps,...} fields for assessment items that aren't
-- conventional training exercises (flexibility, balance, body measurements): `reps`
-- carries the unit/instruction text (e.g. "record cm"), `sets` carries attempt count
-- where relevant (balance = 3), and `coaching_cue` carries the test protocol.

INSERT INTO workout_templates (name, data, archetypes, movement_type, muscle_groups, equipment, condition_tags)
SELECT
  'Client Assessment Results',
  $data$
  {
    "warm_up": [],
    "main_block": [
      {
        "exercise_name": "Push ups",
        "sets": 1,
        "reps": "max reps in 30 sec",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "Count reps completed in 30 seconds.",
        "modification": "Full / Box / Knees / Incline — record variation used",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Functional strength"
      },
      {
        "exercise_name": "Sit to stand",
        "sets": 1,
        "reps": "max reps in 30 sec",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "Count reps completed in 30 seconds.",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Functional strength"
      },
      {
        "exercise_name": "Seated DB press",
        "sets": 1,
        "reps": "max reps at chosen weight",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "Record weight (kg) used and reps achieved.",
        "modification": "",
        "equipment": ["Dumbbells"],
        "log_type": "reps",
        "group_label": "Functional strength"
      },
      {
        "exercise_name": "Hamstring flexibility — left",
        "sets": 1,
        "reps": "record cm / rating",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "Record left-side hamstring flexibility.",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Flexibility"
      },
      {
        "exercise_name": "Hamstring flexibility — right",
        "sets": 1,
        "reps": "record cm / rating",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "Record right-side hamstring flexibility.",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Flexibility"
      },
      {
        "exercise_name": "Shoulder flexibility — left",
        "sets": 1,
        "reps": "record cm / rating",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "Record left-side shoulder flexibility.",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Flexibility"
      },
      {
        "exercise_name": "Shoulder flexibility — right",
        "sets": 1,
        "reps": "record cm / rating",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "Record right-side shoulder flexibility.",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Flexibility"
      },
      {
        "exercise_name": "Balance — left leg",
        "sets": 3,
        "reps": "seconds held",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "3 attempts. Record seconds held for each attempt.",
        "modification": "",
        "equipment": [],
        "log_type": "time",
        "group_label": "Balance"
      },
      {
        "exercise_name": "Balance — right leg",
        "sets": 3,
        "reps": "seconds held",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "3 attempts. Record seconds held for each attempt.",
        "modification": "",
        "equipment": [],
        "log_type": "time",
        "group_label": "Balance"
      },
      {
        "exercise_name": "Body weight",
        "sets": 1,
        "reps": "record kg",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Weight & body measurements"
      },
      {
        "exercise_name": "Waist",
        "sets": 1,
        "reps": "record cm",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Weight & body measurements"
      },
      {
        "exercise_name": "Hip",
        "sets": 1,
        "reps": "record cm",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Weight & body measurements"
      },
      {
        "exercise_name": "Chest",
        "sets": 1,
        "reps": "record cm",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Weight & body measurements"
      },
      {
        "exercise_name": "Thigh — left",
        "sets": 1,
        "reps": "record cm",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Weight & body measurements"
      },
      {
        "exercise_name": "Thigh — right",
        "sets": 1,
        "reps": "record cm",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Weight & body measurements"
      },
      {
        "exercise_name": "Upper arm — left",
        "sets": 1,
        "reps": "record cm",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Weight & body measurements"
      },
      {
        "exercise_name": "Upper arm — right",
        "sets": 1,
        "reps": "record cm",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Weight & body measurements"
      },
      {
        "exercise_name": "Other relevant tests",
        "sets": 1,
        "reps": "record notes",
        "tempo": "n/a",
        "rest": "n/a",
        "coaching_cue": "Use for any additional test results not captured above.",
        "modification": "",
        "equipment": [],
        "log_type": "reps",
        "group_label": "Other tests"
      }
    ],
    "cooldown": []
  }
  $data$::jsonb,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY['assessment']::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM workout_templates WHERE name = 'Client Assessment Results'
);
