import axios from "axios";
import botConfig from "../../config/bot.config.js";
const Baileys = await import(botConfig.baileys);
const { downloadMediaMessage } = Baileys;
import chalk from "chalk";
import messageConfig from "../../config/message.config.js";

const IMGBB_KEY = process.env.IMGBB_KEY || "f75948785d21c157cc0267fce80cf178";

export default {
  name: "ImgToUrl",
  command: ["imgtourl", "tourl"],
  category: "tools",
  description: "Upload image ke imgbb dan ambil URL",

  async run(yuzi, msg, { jid }) {
    const context = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = context?.quotedMessage;

    if (!quoted || !quoted.imageMessage) {
      return msg.reply("Reply gambar dengan perintah .imgtourl");
    }

    try {
      const fullMessage = {
        key: msg.key,
        message: quoted,
      };

      const buffer = await downloadMediaMessage(
        fullMessage,
        "buffer",
        {},
        {
          logger: undefined,
          reuploadRequest: yuzi.updateMediaMessage,
        },
      );

      const base64 = buffer.toString("base64");

      const params = new URLSearchParams();
      params.append("key", IMGBB_KEY);
      params.append("image", base64);

      const res = await axios.post("https://api.imgbb.com/1/upload", params);

      const url = res?.data?.data?.url;

      if (!url) {
        return msg.reply("Gagal upload gambar");
      }

      await msg.reply(`URL Image:\n${url}`);

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      console.error(chalk.red("[-] [IMGTOURL]"), err);
      msg.reply("❌ Terjadi kesalahan saat upload gambar");
    }
  },
};
