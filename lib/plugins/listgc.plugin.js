import messageConfig from "../../config/message.config.js";
import { isBanned } from "../utils/bannedGroups.js";
import chalk from "chalk";

export default {
  name: "List Groups",
  command: ["listgc"],
  owner_only: true,
  category: "owner",
  description: "Menampilkan daftar semua grup tempat bot berada.",

  async run(yuzi, msg, { jid }) {
    try {
      const groups = await yuzi.groupFetchAllParticipating();
      const groupList = Object.values(groups);

      if (groupList.length === 0) {
        return msg.reply("❌ Bot tidak berada di dalam grup manapun.");
      }

      let message = "📝 *Daftar Grup Bot*\n";
      message += `_Total: ${groupList.length} grup_\n\n`;

      for (let i = 0; i < groupList.length; i++) {
        const group = groupList[i];
        const groupName = group.subject || "Unknown";
        const groupDesc = group.desc
          ? group.desc.slice(0, 50) + "..."
          : "Tidak ada deskripsi";
        const members = group.participants?.length || 0;
        const banned = await isBanned(group.id);
        const banBadge = banned ? " 🚫 [BANNED]" : "";

        message += `${i + 1}. *${groupName}*${banBadge}\n`;
        message += `   🆔 ${group.id}\n`;
        message += `   👥 ${members} anggota\n`;
        message += `   📄 ${groupDesc}\n\n`;
      }

      await yuzi.sendMessage(
        jid,
        {
          text: message,
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error(chalk.red("[-] [LISTGC]"), err);
      msg.reply("❌ Gagal mengambil daftar grup");
    }
  },
};
