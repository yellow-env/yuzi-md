import chalk from "chalk";

export default {
  package: "ZZZ Stalk",
  command: ["zzz-stalk"],
  owner_only: false,
  description: "Screenshot profile enka.network/zzz/",
  category: "stalker",

  async run(yuzi, msg) {
    try {
      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ""
      ).trim();

      const query = text.replace(/^\.?(zzz-stalk)/i, "").trim();

      if (!query) {
        await yuzi.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ Format Salah \n```Contoh: .zzz-stalk 1235321215```",
          },
          { quoted: msg },
        );
        return;
      }

      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: "🔍 Getting Player data",
        },
        { quoted: msg },
      );

      const playerId = query.trim();
      const profileUrl = `https://enka.network/zzz/${playerId}`;

      const screenshotUrl = `https://mini.s-shot.ru/1200x800/JPEG/1024/?${encodeURIComponent(profileUrl)}`;

      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: screenshotUrl },
          caption: `📸 Result`,
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error(chalk.red("[-] [ZZZ STALK]"), err);

      const query = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ""
      )
        .replace(/^\.?(zzz-stalk)/i, "")
        .trim();

      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ Fetching Image Error`,
        },
        { quoted: msg },
      );
    }
  },
};
