import axios from "axios";

export default {
  name: "Cek Tiktok Earnings",
  command: ["tiktokearn", "ttearn", "tiktokearnings"],
  category: "tools",
  description: "Cek Tiktok Earnings",

  async run(yuzi, msg, { jid, args }) {
    try {
      const username = args.join(" ");

      if (!username) {
        return yuzi.sendMessage(
          jid,
          {
            text: "Masukkan username TikTok.\nContoh: .tiktokearn mrbeast",
          },
          { quoted: msg },
        );
      }

      const { data } = await axios.get(
        `https://api.nexray.eu.cc/tools/tiktokearnings?username=${encodeURIComponent(username)}`,
      );

      if (!data) {
        return yuzi.sendMessage(
          jid,
          { text: "Data tidak ditemukan." },
          { quoted: msg },
        );
      }

      return yuzi.sendMessage(
        jid,
        {
          text: JSON.stringify(data, null, 2),
        },
        { quoted: msg },
      );
    } catch (err) {
      return yuzi.sendMessage(
        jid,
        {
          text: "Error: " + err.message,
        },
        { quoted: msg },
      );
    }
  },
};
