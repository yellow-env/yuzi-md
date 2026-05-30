import prefix from "../../config/bot.config.js";
import messageConfig from "../../config/message.config.js";
import botConfig from "../../config/bot.config.js";
const Baileys = await import(botConfig.baileys);
import chalk from "chalk";
const { downloadContentFromMessage } = Baileys;

export default {
  package: "RVO - Retrieve Replied Image/Video",
  command: ["rvo"],
  owner_only: true,
  description: "Retrieve replied view once image/video",
  category: "tools",

  async run(yuzi, msg, { jid, isAdmin, isOwner, isGroup }) {
    if (!isGroup) return msg.reply(messageConfig.groupOnly);

    try {
      const context = msg.message?.extendedTextMessage?.contextInfo;
      let quoted = context?.quotedMessage;

      if (!quoted) {
        return msg.reply(
          `*❌ ERROR:*\n\nReply pesan View Once dengan ${prefix}rvo`,
        );
      }

      await yuzi.sendPresenceUpdate("composing", jid);

      const voKey = Object.keys(quoted).find((key) =>
        key.toLowerCase().includes("viewonce"),
      );

      if (voKey) {
        quoted = quoted[voKey].message;
      }

      const mediaType = Object.keys(quoted).find(
        (key) => key === "imageMessage" || key === "videoMessage",
      );

      if (!mediaType) {
        return msg.reply("❌ Reply gambar / video View Once.");
      }

      const media = quoted[mediaType];
      const caption = media.caption || "";

      const stream = await downloadContentFromMessage(
        media,
        mediaType === "imageMessage" ? "image" : "video",
      );

      let buffer = Buffer.from([]);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (mediaType === "imageMessage") {
        await yuzi.sendMessage(
          jid,
          { image: buffer, caption },
          { quoted: msg },
        );
      } else {
        await yuzi.sendMessage(
          jid,
          { video: buffer, caption },
          { quoted: msg },
        );
      }

      await yuzi.sendPresenceUpdate("paused", jid);
    } catch (err) {
      console.error(chalk.red("[-] [READ VIEW ONCE]"), err);
      msg.reply(`Error: ${err.message}`);
    }
  },
};
