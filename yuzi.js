const originalWrite = process.stdout.write.bind(process.stdout);

process.stdout.write = (chunk, encoding, callback) => {
  const text = chunk?.toString?.() || "";

  if (
    text.includes("Closing session") ||
    text.includes("SessionEntry") ||
    text.includes("currentRatchet") ||
    text.includes("pendingPreKey") ||
    text.includes("[LOG] Emoji") ||
    text.includes("EmojiDB loaded") ||
    text.includes("EmojiDB saved")
  ) {
    return true;
  }

  return originalWrite(chunk, encoding, callback);
};

import chalk from "chalk";
import pino from "pino";
import readlineSync from "readline-sync";
import fs from "fs";

import loadBaileys from "./lib/utils/loadBaileys.js";
import botConfig from "./config/bot.config.js";
import connector from "./connector.js";
import loadPlugins from "./lib/plugins/index.js";
import { startLogger } from "./lib/utils/logger.js";
import { runUpdateChecker } from "./lib/utils/autoUpdater.js";

const Baileys = await loadBaileys();

const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  generateWAMessageContent,
  generateWAMessageFromContent,
  generateWAMessage,
} = Baileys;

import NodeCache from "node-cache";

const groupCache = new NodeCache({
  stdTTL: 5 * 60,
  useClones: false,
});

const SESSION_DIR = `./${botConfig.sessionName}`;

let isStarting = false;
let yuzi = null;
let reconnectAttempts = 0;
let pairingCodeRequested = false;
let hasConnected = false;

const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY = 30000;
const database = JSON.parse(fs.readFileSync("./database/runtime.json"));
import { startBioRuntime } from "./lib/utils/auto_bio.js";

const plugins = await loadPlugins();

console.log(chalk.green("[+]"), `Loaded ${plugins.length} plugins`);

await runUpdateChecker();

function cleanupSocket() {
  if (!yuzi) return;

  try {
    yuzi.ev?.removeAllListeners?.();
    yuzi.ws?.removeAllListeners?.();
    yuzi.ws?.close?.();
    yuzi.end?.();
  } catch {}

  yuzi = null;
}

function getReconnectDelay() {
  const base = Math.min(
    3000 * Math.pow(2, reconnectAttempts),
    MAX_RECONNECT_DELAY,
  );
  const jitter = Math.random() * 500;
  return Math.min(base + jitter, MAX_RECONNECT_DELAY);
}

function isTerminalError(reason) {
  const terminal = [
    DisconnectReason.loggedOut,
    DisconnectReason.forbidden,
    DisconnectReason.badSession,
    DisconnectReason.multideviceMismatch,
    405,
    409,
    412,
  ];
  return terminal.includes(reason);
}

async function startBot() {
  if (isStarting) return;
  isStarting = true;

  try {
    startLogger();
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    const isNewSession = !state?.creds?.registered;

    console.log(chalk.yellow("[*]"), "Connecting...");

    const { version } = await fetchLatestBaileysVersion();

    cleanupSocket();

    yuzi = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      connectTimeoutMs: 60000,
      cachedGroupMetadata: async (jid) => {
        return groupCache.get(jid);
      },
    });

    yuzi.baileys = {
      generateWAMessageContent,
      generateWAMessageFromContent,
      generateWAMessage,
    };

    if (isNewSession && !pairingCodeRequested) {
      pairingCodeRequested = true;

      console.log(chalk.yellow("[?]"), "Masukkan nomor WhatsApp:");
      const phoneNumber = readlineSync.question("=> ");

      setTimeout(async () => {
        try {
          const code = await yuzi.requestPairingCode(phoneNumber);
          console.log(chalk.green("[+]"), "Pairing code:", chalk.yellow(code));
        } catch (err) {
          console.log(chalk.red("[-]"), "Pairing error:", err?.message || err);
        }
      }, 3000);
    }

    yuzi.ev.on("creds.update", saveCreds);

    connector(yuzi, plugins);

    yuzi.ev.on("groups.update", async ([event]) => {
      try {
        const metadata = await yuzi.groupMetadata(event.id);

        groupCache.set(event.id, metadata);
      } catch (err) {
        console.log(chalk.red("[-] groups.update cache error:"), err);
      }
    });

    yuzi.ev.on("group-participants.update", async (event) => {
      try {
        const metadata = await yuzi.groupMetadata(event.id);

        groupCache.set(event.id, metadata);
      } catch (err) {
        console.log(chalk.red("[-] participants.update cache error:"), err);
      }
    });

    yuzi.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        console.log(chalk.yellow("[*]"), "Connecting to WhatsApp...");
      }

      if (connection === "open") {
        hasConnected = true;
        reconnectAttempts = 0;
        console.log(chalk.green("[+]"), "Connected!");
        startBioRuntime(yuzi, database);
        setTimeout(async () => {
          try {
            const rtcPlugin = await import("./lib/plugins/rtc.plugin.js");
            if (rtcPlugin.autoConnectRTC) {
              await rtcPlugin.autoConnectRTC();
            }
          } catch (e) {
            console.log(chalk.red("[-] RTC auto-connect error:"), e.message);
          }
        }, 2000);
        setTimeout(async () => {
          try {
            const { processDueFollowUps } = await import("./lib/utils/aiMemory.js");
            await processDueFollowUps(yuzi);
          } catch (e) {
            console.log(chalk.red("[-] AI follow-up process error:"), e.message);
          }
        }, 4000);
      }

      if (connection === "close") {
        const reason =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.code ||
          lastDisconnect?.error?.statusCode;

        if (reason === DisconnectReason.loggedOut) {
          console.log(chalk.red("[-] Logged Out - resetting session..."));
          pairingCodeRequested = false;
          isStarting = false;
          cleanupSocket();

          try {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
          } catch {}

          setTimeout(startBot, 5000);
          return;
        }

        if (isTerminalError(reason)) {
          console.log(chalk.red("[-] Terminal error:"), reason);
          isStarting = false;
          cleanupSocket();
          return;
        }

        if (!hasConnected) {
          pairingCodeRequested = false;
        }

        isStarting = false;
        cleanupSocket();

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log(chalk.yellow("[!] Reset session due to max retries"));

          try {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
          } catch {}

          reconnectAttempts = 0;
          pairingCodeRequested = false;
          hasConnected = false;
        } else {
          reconnectAttempts += 1;
        }

        const delayMs = getReconnectDelay();

        console.log(
          chalk.yellow(
            `[!] Reconnecting in ${Math.round(delayMs)}ms (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
          ),
        );

        setTimeout(startBot, delayMs);
      }
    });
  } catch (err) {
    console.log(chalk.red("[-] Error:"), err?.message || err);

    isStarting = false;
    cleanupSocket();

    if (!hasConnected) {
      pairingCodeRequested = false;
    }

    const msg = err?.message || "";

    if (
      msg.includes("UNKNOWN") ||
      msg.includes("EBUSY") ||
      msg.includes("EPERM")
    ) {
      setTimeout(startBot, 5000);
      return;
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts = 0;
      setTimeout(startBot, 10000);
      return;
    }

    reconnectAttempts += 1;

    const delayMs = getReconnectDelay();

    console.log(
      chalk.yellow(
        `[!] Restarting in ${Math.round(delayMs)}ms (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
      ),
    );

    setTimeout(startBot, delayMs);
  }
}

startBot();
