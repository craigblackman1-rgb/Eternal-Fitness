-- Plan Agent Rules v2 — simplified for Esther (2026-07-11, per Craig's review).
--
-- The 10 v1 settings overlapped (the full-body definition appeared in two
-- checklists, hard-constraint reminders in three places) and hardcoded a rigid
-- Superset A/B session shape that doesn't match how Esther actually programmes
-- (straight sets, tri-sets, strength circuits with embedded stretches,
-- metabolic blocks, skill blocks — see the Becky Trainerize reference,
-- 2026-07-10). v2 collapses to five Esther-facing settings plus an Advanced
-- section, and moves enforcement (library membership, equipment, muscle-group
-- coverage) into code (lib/planValidation.ts) so correctness no longer depends
-- on prompt wording.
--
-- Retired keys (deleted): session_structure_template, loading_principles,
-- checklist_before_building, checklist_building_sessions, checklist_after_building.
-- Kept: safety_rules (unchanged), pace_modes / clinical_system_prompt /
-- phase_guidance / archetype_focus_labels (moved to Advanced).
-- New: training_principles, session_formats, splits, build_checklist.
-- Defaults are mirrored in lib/planAgentPrompt.ts as code fallbacks.

DELETE FROM plan_agent_settings WHERE key IN (
  'session_structure_template',
  'loading_principles',
  'checklist_before_building',
  'checklist_building_sessions',
  'checklist_after_building'
);

INSERT INTO plan_agent_settings (key, label, section, value_type, value, sort_order, description) VALUES

('training_principles', 'Training Principles', 'Principles', 'list',
 '["Programme by strength-training principles, not a fixed template: compound movements first, then accessories and isolation work, with mobility woven into rest periods.","Each session has 1–2 focus patterns for its main strength work (e.g. hinge focus, press focus) and the focus rotates across the block so no pattern is neglected.","Rep ranges: compounds 8–12 as the hypertrophy default, or 4–8 on a max-effort focus lift where the phase and the client''s clearance allow; isolation and accessory work 10–15.","Sets: 3 for main strength work as the default; 2 when time or client capacity is limited (Slow pace, deload week).","Control the eccentric — 2–4 seconds lowering; state the tempo cue on exercises where it matters.","Progressive overload across the 6-week block — load progresses only when form is perfect; final week is a deload (drop volume, submaximal loads).","Mobility and stretches sit inside rest periods or between strength exercises within a superset — dynamic drills mid-session, no static holds over 15 seconds until the cooldown."]',
 1,
 'The core strength-training principles every plan follows: exercise order, rep ranges, sets, tempo, and progression across the 6-week block. This replaces the old fixed session template — the agent builds each session from these principles plus the Session Formats below, so plans can look like Esther''s real programming instead of the same shape every time. Edit these to change how loading and progression work in every generated plan.'),

('session_formats', 'Session Formats', 'Principles', 'list',
 '["Straight sets — one exercise for all its sets before moving on. Use for max-effort compound lifts.","Superset — 2 exercises alternated, rest after the pair.","Tri-set — 3 exercises rotated, rest after the round.","Strength circuit / giant set — 4–6 items rotated over the sets, and it may embed a stretch or mobility drill between strength exercises (Esther''s usual style).","Metabolic block — short conditioning pairing (carries, slams, battle ropes, step-ups), continuous effort, 60–90s rest between rounds.","Skill block — balance or skill progressions tied to the client''s life goals (e.g. paddleboard kneeling-to-stand series).","Pick the mix that suits this client and session — do not force every session into the same shape. Give every main-block exercise a clear group_label naming its format (e.g. \"Superset A\", \"Tri-Set\", \"Metabolic Block\", \"Skill Block\")."]',
 2,
 'The building blocks a session''s main work can be made of. The agent chooses the mix per client and per session — nothing forces every session into supersets any more. Add a format here (e.g. EMOM, drop sets) and the agent can start using it; remove one and it stops.'),

('splits', 'Training Splits', 'Principles', 'list',
 '["Full body: quads, hamstrings, glutes, back, chest, shoulders, arms, core","Upper body: back, chest, shoulders, arms, core","Lower body: quads, hamstrings, glutes, core"]',
 3,
 'One split per line, as "Name: muscle group, muscle group, …". Each client''s profile picks one (Full body is the default — right for ~90% of clients). The listed muscle groups are a contract: every generated session must hit each one with at least one compound or isolation exercise, and the system checks this automatically after generation — a session missing a group is rejected and regenerated, not shipped. Recognised group names: quads, hamstrings, glutes, back, chest, shoulders, arms, core.'),

('build_checklist', 'Build Checklist', 'Build Checklist', 'list',
 '["Review block history and the most recent client update — what did we do last, and what comes next logically? Has anything changed in this client''s health or circumstances?","Confirm paperwork (PAR-Q / clearance) is in order before programming.","Pick exercises ONLY from the exercise library list provided. Only use equipment on the studio list. Don''t pair exercises that need the same barbell.","Coverage audit before responding: for each muscle group in this client''s split, name the exercise that covers it. If any group has no exercise, go back and add one.","Re-read the HARD CONSTRAINTS for this client and confirm nothing you''ve included conflicts with them.","Sessions across the block must feel genuinely different — different warm-ups, focuses, finishers.","Landmine or unusual exercises: flag custom Trainerize video needs. Flag anything needing Esther''s clinical review."]',
 4,
 'The single checklist the agent works through before returning a plan (replaces the old Before/During/After trio, which had overlapping items). The muscle-group coverage and library/equipment items are also enforced in code after generation — this checklist is the agent''s first pass, the code check is the backstop.')

ON CONFLICT (key) DO NOTHING;

-- Safety rules stay as-is, just repositioned after the new settings.
UPDATE plan_agent_settings SET sort_order = 5,
  description = COALESCE(description, 'Clinical safety rules — never violated regardless of any other setting. These are more than style: they gate whether a plan is produced at all (missing PAR-Q, pending clearance) and how clinical populations are loaded.')
  WHERE key = 'safety_rules';

-- Advanced — rarely edited, and a bad edit here can quietly break generation.
UPDATE plan_agent_settings SET section = 'Advanced', sort_order = 90,
  description = 'Exercises-per-session targets by client pace. Only the Total and Finisher columns are used by the agent now — the Superset A/B and Arms + Core columns are legacy from the fixed template and no longer drive session shape.'
  WHERE key = 'pace_modes';
UPDATE plan_agent_settings SET section = 'Advanced', sort_order = 91 WHERE key = 'clinical_system_prompt';
UPDATE plan_agent_settings SET section = 'Advanced', sort_order = 92 WHERE key = 'phase_guidance';
UPDATE plan_agent_settings SET section = 'Advanced', sort_order = 93 WHERE key = 'archetype_focus_labels';
