import axios from "axios";
import chalk from "chalk";
import FormData from "form-data";

export default {
  name: "upscale",
  command: ["upscale", "hd"],
  category: "tools",

  async run(yuzi, msg, { jid, args }) {
    try {
      const m = msg.message;

      let url = args.join(" ").trim();

      const quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;

      await yuzi.sendMessage(jid, {
        react: { text: "⏳", key: msg.key },
      });

      if (!url && quoted?.imageMessage) {
        const { downloadMediaMessage } =
          await import("@whiskeysockets/baileys");

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

        const form = new FormData();
        form.append("file", buffer, {
          filename: "image.jpg",
          contentType: "image/jpeg",
        });

        const upload = await axios.post(
          "https://tmpfiles.org/api/v1/upload",
          form,
          {
            headers: {
              ...form.getHeaders(),
            },
          },
        );

        url = upload.data?.data?.url?.replace(
          "tmpfiles.org/",
          "tmpfiles.org/dl/",
        );
      }

      if (!url) {
        await yuzi.sendMessage(
          jid,
          { text: "Kirim URL atau reply image dulu" },
          { quoted: msg },
        );
        return;
      }

      const api = `https://api.nexray.eu.cc/tools/v4/upscale?url=${encodeURIComponent(url)}&resolusi=4`;

      const res = await axios.get(api, {
        responseType: "arraybuffer",
      });

      const buffer = Buffer.from(res.data);

      await yuzi.sendMessage(jid, {
        react: { text: "⬆️", key: msg.key },
      });

      const caption = args.join(" ").trim() || "✨ Upscale selesai";

      await yuzi.sendMessage(
        jid,
        {
          image: buffer,
          caption,
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      console.log(chalk.red("[-] [UPSCALER V1]"), err);

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
