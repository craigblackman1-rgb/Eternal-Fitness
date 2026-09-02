-- Add a short explanation to each plan_agent_settings row — what it does, why it
-- exists, and the practical impact of changing it. Shown directly under the label
-- on the Settings > Plan Agent Rules page so Esther can see the "why" before editing.

ALTER TABLE plan_agent_settings ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE plan_agent_settings SET description =
  'Controls how many exercises go in each section of a session, per client pace mode (Fast/Medium/Slow) — set on each client''s profile. This is what keeps a session actually finishable in the time available. Increasing a number makes that pace mode''s sessions busier; the Finisher toggle turns the conditioning finisher on or off entirely for that mode. Changing this affects every client on that pace mode, not just one person.'
  WHERE key = 'pace_modes';

UPDATE plan_agent_settings SET description =
  'The fixed 60-minute shape every session is built around (warm-up, two supersets, arms + core, optional finisher, buffer). {{superset_a}}, {{superset_b}}, {{arms_core}} and {{finisher_line}} are placeholders — they''re swapped for the real numbers from Pace Modes above when a plan is generated, so keep those exact tokens if you edit the wording around them. Changing the minute allocations here changes the actual timing structure of every future session.'
  WHERE key = 'session_structure_template';

UPDATE plan_agent_settings SET description =
  'General rep-range, tempo and set-count rules applied to every exercise the agent writes — this is Esther''s baseline programming philosophy, not specific to any one client. Editing an item (e.g. changing "8–12 reps" to "6–10 reps") changes the loading scheme on every plan generated from now on, for every client.'
  WHERE key = 'loading_principles';

UPDATE plan_agent_settings SET description =
  'Questions the agent works through before writing anything — using the client''s block history and outstanding actions it already has in context, so it builds on what came before instead of starting blank each time. Removing an item stops the agent explicitly reasoning about that check (it may still happen by chance, but is no longer guaranteed).'
  WHERE key = 'checklist_before_building';

UPDATE plan_agent_settings SET description =
  'Rules the agent must follow while actually assembling exercises — most importantly the "full body" definition (which muscle groups must appear somewhere across the block) and the equipment/variety rules. This is the most load-bearing list on the page: loosening the full-body definition or removing the equipment-conflict rule directly changes what counts as an acceptable plan.'
  WHERE key = 'checklist_building_sessions';

UPDATE plan_agent_settings SET description =
  'A self-check the agent runs against its own output before you see it — re-reading the hard constraints, confirming session variety, flagging anything for clinical review. This is a self-review pass, not a hard gate, so it reduces mistakes rather than eliminating them. Removing items here makes the agent less likely to catch its own errors before the plan reaches you.'
  WHERE key = 'checklist_after_building';

UPDATE plan_agent_settings SET description =
  'Non-negotiable clinical and process rules — equipment limits, intensity ceilings, the PAR-Q refusal rule, cancer-fatigue handling. These are the closest thing on this page to hard guardrails; the agent is instructed to never violate them. Removing or softening a rule here is a genuine safety-relevant change, not a style tweak — review carefully before editing.'
  WHERE key = 'safety_rules';

UPDATE plan_agent_settings SET description =
  'The system prompt sent with every individual session-generation call — a separate, more tightly scoped pass from the Plan Agent chat, run once per session to produce the actual structured exercise JSON. Editing this changes the agent''s framing and baseline safety instructions for every session it writes, across every client, not just the current conversation.'
  WHERE key = 'clinical_system_prompt';

UPDATE plan_agent_settings SET description =
  'What each of the 6-week block''s five phases (foundation/build/develop/peak/deload) means in practice — this is what makes week 1 look different from week 5. Each session-generation call is told which phase it''s in and given this line as guidance. Editing a phase''s wording changes how that week is programmed for every client from then on.'
  WHERE key = 'phase_guidance';

UPDATE plan_agent_settings SET description =
  'What each of the three session archetypes (A/B/C) is meant to emphasise. Used in the generation prompt so the agent knows what a given session should focus on, and as a fallback label shown to Esther if the agent doesn''t supply its own. Renaming these only changes the label wording — which sessions get assigned which letter is separate rotation logic, unaffected by this page.'
  WHERE key = 'archetype_focus_labels';
