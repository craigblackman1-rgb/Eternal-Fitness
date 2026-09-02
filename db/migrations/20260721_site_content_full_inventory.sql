-- Broaden page_keywords into a full site-content inventory: adds a page_type
-- column for filtering (static/condition/legal/blog), replaces the 3-value
-- status enum with a clearer published/needs_writing/needs_updating model,
-- and seeds every real and planned page — legal pages, all 8 condition
-- sub-pages (3 built, 5 not), and all blog posts — none of which were
-- tracked before (only 9 static pages were).

ALTER TABLE page_keywords ADD COLUMN IF NOT EXISTS page_type text NOT NULL DEFAULT 'static';

ALTER TABLE page_keywords DROP CONSTRAINT IF EXISTS page_keywords_status_check;
ALTER TABLE page_keywords ALTER COLUMN status DROP DEFAULT;

-- Migrate the 9 existing rows onto the new status model BEFORE the new
-- constraint goes on, or the old values violate it mid-migration.
UPDATE page_keywords SET status = 'published' WHERE status = 'reviewed';
UPDATE page_keywords SET status = 'needs_updating' WHERE status IN ('needs_rewrite', 'pending');

ALTER TABLE page_keywords ADD CONSTRAINT page_keywords_status_check
  CHECK (status = ANY (ARRAY['published'::text, 'needs_writing'::text, 'needs_updating'::text]));
ALTER TABLE page_keywords ALTER COLUMN status SET DEFAULT 'needs_writing';

ALTER TABLE page_keywords DROP CONSTRAINT IF EXISTS page_keywords_page_type_check;
ALTER TABLE page_keywords ADD CONSTRAINT page_keywords_page_type_check
  CHECK (page_type = ANY (ARRAY['static'::text, 'condition'::text, 'legal'::text, 'blog'::text]));

-- New: legal pages (existed on the site, never tracked here)
INSERT INTO page_keywords (page_slug, page_title, url_path, status, page_type, notes) VALUES
  ('privacy-policy', 'Privacy Policy', '/privacy-policy', 'published', 'legal', NULL),
  ('terms', 'Terms', '/terms', 'published', 'legal', NULL),
  ('cookies-policy', 'Cookies Policy', '/cookies-policy', 'published', 'legal', NULL)
ON CONFLICT (page_slug) DO NOTHING;

-- New: condition sub-pages — 3 built and linked from the main nav, 5 gated
-- (available:false in ExerciseForHealthClient.tsx) pending Craig's scope
-- decision on which/how many to build. See project_specs.md's original
-- June 2026 page structure plan for where this list comes from.
INSERT INTO page_keywords (page_slug, page_title, url_path, status, page_type, notes) VALUES
  ('high-blood-pressure', 'High Blood Pressure', '/exercise-for-health/high-blood-pressure', 'published', 'condition', NULL),
  ('bone-health', 'Bone Health & Osteoporosis', '/exercise-for-health/bone-health', 'published', 'condition', NULL),
  ('visual-impairment', 'Visual Impairment', '/exercise-for-health/visual-impairment', 'published', 'condition', NULL),
  ('type-2-diabetes', 'Type 2 Diabetes', '/exercise-for-health/type-2-diabetes', 'needs_writing', 'condition', 'Gated on the Exercise for Health index until built — scope decision needed'),
  ('copd', 'COPD & Breathing Conditions', '/exercise-for-health/copd', 'needs_writing', 'condition', 'Gated on the Exercise for Health index until built — scope decision needed'),
  ('heart-conditions', 'Heart Conditions', '/exercise-for-health/heart-conditions', 'needs_writing', 'condition', 'Gated on the Exercise for Health index until built — scope decision needed'),
  ('chronic-pain', 'Chronic Pain & Fibromyalgia', '/exercise-for-health/chronic-pain', 'needs_writing', 'condition', 'Gated on the Exercise for Health index until built — scope decision needed'),
  ('adaptive-training', 'Physical Disability & Adaptive Training', '/exercise-for-health/adaptive-training', 'needs_writing', 'condition', 'Gated on the Exercise for Health index until built — scope decision needed')
ON CONFLICT (page_slug) DO NOTHING;

-- New: every blog post, flagged needs_updating — legacy WordPress content
-- awaiting Esther's voice/hard-rule review (see .context/state.md open item).
-- Byline already corrected 2026-07-21; content itself is untouched pending review.
INSERT INTO page_keywords (page_slug, page_title, url_path, status, page_type, notes)
SELECT slug, title, '/blog/' || slug, 'needs_updating', 'blog',
       'Legacy WordPress content — awaiting Esther''s voice/hard-rule review'
FROM blog_posts
ON CONFLICT (page_slug) DO NOTHING;
