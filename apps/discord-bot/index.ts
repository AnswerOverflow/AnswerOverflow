import { S3StorageLayer } from "@packages/database/storage";
import { program } from "./src/bot";
import { createAppLayer, runMain } from "./src/core/runtime";

const AppLayer = createAppLayer(S3StorageLayer);

runMain(program, AppLayer);
