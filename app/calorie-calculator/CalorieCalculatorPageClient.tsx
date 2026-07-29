"use client";

import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConsultationDialog from "@/components/ConsultationDialog";
import { useConsultationDialog } from "@/hooks/useConsultationDialog";
import { IconArrowUpRight, IconCheck, IconAlertCircle } from "@/components/icons";
import {
  ACTIVITY_LEVELS,
  TARGETS,
  MACRO_PRESETS,
  DEFAULT_INPUTS,
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
  getFloorThreshold,
  fmtNumber,
  kgToStLb,
  stLbToKg,
  cmToFtIn,
  ftInToCm,
  type CalculatorInputs,
} from "@/lib/calorie-calculator";
import "./calorie-calculator.css";

function CalorieCalculator() {
  const [sex, setSex] = useState<"male" | "female">(DEFAULT_INPUTS.sex);
  const [age, setAge] = useState(DEFAULT_INPUTS.age);
  const [weightKg, setWeightKg] = useState(DEFAULT_INPUTS.weightKg);
  const [weightSt, setWeightSt] = useState(11);
  const [weightLb, setWeightLb] = useState(11);
  const [wUnit, setWUnit] = useState<"kg" | "st">("kg");
  const [heightCm, setHeightCm] = useState(DEFAULT_INPUTS.heightCm);
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(5);
  const [hUnit, setHUnit] = useState<"cm" | "ftin">("cm");
  const [activityMultiplier, setActivityMultiplier] = useState(DEFAULT_INPUTS.activityMultiplier);
  const [paceIndex, setPaceIndex] = useState(0);

  const [proteinPct, setProteinPct] = useState(MACRO_PRESETS[0].protein);
  const [carbPct, setCarbPct] = useState(MACRO_PRESETS[0].carb);
  const [fatPct, setFatPct] = useState(MACRO_PRESETS[0].fat);
  const [activePreset, setActivePreset] = useState(MACRO_PRESETS[0].key);

  const { open, setOpen, openDialog } = useConsultationDialog();

  function getWeightKg(): number {
    if (wUnit === "st") return stLbToKg(weightSt, weightLb);
    return weightKg;
  }
  function getHeightCm(): number {
    if (hUnit === "ftin") return ftInToCm(heightFt, heightIn);
    return heightCm;
  }

  const switchWUnit = useCallback(
    (to: "kg" | "st") => {
      if (to === "st" && wUnit === "kg") {
        const v = kgToStLb(weightKg);
        setWeightSt(v.st);
        setWeightLb(v.lb);
      } else if (to === "kg" && wUnit === "st") {
        setWeightKg(stLbToKg(weightSt, weightLb));
      }
      setWUnit(to);
    },
    [wUnit, weightKg, weightSt, weightLb],
  );

  const switchHUnit = useCallback(
    (to: "cm" | "ftin") => {
      if (to === "ftin" && hUnit === "cm") {
        const v = cmToFtIn(heightCm);
        setHeightFt(v.ft);
        setHeightIn(v.inch);
      } else if (to === "cm" && hUnit === "ftin") {
        setHeightCm(ftInToCm(heightFt, heightIn));
      }
      setHUnit(to);
    },
    [hUnit, heightCm, heightFt, heightIn],
  );

  const kg = getWeightKg();
  const cm = getHeightCm();

  const canCompute = age > 0 && kg > 0 && cm > 0 && activityMultiplier > 0;

  let bmr = 0;
  let tdee = 0;
  let selectedTargetKcal = 0;
  let belowFloor = false;

  if (canCompute) {
    const inputs: CalculatorInputs = { sex, age, weightKg: kg, heightCm: cm, activityMultiplier };
    bmr = calculateBMR(inputs);
    tdee = calculateTDEE(inputs);
    const target = TARGETS[paceIndex];
    selectedTargetKcal = calculateTargetCalories(tdee, target.delta);
    const floor = getFloorThreshold(sex);
    belowFloor = selectedTargetKcal < floor;
  }

  const macros = calculateMacros(selectedTargetKcal || tdee, {
    proteinPct,
    carbPct,
    fatPct,
  });
  const macroSum = proteinPct + carbPct + fatPct;

  const selectPreset = (key: string) => {
    const preset = MACRO_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setProteinPct(preset.protein);
    setCarbPct(preset.carb);
    setFatPct(preset.fat);
    setActivePreset(key);
  };

  const handleMacroInput = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(Number(e.target.value) || 0);
    setActivePreset("");
  };

  const handlePrint = () => window.print();

  const tdeeDisplay = canCompute ? fmtNumber(tdee) : "\u2013";
  const targetKcalDisplay = canCompute ? fmtNumber(selectedTargetKcal) : "\u2013";
  const targetName = TARGETS[paceIndex].name;

  return (
    <>
      <Navbar onBookConsultation={openDialog} />

      {/* ═══ HERO ═══ */}
      <section className="cc-hero">
        <div className="cc-hero-in">
          <div>
            <p className="cc-eyebrow" style={{ marginBottom: 16 }}>
              Client tool &middot; Nutrition
            </p>
            <h1>
              How many calories should you <em>actually</em> be eating?
            </h1>
            <p className="cc-hero-lead">
              Fill this in honestly and you get a number you can work with &mdash; not a number that
              assumes you train like an athlete.
            </p>
            <div className="cc-hero-rule" aria-hidden="true" />
            <p className="cc-hero-sub">
              Most calculators ask how active you are and leave you guessing what the answer means. This
              one describes each level in terms of a real day, so the number that comes back is one you
              can trust &mdash; and it tells you plainly where the estimate stops being reliable.
            </p>
          </div>

          <aside className="cc-trust">
            <h2>Before you start</h2>
            <ul>
              <li>
                <span className="cc-tick" aria-hidden="true">
                  <IconCheck style={{ width: 13, height: 13, strokeWidth: 2.6 }} />
                </span>
                <span>
                  <b>Nothing is stored or sent</b>
                  It runs in your browser. No email, no sign-up, nothing kept when you close the tab.
                </span>
              </li>
              <li>
                <span className="cc-tick" aria-hidden="true">
                  <IconCheck style={{ width: 13, height: 13, strokeWidth: 2.6 }} />
                </span>
                <span>
                  <b>Mifflin-St Jeor equation</b>
                  The same estimate used in practice &mdash; accurate to within roughly 10% for most
                  people.
                </span>
              </li>
              <li>
                <span className="cc-tick" aria-hidden="true">
                  <IconCheck style={{ width: 13, height: 13, strokeWidth: 2.6 }} />
                </span>
                <span>
                  <b>An estimate, not a prescription</b>
                  If you are in treatment, recovering, or managing a condition, use it as a starting
                  point and speak to your clinician or to me.
                </span>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* ═══ CALCULATOR ═══ */}
      <section className="cc-sec" style={{ background: "#fff" }}>
        <div className="cc-inner cc-calc">
          {/* Inputs */}
          <div>
            {/* Card 1 — About you */}
            <div className="cc-qcard">
              <div className="cc-qhead">
                <span className="cc-qn" aria-hidden="true">1</span>
                <h2>About you</h2>
              </div>
              <p className="cc-qsub">
                Four details. Everything else is worked out from these.
              </p>

              <div className="cc-row2" style={{ marginBottom: 18 }}>
                <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                  <legend className="cc-lbl">Sex</legend>
                  <div className="cc-seg">
                    <label className="cc-seg-o">
                      <input
                        type="radio"
                        name="sex"
                        value="female"
                        checked={sex === "female"}
                        onChange={() => setSex("female")}
                      />
                      <span>Female</span>
                    </label>
                    <label className="cc-seg-o">
                      <input
                        type="radio"
                        name="sex"
                        value="male"
                        checked={sex === "male"}
                        onChange={() => setSex("male")}
                      />
                      <span>Male</span>
                    </label>
                  </div>
                  <p className="cc-hint">
                    The equation estimates differently for each. If neither quite fits you, choose
                    the one you are most comfortable with &mdash; the difference is small.
                  </p>
                </fieldset>

                <div className="cc-field">
                  <label htmlFor="cc-age">Age (years)</label>
                  <input
                    type="number"
                    id="cc-age"
                    min={16}
                    max={90}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 0)}
                    inputMode="numeric"
                  />
                  <p className="cc-hint">Energy needs ease down gradually with age.</p>
                </div>
              </div>

              <div className="cc-row2">
                <div className="cc-field">
                  <div className="cc-label-row">
                    <span className="cc-lbl" id="cc-weight-lbl">Weight</span>
                    <div className="cc-units" role="radiogroup" aria-label="Weight units">
                      <label>
                        <input
                          type="radio"
                          name="wunit"
                          value="kg"
                          checked={wUnit === "kg"}
                          onChange={() => switchWUnit("kg")}
                        />
                        <span>kg</span>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="wunit"
                          value="st"
                          checked={wUnit === "st"}
                          onChange={() => switchWUnit("st")}
                        />
                        <span>st / lb</span>
                      </label>
                    </div>
                  </div>
                  {wUnit === "kg" ? (
                    <div>
                      <input
                        type="number"
                        id="cc-weight"
                        min={30}
                        max={250}
                        step={0.1}
                        value={weightKg}
                        onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
                        inputMode="decimal"
                        aria-labelledby="cc-weight-lbl"
                      />
                    </div>
                  ) : (
                    <div className="cc-row2">
                      <input
                        type="number"
                        min={4}
                        max={35}
                        value={weightSt}
                        onChange={(e) => setWeightSt(Number(e.target.value) || 0)}
                        inputMode="numeric"
                        aria-label="Weight, stone"
                      />
                      <input
                        type="number"
                        min={0}
                        max={13}
                        value={weightLb}
                        onChange={(e) => setWeightLb(Number(e.target.value) || 0)}
                        inputMode="numeric"
                        aria-label="Weight, pounds"
                      />
                    </div>
                  )}
                </div>

                <div className="cc-field">
                  <div className="cc-label-row">
                    <span className="cc-lbl" id="cc-height-lbl">Height</span>
                    <div className="cc-units" role="radiogroup" aria-label="Height units">
                      <label>
                        <input
                          type="radio"
                          name="hunit"
                          value="cm"
                          checked={hUnit === "cm"}
                          onChange={() => switchHUnit("cm")}
                        />
                        <span>cm</span>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="hunit"
                          value="ftin"
                          checked={hUnit === "ftin"}
                          onChange={() => switchHUnit("ftin")}
                        />
                        <span>ft / in</span>
                      </label>
                    </div>
                  </div>
                  {hUnit === "cm" ? (
                    <div>
                      <input
                        type="number"
                        id="cc-height"
                        min={130}
                        max={220}
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value) || 0)}
                        inputMode="numeric"
                        aria-labelledby="cc-height-lbl"
                      />
                    </div>
                  ) : (
                    <div className="cc-row2">
                      <input
                        type="number"
                        min={4}
                        max={7}
                        value={heightFt}
                        onChange={(e) => setHeightFt(Number(e.target.value) || 0)}
                        inputMode="numeric"
                        aria-label="Height, feet"
                      />
                      <input
                        type="number"
                        min={0}
                        max={11}
                        value={heightIn}
                        onChange={(e) => setHeightIn(Number(e.target.value) || 0)}
                        inputMode="numeric"
                        aria-label="Height, inches"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2 — Activity */}
            <div className="cc-qcard">
              <div className="cc-qhead">
                <span className="cc-qn" aria-hidden="true">2</span>
                <h2>Your activity level</h2>
              </div>
              <p className="cc-qsub">
                Be honest rather than aspirational &mdash; this is the setting that changes the number
                most. Pick the description that matches a normal week, not your best one.
              </p>

              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                  Activity level
                </legend>
                <div className="cc-acts">
                  {ACTIVITY_LEVELS.map((level) => (
                    <label className="cc-act" key={level.value}>
                      <input
                        type="radio"
                        name="activity"
                        value={level.value}
                        checked={activityMultiplier === level.value}
                        onChange={() => setActivityMultiplier(level.value)}
                      />
                      <div>
                        <div className="cc-act-t">
                          {level.label}{" "}
                          <span className="cc-act-x">&times;{level.value}</span>
                        </div>
                        <p className="cc-act-d">{level.description}</p>
                        <p className="cc-act-e">{level.examples}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          {/* Results panel */}
          <div className="cc-panel">
            <div className="cc-res">
              <div className="cc-res-eyebrow">Your numbers</div>

              <div className="cc-res-main" aria-live="polite">
                <div className="cc-res-num">{tdeeDisplay}</div>
                <div className="cc-res-unit">kcal a day to maintain</div>
                <p className="cc-res-say">
                  Everything you burn in a day just existing, moving, and training &mdash; at the
                  activity level selected.
                </p>
              </div>

              <p className="cc-res-h">Choose a target</p>
              <div className="cc-paces" role="group" aria-label="Daily calorie targets">
                {TARGETS.map((t, i) => {
                  const kcal = canCompute
                    ? calculateTargetCalories(tdee, t.delta)
                    : 0;
                  return (
                    <button
                      key={t.key}
                      className="cc-pace"
                      type="button"
                      aria-pressed={i === paceIndex}
                      onClick={() => setPaceIndex(i)}
                    >
                      <span>
                        <span className="cc-pace-n">
                          {t.name}
                          {t.tag ? <span className="cc-tag">{t.tag}</span> : null}
                        </span>
                        <span className="cc-pace-r">{t.rate}</span>
                      </span>
                      <span className="cc-pace-k">
                        {canCompute ? fmtNumber(kcal) : "\u2013"}
                        <i>kcal</i>
                      </span>
                    </button>
                  );
                })}
              </div>

              {belowFloor && (
                <div className="cc-flag" role="alert">
                  <IconAlertCircle style={{ width: 15, height: 15, flex: "none", marginTop: 1 }} />
                  <span>
                    That target falls below {fmtNumber(getFloorThreshold(sex))} kcal, which is hard
                    to meet your nutrient needs on. Choose a gentler target, or speak to a clinician
                    first.
                  </span>
                </div>
              )}

              <div className="cc-res-foot">
                <button
                  className="ef-btn ef-btn-secondary"
                  type="button"
                  onClick={handlePrint}
                >
                  Print or save
                </button>
                <button
                  className="ef-btn ef-btn-ghost-white"
                  type="button"
                  onClick={openDialog}
                >
                  Talk it through
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ READING THIS ═══ */}
      <section className="cc-sec-tight" style={{ background: "var(--color-warm)" }}>
        <div className="cc-inner cc-split">
          <div>
            <p className="cc-eyebrow">Reading the number</p>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(30px, 2.8vw, 42px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.025em", color: "var(--color-ink)", marginBottom: 18 }}>
              What each of these actually means
            </h2>
            <p className="cc-bd">
              Maintenance is roughly what keeps your weight where it is now. A target below it
              creates the gap that leads to weight coming off; a target above it supports building
              back up after illness, treatment or a long period of doing less.
            </p>
            <p className="cc-bd">
              The two loss paces trade speed against how easy the gap is to live with. Gentle is
              usually the one people can hold for months without it taking over their life, which is
              what makes it work.
            </p>
          </div>
          <div>
            <div className="cc-feats">
              <div className="cc-feat">
                <span className="cc-feat-dot" aria-hidden="true" />
                <div>
                  <div className="cc-feat-t">Give it two to three weeks</div>
                  <p className="cc-feat-d">
                    Weight moves around day to day with water, food volume and hormones. Judge it on
                    the trend across a fortnight, not a single morning.
                  </p>
                </div>
              </div>
              <div className="cc-feat">
                <span className="cc-feat-dot" aria-hidden="true" />
                <div>
                  <div className="cc-feat-t">Adjust rather than restart</div>
                  <p className="cc-feat-d">
                    If nothing has changed after three steady weeks, move the target by 100&ndash;150
                    kcal and hold it again. Small corrections beat starting over.
                  </p>
                </div>
              </div>
              <div className="cc-feat">
                <span className="cc-feat-dot" aria-hidden="true" />
                <div>
                  <div className="cc-feat-t">Energy and sleep are data too</div>
                  <p className="cc-feat-d">
                    If training feels harder, sleep gets worse or you are cold and short-tempered,
                    the gap is too big &mdash; regardless of what the scale says.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MACROS ═══ */}
      <section className="cc-sec" style={{ background: "#fff" }}>
        <div className="cc-inner">
          <div className="cc-head" style={{ marginBottom: 44 }}>
            <p className="cc-eyebrow cc-eyebrow-teal">What the calories are made of</p>
            <h2>The total is the main lever. The split still matters.</h2>
            <p className="cc-bd" style={{ marginTop: 16 }}>
              Worked out from whichever target is selected above. Adjust the percentages if you have
              been given a split to follow, or use one of the starting points.
            </p>
          </div>

          <div className="cc-macro-wrap">
            <div>
              <div className="cc-presets" role="group" aria-label="Starting points">
                {MACRO_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    className="cc-preset"
                    type="button"
                    aria-pressed={activePreset === p.key}
                    onClick={() => selectPreset(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="cc-mbar" role="img" aria-label={`Macronutrient split: protein ${proteinPct}%, carbohydrate ${carbPct}%, fat ${fatPct}%`}>
                <span className="cc-m-pro" style={{ width: `${(proteinPct / (macroSum || 1)) * 100}%` }} />
                <span className="cc-m-car" style={{ width: `${(carbPct / (macroSum || 1)) * 100}%` }} />
                <span className="cc-m-fat" style={{ width: `${(fatPct / (macroSum || 1)) * 100}%` }} />
              </div>

              <div className="cc-mrows">
                <div className="cc-mrow">
                  <span className="cc-dot cc-m-pro" aria-hidden="true" />
                  <div>
                    <div className="cc-mname">Protein</div>
                    <p className="cc-mwhy">
                      Builds and protects muscle, and keeps you full for longer. Typical range
                      10&ndash;35%.
                    </p>
                  </div>
                  <div className="cc-mgrams">
                    {canCompute ? macros.proteinGrams : "\u2013"}
                    <small>grams a day</small>
                  </div>
                  <div className="cc-mpct">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={proteinPct}
                      onChange={handleMacroInput(setProteinPct)}
                      inputMode="numeric"
                      aria-label="Protein percentage"
                    />
                    <span>%</span>
                  </div>
                </div>
                <div className="cc-mrow">
                  <span className="cc-dot cc-m-car" aria-hidden="true" />
                  <div>
                    <div className="cc-mname">Carbohydrate</div>
                    <p className="cc-mwhy">
                      Your main fuel for training and for getting through the day. Typical range
                      45&ndash;65%.
                    </p>
                  </div>
                  <div className="cc-mgrams">
                    {canCompute ? macros.carbGrams : "\u2013"}
                    <small>grams a day</small>
                  </div>
                  <div className="cc-mpct">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={carbPct}
                      onChange={handleMacroInput(setCarbPct)}
                      inputMode="numeric"
                      aria-label="Carbohydrate percentage"
                    />
                    <span>%</span>
                  </div>
                </div>
                <div className="cc-mrow">
                  <span className="cc-dot cc-m-fat" aria-hidden="true" />
                  <div>
                    <div className="cc-mname">Fat</div>
                    <p className="cc-mwhy">
                      Hormones, joint health and absorbing vitamins A, D, E and K. Typical range
                      20&ndash;35%.
                    </p>
                  </div>
                  <div className="cc-mgrams">
                    {canCompute ? macros.fatGrams : "\u2013"}
                    <small>grams a day</small>
                  </div>
                  <div className="cc-mpct">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={fatPct}
                      onChange={handleMacroInput(setFatPct)}
                      inputMode="numeric"
                      aria-label="Fat percentage"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>

              <p className="cc-mtot" aria-live="polite">
                <span>
                  Based on <b>{canCompute ? fmtNumber(selectedTargetKcal) : "\u2013"}</b> kcal a day.
                </span>
                <span style={{ color: macroSum === 100 ? "var(--color-teal)" : "var(--color-rose)", fontWeight: 700 }}>
                  {macroSum !== 100 ? `These add up to ${macroSum}% \u2014 aim for 100%.` : ""}
                </span>
              </p>
            </div>

            <aside className="cc-mside">
              <h3>Where to start</h3>
              <p>
                If you are losing weight, raising protein towards 30% helps you keep the muscle you
                have and stay full on fewer calories.
              </p>
              <p>
                If you are building back up &mdash; after treatment, illness, or a long period of
                doing less &mdash; a similar protein figure works, with the rest split between
                carbohydrate for training energy and fat for hormones.
              </p>
              <div className="cc-prot">
                <b>
                  {canCompute && kg > 0
                    ? (Math.round((macros.proteinGrams / kg) * 10) / 10).toFixed(1)
                    : "\u2013"}
                </b>
                <span>
                  grams of protein per kg of body weight, at the split shown.
                  <br />
                  Around 1.2&ndash;2.0 g/kg suits most people who are training.
                </span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ═══ HONEST LIMITS ═══ */}
      <section className="cc-sec" style={{ background: "var(--color-ink)", color: "#fff" }}>
        <div className="cc-inner">
          <div className="cc-head">
            <p className="cc-eyebrow cc-eyebrow-l">Where this stops being reliable</p>
            <h2 style={{ color: "#fff" }}>
              Three things a calculator cannot know about you
            </h2>
            <p className="cc-bd" style={{ color: "rgba(255,255,255,0.82)", marginTop: 16 }}>
              This is an equation, not an assessment. It is a reasonable place to start and a poor
              place to finish &mdash; particularly if your health is part of the picture.
            </p>
          </div>

          <div className="cc-limits">
            <div className="cc-limit">
              <h3>Treatment and medication</h3>
              <p>
                Chemotherapy, hormone therapy, steroids, thyroid medication and several others change
                appetite, weight and energy use in ways no equation accounts for. Take the number to
                your clinical team before acting on it.
              </p>
            </div>
            <div className="cc-limit">
              <h3>Fatigue and condition-led days</h3>
              <p>
                With long COVID, fibromyalgia, chronic pain or during recovery, activity varies
                enormously week to week. One fixed multiplier cannot describe a week where two days
                are lost to fatigue.
              </p>
            </div>
            <div className="cc-limit">
              <h3>What you are made of</h3>
              <p>
                Two people of the same height and weight can need different amounts depending on how
                much muscle they carry. The estimate can sit 10% either side of the truth &mdash;
                which is why we adjust from real results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MOVEMENT NOTE ═══ */}
      <section className="cc-sec-tight" style={{ background: "var(--color-warm)" }}>
        <div className="cc-inner cc-split" style={{ alignItems: "center" }}>
          <div>
            <p className="cc-eyebrow">Movement and food</p>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(30px, 2.8vw, 42px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.025em", color: "var(--color-ink)", marginBottom: 18 }}>
              Keep moving. Just don&rsquo;t ask it to outrun your plate.
            </h2>
            <p className="cc-bd">
              Movement supports weight change, protects your heart and bones, and does more for how
              you feel day to day than almost anything else. What it cannot do is cancel out food.
              Burning off a single biscuit takes roughly a mile and a half of running, which is not a
              realistic way to manage weight over a year.
            </p>
            <p className="cc-bd">
              So do both, and let each do its own job &mdash; training for strength, function and
              health; food for the energy balance.
            </p>
          </div>
          <figure>
            <div className="cc-frame">
              <img
                src="/imagery/site/studio-kneel-stretch.jpg"
                alt="A one-to-one session in the private Worthing studio"
              />
            </div>
            <figcaption style={{ fontSize: 13, color: "var(--color-muted-text)", marginTop: 12 }}>
              Sessions are private and one-to-one, in the studio in Worthing.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section
        className="cc-sec"
        style={{
          background: "var(--color-ink)",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/imagery/site/coaching-plank-client.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.18,
          }}
        />
        <div className="cc-inner" style={{ position: "relative", maxWidth: 700, textAlign: "center" }}>
          <p className="cc-eyebrow cc-eyebrow-l" style={{ justifyContent: "center" }}>
            Free Consultation
          </p>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(30px, 2.8vw, 42px)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "#fff",
              marginBottom: 18,
            }}
          >
            Got a number. Not sure what to do with it?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.68, color: "rgba(255,255,255,0.82)", marginBottom: 28 }}>
            Bring it to a free consultation and we will work out what it means for you &mdash;
            including how to adapt it around a health condition, treatment or recovery.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <button className="ef-btn ef-btn-white" onClick={openDialog}>
              Book a Free Consultation
              <IconArrowUpRight style={{ width: 13, height: 13 }} />
            </button>
            <a href="tel:07517658128" className="ef-btn ef-btn-ghost-white">
              Call: 07517 658 128
            </a>
          </div>
        </div>
      </section>

      {/* ═══ MOBILE RUNNING TOTAL ═══ */}
      <div className="cc-mini" role="complementary" aria-label="Your selected target">
        <div className="cc-mini-in">
          <div>
            <div className="cc-mini-k">{targetName} target</div>
            <div className="cc-mini-v">
              {targetKcalDisplay}
              <i>kcal</i>
            </div>
          </div>
          <a href="#cta-section">Talk it through</a>
        </div>
      </div>

      <div id="cta-section" />

      <ConsultationDialog open={open} onOpenChange={setOpen} />

      <Footer />
    </>
  );
}

export default CalorieCalculator;
