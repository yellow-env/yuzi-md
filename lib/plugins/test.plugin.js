export default {
  name: "tes",
  owner_only: true,
  command: ["tes", "test"],
  category: ["test"],
  async run(yuzi, msg, { jid }) {
    await yuzi.updateProfileStatus("Hello World!");
    await msg.react("👍");
  },
};
