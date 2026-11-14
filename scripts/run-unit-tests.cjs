const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const directory = join(__dirname, "../.test-build/tests");
const files = readdirSync(directory).filter(name => name.endsWith(".test.js"));
if (files.length === 0) throw new Error("No compiled frontend tests found.");
const result = spawnSync(process.execPath, ["--test", ...files.map(name => join(directory, name))], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
