const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = __dirname;
const backendDir = path.join(rootDir, "backend");
const port = process.env.PORT || "8000";

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

  return process.platform === "win32" ? "python" : "python3";
}

const uvicorn = spawn(
  resolvePython(),
  ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port],
  {
    cwd: backendDir,
    env: process.env,
    stdio: "inherit"
  }
);

uvicorn.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
