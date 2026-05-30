import fs from "fs";
import path from "path";
import chalk from "chalk";

let downloadMediaMessage = null;

async function loadHelper() {
  if (downloadMediaMessage) return downloadMediaMessage;

  try {
    const mod = await import("@whiskeysockets/baileys");
    downloadMediaMessage = mod.downloadMediaMessage;
    return downloadMediaMessage;
  } catch (err) {
    console.log(chalk.red("Failed loading baileys helper:"), err.message);
    return null;
  }
}

function unwrapMessage(message = {}) {
  let current = message;

  while (current) {
    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }

    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }

    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }

    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }

    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }

    break;
  }

  return current;
}

function getMediaInfo(message = {}) {
  if (message.imageMessage) {
    return {
      type: "image",
      ext: "jpg",
    };
  }

  if (message.videoMessage) {
    return {
      type: "video",
      ext: "mp4",
    };
  }

  if (message.audioMessage) {
    return {
      type: "audio",
      ext: message.audioMessage.ptt ? "ogg" : "mp3",
    };
  }

  if (message.stickerMessage) {
    return {
      type: "sticker",
      ext: "webp",
    };
  }

  if (message.documentMessage) {
    return {
      type: "document",
      ext:
        message.documentMessage.fileName?.split(".")?.pop()?.toLowerCase() ||
        "dat",
    };
  }

  return null;
}

export default async function saveMedia(yuzi, msg) {
  try {
    if (!msg?.message) return null;

    const unwrapped = unwrapMessage(msg.message);
    const mediaInfo = getMediaInfo(unwrapped);

    if (!mediaInfo) {
      return null;
    }

    const dir = "./tmp";

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(
      dir,
      `${Date.now()}-${Math.floor(Math.random() * 10000)}.${mediaInfo.ext}`,
    );

    const dl = await loadHelper();

    if (!dl) {
      console.log(chalk.red("downloadMediaMessage helper not found"));
      return null;
    }

    let buffer;

    try {
      buffer = await dl(
        msg,
        "buffer",
        {},
        {
          reuploadRequest: yuzi?.updateMediaMessage,
        },
      );
    } catch (err) {
      console.log(chalk.yellow("Media download failed:"), err.message);
      return null;
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      console.log(chalk.yellow("Downloaded media buffer is empty"));
      return null;
    }

    fs.writeFileSync(filePath, buffer);

    console.log(
      chalk.cyan("[") + chalk.yellow("*") + chalk.cyan("]"),
      chalk.green("Media saved:"),
      chalk.white(filePath),
    );

    return filePath;
  } catch (err) {
    console.log(chalk.red("[ERROR] Save Media:"), err.message);

    return null;
  }
}
