import messageConfig from "../../config/message.config.js";
import chalk from "chalk";

export default {
  name: "Close Group",
  command: ["closegc"],
  group_only: true,
  category: "group",
  description: "Menutup grup (hanya admin bisa kirim pesan)",

  async run(yuzi, msg, { jid, isAdmin, isBotAdmin }) {
    if (!isAdmin) {
      return msg.reply(messageConfig.adminOnly);
    }

    if (!isBotAdmin) {
      return msg.reply(messageConfig.botNotAdmin);
    }

    try {
      await yuzi.groupSettingUpdate(jid, "announcement");

      await yuzi.sendMessage(
        jid,
        {
          text: "🔒 Grup telah ditutup. Hanya admin yang dapat mengirim pesan.",
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error(chalk.red("[-] [CLOSEGC]"), err);
      msg.reply("❌ Gagal menutup grup");
    }
  },
};
