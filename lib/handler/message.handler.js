import chalk from "chalk";
import botConfig from "../../config/bot.config.js";
import commandHandler from "./command.handler.js";
import timeNow from "../utils/getTime.js";
import { checkResetMemory, getPendingFollowUp, clearPendingFollowUp, processDueFollowUps } from "../utils/aiMemory.js";
import detectMessage from "../utils/messageType.js";
import saveMedia from "../utils/saveMedia.js";
import { exec } from "child_process";
import os from "os";
import util from "util";
import { guardCheck } from "../utils/guard.js";
import { getRuntime } from "../utils/autoRead.js";
import { AIRich } from "../utils/MessageBuilderV4.4.js";
import { isBanned } from "../utils/bannedGroups.js";
import fs from "fs/promises";
import path from "path";
import messageConfig from "../../config/message.config.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFilePath = path.resolve(__dirname, "../../database/users.json");
const groupStatsPath = path.resolve(
  __dirname,
  "../../database/groupStats.json",
);

async function ensureUserExists(number, lid, pushName) {
  try {
    let users = [];
    try {
      const data = await fs.readFile(usersFilePath, "utf8");
      users = JSON.parse(data);
    } catch {
      users = [];
    }

    const existingIndex = users.findIndex((u) => u.number === number);
    const now = new Date().toISOString();

    if (existingIndex === -1) {
      const newUser = {
        number,
        lid: lid || null,
        pushName,
        firstSeen: now,
        lastSeen: now,
        messageCount: 1,
      };
      users.push(newUser);
    } else {
      users[existingIndex].lastSeen = now;
      users[existingIndex].messageCount += 1;
      if (lid && !users[existingIndex].lid) {
        users[existingIndex].lid = lid;
      }
    }

    await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Failed to ensure user exists:", err.message);
  }
}

async function updateGroupStats(groupId, senderNumber, pushName) {
  try {
    let stats = [];
    try {
      const data = await fs.readFile(groupStatsPath, "utf8");
      stats = JSON.parse(data);
    } catch {
      stats = [];
    }

    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const dayKey = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;

    let groupEntry = stats.find((g) => g.groupId === groupId);
    if (!groupEntry) {
      groupEntry = { groupId, days: [] };
      stats.push(groupEntry);
    }

    let dayEntry = groupEntry.days.find((d) => d.day === dayKey);
    if (!dayEntry) {
      dayEntry = { day: dayKey, users: [] };
      groupEntry.days.push(dayEntry);
    }

    let userEntry = dayEntry.users.find((u) => u.number === senderNumber);
    if (!userEntry) {
      userEntry = { number: senderNumber, pushName, messageCount: 0 };
      dayEntry.users.push(userEntry);
    }

    userEntry.messageCount += 1;
    userEntry.pushName = pushName;

    await fs.writeFile(groupStatsPath, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("Failed to update group stats:", err.message);
  }
}

export default async function messageHandler(yuzi, msg, plugins) {
  try {
    await checkResetMemory();
    await processDueFollowUps(yuzi);
    if (!yuzi.baileys) {
      const { generateWAMessageContent, generateWAMessageFromContent } = yuzi;

      // fallback kalau belum ada (tergantung cara kamu attach di startBot)
      yuzi.baileys = {
        generateWAMessageContent,
        generateWAMessageFromContent,
      };
    }
    if (!msg || !msg.message) return;
    const runtime = getRuntime();
    if (runtime.autoRead) {
      await yuzi.readMessages([msg.key]);
    }
    if (msg.key?.fromMe) return;
    if (msg.key?.remoteJid === "status@broadcast") return;

    const m = msg.message;

    if (m.protocolMessage) return;
    if (m.senderKeyDistributionMessage) return;

    const jid = msg.key.remoteJid || "";

    const isGroup = jid.endsWith("@g.us");

    const participantAlt =
      msg.key.participantAlt || msg.key.participantPn || "";

    const participant = msg.key.participant || "";

    const senderPn = msg.key.senderPn || "";

    let lid = null;
    let senderNumber = null;

    if (isGroup) {
      if (participantAlt) {
        senderNumber = participantAlt.split("@")[0].split(":")[0];

        if (participantAlt.endsWith("@lid")) {
          lid = participantAlt;
        }
      } else if (participant) {
        senderNumber = participant.split("@")[0].split(":")[0];

        if (participant.endsWith("@lid")) {
          lid = participant;
        }
      }
    } else {
      if (jid.endsWith("@lid")) {
        lid = jid;

        if (msg.key.remoteJidAlt) {
          senderNumber = msg.key.remoteJidAlt.split("@")[0].split(":")[0];
        } else if (senderPn) {
          senderNumber = senderPn.split("@")[0].split(":")[0];
        } else if (participantAlt) {
          senderNumber = participantAlt.split("@")[0].split(":")[0];
        } else {
          senderNumber = jid.split("@")[0].split(":")[0];
        }
      } else {
        senderNumber = jid.split("@")[0].split(":")[0];
      }
    }

    senderNumber = String(senderNumber || "").replace(/\D/g, "");

    if (!senderNumber) {
      return;
    }

    const isOwner = botConfig.ownerNum.some(
      (num) => String(num).replace(/\D/g, "") === senderNumber,
    );

    if (runtime.self && !isOwner) return;
    msg.reply = async (text) => {
      return await yuzi.sendMessage(jid, { text }, { quoted: msg });
    };

    msg.react = async (emoji = "👍", key = msg.key) => {
      try {
        return await yuzi.sendMessage(jid, {
          react: {
            text: emoji,
            key,
          },
        });
      } catch (err) {
        console.error(chalk.red("[-] [ REACT ERROR ]", err));
      }
    };

    const pushName = msg.pushName || "No Name";

    await ensureUserExists(senderNumber, lid, pushName);

    if (isGroup) {
      await updateGroupStats(jid, senderNumber, pushName);
    }

    const interactive =
      m.buttonsResponseMessage?.selectedButtonId ||
      m.listResponseMessage?.singleSelectReply?.selectedRowId ||
      m.interactiveResponseMessage?.body?.text ||
      (() => {
        try {
          const params = JSON.parse(
            m.interactiveResponseMessage?.nativeFlowResponseMessage
              ?.paramsJson || "{}",
          );

          return (
            params.id ||
            params.selectedId ||
            params.selectedRowId ||
            params.command ||
            ""
          );
        } catch {
          return "";
        }
      })();

    const body =
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      interactive ||
      "";

    const dataMsg = detectMessage(msg);

    const isCmd = body && body.startsWith(botConfig.prefix);

    const command = isCmd
      ? body.slice(botConfig.prefix.length).trim().split(" ")[0].toLowerCase()
      : "";

    const args = isCmd
      ? body.slice(botConfig.prefix.length).trim().split(" ").slice(1)
      : [];

    let isAdmin = false;
    let isBotAdmin = false;
    let isTagged = false;

    if (isGroup) {
      try {
        const m = msg.message;

        const metadata = await yuzi.groupMetadata(jid);
        const participants = metadata.participants || [];

        const normalize = (id = "") => {
          if (!id) return "";
          return id.replace(/[:@]/g, "_").split("_")[0].split("-")[0];
        };

        // Collect ALL possible bot identifier sources
        const botIdentifiers = [];

        // From yuzi.user - check ALL possible properties
        if (yuzi.user?.id) botIdentifiers.push(yuzi.user.id);
        if (yuzi.user?.jid) botIdentifiers.push(yuzi.user.jid);
        if (yuzi.user?.lid) botIdentifiers.push(yuzi.user.lid);

        // From auth state credentials - try multiple paths
        const creds = yuzi.authState?.creds;
        if (creds?.me?.id) botIdentifiers.push(creds.me.id);
        if (creds?.me?.jid) botIdentifiers.push(creds.me.jid);
        if (creds?.me?.lid) botIdentifiers.push(creds.me.lid);
        if (creds?.me?.phone)
          botIdentifiers.push(creds.me.phone + "@s.whatsapp.net");

        // Derived formats - generate ALL possible JID variations
        for (const id of [...botIdentifiers]) {
          const num = id.split("@")[0].split(":")[0];
          if (num) {
            botIdentifiers.push(num + "@s.whatsapp.net");
            botIdentifiers.push(num + "@lid");
            botIdentifiers.push(num + ":0@s.whatsapp.net");
            botIdentifiers.push(num + ":1@s.whatsapp.net");
            // Try to extract secondary number from LID format (e.g., 1234567890-9876543210@lid)
            if (id.includes("-")) {
              const parts = id.split("-");
              const secondNum = parts[1]?.split("@")[0];
              if (secondNum) {
                botIdentifiers.push(num + "-" + secondNum + "@lid");
                botIdentifiers.push(num + "-" + secondNum + "@s.whatsapp.net");
              }
            }
          }
        }

        // Normalize all bot identifiers
        const normalizedBotIds = new Set(
          botIdentifiers.map(normalize).filter(Boolean),
        );

        // Find sender participant
        const senderLid = msg.key.participant;
        const senderPnAlt = msg.key.participantAlt || msg.key.participantPn;
        const senderIdentifiers = [senderLid];
        if (senderPnAlt) senderIdentifiers.push(senderPnAlt);

        const normalizedSenderIds = new Set(
          senderIdentifiers.map(normalize).filter(Boolean),
        );

        let sender = null;
        let bot = null;

        // Single pass through all participants
        for (const p of participants) {
          const pid = p.id || p.jid || "";
          const normalizedPid = normalize(pid);

          // Check if this is the sender
          if (!sender) {
            if (pid === senderLid || pid === senderPnAlt) {
              sender = p;
            } else if (normalizedSenderIds.has(normalizedPid)) {
              sender = p;
            }
          }

          // Check if this is the bot - try exact match first, then normalized
          if (!bot) {
            if (botIdentifiers.includes(pid)) {
              bot = p;
            } else if (normalizedBotIds.has(normalizedPid)) {
              bot = p;
            }
          }

          // Early exit if both found
          if (sender && bot) break;
        }

        isAdmin = sender?.admin === "admin" || sender?.admin === "superadmin";
        isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";

        // console.log(
        //   " │  Bot Info :",
        //   "yuzi.user.id =",
        //   yuzi.user?.id,
        //   "| botLid =",
        //   yuzi.user?.lid,
        //   "=>",
        //   chalk.cyan(normalizedBotIds.size + " variations"),
        // );
        // console.log(
        //   " │  Match result: sender =",
        //   chalk.cyan(sender?.id || sender?.jid || "NOT FOUND"),
        //   "| bot =",
        //   chalk.cyan(bot?.id || bot?.jid || "NOT FOUND"),
        // );

        const text =
          m?.conversation ||
          m?.extendedTextMessage?.text ||
          m?.imageMessage?.caption ||
          m?.videoMessage?.caption ||
          "";

        const context =
          m?.extendedTextMessage?.contextInfo ||
          m?.imageMessage?.contextInfo ||
          m?.videoMessage?.contextInfo ||
          {};

        const mentioned = context?.mentionedJid || [];

        // Get bot's exact participant ID from group (most reliable)
        const botParticipantId = bot ? bot.id || bot.jid : null;
        const normalizedBotId = normalize(botParticipantId);
        const botNumber = normalize(botParticipantId);

        // console.log(
        //   " │  Bot participant:",
        //   bot ? "found" : "NOT FOUND",
        //   "=>",
        //   botParticipantId,
        //   "normalized:",
        //   normalizedBotId,
        // );
        // console.log(" │  Mentioned:", mentioned.map(normalize));

        // 1) Official WhatsApp mention (contextInfo)
        const isTaggedMention = mentioned.some((j) => {
          const n = normalize(j);
          return n === normalizedBotId || n === botNumber;
        });

        // 2) Plain text fallback: @number, or number alone
        const isTaggedText =
          text.includes(botNumber) ||
          text.includes("@" + botNumber) ||
          text.includes(normalizedBotId) ||
          text.includes("@" + normalizedBotId);

        isTagged = isTaggedMention || isTaggedText;

        // console.log(
        //   " │  Tag check:",
        //   chalk.yellow("isTaggedMention = " + isTaggedMention),
        //   "|",
        //   chalk.yellow("isTaggedText = " + isTaggedText),
        //   "=>",
        //   chalk.green("isTagged = " + isTagged),
        // );

        // if (isTagged) {
        //   console.log("\n" + "═".repeat(40));
        //   console.log("🚨 BOT TAG DETECTED");
        //   console.log("═".repeat(40));
        //   console.log("JID      :", jid);
        //   console.log("FROM     :", msg.pushName);
        //   console.log("TEXT     :", text);
        //   console.log("MENTION  :", mentioned);
        //   console.log("BOT PARTICIPANT  :", botParticipantId);
        //   console.log("BOT NUM  :", botNumber);
        //   console.log("RAW MSG  :", JSON.stringify(msg.key, null, 2));
        //   console.log("═".repeat(40) + "\n");
        // }
      } catch (err) {
        console.log("Failed get group metadata:", err.message);
      }
    }

    await saveMedia(yuzi, msg);

    console.log(" │");
    console.log(
      chalk.green("[") + chalk.yellow("*") + chalk.green("]"),
      chalk.gray(`[${timeNow()}]`),
      chalk.cyan("New message Received!"),
    );

    console.log(
      " │  Type     : " +
        chalk.magenta(jid.endsWith("@g.us") ? "Group Chat" : "Private Chat"),
    );

    console.log(" │  From     : " + chalk.green.bold(pushName));

    console.log(
      " │  Text     : " + chalk.white(body || dataMsg.content || "-"),
    );

    console.log(" │");

    const safePlugins = Array.isArray(plugins) ? plugins : [];

    if (isGroup && isTagged && !isCmd) {
      const aiPlugin = safePlugins.find((p) => p.command?.includes("yuzi"));

      if (aiPlugin) {
        const banned = await isBanned(jid);

        if (banned) {
          if (!isOwner) return;
        }
        await yuzi.sendPresenceUpdate("composing", jid);

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          "";

        const cleaned = text
          .replace(/@\d+/g, "") // hapus mention
          .trim();

        await commandHandler(yuzi, msg, {
          jid,
          body: text,
          isOwner,
          command: "yuzi",
          isGroup,
          isTagged,
          isAdmin,
          isBotAdmin,
          args: cleaned.split(" "),
          pushName,
          fromMe: msg.key?.fromMe,
          plugins: safePlugins,
        });

        return;
      }
    }

    const isExec = body.startsWith("$");

    if (isExec) {
      await yuzi.sendPresenceUpdate("composing", jid);
      if (isGroup) {
        const banned = await isBanned(jid);

        if (banned && !isOwner) return;
      }

      if (!isOwner) {
        return await yuzi.sendMessage(jid, {
          text: messageConfig.ownerOnly,
        });
      }

      const cmd = body.slice(1).trim();

      if (!cmd) {
        return msg.reply("Masukkan command.");
      }

      const platform = os.platform();

      const shell =
        platform === "win32"
          ? process.env.ComSpec || "cmd.exe"
          : process.env.SHELL || "/bin/sh";

      exec(
        cmd,
        {
          shell,
          timeout: 60000,
          maxBuffer: 1024 * 1024 * 10,
          windowsHide: true,
        },
        async (error, stdout, stderr) => {
          let result = "";

          if (error) {
            result += error.message + "\n";
          }

          if (stderr) {
            result += stderr + "\n";
          }

          if (stdout) {
            result += stdout;
          }

          if (!result.trim()) {
            result = "Done.";
          }

          const lang =
            platform === "win32"
              ? "powershell"
              : platform === "darwin"
                ? "zsh"
                : "bash";

          const rich = new AIRich(yuzi)
            .setTitle("Terminal Response")
            .addTable([
              ["Property", "Value"],
              ["Platform", platform],
              ["Shell", shell],
              ["Command", cmd],
              ["Status", error ? "Error" : "Success"],
            ])
            .addCode(lang, result.slice(0, 12000));

          if (error) {
            rich.addText(`[Node.js Docs](https://nodejs.org/api/errors.html)`);
          }

          await rich.send(jid, {
            quoted: msg,
          });
        },
      );

      return;
    }

    const isEval = body.startsWith(">");

    const context = msg.message?.extendedTextMessage?.contextInfo;

    if (context?.quotedMessage) {
      const quotedJid = context.participant || context.remoteJid;

      const quotedNumber = quotedJid?.split("@")[0];

      msg.quoted = {
        key: {
          remoteJid: jid,
          participant: quotedJid,
        },
        message: context.quotedMessage,
        sender: quotedNumber,
        pushName: context.participantPn || "No Name",
        text:
          context.quotedMessage?.conversation ||
          context.quotedMessage?.extendedTextMessage?.text ||
          context.quotedMessage?.imageMessage?.caption ||
          context.quotedMessage?.videoMessage?.caption ||
          "",
        isGroup,
      };
    } else {
      msg.quoted = null;
    }

    if (isEval) {
      if (
        await guardCheck(yuzi, msg, {
          isOwner,
          jid,
          pushName,
          body,
        })
      )
        if (isGroup) {
          const banned = await isBanned(jid);

          if (banned) {
            if (!isOwner) return;
          }
        }
      if (!isOwner) {
        await yuzi.sendMessage(jid, { text: "Owner only." });
        return;
      }

      let code = body.slice(1).trim();

      if (!code) {
        return msg.reply("Masukkan kode.");
      }

      try {
        // support multiline & auto return
        const asyncCode = `(async () => {
      ${code.includes("\n") ? code : `return ${code}`}
    })()`;

        let result = await eval(asyncCode);

        if (typeof result !== "string") {
          result = util.inspect(result, { depth: 3 });
        }

        await yuzi.sendMessage(
          jid,
          {
            text: `${result.slice(0, 3500)}`,
          },
          { quoted: msg },
        );
      } catch (err) {
        await yuzi.sendMessage(
          jid,
          {
            text: `*❌ Error: *\`\`\`${err.message}\`\`\``,
          },
          { quoted: msg },
        );
      }

      return;
    }

    if (isCmd) {
      if (
        await guardCheck(yuzi, msg, {
          isOwner,
          jid,
          pushName,
          body,
        })
      )
        return;

      if (isGroup) {
        const banned = await isBanned(jid);

        if (banned) {
          if (!isOwner) return;
        }
      }

      await yuzi.sendPresenceUpdate("composing", jid);

      await commandHandler(yuzi, msg, {
        jid,
        body,
        isOwner,
        command,
        isGroup,
        isTagged,
        isAdmin,
        isBotAdmin,

        args,
        pushName,
        fromMe: msg.key?.fromMe,
        plugins: safePlugins,
      });
    }

    if (!isGroup && isOwner && !isCmd && !isExec && !isEval && body.trim()) {
      const pending = await getPendingFollowUp(senderNumber);
      if (pending) {
        await clearPendingFollowUp(senderNumber);
        console.log(
          chalk.cyan(`[>] [ Yuzi AI ]`),
          chalk.gray(`[${timeNow()}]`),
          chalk.green("Owner replied to pending topic, follow-up cancelled"),
        );
      }

      const aiPlugin = safePlugins.find((p) => p.command?.includes("yuzi"));

      if (aiPlugin) {
        console.log(
          chalk.cyan(`[*] [ Yuzi AI ]`),
          chalk.gray(`[${timeNow()}]`),
          chalk.magenta("Processing owner private chat as AI"),
        );

        const text =
          m?.conversation ||
          m?.extendedTextMessage?.text ||
          m?.imageMessage?.caption ||
          m?.videoMessage?.caption ||
          "";

        await yuzi.sendPresenceUpdate("composing", jid);

        await commandHandler(yuzi, msg, {
          jid,
          body: text,
          isOwner: true,
          command: "yuzi",
          isGroup: false,
          isTagged: false,
          isAdmin: false,
          isBotAdmin: false,
          args: text.split(" "),
          pushName,
          fromMe: msg.key?.fromMe,
          plugins: safePlugins,
        });
      }
    }
  } catch (err) {
    if (
      err.message?.includes("Cannot destructure property 'user' of 'jidDecode")
    ) {
      return;
    }
    if (
      err.message?.includes("Cannot destructure property 'jid' of 'undefined'")
    ) {
      return;
    }
    console.log(chalk.red("Message Handler Error:"), err.message);
  }
}
