import { bratVid } from "../utils/canvasCache.js";
import fs from "fs";
import { exec } from "child_process";
import chalk from "chalk";

export default {
  package: "Brat Vid",
  command: ["bratvid"],
  owner_only: false,
  description: "Generate brat-style video with emoji support",
  category: "maker",

  async run(yuzi, msg) {
    const text = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      ""
    ).trim();

    const cleanText = text.replace(/^\.?bratvid/i, "").trim();

    if (!cleanText) {
      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *Format salah!*\n\n*Cara pakai:*\n.bratvid teks\n\n*Contoh:*\n.bratvid Hello World`,
        },
        { quoted: msg },
      );
      return;
    }

    try {
      const videoBuffer = await bratVid(cleanText, {
        outputFormat: "mp4",
      });

      const input = `./tmp/bratvid_${Date.now()}.mp4`;
      const output = `./tmp/bratvid_${Date.now()}_sticker.gif`;

      fs.writeFileSync(input, videoBuffer);

      await new Promise((resolve, reject) => {
        exec(
          `ffmpeg -y -i ${input} -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v gif -r 10 ${output}`,
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
      console.error(chalk.red("[-] [BRATVID]"), error);
      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ *Gagal membuat brat video!*\n\nError: ${error.message}`,
        },
        { quoted: msg },
      );
    }
  },
};
