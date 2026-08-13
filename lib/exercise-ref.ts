export interface ParsedExerciseRef {
  version: string;
  section: string;
  index: number;
  name: string;
}

export function buildExerciseRef(version: string, section: string, index: number, name: string): string {
  return `${version}:${section}:${index}:${name}`;
}

export function parseExerciseRef(ref: string): ParsedExerciseRef | null {
  const parts = ref.split(":");
  if (parts.length < 4) return null;
  const index = Number(parts[2]);
  if (!Number.isInteger(index) || index < 0) return null;
  return {
    version: parts[0],
    section: parts[1],
    index,
    name: parts.slice(3).join(":"),
  };
}

export function ensureUids<T extends { uid?: string }>(
  exercises: T[],
  opts?: { forceNew?: boolean },
): (T & { uid: string })[] {
  return exercises.map((ex) => {
    if (opts?.forceNew) {
      return { ...ex, uid: crypto.randomUUID() };
    }
    if (ex.uid && ex.uid.length > 0) {
      return { ...ex, uid: ex.uid } as T & { uid: string };
    }
    return { ...ex, uid: crypto.randomUUID() };
  });
}
