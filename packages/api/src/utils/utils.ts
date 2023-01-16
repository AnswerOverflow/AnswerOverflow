export function pick<T extends {}, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

// https://stackoverflow.com/questions/53966509/typescript-type-safe-omit-function
export const omit = <T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> => {
  const _ = { ...obj };
  keys.forEach((key) => delete _[key]);
  return _;
};
