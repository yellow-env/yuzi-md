export default {
  name: "Ping Command",
  command: ["ping"],
  owner_only: true,
  description: "Tes respon bot",
  category: "main",

  async run(yuzi, msg, { jid, args }) {
    await yuzi.sendMessage(
      msg.key.remoteJid,
      {
        text: "Pong!",
      },
      { quoted: msg },
    );
  },
};
