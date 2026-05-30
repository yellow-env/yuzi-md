import yts from "yt-search";
import chalk from "chalk";
import botConfig from "../../config/bot.config.js";

const prefix = botConfig.prefix;

export default {
  name: "YT Search",
  command: ["yts", "yt", "ytsearch"],
  category: ["search"],

  async run(yuzi, msg, { jid, args }) {
    const command = args[0];
    const text = args.slice(1).join(" ");

    if (!text) {
      return msg.reply(
        `Masukkan kata kunci pencarian.\nContoh: ${prefix}yts Mario Trailer`,
      );
    }

    await msg.reply(`Sedang mencari hasil untuk: ${text}`);

    try {
      const search = await yts(text);
      const videos = search.videos.slice(0, 5);

      if (!videos.length) {
        return msg.reply(`Tidak ada hasil yang cocok untuk "${text}".`);
      }

      const first = videos[0];

      const caption = [
        `Hasil pencarian YouTube untuk: ${text}\n`,
        ...videos.map(
          (v, i) =>
            `${i + 1}. ${v.title}\n` +
            `Durasi: ${v.timestamp}\n` +
            `Diunggah: ${v.ago}\n` +
            `Views: ${v.views.toLocaleString("id-ID")}\n` +
            `Channel: ${v.author.name}\n` +
            `Link: ${v.url}\n`,
        ),
      ].join("\n");

      await yuzi.sendMessage(
        jid,
        {
          text: caption.trim(),
          contextInfo: {
            externalAdReply: {
              title: first.title,
              body: `Top result untuk ${text}`,
              thumbnailUrl: first.thumbnail,
              sourceUrl: first.url,
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error(chalk.red("[-] [YTSEARCH]"), err);

      msg.reply(`Terjadi kendala saat mengambil data YouTube.\n${err.message}`);
    }
  },
};
