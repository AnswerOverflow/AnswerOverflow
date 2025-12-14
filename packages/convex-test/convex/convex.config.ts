import { defineApp } from "convex/server";
import counter from "../counter/component/convex.config";

const app = defineApp();
app.use(counter);

export default app;
