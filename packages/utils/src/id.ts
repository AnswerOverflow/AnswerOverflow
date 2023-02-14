/*
  Returns an ID of only numbers, i.e 123456789
*/
// Snowflake: 523949187663134754
// That is 19 digits long
// So we want to generate a number that is 19 digits long
export function getRandomId(length: number = 19): string {
  // 10 to the power of lenght
  const max = Math.pow(10, length);
  return Math.floor(Math.random() * max).toString();
}

export function getRandomEmail(): string {
  return `${getRandomId()}@answeroverflow.com`;
}
