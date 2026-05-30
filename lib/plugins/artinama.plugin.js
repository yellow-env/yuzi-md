import chalk from "chalk";

export default {
  name: "artinama",
  command: ["artinama"],
  category: "fun",
  description: "Cari arti nama",
  owner_only: false,
  async run(yuzi, msg, { jid, args }) {
    try {
      msg.react("⏳");

      if (!args[0]) {
        yuzi.sendMessage(jid, { text: "Masukkan nama" }, { quoted: msg });
        msg.react("❌");
        return;
      }

      const query = args.join(" ");

      const url = await fetch(
        `https://api.nexray.eu.cc/primbon/artinama?name=${encodeURIComponent(query)}`,
      );
      const data = await url.json();
      const result = data?.result;

      function formatText(text = "") {
        return text
          .split("\n")
          .map((line) => `│ ${line}`)
          .join("\n");
      }

      let final_reply = `
╭─〔 *ARTI NAMA* 〕
│
│ 👤 Nama : ${result.nama}
│
├─〔 *ARTI* 〕
│
${formatText(result.arti)}
│
├─〔 *CATATAN* 〕
│
${formatText(result.catatan)}
│
╰──────────────
`.trim();

      await yuzi.sendMessage(jid, { text: final_reply }, { quoted: msg });
      await msg.react("✅");
    } catch (e) {
      console.error(chalk.red("[-] [ARTINAMA]", e));
      yuzi.sendMessage(
        jid,
        { text: "❌ Terjadi kesalahan, silahkan coba lagi." },
        { quoted: msg },
      );
      msg.react("❌");
    }
  },
};
