import messageConfig from "../../config/message.config.js";
import chalk from "chalk";

export default {
  name: "hidetag",
  command: ["hidetag", "ht"],
  group_only: true,
  category: "group",
  description: "Tag semua member secara tersembunyi",

  async run(yuzi, msg, { jid, args, isOwner, isAdmin, isGroup }) {
    try {
      if (!isGroup) {
        return await yuzi.sendMessage(
          jid,
          {
            text: messageConfig.groupOnly,
          },
          { quoted: msg },
        );
      }

      if (!isOwner || !isAdmin) {
        return await yuzi.sendMessage(
          jid,
          {
            text: messageConfig.adminOnly,
          },
          { quoted: msg },
        );
      }

      const metadata = await yuzi.groupMetadata(jid);
      const participants = metadata.participants.map((p) => p.id);

      const context = msg.message?.extendedTextMessage?.contextInfo;

      const quotedText =
        context?.quotedMessage?.conversation ||
        context?.quotedMessage?.extendedTextMessage?.text;

      const directText =
        msg.message?.conversation || msg.message?.extendedTextMessage?.text;

      let text = args.join(" ") || quotedText || directText || " ";
      if (!args) {
        let text = " ";
      }

      await yuzi.sendMessage(jid, {
        text,
        mentions: participants,
      });
    } catch (e) {
      console.log(chalk.red("[-] [HIDETAG]"), e.message);

      await yuzi.sendMessage(
        jid,
        {
          text: "Error:\n" + e.message,
        },
        { quoted: msg },
      );
    }
  },
};
