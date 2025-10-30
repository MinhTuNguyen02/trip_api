export function coerceBoolean(v: unknown): boolean {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.toLowerCase() === "true";
    if (typeof v === "number") return v !== 0;
    return false;
  }
  