-- Fix remaining "Level 4 Personal Trainer" / "highest qualification in the UK" /
-- Level 3-vs-4 comparison claims in page_content_blocks that survived the
-- 2026-07-27 code-level rewrite (the DB rows were seeded 2026-07-07, before
-- that fix, and override the already-corrected React fallback copy).
--
-- Esther's Level 4 qualification is CanRehab Cancer and Exercise
-- Rehabilitation specifically — never "Level 4 Personal Trainer" or
-- "highest PT qualification in the UK" framing. See CLAUDE.md.
--
-- Guarded by WHERE content = <old value> so this is safe to re-run: if a row
-- has already been corrected (by this migration or a later hand edit), the
-- UPDATE matches zero rows and is a no-op.

UPDATE page_content_blocks
SET content = 'Level 4 Cancer and Exercise Rehabilitation', updated_at = NOW()
WHERE page_slug = 'home' AND block_key = 'ticker_1'
  AND content = 'Level 4 Personal Trainer';

UPDATE page_content_blocks
SET content = 'Level 4 qualified in Cancer and Exercise Rehabilitation — plus exercise referral', updated_at = NOW()
WHERE page_slug = 'home' AND block_key = 'badge_sub'
  AND content = 'The highest PT qualification in the UK — plus cancer rehab and exercise referral';

UPDATE page_content_blocks
SET content = 'Esther Fair is a personal trainer, Level 4 qualified in Cancer and Exercise Rehabilitation, and also qualified in Exercise Referral, based in Worthing. She specialises in rehabilitation and recovery training for cancer treatment survivors, chronic health conditions, post-surgery recovery, disabilities, and anyone with complex medical needs who has been overlooked by mainstream fitness.', updated_at = NOW()
WHERE page_slug = 'home' AND block_key = 'why_body'
  AND content = 'Esther Fair is a Level 4 personal trainer, Exercise Referral Specialist, and Cancer Rehabilitation Specialist based in Worthing. She specialises in rehabilitation and recovery training for cancer treatment survivors, chronic health conditions, post-surgery recovery, disabilities, and anyone with complex medical needs who has been overlooked by mainstream fitness.';

UPDATE page_content_blocks
SET content = 'Personal Trainer. Level 4 qualified in Cancer and Exercise Rehabilitation. Exercise Referral Specialist. I know first-hand what it feels like to start from zero.', updated_at = NOW()
WHERE page_slug = 'about' AND block_key = 'hero_subhead'
  AND content = 'Level 4 Personal Trainer. Cancer Rehabilitation Specialist. Exercise Referral Specialist. I know first-hand what it feels like to start from zero.';

UPDATE page_content_blocks
SET content = 'Level 4 Cancer and Exercise Rehabilitation', updated_at = NOW()
WHERE page_slug = 'about' AND block_key = 'qual_1_title'
  AND content = 'Level 4 Personal Trainer';

UPDATE page_content_blocks
SET content = 'A specialist qualification held alongside standard personal training certification, registered with a recognised UK fitness body.', updated_at = NOW()
WHERE page_slug = 'about' AND block_key = 'qual_1_desc'
  AND content = 'The highest level of personal training qualification in the UK — above the Level 3 held by most personal trainers. Registered with a recognised UK fitness body.';

UPDATE page_content_blocks
SET content = 'I''m qualified in Exercise Referral, which means I can work safely with clinical populations — and keep adapting your training as your circumstances change.', updated_at = NOW()
WHERE page_slug = 'exercise-for-health' AND block_key = 'approach_p3'
  AND content = 'As a Level 4 Personal Trainer and Exercise Referral Specialist, I am qualified to work with clinical populations that a standard Level 3 PT is not trained for. That distinction matters.';

UPDATE page_content_blocks
SET content = 'Qualified to keep training you if things change', updated_at = NOW()
WHERE page_slug = 'home' AND block_key = 'approach_box_1_title'
  AND content = 'Level 4 qualified — the highest mainstream PT certification in the UK';

UPDATE page_content_blocks
SET content = 'I qualified as a personal trainer, then went further with specialist certifications in Cancer and Exercise Rehabilitation and Exercise Referral. I specifically sought these qualifications to work with people who have more complex medical needs: cancer treatment survivors, those with chronic health conditions, post-surgical recovery, disabilities, and clients whose health situations have led other trainers to say they cannot help. Those are exactly the clients I am here for.', updated_at = NOW()
WHERE page_slug = 'about' AND block_key = 'story_p3'
  AND content = 'I qualified to Level 4 — the highest personal training qualification in the UK — and went further with specialist certifications in Cancer Rehabilitation and Exercise Referral. I specifically sought these qualifications to work with people who have more complex medical needs: cancer treatment survivors, those with chronic health conditions, post-surgical recovery, disabilities, and clients whose health situations have led other trainers to say they cannot help. Those are exactly the clients I am here for.';

-- plan_agent_settings.clinical_system_prompt (seeded by 20260710_plan_agent_settings_generation.sql,
-- ON CONFLICT DO NOTHING so it never got the code-level fix from 20260710_plan_agent_prompt.ts
-- edits). This feeds an LLM system prompt used to generate real client training sessions.
UPDATE plan_agent_settings
SET value = '"You are an expert exercise physiologist supporting Esther Fair, a personal trainer who is Level 4 qualified in Cancer and Exercise Rehabilitation, also qualified in Exercise Referral, with experience in adaptive training and complex health needs.\n\nYour output will be reviewed by Esther before any client sees it. Generate safe, clinically-aware\nsessions. Every exercise must include a modification specific to this client''s contraindications.\nNever exceed the client''s implied intensity ceiling based on their conditions and fitness level.\n\nThe user prompt includes a HARD CONSTRAINTS section for this specific client — these are non-negotiable.\nIf an exercise conflicts with anything marked [HARD], do not include it; find an alternative that\nrespects the constraint instead. Do not ask Esther to repeat these — they are already known.\n\nReturn one valid JSON object matching the Session schema. No markdown, no preamble, no explanation."'::jsonb,
    updated_at = NOW()
WHERE key = 'clinical_system_prompt'
  AND value = '"You are an expert exercise physiologist supporting Esther Fair, a Level 4 Personal Trainer\nspecialising in cancer rehabilitation, exercise referral, adaptive training, and complex health needs.\n\nYour output will be reviewed by Esther before any client sees it. Generate safe, clinically-aware\nsessions. Every exercise must include a modification specific to this client''s contraindications.\nNever exceed the client''s implied intensity ceiling based on their conditions and fitness level.\n\nThe user prompt includes a HARD CONSTRAINTS section for this specific client — these are non-negotiable.\nIf an exercise conflicts with anything marked [HARD], do not include it; find an alternative that\nrespects the constraint instead. Do not ask Esther to repeat these — they are already known.\n\nReturn one valid JSON object matching the Session schema. No markdown, no preamble, no explanation."'::jsonb;
