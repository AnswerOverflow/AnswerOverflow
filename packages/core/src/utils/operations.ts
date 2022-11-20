export async function findCreateReusable<T>(
  // eslint-disable-next-line no-unused-vars
  finder: () => Promise<T | null>,
  // eslint-disable-next-line no-unused-vars
  creator: () => Promise<T>
): Promise<T> {
  const data = await finder();
  if (data != null) return data;
  return creator();
}
