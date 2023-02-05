/*
  Returns an ID of only numbers, i.e 123456789
*/
// Snowflake: 523949187663134754
// That is 19 digits long
// So we want to generate a number that is 19 digits long
export function getRandomId(): string {
  return Math.floor(Math.random() * 100000000000000000).toString();
}

export function getRandomEmail(): string {
  return `${getRandomId()}@answeroverflow.com`;
}
