import botConfig from "../../config/bot.config.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import chalk from "chalk";
import sharp from "sharp";

const Baileys = await import(botConfig.baileys);
const { downloadMediaMessage } = Baileys;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  name: "toimg",
  command: ["toimg", "toimage"],
  category: "converter",

  async run(yuzi, msg, { jid }) {
    let input = null;

    try {
      const m = msg.message;

      const quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted?.stickerMessage) {
        return yuzi.sendMessage(
          jid,
          { text: "Reply sticker dulu." },
          { quoted: msg },
        );
      }

      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fsSync.existsSync(tmpDir)) {
        fsSync.mkdirSync(tmpDir, { recursive: true });
      }

      const mediaMessage = {
        key: msg.key,
        message: quoted,
      };

      const buffer = await downloadMediaMessage(
        mediaMessage,
        "buffer",
        {},
        {
          logger: undefined,
          reuploadRequest: yuzi.updateMediaMessage,
        },
      );

      input = path.join(tmpDir, `${Date.now()}.webp`);
      await fs.writeFile(input, buffer);
      const image = await sharp(input).png().toBuffer();
      await yuzi.sendMessage(jid, { image }, { quoted: msg });
      await sleep(300);

      try {
        await fs.unlink(input);
      } catch (e) {
        if (e.code !== "EBUSY") {
          console.log("unlink error:", e);
        }
      }
    } catch (err) {
      console.log(chalk.red("[-] [TOIMG]"), err);

      await yuzi.sendMessage(
        jid,
        { text: "Error:\n" + err.message },
        { quoted: msg },
      );
    }
  },
};
