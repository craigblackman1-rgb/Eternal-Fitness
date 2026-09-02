-- Exercise library — replaces lib/exercise-db.json (79 hand-tagged entries, still used
-- by the Plan Agent's deterministic fallback generator) with a DB-backed, growable
-- catalog. Seeded here with those 79 as source='original' (fully preserved, so the
-- fallback generator keeps working), then extended separately with the Trainerize
-- import (source='trainerize', see the companion seed once the scrape completes) and
-- whatever Esther adds going forward via the hub (source='custom').
-- See EF_Plan_Agent_Charter_Jul2026.md.

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('original', 'trainerize', 'custom')),
  trainerize_id TEXT,
  trainerize_custom BOOLEAN,
  archetypes TEXT[] NOT NULL DEFAULT '{}',
  movement_type TEXT,
  muscle_groups TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  difficulty INT,
  intensity_tiers TEXT[] NOT NULL DEFAULT '{}',
  coaching_cue TEXT,
  default_mod TEXT,
  image_url TEXT,
  video_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_source ON exercises(source);
CREATE INDEX IF NOT EXISTS idx_exercises_trainerize_id ON exercises(trainerize_id) WHERE trainerize_id IS NOT NULL;

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read exercises" ON exercises;
CREATE POLICY "Users can read exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert exercises" ON exercises;
CREATE POLICY "Users can insert exercises"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update exercises" ON exercises;
CREATE POLICY "Users can update exercises"
  ON exercises FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed: the 79 original hand-tagged exercises from lib/exercise-db.json, fully preserved.
INSERT INTO exercises (name, source, trainerize_id, trainerize_custom, archetypes, movement_type, muscle_groups, equipment, tags, difficulty, intensity_tiers, coaching_cue, default_mod, image_url, video_url) VALUES
  ('Cat-Cow', 'original', NULL, NULL, '{"A"}', 'spinal_mobility', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Move slowly through each vertebra, match breath to movement', 'Reduce ROM if neck or back discomfort', NULL, NULL),
  ('Pelvic Tilts', 'original', NULL, NULL, '{"A"}', 'spinal_mobility', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Small range, feel lower back press into mat', 'Keep knees together, reduce range', NULL, NULL),
  ('Thread the Needle', 'original', NULL, NULL, '{"A"}', 'spinal_mobility', '{}', '{"mat"}', '{}', 2, '{"standard","extended"}', 'Rotate from thoracic spine, keep hips square', 'Half rotation, stay on forearm instead of reaching through', NULL, NULL),
  ('Deep Squat Hold', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{}', '{}', 2, '{"standard","extended"}', 'Elbows push knees outward, hold at comfortable depth', 'Stay higher, heels on mat, hold support', NULL, NULL),
  ('World''s Greatest Stretch', 'original', NULL, NULL, '{"A"}', 'full_body_mobility', '{}', '{"mat"}', '{}', 2, '{"standard","extended"}', 'Front knee at 90, rotate chest toward front leg, back knee down', 'Kneeling version, reduce rotation, hands on floor for support', NULL, NULL),
  ('Cossack Squat', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{}', '{}', 3, '{"standard","extended"}', 'Shift weight sideways, opposite leg straight, control depth', 'Small range, hold support, keep bent leg less deep', NULL, NULL),
  ('Deep Lunge with Rotation', 'original', NULL, NULL, '{"A"}', 'full_body_mobility', '{}', '{"mat"}', '{}', 3, '{"standard","extended"}', 'Front knee at 90, rotate torso toward front leg, reach arm up', 'Hands on floor or block, reduce rotation, shorter lunge', NULL, NULL),
  ('Ankle Dorsiflexion Rocking', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{}', '{}', 1, '{"compact","standard","extended"}', 'Knee forward over toe, keep heel planted', 'Reduce range, use wall support, seated ankle circles as alternative', NULL, NULL),
  ('Half-Kneeling Hip Flexor', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{"mat"}', '{}', 2, '{"standard","extended"}', 'Tuck tailbone, lean forward from ankles, keep torso upright', 'Pad under back knee, reduce lean, seated version', NULL, NULL),
  ('Spiderman Stretch', 'original', NULL, NULL, '{"A"}', 'full_body_mobility', '{}', '{"mat"}', '{}', 2, '{"standard","extended"}', 'Walk hands forward, step foot outside hand, rotate chest open', 'Knees on mat, no rotation, hands on blocks', NULL, NULL),
  ('Figure-4 Stretch', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Cross ankle over opposite knee, pull leg toward chest', 'Foot on floor, knee across body only', NULL, NULL),
  ('Child''s Pose', 'original', NULL, NULL, '{"A"}', 'rest_recovery', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Knees wide or together, arms forward or by sides, breathe', 'Pillow under thighs, arms on cushion', NULL, NULL),
  ('Supine Spinal Twist', 'original', NULL, NULL, '{"A"}', 'spinal_mobility', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Knees over to one side, head opposite, keep shoulders on mat', 'Keep knees stacked, no twist, just side-lying release', NULL, NULL),
  ('Supine Figure-4', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Foot on opposite thigh, pull leg toward chest gently', 'Hand behind thigh instead of shin, reduce pull', NULL, NULL),
  ('Happy Baby', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{"mat"}', '{}', 1, '{"standard","extended"}', 'Knees toward armpits, hold feet or shins, rock gently', 'One leg at a time, foot on floor', NULL, NULL),
  ('Standing Pigeon', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{}', '{}', 2, '{"standard","extended"}', 'Cross ankle over opposite knee, hinge forward, hold support', 'Seated figure-4, hold thigh instead of shin', NULL, NULL),
  ('Single-Leg RDL (mobility)', 'original', NULL, NULL, '{"A"}', 'hinge_pattern', '{}', '{"dumbbell"}', '{}', 3, '{"standard","extended"}', 'Hinge back, free leg lifts, light weight, focus on range', 'Both feet on ground, hinge to comfortable range only', NULL, NULL),
  ('Brettzel Stretch', 'original', NULL, NULL, '{"A"}', 'full_body_mobility', '{}', '{"mat"}', '{}', 3, '{"extended"}', 'Lying twist with opposite knee pulled back, breath into stretch', 'Unwind 50%, keep shoulders on mat, skip head rotation', NULL, NULL),
  ('Lizard Lunge', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{"mat"}', '{}', 3, '{"extended"}', 'Front foot outside hand, rear knee down, sink hips', 'Hands on blocks or chair, less depth', NULL, NULL),
  ('Puppy Pose', 'original', NULL, NULL, '{"A"}', 'upper_body_mobility', '{}', '{"mat"}', '{}', 1, '{"standard","extended"}', 'Hips over knees, walk hands forward, lower chest toward floor', 'Less forward fold, arms on chair or blocks', NULL, NULL),
  ('Wall Ankle Mobilisation', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{}', '{}', 1, '{"compact","standard","extended"}', 'Front knee to wall in half-kneeling, keep heel down', 'Stand further from wall, reduce knee bend', NULL, NULL),
  ('Seated Side Bend', 'original', NULL, NULL, '{"A"}', 'spinal_mobility', '{}', '{}', '{}', 1, '{"compact","standard","extended"}', 'Arm over head, hinge sideways, feel side stretch', 'Arm stays down, minimal lean', NULL, NULL),
  ('Diaphragmatic Breathing', 'original', NULL, NULL, '{"A"}', 'rest_recovery', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Hands on ribs, inhale expand 360 degrees, exhale slow', 'Seated if supine not comfortable', NULL, NULL),
  ('90/90 Hip Shift', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{"mat"}', '{}', 3, '{"extended"}', 'Both knees bent at 90 degrees, shift hips side to side', 'One leg straight, one bent, smaller shift', NULL, NULL),
  ('Standing Hamstring Stretch', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{"resistance band"}', '{}', 1, '{"compact","standard","extended"}', 'Straight leg on step or floor, pull band gently, hinge forward', 'Bent knee, foot on floor', NULL, NULL),
  ('Chest Opener Stretch', 'original', NULL, NULL, '{"A"}', 'upper_body_mobility', '{}', '{}', '{}', 1, '{"compact","standard","extended"}', 'Clasp hands behind back, open chest, roll shoulders back', 'Arms to sides, squeeze shoulder blades', NULL, NULL),
  ('Goblet Squat', 'original', NULL, NULL, '{"B"}', 'squat_pattern', '{}', '{"kettlebell"}', '{}', 2, '{"compact","standard","extended"}', 'Chest up, knees out, go to comfortable depth', 'Raised heels, partial ROM, lighter weight', NULL, NULL),
  ('Front Squat', 'original', NULL, NULL, '{"B"}', 'squat_pattern', '{}', '{"barbell+plates"}', '{}', 3, '{"standard","extended"}', 'Elbows high, brace core, descend with control', 'Goblet hold instead, reduce load, partial depth', NULL, NULL),
  ('Back Squat', 'original', NULL, NULL, '{"B"}', 'squat_pattern', '{}', '{"barbell+plates"}', '{}', 4, '{"standard","extended"}', 'Bar on traps, brace, hips back and down', 'Front squat or goblet squat, reduce load', NULL, NULL),
  ('Bulgarian Split Squat', 'original', NULL, NULL, '{"B"}', 'squat_pattern', '{}', '{"dumbbell","step/box"}', '{}', 3, '{"standard","extended"}', 'Front heel down, back foot on box, control depth', 'Reduce depth, no weight, reverse lunge instead', NULL, NULL),
  ('Reverse Lunge', 'original', NULL, NULL, '{"B"}', 'lunge_pattern', '{}', '{"dumbbell"}', '{}', 2, '{"compact","standard","extended"}', 'Step back, back knee to floor, front heel down', 'No weight, shorter lunge, hold support', NULL, NULL),
  ('Walking Lunge', 'original', NULL, NULL, '{"B"}', 'lunge_pattern', '{}', '{"dumbbell"}', '{}', 3, '{"standard","extended"}', 'Upright torso, step into lunge, drive through front heel', 'No weight, shorter stride, stationary lunges', NULL, NULL),
  ('Step-Up', 'original', NULL, NULL, '{"B"}', 'lunge_pattern', '{}', '{"step/box"}', '{}', 2, '{"compact","standard","extended"}', 'Full foot on box, drive through heel, step down controlled', 'Lower box, lighter weight or no weight', NULL, NULL),
  ('Single-Leg RDL', 'original', NULL, NULL, '{"B"}', 'hinge_pattern', '{}', '{"dumbbell"}', '{}', 3, '{"standard","extended"}', 'Hinge at hips, free leg back, keep spine neutral', 'Both feet, lighter weight, or no weight for pattern', NULL, NULL),
  ('Dumbbell Row (2-point)', 'original', NULL, NULL, '{"B"}', 'horizontal_pull', '{}', '{"dumbbell"}', '{}', 2, '{"compact","standard","extended"}', 'Hinge to flat back, pull dumbbell to hip, squeeze', 'Knee on bench for support, lighter weight, band row', NULL, NULL),
  ('Single-Arm DB Row', 'original', NULL, NULL, '{"B"}', 'horizontal_pull', '{}', '{"dumbbell"}', '{}', 2, '{"compact","standard","extended"}', 'Opposite knee on bench, flat back, pull elbow back', 'Both feet on floor, lighter weight', NULL, NULL),
  ('Bent-Over DB Row', 'original', NULL, NULL, '{"B"}', 'horizontal_pull', '{}', '{"dumbbell"}', '{}', 3, '{"standard","extended"}', 'Hinge to 45 degrees, pull both dumbbells, squeeze shoulder blades', 'Light weight, chest on incline bench for support', NULL, NULL),
  ('Band Row', 'original', NULL, NULL, '{"B"}', 'horizontal_pull', '{}', '{"resistance band"}', '{}', 1, '{"compact","standard","extended"}', 'Anchor band, pull elbows back, squeeze shoulder blades', 'Lighter band, seated version', NULL, NULL),
  ('DB Bench Press', 'original', NULL, NULL, '{"B"}', 'horizontal_push', '{}', '{"dumbbell"}', '{}', 2, '{"compact","standard","extended"}', 'Upper arms at 45 degrees, control descent, press with power', 'Lighter weight, floor press for greater stability', NULL, NULL),
  ('DB Floor Press', 'original', NULL, NULL, '{"B"}', 'horizontal_push', '{}', '{"dumbbell","mat"}', '{}', 2, '{"compact","standard","extended"}', 'Elbows touch floor, press up, keep core braced', 'Lighter weight, single arm for focus', NULL, NULL),
  ('DB Incline Press', 'original', NULL, NULL, '{"B"}', 'horizontal_push', '{}', '{"dumbbell"}', '{}', 3, '{"standard","extended"}', 'Upper chest focus, control the descent, don''t arch', 'Flat bench instead, lighter weight', NULL, NULL),
  ('DB Overhead Press', 'original', NULL, NULL, '{"B"}', 'vertical_push', '{}', '{"dumbbell"}', '{}', 3, '{"standard","extended"}', 'Stack ribs, engage core, press to ceiling', 'Seated with back support, single arm, lighter weight', NULL, NULL),
  ('Glute Bridge', 'original', NULL, NULL, '{"B"}', 'core_posterior', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Heels close to glutes, drive hips up, squeeze at top', 'Both feet on floor, smaller lift, or feet wider', NULL, NULL),
  ('Single-Leg Glute Bridge', 'original', NULL, NULL, '{"B"}', 'core_posterior', '{}', '{"mat"}', '{}', 2, '{"standard","extended"}', 'One foot raised, press through planted heel', 'Both feet on floor, focus on one leg intent', NULL, NULL),
  ('Dead Bug', 'original', NULL, NULL, '{"B"}', 'core_anterior', '{}', '{"mat"}', '{}', 2, '{"compact","standard","extended"}', 'Opposite arm and leg extend, core braced, no arching', 'Arms only or legs only, feet on floor sliding', NULL, NULL),
  ('Plank', 'original', NULL, NULL, '{"B"}', 'core_anterior', '{}', '{"mat"}', '{}', 2, '{"compact","standard","extended"}', 'Elbows under shoulders, body straight, brace core', 'From knees, shorter hold duration', NULL, NULL),
  ('Side Plank', 'original', NULL, NULL, '{"B"}', 'core_lateral', '{}', '{"mat"}', '{}', 3, '{"standard","extended"}', 'Elbow under shoulder, hips forward, hold', 'From knees, shorter hold', NULL, NULL),
  ('Farmer''s Carry', 'original', NULL, NULL, '{"B"}', 'loaded_carry', '{}', '{"dumbbell"}', '{}', 2, '{"compact","standard","extended"}', 'Tall posture, shoulders back, grip tight, walk controlled', 'Lighter weight, shorter distance, single arm', NULL, NULL),
  ('Suitcase Carry', 'original', NULL, NULL, '{"B"}', 'loaded_carry', '{}', '{"kettlebell"}', '{}', 2, '{"compact","standard","extended"}', 'Single side carry, resist lean, core braced', 'Lighter weight, shorter distance', NULL, NULL),
  ('Reverse Hyperextension (floor)', 'original', NULL, NULL, '{"B"}', 'core_posterior', '{}', '{"mat"}', '{}', 2, '{"standard","extended"}', 'Lying on mat, lift legs, squeeze glutes, keep core braced', 'One leg at a time', NULL, NULL),
  ('Band Pull-Apart', 'original', NULL, NULL, '{"B"}', 'horizontal_pull', '{}', '{"resistance band"}', '{}', 1, '{"compact","standard","extended"}', 'Hold band in front, pull apart, squeeze shoulder blades', 'Lighter band, shorter range of motion', NULL, NULL),
  ('Tricep Extension', 'original', NULL, NULL, '{"B"}', 'push_accessory', '{}', '{"dumbbell"}', '{}', 2, '{"compact","standard","extended"}', 'Overhead or lying, keep elbows in, extend full', 'Lighter weight, single arm', NULL, NULL),
  ('Bicep Curl', 'original', NULL, NULL, '{"B"}', 'pull_accessory', '{}', '{"dumbbell"}', '{}', 1, '{"compact","standard","extended"}', 'Elbows fixed at sides, curl, control the negative', 'Lighter weight, alternating arms', NULL, NULL),
  ('Kettlebell Deadlift', 'original', NULL, NULL, '{"C"}', 'hinge_pattern', '{}', '{"kettlebell"}', '{}', 1, '{"compact","standard","extended"}', 'Hinge back, shins vertical, drive through heels to stand', 'No weight, focus on hinge pattern', NULL, NULL),
  ('Kettlebell Swing (2-hand)', 'original', NULL, NULL, '{"C"}', 'hinge_pattern', '{}', '{"kettlebell"}', '{}', 3, '{"compact","standard","extended"}', 'Hike the bell, snap hips forward, shoulders packed', 'Hip hinge only, no float, lighter weight, or deadlift', NULL, NULL),
  ('Kettlebell Clean', 'original', NULL, NULL, '{"C"}', 'hinge_pattern', '{}', '{"kettlebell"}', '{}', 4, '{"extended"}', 'Pull elbow high, flip bell, absorb into rack position', 'Deadlift to high pull only, lighter weight', NULL, NULL),
  ('Medicine Ball Slam', 'original', NULL, NULL, '{"C"}', 'power_output', '{}', '{"stability ball"}', '{}', 2, '{"compact","standard","extended"}', 'Overhead, slam down, catch on bounce, brace core', 'No throw, just overhead lower to floor, or wall throw', NULL, NULL),
  ('Box Jump (low)', 'original', NULL, NULL, '{"C"}', 'power_output', '{}', '{"step/box"}', '{}', 3, '{"standard","extended"}', 'Soft landing, full foot on box, step down', 'Box step-up explosive, or no jump', NULL, NULL),
  ('Explosive Step-Up', 'original', NULL, NULL, '{"C"}', 'power_output', '{}', '{"step/box"}', '{}', 2, '{"compact","standard","extended"}', 'Drive through heel, quick transition, step down controlled', 'Lower box, lighter weight or no weight', NULL, NULL),
  ('Banded Walk', 'original', NULL, NULL, '{"C"}', 'lateral_movement', '{}', '{"resistance band"}', '{}', 1, '{"compact","standard","extended"}', 'Band above knees, half-squat position, small steps', 'Lighter band, taller stance, smaller steps', NULL, NULL),
  ('Lateral Shuffle', 'original', NULL, NULL, '{"C"}', 'lateral_movement', '{}', '{}', '{}', 2, '{"compact","standard","extended"}', 'Athletic stance, push off, quick feet, stay low', 'Smaller steps, walk instead of shuffle', NULL, NULL),
  ('Bear Crawl', 'original', NULL, NULL, '{"C"}', 'locomotion', '{}', '{"mat"}', '{}', 2, '{"compact","standard","extended"}', 'Opposite hand and knee, flat back, don''t rush', 'Knee walks, hands on floor, shorter distance', NULL, NULL),
  ('Mountain Climbers', 'original', NULL, NULL, '{"C"}', 'locomotion', '{}', '{"mat"}', '{}', 2, '{"compact","standard","extended"}', 'Plank position, drive knees to chest, control pace', 'From knees, slower pace, or toe taps', NULL, NULL),
  ('Marching Glute Bridge', 'original', NULL, NULL, '{"C"}', 'core_posterior', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Bridge up, march knees alternating, keep hips level', 'Both feet on floor, small pulses', NULL, NULL),
  ('Hip CARs', 'original', NULL, NULL, '{"C"}', 'mobility_dynamic', '{}', '{}', '{}', 2, '{"compact","standard","extended"}', 'Slow controlled hip circles at end range, stand tall', 'Light touch for balance, seated hip circles', NULL, NULL),
  ('Reverse Lunge + Knee Drive', 'original', NULL, NULL, '{"C"}', 'locomotion', '{}', '{"dumbbell"}', '{}', 3, '{"standard","extended"}', 'Lunge back, drive front knee up at stand, add load', 'No weight, no knee drive, just reverse lunge', NULL, NULL),
  ('Renegade Row', 'original', NULL, NULL, '{"C"}', 'core_anterior', '{}', '{"dumbbell","mat"}', '{}', 4, '{"extended"}', 'Plank on dumbbells, row one arm, keep hips still', 'From knees, or plank hold only', NULL, NULL),
  ('Kettlebell Deadlift to Swing Flow', 'original', NULL, NULL, '{"C"}', 'hinge_pattern', '{}', '{"kettlebell"}', '{}', 2, '{"compact","standard","extended"}', 'Flow deadlift into small swing, hinge snap at top', 'Deadlift only, no float', NULL, NULL),
  ('Rowing Machine (intervals)', 'original', NULL, NULL, '{"C"}', 'cardio', '{}', '{"rowing machine"}', '{}', 2, '{"compact","standard","extended"}', 'Drive with legs, pull with back, finish with arms', 'Reduced intensity, shorter intervals', NULL, NULL),
  ('Stationary Bike (intervals)', 'original', NULL, NULL, '{"C"}', 'cardio', '{}', '{"stationary bike"}', '{}', 1, '{"compact","standard","extended"}', 'Smooth pedal stroke, controlled effort, no bouncing', 'Low resistance, seated only', NULL, NULL),
  ('Treadmill Walk (incline)', 'original', NULL, NULL, '{"C"}', 'cardio', '{}', '{"treadmill"}', '{}', 1, '{"compact","standard","extended"}', 'Tall posture, swing arms, controlled pace', 'Flat walk, slower pace, shorter duration', NULL, NULL),
  ('Skater Tap Downs', 'original', NULL, NULL, '{"C"}', 'lateral_movement', '{}', '{}', '{}', 2, '{"standard","extended"}', 'Lateral push off, tap back foot, quick rebound', 'Small side step, no tap down, walk pattern', NULL, NULL),
  ('Single-Leg Deadlift to Balance', 'original', NULL, NULL, '{"C"}', 'hinge_pattern', '{}', '{"dumbbell"}', '{}', 2, '{"compact","standard","extended"}', 'Hinge, free leg back, stand tall at top, balance', 'Both feet on ground, mini hinge, light weight', NULL, NULL),
  ('Clamshell', 'original', NULL, NULL, '{"B"}', 'core_lateral', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Side lying, knees bent, lift top knee, don''t rotate hips', 'Small range, band above knees for resistance', NULL, NULL),
  ('Side-Lying Leg Raise', 'original', NULL, NULL, '{"B"}', 'core_lateral', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Bottom leg bent for stability, top leg straight, lift', 'Small range, bent top leg', NULL, NULL),
  ('Arch Hold / Cobra', 'original', NULL, NULL, '{"A"}', 'spinal_mobility', '{}', '{"mat"}', '{}', 1, '{"compact","standard","extended"}', 'Prone, hands under shoulders, gently lift chest', 'Prone on elbows, less back extension', NULL, NULL),
  ('Downward Dog', 'original', NULL, NULL, '{"A"}', 'full_body_mobility', '{}', '{"mat"}', '{}', 2, '{"standard","extended"}', 'Hips up and back, straight legs or bent, pedal feet', 'Child''s pose, shortened hold', NULL, NULL),
  ('Standing Calf Stretch', 'original', NULL, NULL, '{"A"}', 'lower_body_mobility', '{}', '{}', '{}', 1, '{"compact","standard","extended"}', 'Back leg straight, heel down, forward lean', 'Bent knee, less lean', NULL, NULL),
  ('Lateral Lunge', 'original', NULL, NULL, '{"C"}', 'lateral_movement', '{}', '{}', '{}', 2, '{"compact","standard","extended"}', 'Step wide, push hips back, keep chest up', 'Small step, no depth, hold support', NULL, NULL)
ON CONFLICT DO NOTHING;
