export interface CalculatorInputs {
  sex: "male" | "female";
  age: number;
  weightKg: number;
  heightCm: number;
  activityMultiplier: number;
}

export interface ActivityLevel {
  value: number;
  label: string;
  description: string;
  examples: string;
}

export interface TargetOption {
  key: string;
  name: string;
  rate: string;
  delta: number;
  tag: string;
}

export interface MacroSplit {
  proteinPct: number;
  carbPct: number;
  fatPct: number;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  {
    value: 1.2,
    label: "Sedentary",
    description:
      "A desk-based job or a day spent mostly sitting, with no structured exercise. Most of the day is driving, at a computer, or on the sofa.",
    examples: "Office work, admin, driving jobs, studying, or retirement without regular walks.",
  },
  {
    value: 1.375,
    label: "Lightly active",
    description:
      "A mostly seated day with some deliberate movement \u2014 one to three sessions of exercise a week, or a job that has you up and walking for part of the day.",
    examples: "Teaching, light retail, a couple of training sessions a week, regular dog walks.",
  },
  {
    value: 1.55,
    label: "Moderately active",
    description:
      "Structured exercise three to five days a week, or a job that keeps you on your feet and moving for most of the day even without formal training.",
    examples:
      "Nursing, hospitality, hairdressing, warehouse picking, or keeping up with young children most days.",
  },
  {
    value: 1.725,
    label: "Very active",
    description:
      "Hard, structured exercise six or seven days a week, or a physically demanding job \u2014 lifting, carrying, on your feet almost constantly \u2014 with regular training on top.",
    examples:
      "Builders, gardeners and delivery drivers who also train regularly; competitive amateur sport.",
  },
  {
    value: 1.9,
    label: "Extremely active",
    description:
      "Hard physical training or manual work twice a day, most days. This is a small minority of people \u2014 not \u201CI go to the gym a lot\u201D, but genuinely intense near-daily demand on top of a physical job.",
    examples: "Athletes in season; manual labourers who also train twice daily.",
  },
];

export const TARGETS: TargetOption[] = [
  {
    key: "gentle",
    name: "Gentle",
    rate: "About 0.25 kg (\u00BD lb) a week off",
    delta: -250,
    tag: "Easier to sustain",
  },
  {
    key: "steadier",
    name: "Steadier",
    rate: "About 0.5 kg (1 lb) a week off",
    delta: -500,
    tag: "",
  },
  {
    key: "maintain",
    name: "Maintain",
    rate: "Hold your weight where it is",
    delta: 0,
    tag: "",
  },
  {
    key: "build",
    name: "Building back up",
    rate: "Gaining gradually, with training",
    delta: 300,
    tag: "",
  },
];

export function calculateBMR(inputs: CalculatorInputs): number {
  const { sex, age, weightKg, heightCm } = inputs;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export function calculateTDEE(inputs: CalculatorInputs): number {
  return calculateBMR(inputs) * inputs.activityMultiplier;
}

export function calculateTargetCalories(tdee: number, targetDelta: number): number {
  return Math.round(tdee + targetDelta);
}

export function calculateMacros(
  targetCalories: number,
  split: MacroSplit,
): { proteinGrams: number; carbGrams: number; fatGrams: number } {
  return {
    proteinGrams: Math.round((targetCalories * split.proteinPct) / 100 / 4),
    carbGrams: Math.round((targetCalories * split.carbPct) / 100 / 4),
    fatGrams: Math.round((targetCalories * split.fatPct) / 100 / 9),
  };
}

export function getFloorThreshold(sex: "male" | "female"): number {
  return sex === "male" ? 1500 : 1200;
}

export function fmtNumber(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

/** kg ↔ stone/pounds conversion */
import { LB_TO_KG } from "./units";
export { LB_TO_KG };

export function kgToStLb(kg: number): { st: number; lb: number } {
  const lb = kg / LB_TO_KG;
  const st = Math.floor(lb / 14);
  let rem = Math.round(lb - st * 14);
  if (rem === 14) {
    return { st: st + 1, lb: 0 };
  }
  return { st, lb: rem };
}

export function stLbToKg(st: number, lb: number): number {
  return Math.round((st * 14 + lb) * LB_TO_KG * 10) / 10;
}

/** cm ↔ ft/in conversion */
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totIn = Math.round(cm / 2.54);
  return { ft: Math.floor(totIn / 12), inch: totIn % 12 };
}

export function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54);
}

export const MACRO_PRESETS = [
  { key: "balanced", label: "Balanced", protein: 20, carb: 55, fat: 25 },
  { key: "high-protein", label: "Higher protein", protein: 30, carb: 45, fat: 25 },
  { key: "low-carb", label: "Lower carb", protein: 30, carb: 30, fat: 40 },
];

export const DEFAULT_INPUTS = {
  sex: "female" as const,
  age: 45,
  weightKg: 75,
  heightCm: 165,
  activityMultiplier: 1.375,
};

export const PORTAL_DEFAULTS = {
  sex: "female" as const,
  age: 52,
  weightKg: 72,
  heightCm: 165,
  activityMultiplier: 1.375,
};
