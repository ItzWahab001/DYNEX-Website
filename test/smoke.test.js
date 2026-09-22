const test = require("node:test");
const assert = require("node:assert/strict");
test("package exposes production start script", () => {
  const pkg = require("../package.json");
  assert.equal(pkg.scripts.start, "node src/server.js");
  assert.ok(pkg.dependencies["connect-pg-simple"]);
});
