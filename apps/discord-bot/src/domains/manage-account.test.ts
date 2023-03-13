import { MANUAL_CONSENT_SOURCES } from '@answeroverflow/api';
import { parseConsentButtonInteraction } from './manage-account';

describe('Manage Account Domain', () => {
	describe('Parse consent button interaction', () => {
		it('should parse a valid interaction', () => {
			for (const intr of MANUAL_CONSENT_SOURCES) {
				const customId = `consent:${intr}`;
				expect(parseConsentButtonInteraction(customId)).toEqual(intr);
			}
		});
		it('should throw an error if the interaction is missing the consent prefix', () => {
			const customId = 'asdasd:invalid';
			expect(() => parseConsentButtonInteraction(customId)).toThrowError(
				'no-consent-prefix',
			);
		});
		it('should throw an error if the interaction is missing the consent source', () => {
			const customId = 'consent:';
			expect(() => parseConsentButtonInteraction(customId)).toThrowError(
				'no-consent-source',
			);
		});
		it('should throw an error if the interaction has an invalid consent source', () => {
			const customId = 'consent:invalid';
			expect(() => parseConsentButtonInteraction(customId)).toThrowError(
				'invalid-consent-source',
			);
		});
		it('should parse legacy consent_button id', () => {
			const customId = 'consent_button';
			expect(parseConsentButtonInteraction(customId)).toEqual(
				'manually-posted-prompt',
			);
		});
		it('should parse legacy consent_button_mark_solution id', () => {
			const customId = 'consent_button_mark_solution';
			expect(parseConsentButtonInteraction(customId)).toEqual(
				'mark-solution-response',
			);
		});
		it('should parse legacy manage_account_consent_button id', () => {
			const customId = 'manage_account_consent_button';
			expect(parseConsentButtonInteraction(customId)).toEqual(
				'manage-account-menu',
			);
		});
	});
});
