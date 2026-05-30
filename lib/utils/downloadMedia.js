import { downloadContentFromMessage } from "@whiskeysockets/baileys";

/**
 * Universal Media Downloader for Baileys forks
 */
export default async function downloadMedia(msg, type = "image") {
  try {
    const message =
      msg.message?.imageMessage ||
      msg.message?.videoMessage ||
      msg.message?.audioMessage ||
      msg.message?.stickerMessage ||
      msg.message?.documentMessage ||
      msg;

    // CASE 1: Standard Baileys stream method
    if (downloadContentFromMessage) {
      const stream = await downloadContentFromMessage(message, type);

      let buffer = Buffer.from([]);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      return buffer;
    }

    // CASE 2: Some forks expose direct data
    if (message?.directPath) {
      const axios = (await import("axios")).default;

      const url = message.url || message.directPath;

      const res = await axios.get(url, {
        responseType: "arraybuffer",
      });

      return Buffer.from(res.data);
    }

    throw new Error("No compatible media downloader found");
  } catch (err) {
    throw new Error("Download media failed: " + err.message);
  }
}
