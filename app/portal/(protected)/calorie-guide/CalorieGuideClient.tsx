"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconPrinter } from "@/components/icons";
import {
  ACTIVITY_LEVELS,
  TARGETS,
  MACRO_PRESETS,
  PORTAL_DEFAULTS,
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
import "./calorie-guide.css";

const TARGET_NAMES: Record<string, string> = {
  gentle: "Gentle",
  steadier: "Steadier",
  maintain: "Maintain",
  build: "Building back up",
};

interface Props {
  clientName: string;
  clientId: string;
}

export default function CalorieGuideClient({ clientName }: Props) {
  const [sex, setSex] = useState<"male" | "female">(PORTAL_DEFAULTS.sex);
  const [age, setAge] = useState(PORTAL_DEFAULTS.age);
  const [weightKg, setWeightKg] = useState(PORTAL_DEFAULTS.weightKg);
  const [weightSt, setWeightSt] = useState(11);
  const [weightLb, setWeightLb] = useState(5);
  const [wUnit, setWUnit] = useState<"kg" | "st">("kg");
  const [heightCm, setHeightCm] = useState(PORTAL_DEFAULTS.heightCm);
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(5);
  const [hUnit, setHUnit] = useState<"cm" | "ftin">("cm");
  const [activityMultiplier, setActivityMultiplier] = useState(PORTAL_DEFAULTS.activityMultiplier);
  const [targetDelta, setTargetDelta] = useState(-250);

  const [proteinPct, setProteinPct] = useState(MACRO_PRESETS[0].protein);
  const [carbPct, setCarbPct] = useState(MACRO_PRESETS[0].carb);
  const [fatPct, setFatPct] = useState(MACRO_PRESETS[0].fat);
  const [activePreset, setActivePreset] = useState(MACRO_PRESETS[0].key);

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

  if (canCompute) {
    const inputs: CalculatorInputs = { sex, age, weightKg: kg, heightCm: cm, activityMultiplier };
    bmr = calculateBMR(inputs);
    tdee = calculateTDEE(inputs);
  }

  const selectedTargetKcal = canCompute ? calculateTargetCalories(tdee, targetDelta) : 0;
  const floor = getFloorThreshold(sex);
  const belowFloor = canCompute && selectedTargetKcal < floor;

  const macros = calculateMacros(selectedTargetKcal || tdee, {
    proteinPct,
    carbPct,
    fatPct,
  });
  const macroSum = proteinPct + carbPct + fatPct;

  const selectedTargetKey =
    TARGETS.find((t) => t.delta === targetDelta)?.key ?? "gentle";
  const selectedTargetName = TARGET_NAMES[selectedTargetKey];

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

  const handleReset = () => {
    setSex(PORTAL_DEFAULTS.sex);
    setAge(PORTAL_DEFAULTS.age);
    setWeightKg(PORTAL_DEFAULTS.weightKg);
    setWeightSt(11);
    setWeightLb(5);
    setWUnit("kg");
    setHeightCm(PORTAL_DEFAULTS.heightCm);
    setHeightFt(5);
    setHeightIn(5);
    setHUnit("cm");
    setActivityMultiplier(PORTAL_DEFAULTS.activityMultiplier);
    setTargetDelta(-250);
    setProteinPct(MACRO_PRESETS[0].protein);
    setCarbPct(MACRO_PRESETS[0].carb);
    setFatPct(MACRO_PRESETS[0].fat);
    setActivePreset(MACRO_PRESETS[0].key);
  };

  const tdeeDisplay = canCompute ? fmtNumber(tdee) : "\u2013";

  return (
    <div className="space-y-6">
      {/* Page head */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-rose mb-3">
          Tools &middot; Food and energy
        </p>
        <h1 className="font-serif text-[clamp(1.6rem,2.5vw,2.2rem)] font-bold tracking-[-0.02em] text-ink leading-tight">
          Your daily calorie guide
        </h1>
        <p className="mt-2 text-[0.94rem] leading-relaxed text-body max-w-[58ch]">
          A starting estimate of how much you need in a day, and how you might split it between
          protein, carbohydrate and fat. Work through it at your own pace &mdash; the numbers update
          as you go.
        </p>
      </div>

      {/* Privacy note */}
      <div className="rounded-xl border border-teal/20 bg-teal/5 p-4">
        <div className="flex gap-3">
          <IconAlertTriangle className="w-5 h-5 text-teal flex-none mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-ink text-[0.95rem] mb-1">This one is just for you</h2>
            <p className="text-[0.88rem] leading-relaxed text-body m-0">
              Nothing you type here is saved or sent to Esther &mdash; it works out the numbers on
              your own device and forgets them when you close the page. Print it, or bring the
              figures to your next session if you would like to go through them together.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1 — About you */}
      <section className="rounded-2xl border border-border-warm bg-white p-5 sm:p-6 shadow-sm" aria-labelledby="cg-h-about">
        <div className="cg-card-head">
          <span className="cg-num" aria-hidden="true">1</span>
          <h2 id="cg-h-about">About you</h2>
        </div>
        <p className="cg-sub">Four details. They set the baseline your body uses at rest.</p>

        <fieldset className="cg-fs">
          <legend>Sex at birth</legend>
          <p className="cg-hint">
            The equation uses this because muscle and bone mass differ on average. If it does not
            describe you, choose whichever fits your body best &mdash; and we can adjust it together.
          </p>
          <div className="cg-choices-row">
            <label className="cg-choice">
              <input
                type="radio"
                name="sex"
                value="female"
                checked={sex === "female"}
                onChange={() => setSex("female")}
              />
              <span className="cg-choice-text">Female</span>
            </label>
            <label className="cg-choice">
              <input
                type="radio"
                name="sex"
                value="male"
                checked={sex === "male"}
                onChange={() => setSex("male")}
              />
              <span className="cg-choice-text">Male</span>
            </label>
          </div>
        </fieldset>

        <div className="cg-field" style={{ maxWidth: "9.5rem" }}>
          <label htmlFor="cg-age">Your age</label>
          <input
            type="number"
            id="cg-age"
            min={14}
            max={100}
            value={age}
            onChange={(e) => setAge(Number(e.target.value) || 0)}
            inputMode="numeric"
          />
        </div>

        <fieldset className="cg-fs">
          <legend>Your weight</legend>
          <div className="cg-choices-row" style={{ marginBottom: "0.75rem" }}>
            <label className="cg-choice">
              <input
                type="radio"
                name="wunit"
                value="kg"
                checked={wUnit === "kg"}
                onChange={() => switchWUnit("kg")}
              />
              <span className="cg-choice-text">Kilograms</span>
            </label>
            <label className="cg-choice">
              <input
                type="radio"
                name="wunit"
                value="st"
                checked={wUnit === "st"}
                onChange={() => switchWUnit("st")}
              />
              <span className="cg-choice-text">Stone &amp; pounds</span>
            </label>
          </div>
          {wUnit === "kg" ? (
            <div className="cg-field" style={{ maxWidth: "9.5rem", marginBottom: 0 }}>
              <label htmlFor="cg-weight">Weight in kg</label>
              <input
                type="number"
                id="cg-weight"
                min={30}
                max={250}
                step={0.1}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
                inputMode="decimal"
              />
            </div>
          ) : (
            <div className="cg-field-row" style={{ marginBottom: 0 }}>
              <div className="cg-field" style={{ flex: "0 1 9.5rem" }}>
                <label htmlFor="cg-weight-st">Stone</label>
                <input
                  type="number"
                  id="cg-weight-st"
                  min={4}
                  max={40}
                  value={weightSt}
                  onChange={(e) => setWeightSt(Number(e.target.value) || 0)}
                  inputMode="numeric"
                />
              </div>
              <div className="cg-field" style={{ flex: "0 1 9.5rem" }}>
                <label htmlFor="cg-weight-lb">Pounds</label>
                <input
                  type="number"
                  id="cg-weight-lb"
                  min={0}
                  max={13}
                  value={weightLb}
                  onChange={(e) => setWeightLb(Number(e.target.value) || 0)}
                  inputMode="numeric"
                />
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="cg-fs" style={{ marginBottom: 0 }}>
          <legend>Your height</legend>
          <div className="cg-choices-row" style={{ marginBottom: "0.75rem" }}>
            <label className="cg-choice">
              <input
                type="radio"
                name="hunit"
                value="cm"
                checked={hUnit === "cm"}
                onChange={() => switchHUnit("cm")}
              />
              <span className="cg-choice-text">Centimetres</span>
            </label>
            <label className="cg-choice">
              <input
                type="radio"
                name="hunit"
                value="ftin"
                checked={hUnit === "ftin"}
                onChange={() => switchHUnit("ftin")}
              />
              <span className="cg-choice-text">Feet &amp; inches</span>
            </label>
          </div>
          {hUnit === "cm" ? (
            <div className="cg-field" style={{ maxWidth: "9.5rem", marginBottom: 0 }}>
              <label htmlFor="cg-height">Height in cm</label>
              <input
                type="number"
                id="cg-height"
                min={120}
                max={220}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value) || 0)}
                inputMode="numeric"
              />
            </div>
          ) : (
            <div className="cg-field-row" style={{ marginBottom: 0 }}>
              <div className="cg-field" style={{ flex: "0 1 9.5rem" }}>
                <label htmlFor="cg-height-ft">Feet</label>
                <input
                  type="number"
                  id="cg-height-ft"
                  min={4}
                  max={7}
                  value={heightFt}
                  onChange={(e) => setHeightFt(Number(e.target.value) || 0)}
                  inputMode="numeric"
                />
              </div>
              <div className="cg-field" style={{ flex: "0 1 9.5rem" }}>
                <label htmlFor="cg-height-in">Inches</label>
                <input
                  type="number"
                  id="cg-height-in"
                  min={0}
                  max={11}
                  value={heightIn}
                  onChange={(e) => setHeightIn(Number(e.target.value) || 0)}
                  inputMode="numeric"
                />
              </div>
            </div>
          )}
        </fieldset>
      </section>

      {/* Step 2 — Activity */}
      <section className="rounded-2xl border border-border-warm bg-white p-5 sm:p-6 shadow-sm" aria-labelledby="cg-h-activity">
        <div className="cg-card-head">
          <span className="cg-num" aria-hidden="true">2</span>
          <h2 id="cg-h-activity">How active is your usual week?</h2>
        </div>
        <p className="cg-sub">
          Pick the one that matches most weeks, not your best week. Your whole day counts here
          &mdash; work, walking and housework, not only training.
        </p>

        <fieldset className="cg-fs" style={{ marginBottom: 0 }}>
          <legend className="sr-only">Activity level</legend>
          <div className="cg-choices">
            {ACTIVITY_LEVELS.map((level) => (
              <label className="cg-choice" key={level.value}>
                <input
                  type="radio"
                  name="activity"
                  value={level.value}
                  checked={activityMultiplier === level.value}
                  onChange={() => setActivityMultiplier(level.value)}
                />
                <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <span className="cg-choice-text">
                    {level.label} <span className="cg-choice-x">&times;{level.value}</span>
                  </span>
                  <span className="cg-choice-desc">{level.description}</span>
                  <span className="cg-choice-eg">{level.examples}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* Step 3 — Targets */}
      <section className="rounded-2xl border border-border-warm bg-white p-5 sm:p-6 shadow-sm" aria-labelledby="cg-h-targets">
        <div className="cg-card-head">
          <span className="cg-num" aria-hidden="true">3</span>
          <h2 id="cg-h-targets">Your daily targets</h2>
        </div>
        <p className="cg-sub">
          The first figure is roughly what you burn in a day. Everything below it is a choice about
          direction &mdash; there is no right answer, and staying where you are is one of them.
        </p>

        <div className="cg-figure">
          <p className="cg-figure-k">
            To stay where you are<br />your body uses about
          </p>
          <p className="cg-figure-v">
            {tdeeDisplay}
            <i>kcal a day</i>
          </p>
        </div>

        <fieldset className="cg-fs" style={{ marginBottom: 0 }}>
          <legend>Choose a direction</legend>
          <p className="cg-hint">
            Change this whenever you like &mdash; the split below updates with it.
          </p>
          <div className="cg-choices">
            {TARGETS.map((t) => {
              const kcal = canCompute ? calculateTargetCalories(tdee, t.delta) : 0;
              return (
                <label
                  className={`cg-choice cg-target ${targetDelta === t.delta ? "" : ""}`}
                  key={t.key}
                >
                  <input
                    type="radio"
                    name="target"
                    value={t.delta}
                    checked={targetDelta === t.delta}
                    onChange={() => setTargetDelta(t.delta)}
                  />
                  <span className="cg-choice-body">
                    <span className="cg-choice-text">
                      {t.name}
                      {t.tag ? <span className="cg-t-tag">{t.tag}</span> : null}
                    </span>
                    <span className="cg-choice-desc">{t.rate}</span>
                  </span>
                  <span className="cg-t-kcal">
                    {canCompute ? fmtNumber(kcal) : "\u2013"}
                    <i>kcal a day</i>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {belowFloor && (
          <div className="cg-alert" role="alert">
            <IconAlertTriangle style={{ width: 18, height: 18 }} />
            <div>
              <h2>That target is quite low</h2>
              <p>
                That works out at {fmtNumber(selectedTargetKcal)} kcal a day, below the {fmtNumber(floor)}{" "}
                kcal it usually takes to get enough vitamins, minerals and protein into a day. Choose a
                gentler target, or speak to your GP or dietitian before going lower.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Step 4 — Macro split */}
      <section className="rounded-2xl border border-border-warm bg-white p-5 sm:p-6 shadow-sm" aria-labelledby="cg-h-split">
        <div className="cg-card-head">
          <span className="cg-num" aria-hidden="true">4</span>
          <h2 id="cg-h-split">How that splits across your plate</h2>
        </div>
        <p className="cg-sub">
          The total is the main lever. The split is what makes the total liveable &mdash; enough
          protein to hold on to muscle, enough carbohydrate to train on.
        </p>

        <div className="cg-presets" role="group" aria-label="Ready-made splits">
          {MACRO_PRESETS.map((p) => (
            <button
              key={p.key}
              className="cg-preset"
              type="button"
              aria-pressed={activePreset === p.key}
              onClick={() => selectPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div
          className="cg-mbar"
          role="img"
          aria-label={`Macronutrient split: protein ${proteinPct}%, carbohydrate ${carbPct}%, fat ${fatPct}%`}
        >
          <span className="cg-m-pro" style={{ width: `${(proteinPct / (macroSum || 1)) * 100}%` }} />
          <span className="cg-m-car" style={{ width: `${(carbPct / (macroSum || 1)) * 100}%` }} />
          <span className="cg-m-fat" style={{ width: `${(fatPct / (macroSum || 1)) * 100}%` }} />
        </div>

        <div className="cg-mrow">
          <span className="cg-mkey">
            <span className="cg-mswatch cg-m-pro" aria-hidden="true" />
            <span className="cg-mname">Protein</span>
          </span>
          <span className="cg-mgrams">
            {canCompute ? macros.proteinGrams : "\u2013"}
            <small>grams a day</small>
          </span>
          <span className="cg-mpct">
            <input
              type="number"
              min={0}
              max={100}
              value={proteinPct}
              onChange={handleMacroInput(setProteinPct)}
              inputMode="numeric"
              aria-label="Protein percentage"
            />
            <span aria-hidden="true">%</span>
          </span>
        </div>

        <div className="cg-mrow">
          <span className="cg-mkey">
            <span className="cg-mswatch cg-m-car" aria-hidden="true" />
            <span className="cg-mname">Carbohydrate</span>
          </span>
          <span className="cg-mgrams">
            {canCompute ? macros.carbGrams : "\u2013"}
            <small>grams a day</small>
          </span>
          <span className="cg-mpct">
            <input
              type="number"
              min={0}
              max={100}
              value={carbPct}
              onChange={handleMacroInput(setCarbPct)}
              inputMode="numeric"
              aria-label="Carbohydrate percentage"
            />
            <span aria-hidden="true">%</span>
          </span>
        </div>

        <div className="cg-mrow">
          <span className="cg-mkey">
            <span className="cg-mswatch cg-m-fat" aria-hidden="true" />
            <span className="cg-mname">Fat</span>
          </span>
          <span className="cg-mgrams">
            {canCompute ? macros.fatGrams : "\u2013"}
            <small>grams a day</small>
          </span>
          <span className="cg-mpct">
            <input
              type="number"
              min={0}
              max={100}
              value={fatPct}
              onChange={handleMacroInput(setFatPct)}
              inputMode="numeric"
              aria-label="Fat percentage"
            />
            <span aria-hidden="true">%</span>
          </span>
        </div>

        <p className="cg-msum">
          Split from a target of <b>{canCompute ? fmtNumber(selectedTargetKcal) : "\u2013"}</b> kcal a day.
          <span className="cg-msum-warn">
            {macroSum !== 100
              ? `Your three percentages add up to ${macroSum}% \u2014 aim for 100%.`
              : ""}
          </span>
        </p>

        <div className="cg-gkg">
          <span className="cg-gkg-v">
            {canCompute && kg > 0
              ? (Math.round((macros.proteinGrams / kg) * 10) / 10).toFixed(1)
              : "\u2013"}
          </span>
          <p className="cg-gkg-t">
            grams of protein per kilogram of your body weight, at the split above. Around 1.2&ndash;2.0
            g/kg suits most people who are training.
          </p>
        </div>

        <p className="mt-6 text-[0.92rem] text-body leading-relaxed">
          If you are losing weight, moving protein towards 30% helps you keep the muscle you have and
          stay full on fewer calories. If you are building back up after treatment, illness or a long
          period of doing less, a similar protein figure works &mdash; with the rest split between
          carbohydrate for training energy and fat for hormones.
        </p>
      </section>

      {/* Caveats */}
      <section className="rounded-2xl border p-5 sm:p-6 shadow-sm cg-caveats" aria-labelledby="cg-h-caveats">
        <h2 id="cg-h-caveats">Three things a calculator cannot know about you</h2>
        <p className="cg-sub">
          This is an estimate built from averages. These are the places it stops being reliable, and
          they matter more for some of us than others.
        </p>
        <div className="cg-caveat-list">
          <div>
            <h3>Treatment and medication</h3>
            <p>
              Chemotherapy, hormone therapy, steroids, thyroid medication and several others change
              appetite, fluid balance and how your body uses energy. If you are on any of these,
              treat the number as a rough starting point and let how you feel and function lead.
            </p>
          </div>
          <div>
            <h3>Fatigue and condition-led days</h3>
            <p>
              With long COVID, fibromyalgia, chronic pain or cancer-related fatigue, activity is not
              steady from week to week. Pick the level that matches your quieter weeks &mdash; then
              eat more on the weeks you do more, rather than the other way round.
            </p>
          </div>
          <div>
            <h3>What you are made of</h3>
            <p>
              Two people of the same age, height and weight can burn noticeably different amounts
              depending on how much muscle they carry. The equation cannot see that. If you have been
              training a while, you probably sit slightly above the figure shown.
            </p>
          </div>
        </div>
      </section>

      {/* What next */}
      <section aria-labelledby="cg-h-next" className="pb-4">
        <h2 id="cg-h-next" className="font-serif text-[1.25rem] font-bold tracking-[-0.015em] text-ink mb-2">
          Got a number. Not sure what to do with it?
        </h2>
        <p className="text-[0.94rem] leading-relaxed text-body mb-4">
          Bring these figures to your next session and Esther will work through them with you &mdash;
          against your plan, your treatment and what your week actually looks like.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/portal" className="ef-btn ef-btn-outline">
            See your documents
          </Link>
          <a href="tel:07517658128" className="ef-btn ef-btn-ghost">
            Call or text Esther
          </a>
        </div>
      </section>

      {/* Sticky total bar */}
      <div className="cg-total" aria-live="polite" aria-atomic="true">
        <div>
          <p className="cg-total-k">{selectedTargetName} &mdash; your target</p>
          <p className="cg-total-v">
            {canCompute ? fmtNumber(selectedTargetKcal) : "\u2013"}
            <i>kcal a day</i>
          </p>
        </div>
        <div className="cg-total-actions">
          <button className="ef-btn ef-btn-ghost" type="button" onClick={handleReset}>
            Start again
          </button>
          <button className="ef-btn ef-btn-primary" type="button" onClick={handlePrint}>
            <IconPrinter className="w-4 h-4" aria-hidden="true" />
            Print or save
          </button>
        </div>
      </div>
    </div>
  );
}
