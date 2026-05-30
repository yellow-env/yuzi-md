import chalk from "chalk";

export default {
  name: "Deep Search",
  command: ["deepsearch", "ds"],
  category: "ai",

  async run(yuzi, msg, { jid, args }) {
    try {
      await msg.react("⏳");

      if (!args[0]) {
        await msg.reply("Masukkan kata kunci pencarian");
        return msg.react("❌");
      }

      const query = args.join(" ");

      const params = new URLSearchParams({
        text: query,
      });

      const res = await fetch(
        `https://api.nexray.eu.cc/ai/deepsearch?${params}`,
      );

      const text = await res.text();

      let result_data;

      try {
        result_data = JSON.parse(text);
      } catch {
        console.log(chalk.yellow("[DEEPSEARCH RAW RESPONSE]"));
        console.log(text);

        await msg.reply("API mengembalikan response tidak valid.");

        return msg.react("❌");
      }

      if (!result_data?.status) {
        await msg.reply("Gagal mendapatkan response.");
        return msg.react("❌");
      }

      const reply = result_data?.result;

      if (!reply || typeof reply !== "string") {
        await msg.reply("Response API tidak valid.");
        return msg.react("❌");
      }

      const final_reply = reply.replace(/###\s*/g, "*").replace(/\s*###/g, "*");

      await yuzi.sendMessage(
        jid,
        {
          text: final_reply,
        },
        { quoted: msg },
      );

      await msg.react("✅");
    } catch (err) {
      console.error(chalk.red("[-] [DEEPSEARCH]"), err);

      await msg.reply("❌ Terjadi error");
      await msg.react("❌");
    }
  },
};
