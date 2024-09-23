import { doesTextHaveConsentPrompt } from './channel-settings';

describe('Update Channel Settings', () => {
	describe('Update Channel Forum Guidelines Consent Enabled', () => {
		it('should error if the post does not have the consent prompt in the guidelines', async () => {});
	});
	describe('does channel have consent prompt', () => {
		describe('succeeds', () => {
			it('should succeed normally', () => {
				expect(
					doesTextHaveConsentPrompt(
						'This server uses Answer Overflow to index content on the web. By posting in this channel your messages will be indexed on the web to help others find answers.',
					),
				).toBeTruthy();
			});
			it('should succeed with markdown in the guidelines', () => {
				expect(
					doesTextHaveConsentPrompt(
						'**This** `server` uses ```Answer Overflow``` to index content on the web. By posting in this channel your messages will be indexed on the web to help others find answers. **This is a test.**',
					),
				).toBeTruthy();
			});
			it('should succeed with text next to the guidelines', () => {
				expect(
					doesTextHaveConsentPrompt(
						'ASDThis server uses Answer Overflow to index content on the web. By posting in this channel your messages will be indexed on the web to help others find answers.This is a test.',
					),
				).toBeTruthy();
			});
			it('should succeed with new lines in topic', () => {
				expect(
					doesTextHaveConsentPrompt(
						'\nThis server uses Answer Overflow to index content on the web. By posting in this channel your messages will be indexed on the web to help others find answers.\n\nThis is a test.',
					),
				).toBeTruthy();
			});
			it('should succeed with new lines in guidelines', () => {
				expect(
					doesTextHaveConsentPrompt(
						'This server uses Answer Overflow to index content on the web.\n\nBy posting in this channel your messages will be indexed on the web to help others find answers.\n\nThis is a test.',
					),
				).toBeTruthy();
			});
		});
		describe('fails', () => {
			it('should fail if the guidelines are empty', () => {
				expect(doesTextHaveConsentPrompt('')).toBeFalsy();
			});
			it('should fail if the guidelines are missing the prompt', () => {
				expect(doesTextHaveConsentPrompt('This is a test.')).toBeFalsy();
			});
			it('should fail if the guidelines are malformed', () => {
				expect(
					doesTextHaveConsentPrompt(
						'This serve uses Answer Overflow to index content on the web. By posting in this channel your messages will be indexed on the web to help others find answers.',
					),
				).toBeFalsy();
			});
		});
	});
});
