import chalk from "chalk";
import botConfig from "../../config/bot.config.js";
import { Button } from "../utils/MessageBuilderV4.4.js";

export default {
  name: "Lirik Lagu",
  command: ["lirik", "lyrics"],
  category: "search",
  description: "Cari lirik lagu",

  async run(yuzi, msg, { jid, args }) {
    try {
      await msg.react("⏳");

      if (!args.length) {
        return msg.reply(
          [
            "❌ Judul lagu belum dimasukkan",
            "",
            "Contoh:",
            ".lyrics impostor syndrome",
          ].join("\n"),
        );
      }

      const query = args.join(" ");

      const res = await fetch(
        `https://api.danzy.web.id/api/search/lyrics?q=${encodeURIComponent(query)}`,
      );

      const data = await res.json();

      const result = data?.result?.[0];

      if (!result) {
        await msg.react("❌");

        return msg.reply(
          ["❌ Lagu tidak ditemukan", "", "Coba gunakan kata kunci lain."].join(
            "\n",
          ),
        );
      }

      const lyrics = result?.plainLyrics;

      if (!lyrics || typeof lyrics !== "string") {
        await msg.react("❌");

        return msg.reply("❌ Response API tidak valid.");
      }

      const finalLyrics = [
        `🎵 ${result?.trackName || "-"}`,
        `👤 ${result?.artistName || "-"}`,
        "",
        "━━━━━━━━━━━━━━━━━━",
        "",
        `\`\`\` ${lyrics} \`\`\``,
        "",
        "━━━━━━━━━━━━━━━━━━",
        "",
        `🔎 Query : ${query}`,
      ].join("\n");

      const menu = new Button(yuzi)
        .setTitle("🎵 Lyrics Search")
        .setSubtitle(result?.artistName || "Unknown Artist")
        .setBody(
          [
            `📀 Title : ${result?.trackName || "-"}`,
            `👤 Artist : ${result?.artistName || "-"}`,
            "",
            `\`\`\` ${lyrics} \`\`\``,
            "",
          ].join("\n"),
        )
        .setFooter(`${botConfig.botName} - Lyrics Finder`)
        .addCopy("Copy Lyrics", lyrics);

      await menu.send(jid, {
        quoted: msg,
      });

      await msg.react("✅");
    } catch (e) {
      console.error(chalk.red("[-] [SEARCH LIRIK]"), e);

      await msg.react("❌");

      await msg.reply("❌ Terjadi kesalahan\n\n" + (e?.message || String(e)));
    }
  },
};
