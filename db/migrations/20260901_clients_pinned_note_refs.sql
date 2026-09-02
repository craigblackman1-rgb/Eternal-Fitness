-- CR-EF-098: Store pin state for session/exercise notes on the client record.
-- Profile notes already pin via client_notes.pinned. Session and exercise notes
-- live inside sessions.data JSONB and have no row of their own to attach a
-- boolean to, so their pin state is tracked here as an array of references.
--
-- Each entry: { source: "session"|"exercise", session_id: uuid, exercise_uid?: string }
-- exercise_uid is present only for exercise-origin pins.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS pinned_note_refs jsonb NOT NULL DEFAULT '[]'::jsonb;
