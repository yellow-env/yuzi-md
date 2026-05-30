import anime from "../scrape/nontonAnime.js";

export default {
  name: "anime detail",
  command: ["animeinfo", "detailanime"],
  category: "anime",

  async run(yuzi, msg, { jid, args }) {
    try {
      const url = args[0];

      if (!url) {
        return yuzi.sendMessage(
          jid,
          {
            text: "Masukkan URL anime",
          },
          { quoted: msg },
        );
      }

      await yuzi.sendMessage(jid, {
        react: { text: "⏳", key: msg.key },
      });

      const data = await anime.getDetail(url);

      const text = `
╭─── ✦ DETAIL ANIME ✦ ───╮
• Judul : ${data.title}
• Score : ${data.score}
• Tipe : ${data.type}

📝 Sinopsis:
${data.synopsis || "-"}

╰──────────────────╯
`;

      await yuzi.sendMessage(
        jid,
        {
          image: { url: data.image },
          caption: text,
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      await yuzi.sendMessage(jid, {
        text: "Error:\n" + err.message,
      });
    }
  },
};
