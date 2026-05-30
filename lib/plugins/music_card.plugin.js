import axios from "axios";
import botConfig from "../../config/bot.config.js";

const Baileys = await import(botConfig.baileys);
import chalk from "chalk";
const { downloadMediaMessage } = Baileys;

const IMGBB_KEY = process.env.IMGBB_KEY || "f75948785d21c157cc0267fce80cf178";

export default {
  name: "musiccard",
  command: ["musiccard", "mc"],
  category: "maker",

  async run(yuzi, msg, { jid, args }) {
    try {
      const m = msg.message;

      await yuzi.sendMessage(jid, {
        react: { text: "⏳", key: msg.key },
      });

      const input = args.join(" ").split("|");

      let judul = input[0]?.trim();
      let nama = input[1]?.trim();
      let url = input[2]?.trim();

      const quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!url && quoted?.imageMessage) {
        const buffer = await downloadMediaMessage(
          {
            key: msg.key,
            message: quoted,
          },
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

        url = res?.data?.data?.url;
      }

      if (!judul || !nama) {
        return yuzi.sendMessage(
          jid,
          {
            text: "Format:\n.musiccard judul|artist|image_url (opsional)\nAtau reply image",
          },
          { quoted: msg },
        );
      }

      if (!url) {
        return yuzi.sendMessage(
          jid,
          { text: "Masukkan image URL atau reply gambar" },
          { quoted: msg },
        );
      }

      const api = `https://api.nexray.eu.cc/canvas/musiccard?judul=${encodeURIComponent(
        judul,
      )}&nama=${encodeURIComponent(nama)}&image_url=${encodeURIComponent(url)}`;

      const res = await axios.get(api, {
        responseType: "arraybuffer",
      });

      const buffer = Buffer.from(res.data);

      await yuzi.sendMessage(jid, {
        react: { text: "🎧", key: msg.key },
      });

      await yuzi.sendMessage(
        jid,
        {
          image: buffer,
          caption: `🎶 ${judul} - ${nama}`,
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      console.log(chalk.red("[-] [MUSICCARD]"), err);

      await yuzi.sendMessage(jid, {
        react: { text: "❌", key: msg.key },
      });

      await yuzi.sendMessage(
        jid,
        {
          text: "Error:\n" + err.message,
        },
        { quoted: msg },
      );
    }
  },
};
