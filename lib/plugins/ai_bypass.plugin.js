import chalk from "chalk";

export default {
  name: "AI Bypass ( To Human )",
  category: "ai",
  command: ["tohuman", "aibypass", "aitohuman"],
  async run(yuzi, msg, { jid, args }) {
    try {
      if (!args[0]) {
        msg.reply("Harap masukkan `text` yang ingin di *bypass*");
        msg.react("❌");
        return;
      }

      const query = args.join(" ");

      const url = await fetch(
        `https://api.nexray.eu.cc/ai/bypass?text=${encodeURIComponent(query)}`,
      );

      const data = await url.json();

      if (!data) {
        return msg.react("❌");
      }

      const result = data?.result;

      let text = `*[ AI TEXT BYPASS ]*`;
      text += `\n\nOriginal Text: \`${query}\``;
      text += `\n\nResult: \`${result}\``;

      if (!result || typeof result !== "string") {
        return yuzi.sendMessage(
          jid,
          { text: "Response API tidak valid." },
          { quoted: msg },
        );
      }

      await yuzi.sendMessage(jid, { text: text }, { quoted: msg });
    } catch (err) {
      console.error(chalk.red("[-] [AI BYPASS]", err));
      msg.reply("❌ Error", err);
      msg.react("❌");
    }
  },
};
