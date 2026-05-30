import messageConfig from "../../config/message.config.js";
import { removeBan } from "../utils/bannedGroups.js";
import chalk from "chalk";

export default {
  name: "Unbangroup (Unban Group)",
  command: ["unbangroup", "unbangc"],
  category: "owner",
  owner_only: true,
  description: "Unban a group (remove from banned list). Owner only.",

  async run(yuzi, msg, { jid, isOwner, isGroup }) {
    let targetGroup = jid;

    if (msg.quoted && msg.quoted.isGroup) {
      targetGroup = msg.quoted.key.remoteJid;
    }

    if (msg.args && msg.args.length > 0) {
      const arg = msg.args.join(" ");
      if (arg.includes("@g.us")) {
        targetGroup = arg.trim();
      } else {
        const cleanArg = arg.replace(/[^\w\-]/g, "");
        if (cleanArg) {
          targetGroup = cleanArg + "@g.us";
        }
      }
    }

    const result = await removeBan(targetGroup);

    if (result.success) {
      await yuzi.sendMessage(
        jid,
        {
          text: `✅ Group unbanned\n\n`,
        },
        { quoted: msg },
      );
    } else {
      await yuzi.sendMessage(
        jid,
        {
          text: `❌ ${result.message}`,
        },
        { quoted: msg },
      );
    }
  },
};
