import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function loadPlugins() {
  try {
    const files = fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith(".plugin.js"));

    const plugins = [];

    for (const file of files) {
      try {
        const mod = await import(pathToFileURL(path.join(__dirname, file)).href);

        if (mod?.default) {
          plugins.push(mod.default);
        }
      } catch (e) {
        console.log("Plugin load error:", file, e.message);
      }
    }

    return plugins;
  } catch (error) {
    console.error("Failed to load plugins:", error.message);
    return []; // Return empty array on failure to prevent iteration errors
  }
}
