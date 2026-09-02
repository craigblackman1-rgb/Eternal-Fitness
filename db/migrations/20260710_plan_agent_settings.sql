CREATE TABLE IF NOT EXISTS plan_agent_settings (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  section TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('text', 'list', 'pace_modes')),
  value JSONB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plan_agent_settings (key, label, section, value_type, value, sort_order) VALUES
('pace_modes', 'Pace Modes', 'Session Composition', 'pace_modes',
 '{"fast":{"label":"Fast","superset_a":3,"superset_b":3,"arms_core":3,"finisher":true,"total":10},"medium":{"label":"Medium","superset_a":3,"superset_b":2,"arms_core":2,"finisher":true,"total":8},"slow":{"label":"Slow","superset_a":2,"superset_b":2,"arms_core":2,"finisher":false,"total":6}}',
 1),

('session_structure_template', '60-Minute Session Structure', 'Session Structure', 'text',
 '"Warm-up & Activation — 10 min, 2 sets, flow through, no rest\nHypertrophy Superset A — 15 min, {{superset_a}} exercises, 2 sets, 60–75s rest. Mobility drill in rest period.\nHypertrophy Superset B — 15 min, {{superset_b}} exercises, 2 sets, 60–75s rest. Mobility drill in rest period.\nArms + Core — 12 min, {{arms_core}} exercises, 2 sets, 60s rest between sets, flow through exercises.\n{{finisher_line}}\nBuffer — 5 min for setup, transitions, coaching cues. Always account for this."',
 2),

('loading_principles', 'Loading Principles', 'Session Structure', 'list',
 '["8–12 reps for compound movements","10–15 reps for accessory and isolation","2–4 second eccentric (lowering phase)","2 sets across all blocks","Progress load only when form is perfect","Mobility sits inside the rest period, not between exercises within a superset","Dynamic drills only mid-session — no static holds over 15 seconds"]',
 3),

('checklist_before_building', 'Before Building', 'Build Checklist', 'list',
 '["Review block history — what was the last focus? What comes next logically?","Has anything changed in this client''s health or circumstances?","Check outstanding actions — do any affect programming?","Confirm paperwork is in order before programming"]',
 4),

('checklist_building_sessions', 'Building Sessions', 'Build Checklist', 'list',
 '["\"Full body\" means every one of these muscle groups is directly targeted at least once across the block''s session set (a session doesn''t need all of them, but the block does): quads, hamstrings, glutes, back, chest, biceps, triceps, shoulders, core. A compound lift may cover more than one group, but every group must be traceable to at least one exercise — a plan with zero chest or zero quad work is not full body and must not be produced.","Each of the 3 sessions must feel genuinely different (different warm-ups, finishers, main work)","No novelty exercise repeats across the 3 sessions (compound lifts are fine to repeat)","Check equipment conflicts — don''t pair exercises that use the same barbell","Landmine exercises: flag custom video needs","Mobility in rest periods: 1–2 dynamic drills per superset, relevant to joints being loaded","Build gym version first; note home alternatives where relevant","Only use equipment listed in STUDIO EQUIPMENT above — do not invent equipment not on that list"]',
 5),

('checklist_after_building', 'After Building', 'Build Checklist', 'list',
 '["Muscle-group audit: list which exercise covers each of quads / hamstrings / glutes / back / chest / biceps / triceps / shoulders / core. If any group has no exercise, go back and add one before responding.","Re-read HARD CONSTRAINTS FOR THIS CLIENT above and confirm nothing you''ve included conflicts with it","Sense check: do all 3 sessions feel genuinely different?","Note any Trainerize custom video requirements","Flag anything for Esther''s clinical review"]',
 6),

('safety_rules', 'Safety Rules', 'Safety', 'list',
 '["Never programme exercises requiring equipment not confirmed in the studio","Never exceed the client''s intensity ceiling","Every exercise must have a documented modification","Never mark a plan as approved — that is Esther''s action only","Cancer-related fatigue is not training fatigue — default to lower volume","If lymphoedema risk is present, flag any compression or sustained upper limb loading","If BP monitoring required, flag exercises that cause Valsalva","If clearance is pending, label the plan DRAFT — PENDING CLEARANCE","If there is no PAR-Q on file and no trainer override recorded above, refuse to produce a full plan — tell Esther it must be completed first"]',
 7)

ON CONFLICT (key) DO NOTHING;
