import anime from "../scrape/nontonAnime.js";

export default {
  name: "anime search",
  command: ["anime", "animesearch"],
  category: "anime",

  async run(yuzi, msg, { jid, args }) {
    try {
      const query = args.join(" ");

      if (!query) {
        return yuzi.sendMessage(
          jid,
          { text: "Masukin judul anime" },
          { quoted: msg },
        );
      }

      await yuzi.sendMessage(jid, {
        react: { text: "🔍", key: msg.key },
      });

      const results = await anime.search(query);

      if (!results.length) {
        return yuzi.sendMessage(
          jid,
          { text: "Anime tidak ditemukan" },
          { quoted: msg },
        );
      }

      const v = results[0];

      const caption = `
╭─── ✦ ANIME INFO ✦ ───╮
• Judul : ${v.title}
• Rating : ${v.rating || "-"}
• Tipe   : ${v.type || "-"}
• Season : ${v.season || "-"}

🔗 ${v.url}
╰─────────────────╯
      `.trim();

      await yuzi.sendMessage(
        jid,
        {
          image: { url: v.image },
          caption,
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      await yuzi.sendMessage(jid, {
        react: { text: "❌", key: msg.key },
      });

      await yuzi.sendMessage(
        jid,
        { text: "Error:\n" + err.message },
        { quoted: msg },
      );
    }
  },
};
