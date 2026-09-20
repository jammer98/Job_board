export function buildUpdate(data, allowed) {
  const entries = Object.entries(data).filter(
    ([key, value]) => allowed.includes(key) && value !== undefined
  );
  if (entries.length === 0) return null;

  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(", ");
  return { setClause, values: entries.map(([, value]) => value) };
}