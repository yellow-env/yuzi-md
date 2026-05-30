import { createCanvas, loadImage } from "canvas";
import chalk from "chalk";

export default {
  name: "Landsat Name",
  command: ["landsat", "nasaname"],
  category: "maker",
  description: "Generate nama dengan style NASA Landsat",

  async run(yuzi, msg, { jid, args }) {
    const text = args.join(" ");

    if (!text) {
      return msg.reply("Contoh: .landsat rayy");
    }

    const queryClean = text.toLowerCase().replace(/[^a-z\s-]/g, "");

    if (!queryClean.replace(/[\s-]/g, "").length) {
      return msg.reply("❌ Gunakan huruf A-Z saja");
    }

    await yuzi.sendMessage(jid, {
      react: { text: "🛰️", key: msg.key },
    });

    const baseUrl =
      "https://science.nasa.gov/specials/your-name-in-landsat/images/";
    const gap = 8;
    const lineGap = 20;

    try {
      const words = queryClean.split(/[\s-]+/).filter(Boolean);

      const allImages = [];
      const lineHeights = [];
      const lineWidths = [];

      for (const word of words) {
        const lineImages = [];
        let maxHeight = 0;
        let totalWidth = 0;

        for (const letter of word) {
          const num = Math.floor(Math.random() * 4) + 1;
          const url = `${baseUrl}${letter}_${num}.jpg`;

          try {
            const img = await loadImage(url);

            lineImages.push({
              img,
              width: img.width,
              height: img.height,
            });

            if (img.height > maxHeight) maxHeight = img.height;
            totalWidth += img.width + gap;
          } catch {
            lineImages.push({
              img: null,
              width: 200,
              height: 200,
              letter,
            });

            maxHeight = Math.max(maxHeight, 200);
            totalWidth += 200 + gap;
          }
        }

        allImages.push(lineImages);
        lineHeights.push(maxHeight);
        lineWidths.push(totalWidth - gap);
      }

      const maxWidth = Math.max(...lineWidths);
      const totalHeight =
        lineHeights.reduce((a, b) => a + b, 0) + (words.length - 1) * lineGap;

      const canvas = createCanvas(maxWidth, totalHeight);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "rgb(10, 15, 42)";
      ctx.fillRect(0, 0, maxWidth, totalHeight);

      let currentY = 0;

      allImages.forEach((line, index) => {
        const lineTotalWidth = lineWidths[index];
        const startX = (maxWidth - lineTotalWidth) / 2;

        let currentX = startX;
        const currentLineHeight = lineHeights[index];

        for (const item of line) {
          const yOffset = (currentLineHeight - item.height) / 2;

          if (item.img) {
            ctx.drawImage(
              item.img,
              currentX,
              currentY + yOffset,
              item.width,
              item.height,
            );
          } else {
            ctx.fillStyle = "rgb(60, 60, 80)";
            ctx.fillRect(currentX, currentY, item.width, currentLineHeight);

            ctx.fillStyle = "white";
            ctx.font = "bold 40px Sans-serif";
            ctx.textAlign = "center";

            ctx.fillText(
              item.letter.toUpperCase(),
              currentX + item.width / 2,
              currentY + currentLineHeight / 2 + 15,
            );
          }

          currentX += item.width + gap;
        }

        currentY += currentLineHeight + lineGap;
      });

      const buffer = canvas.toBuffer("image/jpeg");

      await yuzi.sendMessage(
        jid,
        {
          image: buffer,
          caption: `🛰️ *LANDSAT STYLE:* ${text.toUpperCase()}`,
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      console.error(chalk.red("[-] [LANDSAT]"), err);

      await yuzi.sendMessage(jid, {
        react: { text: "❌", key: msg.key },
      });

      msg.reply("❌ Gagal generate gambar");
    }
  },
};
