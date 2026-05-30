import axios from "axios";
import chalk from "chalk";
import botConfig from "../../config/bot.config.js";
import { getMemory, pushMemory, setPendingFollowUp, getPendingFollowUp, scheduleFollowUpIfNeeded } from "../utils/aiMemory.js";
import timeNow from "../utils/getTime.js";

const OWNER_NAME = botConfig.owner || "Owner";
const AI_GENDER = botConfig.aiGender || "female";
const AI_AGE = botConfig.aiAge || "18";
const AI_PERSONALITY = botConfig.aiPersonality || ["serious", "formal"];
const AI_CHAT_GENRE = botConfig.aiChatGenre || ["ai chat"];
const botName = botConfig.botName || "Yuzi";

export default {
  name: "Yuzi AI",
  command: ["yuzi"],
  private_only: true,
  category: "ai",
  async run(yuzi, msg, { jid, isGroup, isOwner, args, pushName, isTagged }) {
    try {
      const m = msg.message;
      const sender = msg.key.participant || jid;
      const userNumber = sender.split("@")[0];

      const quotedMsg = m?.extendedTextMessage?.contextInfo?.quotedMessage;

      const quotedText =
        quotedMsg?.extendedTextMessage?.text ||
        quotedMsg?.conversation ||
        quotedMsg?.imageMessage?.caption ||
        quotedMsg?.videoMessage?.caption ||
        null;

      const quotedSender =
        m?.extendedTextMessage?.contextInfo?.participant || null;

      const history = await getMemory(jid, userNumber);

      const historyText = history
        .map((m) => {
          let base = `${m.role === "user" ? m.name || "User" : "AI"}: ${m.content}`;

          if (m.quoted) {
            base += `\n↳ reply to: "${m.quoted.text}" (${m.quoted.sender})`;
          }

          return base;
        })
        .join("\n");

      const text =
        m?.conversation ||
        m?.extendedTextMessage?.text ||
        m?.imageMessage?.caption ||
        m?.videoMessage?.caption ||
        "";

      const query = args.length > 0 ? args.join(" ") : text;

      if (isGroup && !isTagged && args.length === 0) return;

      const hasMention = text.includes("@");
      const startsWithMention = text.trim().startsWith("@");

      const invalidFormat = hasMention && !startsWithMention;

      if (invalidFormat) return;

      const personalityText = Array.isArray(AI_PERSONALITY)
        ? AI_PERSONALITY.join(", ")
        : AI_PERSONALITY;

      const genreText = Array.isArray(AI_CHAT_GENRE)
        ? AI_CHAT_GENRE.join(", ")
        : AI_CHAT_GENRE;

      const pronoun =
        AI_GENDER === "male"
          ? { self: "aku", user: "kamu" }
          : { self: "aku", user: "kamu" };

      const basePersona = `
Nama kamu: ${botName}

Kamu adalah AI berkepribadian dinamis yang diatur dari config.

Detail karakter:
- Gender: ${AI_GENDER}
- Umur: ${AI_AGE}
- Personality: ${personalityText}
- Genre chat: ${genreText}

Gaya bicara:
- Gunakan "${pronoun.self}" untuk diri sendiri
- Gunakan "${pronoun.user}" untuk user
- Bahasa santai, natural, seperti manusia

Aturan utama:
- Jawaban singkat (maks 2-3 paragraf)
- Jangan terlalu formal
- Ikuti personality dari config secara fleksibel

Kamu bisa membaca konteks percakapan sebelumnya.
Jika ada quoted message, itu adalah pesan yang sedang dibalas user.
Gunakan itu sebagai referensi utama jawaban.
`;

      let systemPrompt = "";

      if (isOwner) {
        systemPrompt = `
${basePersona}
Kamu sedang ngobrol sama ${OWNER_NAME}.
`;
      } else if (isGroup && isTagged) {
        systemPrompt = `
${basePersona}
Kamu di grup dan ditag. Jawab pendek dan cuek.
`;
      } else {
        systemPrompt = `
${basePersona}
Kamu di private chat.
`;
      }

      const finalPrompt = `
${systemPrompt}

Riwayat:
${historyText || "Belum ada"}

Nama user: ${pushName}
Pesan: ${query}

Jawab langsung, pendek, natural. Gunakan format WA kalau perlu:
*bold* _italic_ ~coret~ \`\`\`mono\`\`\` >quote

Jika kamu butuh informasi tambahan untuk memahami situasi, ajukan satu pertanyaan saja. Jangan bertanya untuk berbicara.
`;

      const res = await axios.get(
        `https://api.silentkana.web.id/api/ai/gemini?q=${encodeURIComponent(finalPrompt)}`,
      );

      let result =
        res.data?.result || res.data?.data || res.data?.message || null;

      if (!result || result.trim() === "" || result === "...") {
        result = `_aduh error lagi... nunggu kamu benerin nih~_`;
      }

      await yuzi.sendMessage(jid, { text: result }, { quoted: msg });

      await pushMemory(jid, userNumber, "user", query, {
        sender: userNumber,
        name: pushName,
        quoted: quotedText
          ? {
              text: quotedText,
              sender: quotedSender,
              name: "unknown",
            }
          : null,
      });

      await pushMemory(jid, userNumber, "assistant", result);

      if (!isGroup && isOwner) {
        const hasQuestionMark = result.includes("?");

        if (hasQuestionMark) {
          await scheduleFollowUpIfNeeded(yuzi, userNumber, query, result);
        }
      }
    } catch (err) {
      await yuzi.sendMessage(
        jid,
        { text: "error: " + err.message },
        { quoted: msg },
      );
    }
  },
};
