import axios from "axios";
import chalk from "chalk";

async function ApiData(url) {
  const res = await axios.get(
    `https://api.nexray.eu.cc/downloader/v2/instagram?url=${encodeURIComponent(url)}`,
  );
  return res.data;
}

export default {
  name: "Instagram Downloader",
  command: ["ig", "igdl", "instagram", "instadl"],
  category: "downloader",

  async run(yuzi, msg, { jid, args }) {
    try {
      const url = args[0];

      if (!url || !url.includes("instagram.com")) {
        await yuzi.sendMessage(
          jid,
          { text: "Kirim link Instagram yang valid." },
          { quoted: msg },
        );
        return;
      }

      await yuzi.sendMessage(jid, {
        react: { text: "⏳", key: msg.key },
      });

      const data = await ApiData(url);

      if (!data?.status) {
        await yuzi.sendMessage(jid, {
          react: { text: "❌", key: msg.key },
        });

        return yuzi.sendMessage(
          jid,
          {
            text: "Gagal ambil data Instagram.",
          },
          { quoted: msg },
        );
      }

      const res = data.result;

      const caption =
        `✨ Instagram Downloader\n` +
        `👤 ${res.username}\n` +
        `📝 ${res.title?.slice(0, 200) || "-"}\n` +
        `❤️ ${res.likes || 0} Likes`;

      if (res.media?.length === 1 && res.media[0]?.url?.includes(".mp4")) {
        await yuzi.sendMessage(jid, {
          react: { text: "⬇️", key: msg.key },
        });

        await yuzi.sendMessage(
          jid,
          {
            video: { url: res.media[0].url },
            caption,
          },
          { quoted: msg },
        );

        await yuzi.sendMessage(jid, {
          react: { text: "✅", key: msg.key },
        });

        return;
      }

      if (res.media?.length) {
        await yuzi.sendMessage(jid, {
          react: { text: "⬇️", key: msg.key },
        });

        for (let i = 0; i < res.media.length; i++) {
          await yuzi.sendMessage(
            jid,
            {
              image: { url: res.media[i].url },
              caption: i === 0 ? caption : "",
            },
            { quoted: msg },
          );
        }

        await yuzi.sendMessage(jid, {
          react: { text: "✅", key: msg.key },
        });

        return;
      }

      await yuzi.sendMessage(jid, {
        react: { text: "⚠️", key: msg.key },
      });

      await yuzi.sendMessage(
        jid,
        { text: "Tidak ada media ditemukan." },
        { quoted: msg },
      );
    } catch (err) {
      console.log(chalk.red("[-] [IGDL ERROR]"), err);

      await yuzi.sendMessage(jid, {
        react: { text: "💥", key: msg.key },
      });

      await yuzi.sendMessage(
        jid,
        { text: "Error:\n" + err.message },
        { quoted: msg },
      );
    }
  },
};
