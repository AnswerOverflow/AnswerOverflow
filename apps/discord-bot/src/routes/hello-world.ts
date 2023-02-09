import { ApplyOptions } from "@sapphire/decorators";
import { ApiRequest, ApiResponse, methods, Route } from "@sapphire/plugin-api";

@ApplyOptions<Route.Options>({ route: "hello-world" })
export class UserRoute extends Route {
  public [methods.GET](_: ApiRequest, response: ApiResponse) {
    response.json({ message: "Hello World" });
  }

  public [methods.POST](_: ApiRequest, response: ApiResponse) {
    response.json({ message: "Hello World" });
  }
}
