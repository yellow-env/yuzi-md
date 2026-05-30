import chalk from "chalk";

export default {
  package: "GI Stalk",
  command: ["gi-stalk", "genshin-stalk", "gistalk", "genshinstalk", "checkgi"],
  owner_only: false,
  description: "Screenshot profile enka.network/gi/",
  category: "stalker",

  async run(yuzi, msg) {
    try {
      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ""
      ).trim();

      const query = text
        .replace(
          /^\.?(gi-stalk|genshin-stalk|gistalk|genshinstalk|checkgi)/i,
          "",
        )
        .trim();

      if (!query) {
        await yuzi.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ Format Salah\n```Contoh: .gi-stalk 800123456```",
          },
          { quoted: msg },
        );
        return;
      }

      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: "🔍 Getting Genshin Player data",
        },
        { quoted: msg },
      );

      const playerId = query.trim();
      const profileUrl = `https://enka.network/u/${playerId}`;

      const screenshotUrl = `https://mini.s-shot.ru/1200x800/JPEG/1024/?${encodeURIComponent(profileUrl)}`;

      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: screenshotUrl },
          caption: "📸 Result",
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error(chalk.red("[-] [GENSHIN STALK]"), err);

      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Fetching Image Error",
        },
        { quoted: msg },
      );
    }
  },
};
