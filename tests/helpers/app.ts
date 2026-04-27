import { buildApp } from "../../src/app.js";
import { testConfig } from "./config.js";

export function buildTestApp() {
  return buildApp(testConfig.databaseUrl);
}
