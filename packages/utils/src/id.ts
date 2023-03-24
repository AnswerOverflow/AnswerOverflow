import { loremIpsum } from 'lorem-ipsum';

/*
  Returns an ID of only numbers, i.e 123456789
*/
export function getRandomId(length: number = 15): string {
	// 10 to the power of lenght
	const max = Math.pow(10, length);
	return Math.floor(Math.random() * max).toString();
}

export function getRandomIdGreaterThan(min: number): string {
	const max = Math.pow(10, min.toString().length);
	return Math.floor(Math.random() * (max - min) + min).toString();
}

export function getRandomEmail(): string {
	return `${getRandomId()}@answeroverflow.com`;
}

export function getRandomSentence() {
	return loremIpsum({
		count: 1, // Number of "words", "sentences", or "paragraphs"
		format: 'plain', // "plain" or "html"
		paragraphLowerBound: 3, // Min. number of sentences per paragraph.
		paragraphUpperBound: 7, // Max. number of sentences per paragarph.
		random: Math.random, // A PRNG function
		sentenceLowerBound: 5, // Min. number of words per sentence.
		sentenceUpperBound: 15, // Max. number of words per sentence.
		suffix: '\n', // Line ending, defaults to "\n" or "\r\n" (win32)
		units: 'sentences', // paragraph(s), "sentence(s)", or "word(s)"
	});
}
export function getRandomName() {
	return loremIpsum({
		count: 4, // Number of "words", "sentences", or "paragraphs"
		format: 'plain', // "plain" or "html"
		paragraphLowerBound: 1, // Min. number of sentences per paragraph.
		paragraphUpperBound: 1, // Max. number of sentences per paragarph.
		random: Math.random, // A PRNG function
		sentenceLowerBound: 1, // Min. number of words per sentence.
		sentenceUpperBound: 1, // Max. number of words per sentence.
		suffix: '\n', // Line ending, defaults to "\n" or "\r\n" (win32)
		units: 'words', // paragraph(s), "sentence(s)", or "word(s)"
	});
}
