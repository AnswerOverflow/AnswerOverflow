import { ApplyOptions } from '@sapphire/decorators';
import { ApiRequest, ApiResponse, methods, Route } from '@sapphire/plugin-api';

@ApplyOptions<Route.Options>({ route: 'ping' })
export class UserRoute extends Route {
	public [methods.GET](_: ApiRequest, response: ApiResponse) {
		response.json({ message: 'Pong!' });
	}
}
