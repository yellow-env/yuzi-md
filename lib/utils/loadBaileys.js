import chalk from "chalk";
import path from "path";
import { pathToFileURL } from "url";
import botConfig from "../../config/bot.config.js";

function normalizeList(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === "string") return [input];
  return [];
}

function isLocal(target) {
  return (
    target.startsWith("./") ||
    target.startsWith("../") ||
    target.endsWith(".js")
  );
}

function resolveSocket(mod) {
  return (
    mod.default || mod.makeWASocket || mod.makeWaSocket || mod.WASocket || null
  );
}

function resolveMessageUtils(mod) {
  return {
    generateWAMessageContent:
      mod.generateWAMessageContent ||
      mod.default?.generateWAMessageContent ||
      null,
    generateWAMessageFromContent:
      mod.generateWAMessageFromContent ||
      mod.default?.generateWAMessageFromContent ||
      null,
    generateWAMessage:
      mod.generateWAMessage || mod.default?.generateWAMessage || null,
    prepareWAMessageMedia:
      mod.prepareWAMessageMedia ||
      mod.default?.prepareWAMessageMedia ||
      null,
  };
}

export default async function loadBaileys() {
  const targets = normalizeList(botConfig.baileys);

  if (!targets.length) {
    throw new Error("No baileys source configured");
  }

  for (const source of targets) {
    try {
      let mod;

      if (isLocal(source)) {
        const full = path.resolve(source);
        mod = await import(pathToFileURL(full).href);
      } else {
        mod = await import(source);
      }

      const makeWASocket = resolveSocket(mod);

      if (!makeWASocket) {
        console.log(chalk.yellow("[!]"), source, "invalid socket export");
        continue;
      }

      console.clear();
      console.log(chalk.green("[+]"), "Loaded:", chalk.cyan(source));
      console.log(chalk.yellow("[*]"), "Loading Plugins...");

      return {
        packageName: source,

        makeWASocket,

        useMultiFileAuthState: mod.useMultiFileAuthState,

        fetchLatestBaileysVersion: mod.fetchLatestBaileysVersion,

        DisconnectReason: mod.DisconnectReason || {},

        downloadMediaMessage: mod.downloadMediaMessage || null,

        jidDecode: mod.jidDecode || null,

        ...resolveMessageUtils(mod),
      };
    } catch (err) {
      console.log(chalk.red("[-]"), "Failed:", source);
    }
  }

  throw new Error("No compatible baileys source loaded");
}
