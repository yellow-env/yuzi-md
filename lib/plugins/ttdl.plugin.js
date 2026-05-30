import axios from "axios";
import messageConfig from "../../config/message.config.js";
import chalk from "chalk";

export default {
  name: "TikTok Downloader",
  command: ["ttdl", "tiktokdownload", "tiktokdl"],
  category: "downloader",
  description: "Download video TikTok HD tanpa watermark",

  async run(yuzi, msg, { jid, args }) {
    const url = args[0];

    if (!url) {
      return msg.reply(
        "Masukkan link TikTok\nContoh: .tt https://vt.tiktok.com/xxxx",
      );
    }

    try {
      await yuzi.sendMessage(jid, {
        react: { text: "⏳", key: msg.key },
      });

      const { data } = await axios.post(
        "https://www.tikwm.com/api/",
        new URLSearchParams({
          url,
          count: "12",
          cursor: "0",
          web: "1",
          hd: "1",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        },
      );

      if (!data?.data) {
        return msg.reply("❌ Gagal mengambil data TikTok");
      }

      const videoUrl = "https://www.tikwm.com" + data.data.play;
      const musicUrl = "https://www.tikwm.com" + data.data.music;

      const caption =
        `🎬 *TikTok Downloader*\n\n` +
        `📌 *Title:* ${data.data.title || "-"}\n` +
        `▶️ Play: ${data.data.play_count}\n` +
        `❤️ Like: ${data.data.digg_count}\n` +
        `💬 Comment: ${data.data.comment_count}`;

      await yuzi.sendMessage(
        jid,
        {
          video: { url: videoUrl },
          caption,
        },
        { quoted: msg },
      );

      try {
        const audioBuffer = await axios.get(musicUrl, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0",
            Referer: "https://www.tikwm.com/",
          },
        });

        await yuzi.sendMessage(
          jid,
          {
            audio: Buffer.from(audioBuffer.data),
            mimetype: "audio/mp4",
          },
          { quoted: msg },
        );
      } catch (err) {
        console.log(chalk.red("[-] [TTDL]", err));
      }

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (e) {
      console.error(chalk.red("[-] [TTDL]"), e);

      await yuzi.sendMessage(jid, {
        react: { text: "❌", key: msg.key },
      });

      msg.reply("❌ Terjadi kesalahan saat download");
    }
  },
};
