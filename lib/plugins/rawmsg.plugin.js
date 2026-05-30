import messageConfig from "../../config/message.config.js";
export default {
  package: "Raw Message",
  command: ["rawmsg", "raw"],
  owner_only: true,
  description: "Send raw message data as JSON file",
  category: "owner",

  async run(yuzi, msg, { jid, isOwner }) {
    /* if (!isOwner) {
      return yuzi.sendMessage(
        jid,
        { text: messageConfig.ownerOnly },
        { quoted: msg },
      );
    } */

    let messageToDisplay = {
      key: msg.key,
      message: msg.message,
      pushName: msg.pushName || context?.pushName || "Unknown",
      messageTimestamp: msg.messageTimestamp || Date.now(),
    };

    const context = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = context?.quotedMessage;

    if (quoted) {
      messageToDisplay = {
        key: {
          remoteJid: msg.key.remoteJid,
          id: context.stanzaId || msg.key.id,
          fromMe: false,
          participant: context.participant,
          participantPn: context.participantPn,
        },
        message: quoted,
        pushName: context.pushName || "Unknown",
        messageTimestamp: context.timestamp || Date.now(),
      };
    }

    const rawJson = JSON.stringify(
      messageToDisplay,
      (key, value) => {
        if (Buffer.isBuffer(value)) {
          return `[Buffer ${value.length} bytes]`;
        }
        if (value instanceof Uint8Array) {
          return `[Uint8Array ${value.length} bytes]`;
        }
        return value;
      },
      2,
    );

    await yuzi.sendMessage(
      jid,
      { text: `\`\`\`${rawJson}\`\`\`` },
      { quoted: msg },
    );

    await yuzi.sendMessage(jid, {
      document: Buffer.from(rawJson),
      fileName: `raw-${Date.now()}.json`,
      mimetype: "application/json",
      caption: quoted ? "Raw Replied Message Data" : "Raw Message Data",
    });
  },
};
