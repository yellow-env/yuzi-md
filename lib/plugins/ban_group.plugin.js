import messageConfig from "../../config/message.config.js";
import { addBan, isBanned } from "../utils/bannedGroups.js";
import botConfig from "../../config/bot.config.js";

export default {
  name: "Bangroup (Ban Group)",
  command: ["bangroup", "bangc"],
  owner_only: true,
  category: "owner",
  description: "Ban a group (add to banned list). Owner only.",

  async run(yuzi, msg, { jid, isOwner, isGroup, args }) {
    let targetGroup = jid;
    let groupName = "Unknown";

    if (args && args.length > 0) {
      let input = args[0].trim();

      if (input.endsWith("@g.us")) {
        targetGroup = input;
      } else {
        const clean = input.replace(/[^\d]/g, "");
        if (!clean) {
          return msg.reply("ID grup tidak valid.");
        }
        targetGroup = clean + "@g.us";
      }
    } else if (msg.quoted && msg.quoted.isGroup) {
      targetGroup = msg.quoted.key.remoteJid;
    }

    if (!targetGroup.endsWith("@g.us")) {
      return msg.reply("Target harus grup.");
    }

    const alreadyBanned = await isBanned(targetGroup);
    if (alreadyBanned) {
      return msg.reply("🚫 Group already banned.");
    }

    try {
      const metadata = await yuzi.groupMetadata(targetGroup);
      groupName = metadata.subject || "Unknown";
    } catch {
      groupName = targetGroup.split("@")[0];
    }

    const banData = {
      groupId: targetGroup,
      groupName,
      bannedAt: new Date().toISOString(),
      bannedBy: botConfig.ownerNum[0] || "Unknown",
    };

    const result = await addBan(banData);

    if (result.success) {
      await yuzi.sendMessage(
        jid,
        {
          text: `✅ Group banned\n\n`,
        },
        { quoted: msg },
      );
    } else {
      await yuzi.sendMessage(
        jid,
        { text: `❌ ${result.message}` },
        { quoted: msg },
      );
    }
  },
};
