export default {
  package: "Check Favicon",
  command: ["favicon", "preview", "linkinfo"],
  owner_only: false,
  description: "Cek preview/favicon dari pesan reply",
  category: "main",

  async run(yuzi, msg) {
    const quoted = msg?.quoted || msg;

    const m = quoted?.message || quoted;

    const ext = m?.extendedTextMessage;

    const result = {
      hasPreview: !!(ext?.title || ext?.description || ext?.jpegThumbnail),

      hasExternalAdReply: !!ext?.contextInfo?.externalAdReply,

      title: ext?.title || null,
      description: ext?.description || null,

      hasThumbnail: !!ext?.jpegThumbnail,
    };

    await yuzi.sendMessage(
      msg.key.remoteJid,
      {
        text: JSON.stringify(result, null, 2),
      },
      { quoted: msg },
    );
  },
};
