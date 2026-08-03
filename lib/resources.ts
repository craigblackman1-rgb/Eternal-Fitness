export interface ResourceDef {
  key: string;
  name: string;
  description: string;
  route: string;
}

export const RESOURCES: ResourceDef[] = [
  {
    key: "calorie-calculator",
    name: "Your daily calorie guide",
    description:
      "A starting estimate of how much you need in a day, and how you might split it between protein, carbohydrate and fat. About 3 minutes.",
    route: "/portal/calorie-guide",
  },
  {
    key: "showdown-soundboard",
    name: "Showdown Soundboard",
    description:
      "Position-cue audio tool for table tennis training — tap to sound forehand, backhand, defence and centre-court tones. Includes background ambience links.",
    route: "/portal/resources/showdown-soundboard",
  },
];

export function getEnabledResources(
  visibility: Record<string, boolean> | null | undefined,
): ResourceDef[] {
  if (!visibility || typeof visibility !== "object") return [];
  return RESOURCES.filter((r) => visibility[r.key] === true);
}
