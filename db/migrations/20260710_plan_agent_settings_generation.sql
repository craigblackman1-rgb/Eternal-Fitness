-- Extend plan_agent_settings to cover the hardcoded sections in generate-block/route.ts
-- (clinical system prompt, phase guidance, archetype focus labels) — same pattern as
-- 20260710_plan_agent_settings.sql, just two new value_type variants for small
-- structured (keyed) editors.

ALTER TABLE plan_agent_settings DROP CONSTRAINT IF EXISTS plan_agent_settings_value_type_check;
ALTER TABLE plan_agent_settings ADD CONSTRAINT plan_agent_settings_value_type_check
  CHECK (value_type IN ('text', 'list', 'pace_modes', 'phase_guidance', 'archetype_labels'));

INSERT INTO plan_agent_settings (key, label, section, value_type, value, sort_order) VALUES
('clinical_system_prompt', 'Clinical System Prompt', 'Generation', 'text',
 '"You are an expert exercise physiologist supporting Esther Fair, a Level 4 Personal Trainer\nspecialising in cancer rehabilitation, exercise referral, adaptive training, and complex health needs.\n\nYour output will be reviewed by Esther before any client sees it. Generate safe, clinically-aware\nsessions. Every exercise must include a modification specific to this client''s contraindications.\nNever exceed the client''s implied intensity ceiling based on their conditions and fitness level.\n\nThe user prompt includes a HARD CONSTRAINTS section for this specific client — these are non-negotiable.\nIf an exercise conflicts with anything marked [HARD], do not include it; find an alternative that\nrespects the constraint instead. Do not ask Esther to repeat these — they are already known.\n\nReturn one valid JSON object matching the Session schema. No markdown, no preamble, no explanation."',
 8),

('phase_guidance', 'Phase Guidance', 'Generation', 'phase_guidance',
 '{"foundation":"basic regressions, learn patterns, low load, lower ROM","build":"increase load, add complexity to established patterns","develop":"compound movements, greater ROM, higher challenge","peak":"highest intensity/volume of the block","deload":"drop volume, submax loads, active recovery focus, easier exercises"}',
 9),

('archetype_focus_labels', 'Archetype Focus Labels', 'Generation', 'archetype_labels',
 '{"A":"Mobility & Movement Quality","B":"Strength & Stability","C":"Power & Conditioning"}',
 10)

ON CONFLICT (key) DO NOTHING;
