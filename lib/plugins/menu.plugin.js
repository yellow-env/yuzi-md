import { Button } from "../utils/MessageBuilderV4.4.js";
import botConfig from "../../config/bot.config.js";
import chalk from "chalk";
import fs from "fs";
import path from "path";

function getRandomAudio() {
  try {
    const dir = "./assets/menu-musics";

    if (!fs.existsSync(dir)) return null;

    const files = fs
      .readdirSync(dir)
      .filter(
        (f) => f.endsWith(".mp3") || f.endsWith(".m4a") || f.endsWith(".ogg"),
      );

    if (!files.length) return null;

    const pick = files[Math.floor(Math.random() * files.length)];
    return path.join(dir, pick);
  } catch {
    return null;
  }
}

export default {
  name: "menu",
  command: ["menu", "allmenu"],
  category: "main",
  description: "Interactive menu",

  async run(yuzi, msg, { jid, pushName, plugins }) {
    try {
      jid = jid || msg.key.remoteJid;
      pushName = pushName || "User";
      plugins = Array.isArray(plugins) ? plugins : [];

      const grouped = {};

      for (const p of plugins) {
        if (!p?.command) continue;

        let category = "OTHER";

        if (typeof p.category === "string") {
          category = p.category.toUpperCase();
        } else if (Array.isArray(p.category)) {
          category = String(p.category[0] || "OTHER").toUpperCase();
        }

        if (category === "HIDDEN") continue;

        if (!grouped[category]) grouped[category] = [];

        const mainCmd = Array.isArray(p.command) ? p.command[0] : p.command;

        if (!mainCmd) continue;

        grouped[category].push({
          cmd: String(mainCmd),
          name: p.name || p.package || mainCmd,
        });
      }

      for (const category in grouped) {
        grouped[category] = grouped[category].sort((a, b) =>
          a.cmd.localeCompare(b.cmd),
        );
      }

      const sortedCategories = Object.keys(grouped).sort((a, b) =>
        a.localeCompare(b),
      );

      const menu = new Button(yuzi)
        .setTitle(`📌 ${botConfig.botName}`)
        .setSubtitle(`Hello ${pushName} 👋`)
        .setBody(
          [
            "Simple Interactive Menu",
            "",
            `Version : ${botConfig.botVersion || "1.0.0"}`,
            "Choose button below.",
          ].join("\n"),
        )
        .setFooter(`Powered by ${botConfig.owner || "Developer"}`)
        .setMedia({
          document: Buffer.from("MENU"),
          mimetype:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileName: `${botConfig.botName} Menu.docx`,
          fileLength: "999999999999",
          pageCount: 999,
        })
        .setContextInfo({
          externalAdReply: {
            title: `${botConfig.botName} - WhatsApp Bot`,
            body: "Interactive Command Menu",
            thumbnailUrl: botConfig.thumb,
            sourceUrl:
              botConfig.github ||
              `https://wa.me/${botConfig.ownerNum?.[0] || ""}`,
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: false,
          },
        });

      menu.addSelection("COMMAND LIST");

      for (const category of sortedCategories) {
        menu.makeSection(`📂 ${category}`);

        for (const item of grouped[category]) {
          menu.makeRow(item.name, `.${item.cmd}`);
        }
      }
      menu.addUrl(
        "📞 DEVELOPER",
        botConfig.ownerLink || `https://wa.me/${botConfig.ownerNum?.[0] || ""}`,
      );

      await menu.send(jid, { quoted: msg });

      const audioPath = getRandomAudio();

      if (audioPath && fs.existsSync(audioPath)) {
        await yuzi.sendMessage(
          jid,
          {
            audio: fs.readFileSync(audioPath),
            mimetype: "audio/mpeg",
            ptt: false,
          },
          { quoted: msg },
        );
      }
    } catch (e) {
      console.log(chalk.red("[-] [MENU ERROR]"), e);

      await yuzi.sendMessage(
        jid,
        {
          text: "Failed to send menu.\n\n" + (e?.message || String(e)),
        },
        { quoted: msg },
      );
    }
  },
};
