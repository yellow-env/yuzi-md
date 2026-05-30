import botConfig from "../../config/bot.config.js";
import { getThumb } from "../utils/thumb_store.js";

const Baileys = await import(botConfig.baileys);

const generateWAMessageFromContent =
  Baileys.generateWAMessageFromContent ||
  Baileys.default?.generateWAMessageFromContent;

export default {
  package: "Send Preview Thumbnail",
  command: ["sendthumb"],
  owner_only: true,
  description: "Kirim preview thumbnail",
  category: "tools",

  async run(yuzi, msg, { args }) {
    const jid = msg.key.remoteJid;

    const name = args[0]?.toLowerCase();

    if (!name) {
      return await yuzi.sendMessage(
        jid,
        {
          text: "Masukkan nama thumbnail.",
        },
        { quoted: msg },
      );
    }

    const data = getThumb(name);

    if (!data) {
      return await yuzi.sendMessage(
        jid,
        {
          text: "Thumbnail tidak ditemukan.",
        },
        { quoted: msg },
      );
    }

    const message = generateWAMessageFromContent(
      jid,
      {
        extendedTextMessage: {
          text: data.url || "https://chat.whatsapp.com",

          matchedText: data.url || "https://chat.whatsapp.com",

          title: data.title,

          description: data.description,

          previewType: 1,

          inviteLinkGroupTypeV2: 0,

          jpegThumbnail: Buffer.from(data.jpegThumbnail, "base64"),

          thumbnailDirectPath: data.thumbnail?.thumbnailDirectPath,

          thumbnailSha256: data.thumbnail?.thumbnailSha256
            ? Buffer.from(data.thumbnail.thumbnailSha256, "base64")
            : undefined,

          thumbnailEncSha256: data.thumbnail?.thumbnailEncSha256
            ? Buffer.from(data.thumbnail.thumbnailEncSha256, "base64")
            : undefined,

          mediaKey: data.thumbnail?.mediaKey
            ? Buffer.from(data.thumbnail.mediaKey, "base64")
            : undefined,

          mediaKeyTimestamp: data.thumbnail?.mediaKeyTimestamp,

          thumbnailHeight: data.thumbnail?.thumbnailHeight,

          thumbnailWidth: data.thumbnail?.thumbnailWidth,

          faviconMMSMetadata: data.favicon
            ? {
                thumbnailDirectPath: data.favicon.thumbnailDirectPath,

                thumbnailSha256: data.favicon.thumbnailSha256
                  ? Buffer.from(data.favicon.thumbnailSha256, "base64")
                  : undefined,

                thumbnailEncSha256: data.favicon.thumbnailEncSha256
                  ? Buffer.from(data.favicon.thumbnailEncSha256, "base64")
                  : undefined,

                mediaKey: data.favicon.mediaKey
                  ? Buffer.from(data.favicon.mediaKey, "base64")
                  : undefined,

                mediaKeyTimestamp: data.favicon.mediaKeyTimestamp,

                thumbnailHeight: data.favicon.thumbnailHeight,

                thumbnailWidth: data.favicon.thumbnailWidth,
              }
            : undefined,
        },
      },
      {},
    );

    await yuzi.relayMessage(jid, message.message, {});
  },
};
