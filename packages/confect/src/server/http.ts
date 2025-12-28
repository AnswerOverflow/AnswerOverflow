import {
  type HttpApi as EffectHttpApi,
  type HttpRouter as EffectHttpRouter,
  HttpApiBuilder,
  HttpApiScalar,
  type HttpApp,
  HttpServer,
} from "@effect/platform";
import {
  type GenericActionCtx,
  type HttpRouter,
  httpActionGeneric,
  httpRouter,
  ROUTABLE_HTTP_METHODS,
  type RouteSpecWithPathPrefix,
} from "convex/server";
import { Array, Layer, pipe, Record } from "effect";
import { ConfectActionCtx, makeConfectActionCtx } from "./ctx";
import type {
  DataModelFromConfectDataModel,
  GenericConfectDataModel,
} from "./data-model";

type Middleware = (
  httpApp: HttpApp.Default,
) => HttpApp.Default<
  never,
  | EffectHttpApi.Api
  | HttpApiBuilder.Router
  | EffectHttpRouter.HttpRouter.DefaultServices
>;

const makeHandler =
  <ConfectDataModel extends GenericConfectDataModel>({
    pathPrefix,
    apiLive,
    middleware,
    scalar,
  }: {
    pathPrefix: RoutePath;
    apiLive: Layer.Layer<EffectHttpApi.Api, never, ConfectActionCtx<any>>;
    middleware?: Middleware;
    scalar?: HttpApiScalar.ScalarConfig;
  }) =>
  (
    ctx: GenericActionCtx<DataModelFromConfectDataModel<ConfectDataModel>>,
    request: Request,
  ): Promise<Response> => {
    const ConfectActionCtxLive = Layer.succeed(
      ConfectActionCtx<any>(),
      makeConfectActionCtx(ctx),
    );

    const ApiLive = apiLive.pipe(Layer.provide(ConfectActionCtxLive));

    const ApiDocsLive = HttpApiScalar.layer({
      path: `${pathPrefix}docs`,
      scalar: {
        baseServerURL: `${
          // biome-ignore lint/complexity/useLiteralKeys: TS says this must be accessed with a string literal
          process.env["CONVEX_SITE_URL"]
        }${pathPrefix}`,
        ...scalar,
      },
    }).pipe(Layer.provide(ApiLive));

    const EnvLive = Layer.mergeAll(
      ApiLive,
      ApiDocsLive,
      HttpServer.layerContext,
    );

    const { handler } = HttpApiBuilder.toWebHandler(EnvLive, { middleware });

    return handler(request);
  };

const makeHttpAction = ({
  pathPrefix,
  apiLive,
  middleware,
  scalar,
}: {
  pathPrefix: RoutePath;
  apiLive: Layer.Layer<EffectHttpApi.Api, never, ConfectActionCtx<any>>;
  middleware?: Middleware;
  scalar?: HttpApiScalar.ScalarConfig;
}) =>
  httpActionGeneric(makeHandler({ pathPrefix, apiLive, middleware, scalar }));

export type HttpApi = {
  apiLive: Layer.Layer<EffectHttpApi.Api, never, ConfectActionCtx<any>>;
  middleware?: Middleware;
  scalar?: HttpApiScalar.ScalarConfig;
};

export type RoutePath = "/" | `/${string}/`;

const mountEffectHttpApi =
  ({
    pathPrefix,
    apiLive,
    middleware,
    scalar,
  }: {
    pathPrefix: RoutePath;
    apiLive: Layer.Layer<EffectHttpApi.Api, never, ConfectActionCtx<any>>;
    middleware?: Middleware;
    scalar?: HttpApiScalar.ScalarConfig;
  }) =>
  (convexHttpRouter: HttpRouter): HttpRouter => {
    const handler = makeHttpAction({ pathPrefix, apiLive, middleware, scalar });

    Array.forEach(ROUTABLE_HTTP_METHODS, (method) => {
      const routeSpec: RouteSpecWithPathPrefix = {
        pathPrefix,
        method,
        handler,
      };
      convexHttpRouter.route(routeSpec);
    });

    return convexHttpRouter;
  };

type HttpApis = Partial<Record<RoutePath, HttpApi>>;

const makeHttpRouter = (httpApis: HttpApis): HttpRouter => {
  applyMonkeyPatches();

  return pipe(
    httpApis as Record<RoutePath, HttpApi>,
    Record.toEntries,
    Array.reduce(
      httpRouter(),
      (convexHttpRouter, [pathPrefix, { apiLive, middleware }]) =>
        mountEffectHttpApi({
          pathPrefix: pathPrefix as RoutePath,
          apiLive,
          middleware,
        })(convexHttpRouter),
    ),
  );
};

const applyMonkeyPatches = () => {
  // These are necessary until the Convex runtime supports these APIs. See https://discord.com/channels/1019350475847499849/1281364098419785760

  // biome-ignore lint/suspicious/noGlobalAssign: See above note.
  URL = class extends URL {
    override get username() {
      return "";
    }
    override get password() {
      return "";
    }
  };

  Object.defineProperty(Request.prototype, "signal", {
    get: () => new AbortSignal(),
  });
};

export { makeHttpRouter };
