import { bratGen } from "../utils/canvasCache.js";
import fs from "fs";
import { exec } from "child_process";
import chalk from "chalk";

export default {
  package: "Brat Canvas",
  command: ["brat"],
  owner_only: false,
  description: "Generate brat-style image with emoji support",
  category: "maker",

  async run(yuzi, msg) {
    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      ""
    ).trim();

    const cleanText = text.replace(/^\.?brat/i, "").trim();

    if (!cleanText) {
      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *Format salah!*\n\n*Cara pakai:*\n.brat teks\n\n*Contoh:*\n.brat Hello World`,
        },
        { quoted: msg },
      );
      return;
    }

    try {
      const imageBuffer = await bratGen(cleanText);
      const input = `./tmp/brat_${Date.now()}.png`;
      const output = `./tmp/brat_${Date.now()}_sticker.webp`;
      fs.writeFileSync(input, imageBuffer);

      await new Promise((resolve, reject) => {
        exec(
          `ffmpeg -y -i ${input} -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -q:v 80 -preset default -an ${output}`,
          (err) => {
            if (err) reject(err);
            else resolve();
          },
        );
      });

      const stickerBuffer = fs.readFileSync(output);
      fs.unlinkSync(input);
      fs.unlinkSync(output);

      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          sticker: stickerBuffer,
        },
        { quoted: msg },
      );
    } catch (error) {
      console.error(chalk.red("[-] [BRAT]"), error.message);
      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *Gagal membuat brat image!*\n\nError: ${error.message}`,
        },
        { quoted: msg },
      );
    }
  },
};
