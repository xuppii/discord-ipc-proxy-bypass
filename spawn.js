import { spawn } from "child_process";

const electronProcess = spawn("npx", ["electron", "electronTest.js"], {
    stdio: "inherit",
    shell: true
  });