import { isSnowflakeLarger } from './snowflake';

describe('Snowflake', () => {
	it('should correctly tell if a snowflake is smaller', () => {
		expect(isSnowflakeLarger('1', '2')).toBeFalsy();
	});
	it('should correctly tell if a snowflake is larger', () => {
		expect(isSnowflakeLarger('2', '1')).toBeTruthy();
	});
	it('should correctly tell if a snowflake is equal', () => {
		expect(isSnowflakeLarger('1', '1')).toBeFalsy();
	});
});
