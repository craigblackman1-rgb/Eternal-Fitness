export interface ExerciseGroup<T> {
  type: "group" | "single";
  label?: string;
  items: T[];
  indices: number[];
}

export function computeGroups<T extends { group_label?: string | null }>(
  list: T[],
  opts?: { allowGroups?: boolean },
): ExerciseGroup<T>[] {
  if (opts?.allowGroups === false) {
    return list.map((item, i) => ({ type: "single", items: [item], indices: [i] }));
  }

  const groups: ExerciseGroup<T>[] = [];
  let i = 0;
  while (i < list.length) {
    const item = list[i];
    if (item.group_label) {
      const label = item.group_label;
      const items: T[] = [item];
      const indices: number[] = [i];
      let j = i + 1;
      while (j < list.length && list[j].group_label === label) {
        items.push(list[j]);
        indices.push(j);
        j++;
      }
      if (items.length > 1) {
        groups.push({ type: "group", label, items, indices });
      } else {
        groups.push({ type: "single", items: [item], indices: [i] });
      }
      i = j;
    } else {
      groups.push({ type: "single", items: [item], indices: [i] });
      i++;
    }
  }
  return groups;
}

export function normalizeGroups<T extends { group_label?: string | null }>(
  list: T[],
): { list: T[]; dissolved: string[] } {
  const counts: Record<string, number> = {};
  for (const item of list) {
    if (item.group_label) {
      counts[item.group_label] = (counts[item.group_label] || 0) + 1;
    }
  }
  const dissolved: string[] = [];
  const next = list.map((item) => {
    if (item.group_label && counts[item.group_label] < 2) {
      dissolved.push(item.group_label);
      return { ...item, group_label: undefined };
    }
    return item;
  });
  return { list: next, dissolved };
}

export function nextGroupLabel<T extends { group_label?: string | null }>(
  list: T[],
): string {
  const used = new Set<string>();
  for (const item of list) {
    if (item.group_label) used.add(item.group_label);
  }
  const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const ch of pool) {
    if (!used.has(ch)) return ch;
  }
  return "Z";
}
