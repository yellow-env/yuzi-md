import { pinterest } from "../scrape/pinterest.js";
import chalk from "chalk";
import botConfig from "../../config/bot.config.js";

import { Button, Carousel } from "../utils/MessageBuilderV4.4.js";

export default {
  name: "pinterest",
  command: ["pin"],
  category: "search",
  description: "Cari gambar di Pinterest berdasarkan query",
  owner_only: false,

  async run(yuzi, msg, { jid, args, pushName }) {
    try {
      const input = args.join(" ").trim();

      let query = "";
      let limit = 5;

      if (input.includes("|")) {
        const parts = input.split("|");

        query = parts[0].trim();

        const num = parseInt(parts[1].trim());

        if (!isNaN(num) && num >= 1 && num <= 5) {
          limit = num;
        }
      } else {
        query = input;
      }

      if (!query) {
        return await yuzi.sendMessage(
          jid,
          {
            text:
              "*Format salah!*\n\n" +
              "Gunakan:\n" +
              "*.pin <query>|<amount>*\n\n" +
              "Contoh:\n" +
              "*.pin flying cat|5*\n\n" +
              "Jumlah max: 5",
          },
          {
            quoted: msg,
          },
        );
      }

      const results = await pinterest(query, 20);

      if (!results || results.length === 0) {
        return await yuzi.sendMessage(
          jid,
          {
            text:
              `*Tidak ditemukan!*\n\n` +
              `Query "${query}" tidak ditemukan di Pinterest.`,
          },
          {
            quoted: msg,
          },
        );
      }

      const selected = results.slice(0, Math.min(limit, 5));

      const cards = await Promise.all(
        selected.map(async (pin, index) => {
          const card = new Button(yuzi)
            .setTitle(`Pinterest Result ${index + 1}`)
            .setSubtitle(`@${pin.upload_by}`)
            .setBody(
              `*${pin.caption || "No Caption"}*\n\n` +
                `Uploader: ${pin.fullname}\n` +
                `Followers: ${pin.followers.toLocaleString()}\n` +
                `Source: ${pin.source}`,
            )
            .setFooter(`Pinterest search - ${botConfig.botName}`)
            .setImage(pin.image)
            .addUrl("Open Image", pin.image);

          return await card.toCard();
        }),
      );

      const carousel = new Carousel(yuzi)
        .setBody(
          `*Pinterest Search*\n\n` +
            `Query: ${query}\n` +
            `Total: ${selected.length} image(s)`,
        )
        .setFooter(`Pinterest search - ${botConfig.botName}`)
        .addCard(cards);

      await carousel.send(jid, {
        quoted: msg,
      });
    } catch (e) {
      console.log(chalk.red("[-] [PINTEREST]"), e);

      await yuzi.sendMessage(
        jid,
        {
          text: "*Error!*\n\n" + e.message,
        },
        {
          quoted: msg,
        },
      );
    }
  },
};
