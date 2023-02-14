/*
  Returns an ID of only numbers, i.e 123456789
*/
export function getRandomId(length: number = 15): string {
  // 10 to the power of lenght
  const max = Math.pow(10, length);
  return Math.floor(Math.random() * max).toString();
}

export function getRandomEmail(): string {
  return `${getRandomId()}@answeroverflow.com`;
}
