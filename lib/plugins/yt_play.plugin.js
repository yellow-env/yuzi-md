import yts from "yt-search";
import chalk from "chalk";
import botConfig from "../../config/bot.config.js";

const prefix = botConfig.prefix;

const POOL_INTERVAL = 5000;
const POLL_MAX_TRIES = 12;

const headers = {
  "accept-encoding": "gzip, deflate, br, zstd",
  origin: "https://ht.flvto.online",
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function flvtoDownload(videoId, format = "mp3") {
  const body = JSON.stringify({
    id: videoId,
    fileType: format,
  });

  for (let i = 0; i < POLL_MAX_TRIES; i++) {
    const res = await fetch("https://ht.flvto.online/converter", {
      method: "POST",
      headers,
      body,
    });

    if (!res.ok) {
      throw new Error(`FLVTO Error ${res.status}`);
    }

    const json = await res.json();

    if (json.status === "ok" || json.status === "success") {
      return json;
    }

    if (json.status === "fail") {
      throw new Error("FLVTO gagal convert");
    }

    await delay(POOL_INTERVAL);
  }

  throw new Error("Timeout convert");
}

export default {
  name: "YouTube Player",
  command: ["ytplay", "ytp", "play"],
  category: "downloader",

  async run(yuzi, msg, { jid, args }) {
    const text = args.join(" ");

    if (!text) {
      return msg.reply(`Masukkan kata kunci.\nContoh: ${prefix}play her`);
    }

    try {
      await yuzi.sendMessage(jid, {
        react: { text: "🔍", key: msg.key },
      });

      const search = await yts(text);
      const videos = search.videos;

      if (!videos.length) {
        return msg.reply("Tidak ada hasil.");
      }

      const v = videos[0];

      if (v.seconds > 600) {
        return msg.reply("Maksimal durasi 10 menit.");
      }

      await yuzi.sendMessage(jid, {
        react: { text: "⏬", key: msg.key },
      });

      // ===== CONVERT VIA FLVTO =====
      const result = await flvtoDownload(v.videoId, "mp3");

      if (!result.link) {
        throw new Error("Link audio tidak ditemukan");
      }

      // ===== DOWNLOAD AUDIO =====
      const audioRes = await fetch(result.link);
      const buffer = Buffer.from(await audioRes.arrayBuffer());

      // ===== SEND AUDIO (FIX FORMAT) =====
      await yuzi.sendMessage(
        jid,
        {
          audio: buffer,
          mimetype: "audio/mpeg",
          fileName: `${result.title || v.title}.mp3`,
          ptt: false,
          contextInfo: {
            externalAdReply: {
              title: v.title,
              body: v.author.name,
              thumbnailUrl: v.thumbnail,
              sourceUrl: `https://youtu.be/${v.videoId}`,
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      console.log(chalk.red("[-] [YT PLAY]"), err);

      await yuzi.sendMessage(jid, {
        react: { text: "❌", key: msg.key },
      });

      msg.reply("Gagal memutar: " + err.message);
    }
  },
};
