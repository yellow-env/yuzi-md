import botConfig from "../../config/bot.config.js";
const Baileys = await import(botConfig.baileys);
const { downloadMediaMessage } = Baileys;
import fs from "fs";
import { exec } from "child_process";
import os from "os";
import chalk from "chalk";
import { join } from "path";

export default {
  name: "Sticker Maker",
  command: ["s", "sticker", "stickermaker"],
  category: "maker",

  async run(yuzi, msg, { jid }) {
    try {
      const m = msg.message;

      let quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;
      let mediaMessage = null;

      if (quoted) {
        mediaMessage = {
          key: msg.key,
          message: quoted,
        };
      } else if (m.imageMessage || m.videoMessage) {
        mediaMessage = {
          key: msg.key,
          message: m,
        };
      } else {
        return yuzi.sendMessage(
          jid,
          { text: "Kirim / reply gambar atau video dengan caption .s" },
          { quoted: msg },
        );
      }

      const buffer = await downloadMediaMessage(
        mediaMessage,
        "buffer",
        {},
        {
          logger: undefined,
          reuploadRequest: yuzi.updateMediaMessage,
        },
      );

      const tmpDir = join(os.tmpdir(), "bot-wa");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const input = join(tmpDir, `${Date.now()}.jpg`);
      const output = join(tmpDir, `${Date.now()}.webp`);

      fs.writeFileSync(input, buffer);

      await new Promise((resolve, reject) => {
        exec(
          `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -q:v 80 -preset default -an "${output}"`,
          (err) => {
            if (err) reject(err);
            else resolve();
          },
        );
      });

      const sticker = fs.readFileSync(output);

      await yuzi.sendMessage(jid, { sticker }, { quoted: msg });

      fs.unlinkSync(input);
      fs.unlinkSync(output);
    } catch (e) {
      console.log(chalk.red("[-] [STICKER MAKER]"), e);

      await yuzi.sendMessage(jid, {
        text: "Error:\n" + e.message,
      });
    }
  },
};
