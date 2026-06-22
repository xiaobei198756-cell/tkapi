const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = __dirname;
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function commandExists(command, args) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: process.platform === "win32"
  });
  return !result.error && result.status === 0;
}

function resolvePython() {
  if (process.env.PYTHON_BIN) {
    return process.env.PYTHON_BIN;
  }

  const localVenvPython = process.platform === "win32"
    ? path.join(backendDir, ".venv", "Scripts", "python.exe")
    : path.join(backendDir, ".venv", "bin", "python");

  if (fs.existsSync(localVenvPython)) {
    return localVenvPython;
  }

  if (commandExists("python3", ["--version"])) {
    return "python3";
  }

  return "python";
}

run(resolvePython(), ["-m", "pip", "install", "-r", path.join("backend", "requirements.txt")]);
run(process.platform === "win32" ? "npm.cmd" : "npm", ["ci"], { cwd: frontendDir });
run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { cwd: frontendDir });
