-- Client Profile Extensions — Add compliance and session structure fields
-- Safe to run on existing DB with IF NOT EXISTS guards

-- Add new columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS compliance_status TEXT
  CHECK (compliance_status IN ('clear', 'action_needed', 'do_not_train', 'pending_medical'))
  DEFAULT 'action_needed';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS outstanding_actions TEXT[] DEFAULT '{}';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS group_type TEXT
  CHECK (group_type IN ('individual_journey', 'calendar_block'))
  DEFAULT 'individual_journey';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS pace_mode TEXT
  CHECK (pace_mode IN ('fast', 'medium', 'slow'))
  DEFAULT 'medium';

-- Seed compliance status for existing clients
UPDATE clients SET 
  compliance_status = 'clear',
  group_type = 'individual_journey',
  pace_mode = 'medium'
WHERE name = 'Amanda Munday';

UPDATE clients SET 
  compliance_status = 'action_needed',
  group_type = 'calendar_block',
  pace_mode = 'medium',
  outstanding_actions = ARRAY['Provide IVIG adaptation guide']
WHERE name = 'Anne Wareine';

UPDATE clients SET 
  compliance_status = 'action_needed',
  group_type = 'individual_journey',
  pace_mode = 'slow',
  outstanding_actions = ARRAY['Order kneeling cushion', 'Remind Becky of mobility goal']
WHERE name = 'Becky Price';

UPDATE clients SET 
  compliance_status = 'action_needed',
  group_type = 'individual_journey',
  pace_mode = 'medium',
  outstanding_actions = ARRAY['Update notes from 13/06/2026', 'New plan needed']
WHERE name = 'Camilla Arnold';

UPDATE clients SET 
  compliance_status = 'do_not_train',
  group_type = 'calendar_block',
  pace_mode = 'fast',
  outstanding_actions = ARRAY['GET CONTRACT SIGNED', 'GET PAR-Q COMPLETED', 'SORT INSURANCE CLEARANCE']
WHERE name = 'Colin Farley';

UPDATE clients SET 
  compliance_status = 'action_needed',
  group_type = 'individual_journey',
  pace_mode = 'medium',
  outstanding_actions = ARRAY['Record workout from 9th June 2026', 'Get floor markers']
WHERE name = 'Ellie Wallwork';

UPDATE clients SET 
  compliance_status = 'pending_medical',
  group_type = 'individual_journey',
  pace_mode = 'medium',
  outstanding_actions = ARRAY['Confirm surgeon details for 29 Jul', 'Get post-op restrictions in writing before 21 Aug', 'Plan upper body programme from 3 Aug', 'Plan online travel programme from 21 Aug']
WHERE name = 'Emma Atkinson';

UPDATE clients SET 
  compliance_status = 'action_needed',
  group_type = 'individual_journey',
  pace_mode = 'slow',
  outstanding_actions = ARRAY['Insurance clearance pending', 'Update risk assessment (post-surgical)', 'Plan modified return session']
WHERE name = 'Ian Healey';

UPDATE clients SET 
  compliance_status = 'action_needed',
  group_type = 'individual_journey',
  pace_mode = 'slow',
  outstanding_actions = ARRAY['Risk assessment discussion outstanding', 'Send PDF for signature', 'Get Jonathan mobile number']
WHERE name = 'Monique Weardon';

UPDATE clients SET 
  compliance_status = 'action_needed',
  group_type = 'individual_journey',
  pace_mode = 'slow',
  outstanding_actions = ARRAY['Session management conversation needed — address lateness and pace directly']
WHERE name = 'Odul Bozkurt';

UPDATE clients SET 
  compliance_status = 'do_not_train',
  group_type = 'individual_journey',
  pace_mode = 'slow',
  outstanding_actions = ARRAY['GET ALL PAPERWORK COMPLETED', 'Tighten programme', 'Address session pace']
WHERE name = 'Saffron Somerset';

UPDATE clients SET 
  compliance_status = 'do_not_train',
  group_type = 'individual_journey',
  pace_mode = 'medium',
  outstanding_actions = ARRAY['Medical clearance PENDING', 'Insurance letter not yet sent', 'Reformat PAR-Q into accessible format', 'Email insurance once Sam has neurosurgeon letter']
WHERE name = 'Sam Gibbons';

UPDATE clients SET 
  compliance_status = 'action_needed',
  group_type = 'individual_journey',
  pace_mode = 'medium',
  outstanding_actions = ARRAY['Complete client profile']
WHERE name = 'Sarah Tyler';

UPDATE clients SET 
  compliance_status = 'clear',
  group_type = 'calendar_block',
  pace_mode = 'fast',
  outstanding_actions = ARRAY['Record goals']
WHERE name = 'Steph White';

UPDATE clients SET 
  compliance_status = 'clear',
  group_type = 'calendar_block',
  pace_mode = 'fast',
  outstanding_actions = ARRAY['Record goals']
WHERE name = 'Tom Putnam';