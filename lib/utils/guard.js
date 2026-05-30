// ./lib/utils/guard.js

import botConfig from "../../config/bot.config.js";
import timeNow from "./getTime.js";
import chalk from "chalk";

const users = new Map();

export async function guardCheck(
  yuzi,
  msg,
  {
    isOwner = false,
    max = 3,
    windowMs = 5000,
    cooldownMs = 30000,
    jid = "",
    pushName = "Unknown",
    body = "",
  } = {},
) {
  try {
    if (isOwner) {
      return false;
    }

    const senderJid =
      msg.key.participantAlt ||
      msg.key.remoteJidAlt ||
      msg.key.participant ||
      msg.key.remoteJid;

    const sender = senderJid?.split("@")[0]?.split(":")[0];

    if (!sender) {
      return false;
    }

    const now = Date.now();

    if (!users.has(sender)) {
      users.set(sender, {
        count: 1,
        firstMessage: now,
        cooldownUntil: 0,
        notified: false,
      });

      return false;
    }

    const user = users.get(sender);

    if (now < user.cooldownUntil) {
      const remaining = Math.ceil((user.cooldownUntil - now) / 1000);

      await msg.react("❌");

      return true;
    }

    if (now - user.firstMessage > windowMs) {
      user.count = 1;
      user.firstMessage = now;
      user.cooldownUntil = 0;
      user.notified = false;

      return false;
    }

    user.count++;

    if (user.count >= max) {
      user.cooldownUntil = now + cooldownMs;

      const remaining = Math.ceil(cooldownMs / 1000);

      if (!user.notified) {
        user.notified = true;

        const ownerJid =
          String(botConfig.ownerNum[0]).replace(/\D/g, "") + "@s.whatsapp.net";

        console.log(" │");

        console.log(
          chalk.red("[!]"),
          chalk.cyan("[ HOSHINO GUARD ]"),
          chalk.red("SPAM DETECTED!"),
        );

        console.log(
          " │",
          chalk.red("  Type     :"),
          chalk.yellow(jid.endsWith("@g.us") ? "Group Chat" : "Private Chat"),
        );

        console.log(" │", chalk.red("  From     :"), chalk.green(pushName));

        console.log(" │", chalk.red("  Number   :"), chalk.yellow(sender));

        console.log(
          " │",
          chalk.red("  Text     :"),
          chalk.white(
            body ||
              msg.body ||
              msg.text ||
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              "-",
          ),
        );

        console.log(" │", chalk.red("  Time     :"), chalk.yellow(timeNow()));

        console.log(" │");

        await msg.react("❌");

        await yuzi.sendMessage(ownerJid, {
          text:
            `⚠️ Spam detected\n\n` +
            `User: ${pushName}\n` +
            `Number: ${sender}\n` +
            `Messages: ${user.count}\n` +
            `Cooldown: ${remaining}s` +
            `Text: ${
              body ||
              msg.body ||
              msg.text ||
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              "-"
            }`,
        });
      }

      return true;
    }

    return false;
  } catch (err) {
    console.error(chalk.red("[-] [ HOSHINO GUARD ]"), err);

    return false;
  }
}

setInterval(() => {
  const now = Date.now();

  for (const [jid, data] of users.entries()) {
    if (now - data.firstMessage > 10 * 60 * 1000 && now > data.cooldownUntil) {
      users.delete(jid);
    }
  }
}, 60 * 1000);
