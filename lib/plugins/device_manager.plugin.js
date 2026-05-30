import chalk from "chalk";
import fs from "fs";
import path from "path";
import pino from "pino";
import loadBaileys from "../../lib/utils/loadBaileys.js";

process.on("unhandledRejection", console.error);

process.on("uncaughtException", console.error);

const Baileys = await loadBaileys();

const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = Baileys;

const DEVICE_DIR = "./sub_yuzi_sessions";

if (!fs.existsSync(DEVICE_DIR)) {
  fs.mkdirSync(DEVICE_DIR, {
    recursive: true,
  });
}

const activeSockets = new Map();

const deviceStatus = new Map();

async function waitForSocketReady(sock, timeout = 30000) {
  return new Promise((resolve, reject) => {
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;

      done = true;

      reject(new Error("Socket ready timeout"));
    }, timeout);

    sock.ev.on("connection.update", (update) => {
      const { receivedPendingNotifications, connection } = update;

      if (connection === "connecting" && receivedPendingNotifications) {
        if (done) return;

        done = true;

        clearTimeout(timer);

        resolve(true);
      }
    });
  });
}

function sessionExists(number) {
  const sessionPath = path.join(DEVICE_DIR, number);

  if (!fs.existsSync(sessionPath)) {
    return false;
  }

  const files = fs.readdirSync(sessionPath);

  return files.length > 0;
}

async function connectDevice(number, edit) {
  if (activeSockets.has(number)) {
    throw new Error("Device already active.");
  }

  if (sessionExists(number)) {
    throw new Error("Device session already exists.");
  }

  const sessionPath = path.join(DEVICE_DIR, number);

  fs.mkdirSync(sessionPath, {
    recursive: true,
  });

  deviceStatus.set(number, "connecting");

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const { version } = await fetchLatestBaileysVersion();

  const subYuzi = makeWASocket({
    version,
    auth: state,

    logger: pino({
      level: "silent",
    }),

    printQRInTerminal: false,

    browser: ["Ubuntu", "Chrome", "20.0.04"],

    connectTimeoutMs: 60000,

    defaultQueryTimeoutMs: 60000,

    keepAliveIntervalMs: 10000,

    syncFullHistory: false,

    markOnlineOnConnect: false,

    emitOwnEvents: false,

    fireInitQueries: true,

    generateHighQualityLinkPreview: false,

    retryRequestDelayMs: 250,

    maxMsgRetryCount: 5,

    qrTimeout: 60000,
  });

  subYuzi.ev.on("creds.update", saveCreds);

  subYuzi.ws.on("CB:stream:error", () => {});

  subYuzi.ws.on("ws-close", () => {});

  activeSockets.set(number, {
    yuzi: subYuzi,
    sessionPath,
  });

  subYuzi.ev.on("connection.update", async (update) => {
    try {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") {
        console.log(chalk.yellow("[*] [DEVICE]"), `${number} connecting`);
      }

      if (connection === "open") {
        console.log(chalk.green("[+] [DEVICE]"), `${number} connected`);

        deviceStatus.set(number, "active");

        try {
          await edit("Device connected successfully.");
        } catch {}
      }

      if (connection === "close") {
        const reason =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.code;

        console.log(
          chalk.red("[-] [DEVICE]"),
          `${number} disconnected: ${reason}`,
        );

        activeSockets.delete(number);

        if (reason === DisconnectReason.loggedOut) {
          deviceStatus.set(number, "inactive");

          try {
            fs.rmSync(sessionPath, {
              recursive: true,
              force: true,
            });
          } catch {}
        } else {
          deviceStatus.set(number, "error");
        }
      }
    } catch (err) {
      console.log("[DEVICE EVENT ERROR]", err);

      deviceStatus.set(number, "error");
    }
  });

  await waitForSocketReady(subYuzi);

  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const code = await subYuzi.requestPairingCode(number);

    await edit("**Your Pairing code:*");

    return code;
  } catch (err) {
    deviceStatus.set(number, "error");

    activeSockets.delete(number);

    try {
      subYuzi.ev.removeAllListeners();

      subYuzi.ws.close();

      subYuzi.end?.();
    } catch {}

    try {
      fs.rmSync(sessionPath, {
        recursive: true,
        force: true,
      });
    } catch {}

    throw new Error("Failed request pairing code: " + err.message);
  }
}

async function disconnectDevice(number) {
  const data = activeSockets.get(number);

  const sessionPath = path.join(DEVICE_DIR, number);

  if (data?.yuzi) {
    try {
      data.yuzi.ev.removeAllListeners();

      data.yuzi.ws.close();

      data.yuzi.end?.();
    } catch {}
  }

  activeSockets.delete(number);

  deviceStatus.set(number, "inactive");

  try {
    fs.rmSync(sessionPath, {
      recursive: true,
      force: true,
    });
  } catch {}

  return true;
}

function getDeviceList() {
  const folders = fs
    .readdirSync(DEVICE_DIR, {
      withFileTypes: true,
    })
    .filter((f) => f.isDirectory())
    .map((f) => f.name);

  return folders.map((num) => ({
    number: num,

    status:
      deviceStatus.get(num) || (activeSockets.has(num) ? "active" : "inactive"),
  }));
}

export default {
  name: "Device Manager",

  command: ["device"],

  category: "owner",

  admin_only: true,

  async run(yuzi, msg, { jid, args, isOwner }) {
    try {
      if (!isOwner) {
        return;
      }

      const action = args[0];

      const number = args[1]?.replace(/[^0-9]/g, "");

      if (!action) {
        return await yuzi.sendMessage(
          jid,
          {
            text:
              ".device --connect <number>\n" +
              ".device --disconnect <number>\n" +
              ".device --list",
          },
          {
            quoted: msg,
          },
        );
      }

      if (action === "--connect") {
        if (!number) {
          return await yuzi.sendMessage(
            jid,
            {
              text: "Masukkan nomor.",
            },
            {
              quoted: msg,
            },
          );
        }

        if (activeSockets.has(number) || sessionExists(number)) {
          return await yuzi.sendMessage(
            jid,
            {
              text: "Device already exists.",
            },
            {
              quoted: msg,
            },
          );
        }

        await msg.react("⏳");

        const sent = await yuzi.sendMessage(
          jid,
          {
            text: "Preparing device connection...",
          },
          {
            quoted: msg,
          },
        );

        const code = await connectDevice(number, async (newText) => {
          await yuzi.sendMessage(jid, {
            text: newText,
            edit: sent.key,
          });
        });

        await yuzi.sendMessage(
          jid,
          {
            text: `\`\`\`${code}\`\`\``,
          },
          {
            quoted: msg,
          },
        );

        await msg.react("✅");

        return;
      }

      if (action === "--disconnect") {
        if (!number) {
          return await yuzi.sendMessage(
            jid,
            {
              text: "Masukkan nomor.",
            },
            {
              quoted: msg,
            },
          );
        }

        await msg.react("⏳");

        await disconnectDevice(number);

        await msg.react("✅");

        return await yuzi.sendMessage(
          jid,
          {
            text: "Device disconnected.",
          },
          {
            quoted: msg,
          },
        );
      }

      if (action === "--list") {
        const devices = getDeviceList();

        const text = devices.length
          ? devices
              .map((d, i) => `${i + 1}. ${d.number} - ${d.status}`)
              .join("\n")
          : "Tidak ada device.";

        return await yuzi.sendMessage(
          jid,
          {
            text: "Connected Devices:\n\n" + text,
          },
          {
            quoted: msg,
          },
        );
      }

      return await yuzi.sendMessage(
        jid,
        {
          text: "Unknown option.",
        },
        {
          quoted: msg,
        },
      );
    } catch (e) {
      console.log(chalk.red("[-] [DEVICE MANAGER]"), e.message);

      try {
        await msg.react("❌");
      } catch {}

      await yuzi.sendMessage(
        jid,
        {
          text: "Error:\n" + e.message,
        },
        {
          quoted: msg,
        },
      );
    }
  },
};
