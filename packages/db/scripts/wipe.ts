import { clearDatabase } from "../src/utils";

void (async () => {
  await clearDatabase();
  console.log("Database wiped successfully");
})();
