import botConfig from "../../config/bot.config.js";
import chalk from "chalk";

export default {
  name: "SPREM",
  command: ["sprem"],
  owner_only: true,
  category: "sticker",

  async run(yuzi, msg, { jid, args }) {
    try {
      const m = msg.message;

      const quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        return yuzi.sendMessage(
          jid,
          { text: "- reply sticker" },
          { quoted: msg },
        );
      }

      const type = Object.keys(quoted)[0];

      if (type !== "stickerMessage") {
        return yuzi.sendMessage(
          jid,
          { text: "- reply ke sticker" },
          { quoted: msg },
        );
      }

      const targetJid = args.join(" ") || jid;

      const sticker = quoted.stickerMessage;

      const stickerMessage = {
        stickerMessage: {
          url: sticker.url,
          fileSha256: sticker.fileSha256,
          fileEncSha256: sticker.fileEncSha256,
          mediaKey: sticker.mediaKey,
          mimetype: sticker.mimetype,
          height: sticker.height,
          width: sticker.width,
          directPath: sticker.directPath,
          fileLength: sticker.fileLength,
          mediaKeyTimestamp: sticker.mediaKeyTimestamp,
          isAnimated: sticker.isAnimated || false,
          stickerSentTs: sticker.stickerSentTs || Date.now(),
          isAvatar: sticker.isAvatar || false,
          isAiSticker: sticker.isAiSticker || false,
          isLottie: sticker.isLottie || false,
        },
      };

      await yuzi.relayMessage(targetJid, stickerMessage, {});

      await yuzi.sendMessage(jid, { react: { text: "👍", key: msg.key } });
    } catch (err) {
      console.log(chalk.red("[-] [SPREM]"), err);

      await yuzi.sendMessage(jid, {
        text: "Error:\n" + err.message,
      });
    }
  },
};
