import { createUserReceipt } from "../canvas/userReceipt.js";
import messageConfig from "../../config/message.config.js";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFilePath = path.resolve(__dirname, "../../database/users.json");

async function getUserData(number) {
  try {
    const data = await fs.readFile(usersFilePath, "utf8");
    const users = JSON.parse(data);
    return users.find((u) => u.number === number) || null;
  } catch {
    return null;
  }
}

async function getProfilePicture(yuzi, jid) {
  try {
    const ppUrl = await yuzi.profilePictureUrl(jid, "image");
    if (!ppUrl) return null;

    const response = await fetch(ppUrl);
    if (!response.ok) return null;

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export default {
  name: "Canvas User",
  command: ["canvas"],
  category: "tools",

  async run(yuzi, msg, ctx) {
    try {
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderNumber = senderJid?.split("@")[0];
      const participantAlt = msg.key.participantAlt;
      const participantAltNumber = participantAlt
        ? participantAlt.split("@")[0]
        : "-";

      const userData = await getUserData(senderNumber);

      let avatarBuffer = null;

      const jidToTry = [senderNumber + "@s.whatsapp.net", senderJid];

      if (userData?.lid) {
        jidToTry.splice(1, 0, userData.lid);
      }

      if (participantAlt) {
        jidToTry.push(participantAlt);
      }

      for (const jid of jidToTry) {
        avatarBuffer = await getProfilePicture(yuzi, jid);
        if (avatarBuffer) break;
      }

      const user = {
        name: msg.pushName || "Unknown",
        id: senderNumber || "-",
        lid: userData?.lid || "-",
        messageCount: userData?.messageCount || 0,
        phoneNumber: participantAltNumber,
        status: ctx.isOwner ? "OWNER" : "USER",
        avatar: avatarBuffer,
      };

      const buffer = await createUserReceipt(user);

      return yuzi.sendMessage(ctx.jid, {
        image: buffer,
        caption: "User Receipt Generated",
      });
    } catch (err) {
      console.log(chalk.red("[-] [CANVAS]"), err);
      return msg.reply(messageConfig.error || "Terjadi kesalahan");
    }
  },
};
