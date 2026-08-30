console.log("Checking repository...");
await import("./check-repository.mjs");

console.log("Running tests...");
await import("../tests/run-tests.mjs");

console.log("Building unpacked extension...");
await import("./build.mjs");
