import axios from "axios";
import messageConfig from "../../config/message.config.js";
import chalk from "chalk";

export default {
  name: "Text To Speech",
  command: ["tts", "texttospeech"],
  category: "tools",
  description: "Ubah teks jadi suara",

  async run(yuzi, msg, { jid, args }) {
    const text = args.join(" ");

    if (!text) {
      return msg.reply("Contoh: .tts halo dunia");
    }

    const wordCount = text.trim().split(/\s+/).length;

    if (wordCount > 200) {
      return msg.reply("Maksimal 200 kata.");
    }

    try {
      await yuzi.sendMessage(jid, {
        react: { text: "⏳", key: msg.key },
      });

      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        text,
      )}&tl=id&client=tw-ob`;

      const audioBuffer = await axios.get(ttsUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      await yuzi.sendMessage(
        jid,
        {
          audio: Buffer.from(audioBuffer.data),
          mimetype: "audio/mpeg",
          ptt: true,
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (e) {
      console.error(chalk.red("[-] [TEXT TO SPEECH]"), e);

      await yuzi.sendMessage(jid, {
        react: { text: "❌", key: msg.key },
      });

      msg.reply("❌ Terjadi kesalahan saat generate suara");
    }
  },
};
