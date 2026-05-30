import fs from "fs";
import { getThumbs, saveThumbs } from "../utils/thumb_store.js";

export default {
  package: "Delete Thumbnail",
  command: ["delthumb"],
  owner_only: true,
  description: "Hapus thumbnail",
  category: "tools",

  async run(yuzi, msg, { args }) {
    const jid = msg.key.remoteJid;

    const query = args[0]?.toLowerCase();

    if (!query) {
      return await yuzi.sendMessage(
        jid,
        {
          text: "Masukkan nama thumbnail atau all.",
        },
        { quoted: msg },
      );
    }

    const thumbs = getThumbs();

    if (!thumbs.length) {
      return await yuzi.sendMessage(
        jid,
        {
          text: "Database thumbnail kosong.",
        },
        { quoted: msg },
      );
    }

    if (query === "all") {
      saveThumbs([]);

      return await yuzi.sendMessage(
        jid,
        {
          text: "Semua thumbnail berhasil dihapus.",
        },
        { quoted: msg },
      );
    }

    const filtered = thumbs.filter((v) => v.name.toLowerCase() !== query);

    if (filtered.length === thumbs.length) {
      return await yuzi.sendMessage(
        jid,
        {
          text: "Thumbnail tidak ditemukan.",
        },
        { quoted: msg },
      );
    }

    saveThumbs(filtered);

    await yuzi.sendMessage(
      jid,
      {
        text: `Thumbnail "${query}" berhasil dihapus.`,
      },
      { quoted: msg },
    );
  },
};
