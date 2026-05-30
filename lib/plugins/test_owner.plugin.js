export default {
  name: "Test Owner",
  command: ["testowner", "me"],
  category: "hidden",
  async run(yuzi, msg, { jid, isOwner }) {
    if (isOwner) {
      await yuzi.sendMessage(jid, { text: "Halo Owner" }, { quoted: msg });
    } else {
      await yuzi.sendMessage(jid, { text: "Halo User" }, { quoted: msg });
    }
  },
};
