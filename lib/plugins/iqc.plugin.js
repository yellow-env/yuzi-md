import { pkg } from "../utils/canvasCache.js";
import chalk from "chalk";

export default {
  package: "IQC Quote Generator",
  command: ["iqc"],
  owner_only: false,
  description: "Generate IQC style quotes with customizable options",
  category: "maker",

  async run(yuzi, msg) {
    try {
      const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ""
      ).trim();

      const cleanText = text.replace(/^\.?iqc/i, "").trim();

      if (!cleanText) {
        await yuzi.sendMessage(
          msg.key.remoteJid,
          {
            text: `❌ *Format salah!*\n\n*Cara pakai:*\n.iqc teks|waktu\n\n*Contoh Basic:*\n.iqc kalau gw sih bodo amat 😂|23.13\n\n*Dengan Options:*\n.iqc teks|waktu|baterai|operator|wifi|timebar\n\n*Contoh Lengkap:*\n.iqc Hello World|15:30|85|true|true|true\n\n*Keterangan:*\n• Baterai: 0-100 (default: hidden)\n• Operator: true/false (default: false)\n• Wifi: true/false (default: false)\n• Timebar: true/false (default: false)`,
          },
          { quoted: msg },
        );
        return;
      }

      let quoteText, quoteTime, battery, operator, wifi, timebar;

      if (cleanText.includes("|")) {
        const parts = cleanText.split("|").map((p) => p.trim());
        quoteText = parts[0];
        quoteTime = parts[1];
        battery = parts[2] || null;
        operator = parts[3] || null;
        wifi = parts[4] || null;
        timebar = parts[5] || null;
      } else {
        quoteText = cleanText;
        const now = new Date();
        quoteTime = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`;
        battery = null;
        operator = null;
        wifi = null;
        timebar = null;
      }

      if (!quoteText) {
        await yuzi.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ Teks quote tidak boleh kosong!",
          },
          { quoted: msg },
        );
        return;
      }

      if (quoteText.length > 200) {
        await yuzi.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ Teks terlalu panjang! Maksimal 200 karakter.",
          },
          { quoted: msg },
        );
        return;
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])$/;
      if (!timeRegex.test(quoteTime)) {
        await yuzi.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ Format waktu salah! Gunakan format HH.MM atau HH:MM\nContoh: 23.13 atau 12:30",
          },
          { quoted: msg },
        );
        return;
      }

      quoteTime = quoteTime.replace(":", ".");

      try {
        const options = {
          baterai: battery ? [true, battery.toString()] : [false, "0"],
          operator: operator
            ? operator.toLowerCase() === "true" || operator === "1"
            : false,
          wifi: wifi ? wifi.toLowerCase() === "true" || wifi === "1" : false,
          timebar: timebar
            ? timebar.toLowerCase() === "true" || timebar === "1"
            : false,
        };

        let generateIQC;

        const iqcModule = pkg;
        generateIQC = iqcModule.generateIQC;

        const result = await generateIQC(quoteText, quoteTime, options);

        if (!result.success) {
          throw new Error("Gagal generate quote");
        }

        let caption = `✅ *QUOTE BERHASIL DIBUAT*\n\n`;
        caption += `📝 *Teks:* ${quoteText}\n`;
        caption += `⏰ *Waktu:* ${quoteTime}\n`;

        if (battery) {
          caption += `🔋 *Baterai:* ${battery}%\n`;
        }
        if (operator && options.operator) {
          caption += `📡 *Operator:* Aktif\n`;
        }
        if (wifi && options.wifi) {
          caption += `📶 *WiFi:* Aktif\n`;
        }
        if (timebar && options.timebar) {
          caption += `⏱️ *Timebar:* Aktif\n`;
        }

        caption += `\n_${result.message}_`;

        await yuzi.sendMessage(
          msg.key.remoteJid,
          {
            image: result.image,
            caption: caption,
          },
          { quoted: msg },
        );
      } catch (error) {
        console.error("Error generate quote:", error);

        let errorMsg = "❌ *Gagal membuat quote!*\n\n";

        if (error.message.includes("Cannot find module")) {
          errorMsg += "📦 *Module iqc-canvas belum terinstall*\n\n";
          errorMsg += "*Install dengan:*\n```npm install iqc-canvas```";
        } else if (error.message.includes("generateIQC")) {
          errorMsg +=
            "⚠️ Fungsi generateIQC belum tersedia\nPastikan module iqc-canvas sudah terinstall";
        } else if (
          error.message.includes("canvas") ||
          error.message.includes("image")
        ) {
          errorMsg +=
            "🖼️ Gagal memproses gambar\nPastikan dependencies canvas terinstall";
        } else {
          errorMsg += `Error: ${error.message}`;
        }

        await yuzi.sendMessage(
          msg.key.remoteJid,
          {
            text: errorMsg,
          },
          { quoted: msg },
        );
      }
    } catch (err) {
      console.error(chalk.red("[-] [IQC]"), err);
      await yuzi.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ Terjadi kesalahan internal`,
        },
        { quoted: msg },
      );
    }
  },
};
