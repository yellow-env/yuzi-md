import chalk from "chalk";
import messageConfig from "../../config/message.config.js";

function levenshtein(a, b) {
  if (typeof a !== "string") {
    a = String(a || "");
  }

  if (typeof b !== "string") {
    b = String(b || "");
  }

  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function findClosest(input, commands) {
  if (typeof input !== "string" || !Array.isArray(commands)) {
    return null;
  }

  let best = null;
  let min = Infinity;

  for (const cmd of commands) {
    if (typeof cmd !== "string") {
      continue;
    }

    const dist = levenshtein(input.toLowerCase(), cmd.toLowerCase());

    if (dist < min) {
      min = dist;
      best = cmd;
    }
  }

  return min <= 3 ? best : null;
}

export default async function commandHandler(yuzi, msg, ctx = {}) {
  const safeCtx = {
    jid: ctx.jid || msg?.key?.remoteJid || "",

    body: typeof ctx.body === "string" ? ctx.body : "",

    command: typeof ctx.command === "string" ? ctx.command.toLowerCase() : "",

    isOwner: ctx.isOwner === true,

    isGroup: ctx.isGroup === true,

    isAdmin: ctx.isAdmin === true,

    isBotAdmin: ctx.isBotAdmin === true,

    args: Array.isArray(ctx.args) ? ctx.args : [],

    pushName: typeof ctx.pushName === "string" ? ctx.pushName : "User",

    fromMe: ctx.fromMe === true,

    plugins: Array.isArray(ctx.plugins) ? ctx.plugins : [],
  };

  const plugins = safeCtx.plugins;

  const input = safeCtx.command;

  if (!input) {
    return;
  }

  const plugin = plugins.find((p) => {
    if (!Array.isArray(p.command)) {
      return false;
    }

    return p.command.map((cmd) => String(cmd).toLowerCase()).includes(input);
  });

  if (plugin) {
    if (plugin.owner_only && !safeCtx.isOwner) {
      await yuzi.sendMessage(
        safeCtx.jid,
        {
          text: messageConfig.ownerOnly,
        },
        {
          quoted: msg,
        },
      );

      return;
    }

    try {
      // console.log(chalk.cyan(`[ COMMAND ] ${input}`));

      if (plugin.group_only && !safeCtx.isGroup) {
        await yuzi.sendMessage(
          safeCtx.jid,
          {
            text: messageConfig.groupOnly,
          },
          {
            quoted: msg,
          },
        );

        return;
      }

      if (plugin.private_only && safeCtx.isGroup) {
        await yuzi.sendMessage(
          safeCtx.jid,
          {
            text: messageConfig.privateOnly,
          },
          {
            quoted: msg,
          },
        );

        return;
      }

      return await plugin.run(yuzi, msg, safeCtx);
    } catch (e) {
      console.log(chalk.red(`[-] [COMMAND ERROR]`), `${input}`);

      console.error(e);

      await yuzi.sendMessage(
        safeCtx.jid,
        {
          text: e?.stack || e?.message || String(e),
        },
        {
          quoted: msg,
        },
      );

      return;
    }
  }

  const allCommands = plugins.flatMap((p) =>
    Array.isArray(p.command) ? p.command : [],
  );

  const suggestion = findClosest(input, allCommands);

  if (suggestion) {
    await yuzi.sendMessage(
      safeCtx.jid,
      {
        text: `Command tidak ditemukan\n` + `Mungkin: .${suggestion}`,
      },
      {
        quoted: msg,
      },
    );
  }
}
