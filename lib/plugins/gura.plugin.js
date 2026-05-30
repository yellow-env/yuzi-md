import axios from "axios";
import botConfig from "../../config/bot.config.js";

const Baileys = await import(botConfig.baileys);
const { downloadMediaMessage } = Baileys;
import chalk from "chalk";

const IMGBB_KEY = process.env.IMGBB_KEY || "f75948785d21c157cc0267fce80cf178";

export default {
  name: "gura",
  command: ["gura"],
  category: "maker",

  async run(yuzi, msg, { jid, args }) {
    try {
      const m = msg.message;

      let url = args.join(" ").trim();

      const context = m?.extendedTextMessage?.contextInfo;
      const quoted = context?.quotedMessage;

      await yuzi.sendMessage(jid, {
        react: { text: "⏳", key: msg.key },
      });

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

      if (!url) {
        return yuzi.sendMessage(
          jid,
          { text: "Kirim URL atau reply image dulu" },
          { quoted: msg },
        );
      }

      const api = `https://api.nexray.eu.cc/canvas/gura?url=${encodeURIComponent(url)}`;

      const res = await axios.get(api, {
        responseType: "arraybuffer",
      });

      const buffer = Buffer.from(res.data);

      await yuzi.sendMessage(jid, {
        react: { text: "✨", key: msg.key },
      });

      await yuzi.sendMessage(
        jid,
        {
          image: buffer,
          caption: args.join(" ").trim() || "Success ✨",
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      console.log(chalk.red("[-] [GURA MAKER]"), err);

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
