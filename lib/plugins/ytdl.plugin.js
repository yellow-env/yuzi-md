import axios from "axios";
import chalk from "chalk";
import botConfig from "../../config/bot.config.js";

const prefix = botConfig.prefix;

export default {
  name: "YouTube Downloader",
  command: ["ytdl"],
  category: "downloader",

  async run(yuzi, msg, { jid, args }) {
    const url = args[0];
    const format = args[1] || "720";

    if (!url) {
      return msg.reply(
        `Contoh:\n` +
          `${prefix}ytdl https://youtu.be/xxxx\n` +
          `${prefix}ytdl https://youtu.be/xxxx 1080\n` +
          `${prefix}ytdl https://youtu.be/xxxx 720\n` +
          `${prefix}ytdl https://youtu.be/xxxx 360\n` +
          `${prefix}ytdl https://youtu.be/xxxx mp3`,
      );
    }

    try {
      await yuzi.sendMessage(jid, {
        react: {
          text: "⏬",
          key: msg.key,
        },
      });

      const api = `https://apis.snowping.eu.cc/api/downloader/youtube?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format)}`;

      const { data } = await axios.get(api);

      if (!data?.result?.download?.url) {
        throw new Error("Link download tidak ditemukan");
      }

      const info = data.result.video;
      const download = data.result.download;

      const mediaRes = await fetch(download.url);
      const buffer = Buffer.from(await mediaRes.arrayBuffer());

      if (format === "mp3") {
        await yuzi.sendMessage(
          jid,
          {
            audio: buffer,
            mimetype: download.mimetype || "audio/mpeg",
            fileName: `${info.title}.mp3`,
            ptt: false,
            contextInfo: {
              externalAdReply: {
                title: info.title,
                body: download.size,
                thumbnailUrl: info.thumbnail,
                sourceUrl: url,
                mediaType: 1,
                renderLargerThumbnail: true,
              },
            },
          },
          {
            quoted: msg,
          },
        );
      } else {
        await yuzi.sendMessage(
          jid,
          {
            video: buffer,
            mimetype: download.mimetype || "video/mp4",
            fileName: `${info.title}.mp4`,
            caption:
              `*${info.title}*\n\n` +
              `• Format: ${download.format}\n` +
              `• Size: ${download.size}`,
            contextInfo: {
              externalAdReply: {
                title: info.title,
                body: download.size,
                thumbnailUrl: info.thumbnail,
                sourceUrl: url,
                mediaType: 1,
                renderLargerThumbnail: true,
              },
            },
          },
          {
            quoted: msg,
          },
        );
      }

      await yuzi.sendMessage(jid, {
        react: {
          text: "✅",
          key: msg.key,
        },
      });
    } catch (err) {
      console.log(chalk.red("[-] [YTDL]"), err);

      await yuzi.sendMessage(jid, {
        react: {
          text: "❌",
          key: msg.key,
        },
      });

      msg.reply(`Gagal download.\n${err.message}`);
    }
  },
};
