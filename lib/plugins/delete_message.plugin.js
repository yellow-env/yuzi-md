import messageConfig from "../../config/message.config.js";
import chalk from "chalk";

export default {
  name: "del",
  command: ["del"],
  category: "group",
  group_only: true,

  async run(yuzi, msg, { jid, isBotAdmin, isGroup, isOwner }) {
    try {
      const context = msg.message?.extendedTextMessage?.contextInfo;

      const key = context?.stanzaId;

      const participant = context?.participant;

      if (!key) {
        return await yuzi.sendMessage(
          jid,
          { text: "Reply pesan yang mau dihapus." },
          { quoted: msg },
        );
      }

      const isFromMe = context?.participant ? false : msg.key.fromMe;

      if (isGroup || !isFromMe) {
        const meta = await yuzi.groupMetadata(jid);

        const me = yuzi.user.id.split(":")[0] + "@s.whatsapp.net";

        const bot = meta.participants.find((p) => p.id === me);

        if (!isBotAdmin) {
          return await yuzi.sendMessage(
            jid,
            {
              text: messageConfig.botNotAdmin,
            },
            { quoted: msg },
          );
        }
      }

      await yuzi.sendMessage(jid, {
        delete: {
          remoteJid: jid,
          id: key,
          participant,
        },
      });
    } catch (e) {
      console.log(chalk.red("[-] [DELETEMSG]"), e);

      await yuzi.sendMessage(jid, {
        text: "Gagal hapus pesan:\n" + e.message,
      });
    }
  },
};
