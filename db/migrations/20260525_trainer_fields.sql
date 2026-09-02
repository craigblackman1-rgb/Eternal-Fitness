-- Eternal Fitness Signed Agreements — Trainer Fields
-- Adds trainer-fillable fields to the signed_agreements table

ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS trainer_notes TEXT;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS package_type TEXT;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS sessions_purchased INTEGER;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 60;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('paid', 'deposit', 'pending', 'overdue', 'suspended')) DEFAULT 'pending';
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS sessions_used INTEGER DEFAULT 0;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS sessions_remaining INTEGER;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS block_expiry_date DATE;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS medical_clearance_status TEXT CHECK (medical_clearance_status IN ('cleared', 'pending', 'not_required', 'not_yet_requested')) DEFAULT 'not_required';
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS gp_letter_requested_date DATE;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS gp_letter_received_date DATE;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS annual_review_due_date DATE;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS trainer_observations TEXT;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low';
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS exercise_modifications TEXT;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS watch_for TEXT;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE signed_agreements ADD COLUMN IF NOT EXISTS client_status TEXT CHECK (client_status IN ('active', 'inactive', 'completed', 'suspended')) DEFAULT 'active';

-- Computed column: sessions_remaining = sessions_purchased - sessions_used
-- We'll handle this in the application layer
