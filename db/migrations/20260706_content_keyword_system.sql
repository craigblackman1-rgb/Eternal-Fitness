-- Content & Keyword System
-- Tracks SEO keywords per page and editable content blocks for each page.
-- Hub-internal only; no public access.

CREATE TABLE IF NOT EXISTS page_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL UNIQUE,
  page_title TEXT NOT NULL,
  url_path TEXT NOT NULL,
  primary_keyword TEXT,
  keyword_cluster TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'needs_rewrite')),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL,
  block_key TEXT NOT NULL,
  label TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(page_slug, block_key)
);

ALTER TABLE page_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage page keywords" ON page_keywords
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated manage page content blocks" ON page_content_blocks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed page_keywords with one row per page (keyword fields left NULL, status pending)
INSERT INTO page_keywords (page_slug, page_title, url_path, status)
SELECT v.slug, v.title, v.path, 'pending'
FROM (VALUES
  ('home', 'Home', '/'),
  ('about', 'About', '/about'),
  ('personal-training', 'Personal Training', '/personal-training'),
  ('exercise-for-health', 'Exercise for Health', '/exercise-for-health'),
  ('cancer-rehabilitation', 'Cancer Rehabilitation', '/cancer-rehabilitation'),
  ('pricing', 'Pricing', '/pricing'),
  ('faqs', 'FAQs', '/faqs'),
  ('contact', 'Contact', '/contact'),
  ('blog', 'Blog', '/blog')
) AS v(slug, title, path)
WHERE NOT EXISTS (SELECT 1 FROM page_keywords WHERE page_slug = v.slug);
