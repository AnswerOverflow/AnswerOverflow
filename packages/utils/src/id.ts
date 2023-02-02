/*
  Returns an ID of only numbers, i.e 123456789
*/

export function getRandomId(): string {
  return Math.floor(Math.random() * 1000000000).toString();
}
