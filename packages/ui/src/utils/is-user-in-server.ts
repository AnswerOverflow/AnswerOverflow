export function isUserInServer(): Promise<'in_server' | 'not_in_server'> {
	return new Promise((resolve) => {
		resolve('in_server');
	});
}
