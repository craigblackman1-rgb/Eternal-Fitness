-- Session 2: Blog Content Repositioning
-- Delete 2 weight-loss focused posts
-- Reframe 3 generic posts for health conditions angle
-- Update all 27 blog posts author byline to Esther Fair

-- TASK 1: Delete 2 weight-loss focused posts
DELETE FROM blog_posts WHERE slug = 'are-you-sabotaging-your-weight-loss';
DELETE FROM blog_posts WHERE slug = 'is-it-possible-to-target-fat-loss-to-specific-body-parts';

-- TASK 2: Reframe 3 posts (change title, excerpt, and content to health conditions angle)

-- Post A: Reframe "Getting back on track when you've fallen off the wagon" -> Health recovery focus
UPDATE blog_posts
SET
  title = 'Managing Setbacks in Your Recovery Journey',
  slug = 'managing-setbacks-in-your-recovery-journey',
  excerpt = 'When managing a health condition or recovering from illness, setbacks are part of the journey. Learn how to identify triggers, renew your motivation, and get back on track with your recovery and training goals.',
  content = '<h2>Managing Setbacks in Your Recovery Journey</h2>
<p>When you begin a recovery journey following a health condition, illness, or injury, motivation is generally high. Your goals are clear, and you have a drive to regain your health and capability. And for many, to begin with, it doesn''t feel as hard as you thought it would be. You may not need to make that many changes to start seeing improvements. As your strength and endurance improve, confidence grows, and you feel like you''re winning. You find yourself wondering how you ever struggled with such basic activities.</p>
<p>But what happens when progress starts slowing down, the initial enthusiasm wears off, and you realise that this is a long-term commitment? One treatment leads to another, a flurry of setbacks derails you a little further still, confidence doesn''t feel as good as it did, and you''re feeling pretty annoyed with yourself. Why have you fallen back again?</p>
<p>Before you know it, it''s gone from feeling manageable to not. Your training plateaus, or worse, your health condition symptoms start affecting your progress again. You are now entering a critical point. What''s your next move going to be? Because this is the point when it is very easy to lose momentum entirely.</p>
<p>So first off, if you do experience a setback. That''s ok. It''s normal. We all do it, but if you''re not careful and you don''t identify why it''s happened, or why it keeps happening, you can slip into a pattern of loss of confidence and deconditioning.</p>
<h2>So why do we experience setbacks?</h2>
<p>Sometimes it''s easy to find the trigger, but if you''ve been struggling for a while, it''s not always easy to pinpoint exactly why it went wrong. Usually, motivation is not as high as it was, and it needs renewing.</p>
<p>Have a think about when you were making progress. What was different? How did you feel? What was motivating you?</p>
<p>Have a read through some of the common triggers below. Do any of these resonate with you? Pre-empting and planning around some of these triggers can be powerful in helping you to regain some of the control. As can renewing your goals. If the driving reason behind your motivation is not as powerful as it was, then it may be time to check in with yourself and rethink why it''s important to you.</p>
<h3><u>Your condition flares up or symptoms worsen</u></h3>
<p>A flare-up or increase in symptoms can be discouraging and derail your training progress. The key is understanding that setbacks are part of living with a health condition.</p>
<p>Solution: Work with your trainer to adapt your training plan during flare-ups. Rest and recovery are just as important as the training itself. This is not failure; this is management.</p>
<h3><u>Emotional challenges</u></h3>
<p>Bad day, frustration with lack of progress, or grief about your health condition — these emotions can impact your motivation.</p>
<p>Solution: Have some strategies up your sleeve because there''s going to be a lot of these days. Think about what makes you feel supported and motivated. Get outside for a walk, connect with your support network, celebrate small wins — it doesn''t matter what it is, but something that keeps you moving forward, because progress in health recovery is measured in many ways, not just physical performance.</p>
<h3><u>You''re pushing too hard or not hard enough</u></h3>
<p>Finding the right intensity is crucial when recovering from a health condition. Too much can cause setbacks; too little may mean missing opportunities for progress.</p>
<p>Solution: Work closely with your trainer to dial in the right intensity for your current condition and capability level. This may change week to week, and that''s ok.</p>',
  author_name = 'Esther Fair'
WHERE slug = 'getting-back-on-track-when-youve-fallen-off-the-wagon';

-- Post B: Reframe "Myth: Are low-fat foods healthy?" -> Nutrition for energy/recovery, not weight loss
UPDATE blog_posts
SET
  title = 'Nutrition for Energy & Recovery (Not Weight Loss)',
  slug = 'nutrition-for-energy-recovery',
  excerpt = 'Good nutrition is about fuelling your body for health and recovery, not restrictive dieting. Learn how to eat to support your energy levels, strength, and healing when managing health conditions.',
  content = '<h2>Nutrition for Energy & Recovery</h2>
<p><strong>Nutrition is about fuelling your recovery, not restricting your diet.</strong></p>
<p>When managing a health condition or recovering from illness, the food choices you make directly impact your energy levels, how your body heals, and how well you can engage in your training and recovery.</p>
<p>The common narrative around "low-fat" or "diet" foods misses the point. It can be tempting to be lured in by the marketing strategies on the front of packages claiming "low fat" or "healthy choice", however, many of these foods tend to be much higher in sugar and salt to make them taste better — and these additives can actually work against your recovery goals.</p>
<p>Instead of focusing on restriction or choosing artificially altered foods, focus on:</p>
<h3>Whole foods for better recovery</h3>
<p>It''s actually better to have the unaltered, whole version of food and simply be mindful of portion sizes. The real food contains natural nutrients, fibre, and elements that support your body''s healing and energy production.</p>
<h3>Nutrition to support your condition</h3>
<p>Different health conditions benefit from different nutritional approaches. Whether you''re managing inflammation, supporting bone health, or optimizing energy for training — nutrition should support your specific needs, not follow a generic "diet" formula.</p>
<p>Rather than cutting out food groups or following restrictive patterns, work with your trainer or nutritionist to understand what your body needs to thrive during your recovery journey.</p>',
  author_name = 'Esther Fair'
WHERE slug = 'myth-buster-are-low-fat-foods-healthy';

-- Post C: Reframe "BMI outdated assessment" -> Why BMI doesn't matter for health conditions
UPDATE blog_posts
SET
  title = 'Why BMI Doesn''t Matter When You Have Health Conditions',
  slug = 'why-bmi-doesnt-matter-with-health-conditions',
  excerpt = 'BMI is especially irrelevant when you have a health condition or disability. What matters is functional capability, strength, energy, and how your body performs — not a number on a scale or a BMI calculation.',
  content = '<h2>Why BMI Doesn''t Matter When You Have Health Conditions</h2>
<p>BMI (Body Mass Index) has been used for decades as a go-to measurement for health. However, BMI does not take into account what the body is composed of — muscle mass, bone density, overall body composition, or functional capability. For people with health conditions and disabilities, BMI is especially irrelevant.</p>
<p>Traditional BMI measurements fail to consider:</p>
<ul>
<li><strong>Muscle vs. Fat:</strong> Muscle weighs more than fat. Someone who is strong, fit, and healthy could be classified as "overweight" or "obese" on the BMI scale.</li>
<li><strong>Bone Density:</strong> Particularly important for people managing conditions like osteoporosis — BMI doesn''t measure bone strength at all.</li>
<li><strong>Functional Capability:</strong> The ability to perform daily activities, exercise, and live independently matters far more than a number.</li>
<li><strong>Health Condition Factors:</strong> Some medications cause weight gain; some conditions affect how the body stores or processes energy. BMI can''t distinguish between health-impacting weight and body composition that reflects muscle, strength, and fitness.</li>
</ul>
<h2>What Actually Matters</h2>
<p>When living with a health condition, focus on metrics that reflect real health and capability:</p>
<ul>
<li><strong>Energy levels:</strong> Can you do more than you could before?</li>
<li><strong>Strength and endurance:</strong> Are you getting stronger and able to do activities longer?</li>
<li><strong>How clothes fit:</strong> Is your body composition changing in ways that matter to you?</li>
<li><strong>Condition markers:</strong> Are your health condition symptoms improving?</li>
<li><strong>Overall wellbeing:</strong> Do you feel better, sleep better, have more confidence?</li>
<li><strong>Functional measurements:</strong> Waist-to-height ratio, body composition testing, or fitness assessments are far more meaningful than BMI.</li>
</ul>
<h3>A better indicator: Waist to height ratio</h3>
<p>If you want a simple measurement of body composition that''s more meaningful than BMI, waist-to-height ratio is one option. A healthy waist-to-height ratio is below 0.5 — this is measured as your waist measurement divided by your height.</p>
<p>This measurement better reflects fat distribution and correlates more closely with actual health outcomes than BMI does.</p>
<p><strong>Bottom line:</strong> Stop fixating on BMI. When you''re managing a health condition, what matters is how you feel, what you can do, and how your health condition is responding to your efforts. That''s real progress.</p>',
  author_name = 'Esther Fair'
WHERE slug = 'bmi-an-outdated-inaccurate-assessment-of-a-healthy-body-weight';

-- TASK 3: Update all remaining blog posts author to "Esther Fair"
UPDATE blog_posts
SET author_name = 'Esther Fair'
WHERE author_name = 'Craig Blackman';
