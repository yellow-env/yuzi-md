import { addThumb } from "../utils/thumb_store.js";

export default {
  package: "Save Preview Thumbnail",
  command: ["svthumb"],
  owner_only: true,
  description: "Simpan preview thumbnail + metadata link",
  category: "tools",

  async run(yuzi, msg, { args }) {
    const jid = msg.key.remoteJid;

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const preview = quoted?.extendedTextMessage || quoted;

    if (!preview) {
      return yuzi.sendMessage(
        jid,
        { text: "Reply pesan yang punya link preview." },
        { quoted: msg },
      );
    }

    const name = args[0]?.toLowerCase();
    if (!name) {
      return yuzi.sendMessage(
        jid,
        { text: "Masukkan nama thumbnail." },
        { quoted: msg },
      );
    }

    const hasThumb = preview.jpegThumbnail || preview.thumbnailDirectPath;

    if (!hasThumb) {
      return yuzi.sendMessage(
        jid,
        { text: "Tidak ada thumbnail di preview ini." },
        { quoted: msg },
      );
    }

    const url =
      preview.matchedText ||
      preview.canonicalUrl ||
      preview.contextInfo?.externalAdReply?.sourceUrl ||
      "unknown";

    const data = {
      name,
      url,

      title: preview.title || "",
      description: preview.description || "",

      jpegThumbnail: preview.jpegThumbnail
        ? Buffer.from(preview.jpegThumbnail).toString("base64")
        : null,

      thumbnailDirectPath: preview.thumbnailDirectPath || null,

      thumbnailSha256: preview.thumbnailSha256
        ? Buffer.from(preview.thumbnailSha256).toString("base64")
        : null,

      thumbnailEncSha256: preview.thumbnailEncSha256
        ? Buffer.from(preview.thumbnailEncSha256).toString("base64")
        : null,

      mediaKey: preview.mediaKey
        ? Buffer.from(preview.mediaKey).toString("base64")
        : null,

      mediaKeyTimestamp: preview.mediaKeyTimestamp || null,

      size: {
        width: preview.thumbnailWidth || 0,
        height: preview.thumbnailHeight || 0,
      },
    };

    addThumb(data);

    await yuzi.sendMessage(
      jid,
      {
        text: `Thumbnail "${name}" berhasil disimpan.`,
      },
      { quoted: msg },
    );
  },
};
