import fs from "fs";

const FILE = "./database/runtime.json";

export function getRuntime() {
  return JSON.parse(fs.readFileSync(FILE));
}

export function setRuntime(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
