export const LB_TO_KG = 0.45359237;

export function defaultUnitForEquipment(equipment: string[]): 'kg' | 'lb' {
  if (!equipment || !Array.isArray(equipment)) return 'kg';
  return equipment.some((e) => /band/i.test(e)) ? 'lb' : 'kg';
}

export function toKg(value: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? value * LB_TO_KG : value;
}

export function fromKg(valueKg: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? valueKg / LB_TO_KG : valueKg;
}

export function formatWeight(valueKg: number, unit: "kg" | "lb"): string {
  if (unit === "lb") {
    const lb = valueKg / LB_TO_KG;
    return `${lb.toFixed(1)} lb`;
  }
  return `${valueKg.toFixed(1)} kg`;
}
