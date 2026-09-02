-- GP clearance requirement moved from an automated PAR-Q-answer rule to a
-- trainer-set manual flag (profile.health.gp_clearance_required — see
-- lib/compliance.ts). Backfill it onto the clients the old rule currently
-- flags as high-risk, so effective compliance status doesn't silently change
-- for anyone the moment the manual flag ships. Esther owns the flag from here.

UPDATE clients
SET profile = jsonb_set(profile, '{health,gp_clearance_required}', 'true', true)
WHERE id IN (
  '3f914637-0d09-4280-82b4-4fd44e092f21', -- Colin Farley
  'a1111111-1111-1111-1111-111111111009', -- Monique Weardon
  'a1111111-1111-1111-1111-111111111003', -- Becky Price
  'a1111111-1111-1111-1111-111111111006', -- Ellie Wallwork
  'a1111111-1111-1111-1111-111111111008', -- Ian Healey
  'a1111111-1111-1111-1111-111111111010', -- Odul Bozkurt
  'a1111111-1111-1111-1111-111111111011', -- Saffron Somerset
  'a1111111-1111-1111-1111-111111111012'  -- Sam Gibbons
);
