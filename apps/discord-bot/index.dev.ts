import { ConvexStorageLayer } from "@packages/database/storage";
import { program } from "./src/bot";
import { createAppLayer, runMain } from "./src/core/runtime";

const AppLayer = createAppLayer(ConvexStorageLayer);

runMain(program, AppLayer);
