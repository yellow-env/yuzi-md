export default function detectMessage(msg) {
  const message = msg.message || {};

  if (message.conversation) {
    return {
      type: "text",
      content: message.conversation,
    };
  }

  if (message.extendedTextMessage?.text) {
    return {
      type: "text",
      content: message.extendedTextMessage.text,
    };
  }

  if (message.imageMessage) {
    return {
      type: "photo",
      content: "[📸 Photo] 1x",
      file_id: message.imageMessage?.mediaKey || "-",
    };
  }

  if (message.audioMessage) {
    return {
      type: message.audioMessage.ptt ? "voice" : "audio",
      content: message.audioMessage.ptt ? "[🎤 Voice] 1x" : "[🎵 Audio] 1x",
      file_id: message.audioMessage?.mediaKey || "-",
    };
  }

  if (message.videoMessage) {
    return {
      type: "video",
      content: "[🎥 Video] 1x",
      file_id: message.videoMessage?.mediaKey || "-",
    };
  }

  if (message.stickerMessage) {
    return {
      type: "sticker",
      content: "[🔰 Sticker] 1x",
      file_id: message.stickerMessage?.mediaKey || "-",
    };
  }

  if (message.viewOnceMessageV2 || message.viewOnceMessage) {
    const inner = message.viewOnceMessageV2 || message.viewOnceMessage;
    if (inner.imageMessage) {
      return {
        type: "viewOnceImage",
        content: "[👁️ View Once Image] 1x",
        file_id: inner.imageMessage?.mediaKey || "-",
      };
    }
    if (inner.videoMessage) {
      return {
        type: "viewOnceVideo",
        content: "[👁️ View Once Video] 1x",
        file_id: inner.videoMessage?.mediaKey || "-",
      };
    }
  }

  if (message.documentMessage) {
    return {
      type: "document",
      content: "[📁 Document] 1x",
      file_id: message.documentMessage?.mediaKey || "-",
    };
  }

  if (message.locationMessage) {
    return {
      type: "location",
      content: "[📍 Location] 1x",
    };
  }

  if (message.contactMessage) {
    return {
      type: "contact",
      content: "[👤 Contact] 1x",
    };
  }

  return {
    type: "unknown",
    content: "[❓ Unsupported media] 1x",
  };
}
