-- Keyword targeting for the Content & Keyword system.
-- Values drawn from the page's own existing copy (already condition-led, well-adapted)
-- plus Esther's own language in the 27 June Otter.ai planning transcript.
-- Additive/idempotent — only updates rows that still have a NULL primary_keyword,
-- so it never clobbers anything Esther edits in the hub after this runs.

UPDATE page_keywords SET
  primary_keyword = 'Level 4 personal trainer Worthing',
  keyword_cluster = ARRAY['health conditions', 'exercise referral', 'cancer rehabilitation', 'GP-referred', 'private one-to-one training'],
  status = 'reviewed'
WHERE page_slug = 'home' AND primary_keyword IS NULL;

UPDATE page_keywords SET
  primary_keyword = 'Esther Fair personal trainer Worthing',
  keyword_cluster = ARRAY['Level 4 qualified', 'exercise referral specialist', 'cancer rehabilitation', 'complex health needs'],
  status = 'reviewed',
  notes = 'Cancer rehabilitation qualification wording pending a Craig/Esther accuracy check (see EF_Page_Review_Jul2026.md) — keyword deliberately avoids overclaiming "specialist" status until resolved.'
WHERE page_slug = 'about' AND primary_keyword IS NULL;

UPDATE page_keywords SET
  primary_keyword = 'personal training for health conditions Worthing',
  keyword_cluster = ARRAY['GP-referred exercise', 'chronic conditions', 'disability training', 'adaptive training', 'injury recovery'],
  status = 'reviewed'
WHERE page_slug = 'personal-training' AND primary_keyword IS NULL;

UPDATE page_keywords SET
  primary_keyword = 'exercise for health conditions Worthing',
  keyword_cluster = ARRAY['high blood pressure', 'type 2 diabetes', 'bone health', 'osteoporosis', 'COPD', 'heart conditions', 'chronic pain'],
  status = 'reviewed'
WHERE page_slug = 'exercise-for-health' AND primary_keyword IS NULL;

UPDATE page_keywords SET
  primary_keyword = 'cancer rehabilitation training Worthing',
  keyword_cluster = ARRAY['cancer-related fatigue', 'exercise during cancer treatment', 'post-surgery recovery', 'bone density'],
  status = 'reviewed',
  notes = 'Cancer rehabilitation qualification wording pending a Craig/Esther accuracy check (see EF_Page_Review_Jul2026.md) — keyword deliberately avoids overclaiming "specialist" status until resolved.'
WHERE page_slug = 'cancer-rehabilitation' AND primary_keyword IS NULL;

UPDATE page_keywords SET
  primary_keyword = 'personal training prices Worthing',
  keyword_cluster = ARRAY['1-to-1 personal training cost', 'block booking', 'free consultation'],
  status = 'needs_rewrite',
  notes = 'Voice audit (EF_Voice_Audit_Jul2026.md) flagged generic coaching-brochure language on this page — rewrites drafted, not yet applied.'
WHERE page_slug = 'pricing' AND primary_keyword IS NULL;

UPDATE page_keywords SET
  primary_keyword = 'personal training FAQs health conditions',
  keyword_cluster = ARRAY['GP referral', 'pricing', 'what to expect', 'cancer rehabilitation'],
  status = 'reviewed'
WHERE page_slug = 'faqs' AND primary_keyword IS NULL;

UPDATE page_keywords SET
  primary_keyword = 'book personal training consultation Worthing',
  keyword_cluster = ARRAY['free consultation', 'contact Esther Fair'],
  status = 'reviewed'
WHERE page_slug = 'contact' AND primary_keyword IS NULL;

-- Blog deliberately left untouched (status stays 'pending') — explicitly deferred by Craig
-- until the hub tooling + rest of the page copy are reviewed first. See .context/handoff.md.
