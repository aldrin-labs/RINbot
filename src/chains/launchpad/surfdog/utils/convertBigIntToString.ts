export function convertBigIntToString(
  obj: Record<string, bigint>,
): Record<string, string> {
  const newObj: Record<string, string> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = obj[key].toString();
    }
  }
  return newObj;
}
