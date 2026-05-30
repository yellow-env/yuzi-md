import messageConfig from "../../config/message.config.js";
import chalk from "chalk";

export default {
  name: "Open Group",
  command: ["opengc"],
  category: "group",
  group_only: true,
  description: "Membuka grup (semua anggota bisa kirim pesan)",

  async run(yuzi, msg, { jid, isAdmin, isBotAdmin }) {
    if (!isAdmin) {
      return msg.reply(messageConfig.adminOnly);
    }

    if (!isBotAdmin) {
      return msg.reply(messageConfig.botNotAdmin);
    }

    try {
      await yuzi.groupSettingUpdate(jid, "not_announcement");

      await yuzi.sendMessage(
        jid,
        {
          text: "🔓 Grup telah dibuka. Semua anggota dapat mengirim pesan.",
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error(chalk.red("[-] [OPENGC]"), err);
      msg.reply("❌ Gagal membuka grup");
    }
  },
};
