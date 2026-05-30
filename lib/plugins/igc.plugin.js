import axios from "axios";
import chalk from "chalk";
import FormData from "form-data";
import botConfig from "../../config/bot.config.js";
const Baileys = await import(botConfig.baileys);
const { downloadMediaMessage } = Baileys;
import { fileTypeFromBuffer } from "file-type";

const prefix = botConfig.prefix;

export default {
  name: "Fake IG Comment",
  command: ["fakeigcomment", "igc"],
  category: ["maker"],

  async run(yuzi, msg, { jid, args }) {
    const text = args.join(" ");

    if (!text) {
      return msg.reply(
        `Format salah!\n\n**Format*: ${prefix}fakeigcomment username|text|time|likes|replyto|theme|badge|replytobadge|showreply\n\n**Contoh*: ${prefix}fakeigcomment Kachi|halo|1h|1200|yellow|light|verified|verified|false`,
      );
    }

    const parts = text.split("|");

    if (parts.length < 9) {
      return msg.reply(
        `Format harus lengkap!\n\nusername|text|time|likes|replyto|theme|badge|replytobadge|showreply`,
      );
    }

    const [
      username,
      comment,
      time,
      likes,
      replyto,
      theme,
      badge,
      replytobadge,
      showreply,
    ] = parts;

    try {
      await yuzi.sendMessage(jid, {
        react: { text: "🖼️", key: msg.key },
      });

      const m = msg.message;
      let quoted = m?.extendedTextMessage?.contextInfo?.quotedMessage;

      let mediaMessage = null;

      if (quoted) {
        mediaMessage = {
          key: msg.key,
          message: quoted,
        };
      } else if (m?.imageMessage) {
        mediaMessage = {
          key: msg.key,
          message: m,
        };
      }

      let imageUrl = null;

      if (mediaMessage) {
        const buffer = await downloadMediaMessage(
          mediaMessage,
          "buffer",
          {},
          {
            logger: undefined,
            reuploadRequest: yuzi.updateMediaMessage,
          },
        );

        if (!buffer || buffer.length === 0) {
          throw new Error(
            "Gagal mengunduh media. Media可能 kosong atau tidak valid.",
          );
        }

        const type = await fileTypeFromBuffer(buffer);
        if (!type) {
          throw new Error(
            "Tidak dapat mendeteksi tipe file. Pastikan media adalah gambar yang valid (JPEG/PNG).",
          );
        }

        if (!["jpeg", "jpg", "png", "gif", "webp"].includes(type.ext)) {
          throw new Error(
            `Tipe file tidak didukung: ${type.ext}. Hanya JPEG, PNG, GIF, WebP yang didukung.`,
          );
        }

        const ext = type.ext === "jpg" ? "jpeg" : type.ext;
        const mime = type.mime;

        const form = new FormData();
        form.append("file", buffer, {
          filename: `image.${ext}`,
          contentType: mime,
        });

        const res = await axios.post("https://telegra.ph/upload", form, {
          headers: {
            ...form.getHeaders(),
          },
        });

        if (!res.data || !res.data[0] || !res.data[0].src) {
          console.error("Telegra.ph response:", res.data);
          throw new Error(
            "Respons telegra.ph tidak valid: " + JSON.stringify(res.data),
          );
        }

        imageUrl = "https://telegra.ph" + res.data[0].src;
      }

      const params = new URLSearchParams({
        username,
        text: comment,
        time,
        likes,
        replyto,
        theme,
        badge,
        replytobadge,
        showreply,
        lang: "id",
      });

      if (imageUrl) {
        params.append("picture", imageUrl);
      }

      const apiUrl = `https://api.silentkana.web.id/api/maker/fakeigcomment?${params.toString()}`;

      const { data } = await axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      await yuzi.sendMessage(
        jid,
        {
          image: Buffer.from(data),
          caption: "Fake IG Comment berhasil dibuat",
        },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      console.error(chalk.red("[-] [INSTAGRAM CANVAS]"), err);

      await yuzi.sendMessage(jid, {
        react: { text: "❌", key: msg.key },
      });

      msg.reply("Gagal membuat fake IG comment.");
    }
  },
};
