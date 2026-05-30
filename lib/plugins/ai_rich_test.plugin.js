import { proto } from "@whiskeysockets/baileys";

export default {
  package: "AI Rich Response",
  command: ["airich"],
  owner_only: true,
  description: "Tes AI Rich",
  category: "owner",

  async run(yuzi, msg) {
    const jid = msg.key.remoteJid;

    const message = proto.Message.fromObject({
      aiRichResponseMessage: {
        submessages: [
          {
            text: "Hello World",
          },
        ],
      },
    });

    await yuzi.relayMessage(jid, message, {});
  },
};
