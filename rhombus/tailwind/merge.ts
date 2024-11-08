type DeepMergeable = { [key: string]: any } | Array<any>;

export function deepMerge<T extends DeepMergeable, U extends DeepMergeable>(
  target: T,
  source: U,
): T & U {
  if (!source) {
    return target as T & U;
  }
  if (!target) {
    return source as T & U;
  }

  const output = Array.isArray(target) ? [...target] : { ...target };

  if (Array.isArray(source)) {
    if (!Array.isArray(target)) {
      return source as T & U;
    }
    return [...target, ...source] as T & U;
  }

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = (output as any)[key];
      const sourceValue = source[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        targetValue &&
        typeof targetValue === "object"
      ) {
        (output as any)[key] = deepMerge(targetValue, sourceValue);
      } else {
        (output as any)[key] = sourceValue;
      }
    }
  }

  return output as T & U;
}
