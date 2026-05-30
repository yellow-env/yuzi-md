import botConfig from "../../config/bot.config.js";
import chalk from "chalk";

const Baileys = await import(botConfig.baileys);

const getContentType =
  Baileys.getContentType || Baileys.default?.getContentType;

import messageConfig from "../../config/message.config.js";

function getText(m) {
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    ""
  );
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function extractMessage(msg) {
  if (!msg) return null;

  const type = getContentType(msg);

  if (!type) return null;

  if (type === "viewOnceMessage") {
    return extractMessage(msg.viewOnceMessage?.message);
  }

  if (type === "viewOnceMessageV2") {
    return extractMessage(msg.viewOnceMessageV2?.message);
  }

  if (type === "viewOnceMessageV2Extension") {
    return extractMessage(msg.viewOnceMessageV2Extension?.message);
  }

  if (type === "ephemeralMessage") {
    return extractMessage(msg.ephemeralMessage?.message);
  }

  return {
    type,
    message: msg,
  };
}

function applyCaption(message, type, caption) {
  const mediaTypes = ["imageMessage", "videoMessage", "documentMessage"];

  if (mediaTypes.includes(type)) {
    if (message[type]) {
      message[type].caption = caption;
    }
  }

  return message;
}

export default {
  name: "SWGC",
  group_only: true,
  command: ["swgc", "upswgc"],
  category: "group",

  async run(yuzi, msg, { jid, isOwner, isAdmin, isBotAdmin, isGroup }) {
    try {
      const m = msg.message;

      if (!jid.endsWith("@g.us")) {
        return yuzi.sendMessage(
          jid,
          { text: messageConfig.groupOnly },
          { quoted: msg },
        );
      }

      if (!isAdmin || !isOwner) {
        return yuzi.sendMessage(
          jid,
          { text: messageConfig.adminOnly },
          { quoted: msg },
        );
      }

      if (!isBotAdmin) {
        return yuzi.sendMessage(
          jid,
          { text: messageConfig.botNotAdmin },
          { quoted: msg },
        );
      }

      const ct = getContentType(m);

      if (!ct) {
        return yuzi.sendMessage(
          jid,
          { text: "Message tidak valid." },
          { quoted: msg },
        );
      }

      const quotedRaw = m?.[ct]?.contextInfo?.quotedMessage;

      if (!quotedRaw) {
        return yuzi.sendMessage(
          jid,
          { text: "Reply media atau pesan dulu." },
          { quoted: msg },
        );
      }

      const extracted = extractMessage(quotedRaw);

      if (!extracted) {
        return yuzi.sendMessage(
          jid,
          { text: "Media tidak didukung." },
          { quoted: msg },
        );
      }

      const quotedType = extracted.type;

      const supported = [
        "conversation",
        "extendedTextMessage",
        "imageMessage",
        "videoMessage",
        "audioMessage",
        "documentMessage",
        "stickerMessage",
      ];

      if (!supported.includes(quotedType)) {
        return yuzi.sendMessage(
          jid,
          {
            text: `Tipe "${quotedType}" tidak didukung.`,
          },
          { quoted: msg },
        );
      }

      const body = getText(m);
      const args = body.split(" ").slice(1).join(" ").trim();

      let finalCaption = "";

      if (args === "p") {
        finalCaption = "";
      } else if (args) {
        finalCaption = args;
      }

      let messageToSend = clone(extracted.message);

      messageToSend = applyCaption(messageToSend, quotedType, finalCaption);

      let temp = {
        groupStatusMessageV2: {
          message: messageToSend,
        },
      };

      for (let i = 0; i < 5; i++) {
        temp = {
          groupStatusMessageV2: {
            message: temp,
          },
        };
      }

      await yuzi.relayMessage(jid, temp, {});

      await yuzi.sendMessage(jid, {
        react: {
          text: "✅",
          key: msg.key,
        },
      });
    } catch (err) {
      console.log(chalk.red("[-] [SWGC]"), err);

      await yuzi.sendMessage(
        jid,
        {
          text: "Error:\n" + err.message,
        },
        {
          quoted: msg,
        },
      );
    }
  },
};
