import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import botConfig from "../../config/bot.config.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const memoryPath = path.resolve(__dirname, "../../database/aiMemory.json");

async function loadMemory() {
  try {
    const data = await fs.readFile(memoryPath, "utf8");
    const parsed = JSON.parse(data);

    return {
      groups: parsed.groups || {},
      private: parsed.private || {},
      followUps: parsed.followUps || {},
      lastReset: parsed.lastReset || null,
    };
  } catch {
    return {
      groups: {},
      private: {},
      followUps: {},
      lastReset: null,
    };
  }
}

async function saveMemory(data) {
  await fs.writeFile(memoryPath, JSON.stringify(data, null, 2));
}

export async function checkResetMemory() {
  const data = await loadMemory();

  const today = new Date().toISOString().slice(0, 10);

  if (data.lastReset !== today) {
    data.groups = {};
    data.private = {};
    data.lastReset = today;

    await saveMemory(data);
    console.log(chalk.yellow("[*] [ YUZI AI ] Memory direset (00:00)"));
  }
}

export async function getMemory(jid) {
  const data = await loadMemory();

  if (jid.endsWith("@g.us")) {
    return data.groups?.[jid]?.chat || [];
  }

  return data.private?.[jid] || [];
}

export async function pushMemory(jid, user, role, content, extra = {}) {
  const data = await loadMemory();

  if (!data.groups) data.groups = {};
  if (!data.private) data.private = {};

  const entry = {
    role,
    content,
    sender: extra.sender || user,
    name: extra.name || "unknown",
    quoted: extra.quoted || null,
    time: Date.now(),
  };

  if (jid.endsWith("@g.us")) {
    if (!data.groups[jid]) {
      data.groups[jid] = { chat: [] };
    }

    if (!Array.isArray(data.groups[jid].chat)) {
      data.groups[jid].chat = [];
    }

    data.groups[jid].chat.push(entry);

    data.groups[jid].chat = data.groups[jid].chat.slice(-25);
  } else {
    if (!data.private[user]) {
      data.private[user] = [];
    }

    if (!Array.isArray(data.private[user])) {
      data.private[user] = [];
    }

    data.private[user].push(entry);

    data.private[user] = data.private[user].slice(-20);
  }

  await saveMemory(data);
}

export async function setPendingFollowUp(userNumber, topic, scheduledTime) {
  const data = await loadMemory();
  if (!data.followUps) data.followUps = {};
  data.followUps[userNumber] = {
    topic,
    scheduledTime,
    createdAt: Date.now(),
  };
  await saveMemory(data);
}

export async function getPendingFollowUp(userNumber) {
  const data = await loadMemory();
  return data.followUps?.[userNumber] || null;
}

export async function clearPendingFollowUp(userNumber) {
  const data = await loadMemory();
  if (data.followUps && data.followUps[userNumber]) {
    delete data.followUps[userNumber];
    await saveMemory(data);
  }
}

export async function scheduleFollowUpIfNeeded(yuzi, userNumber, topic, context = "") {
  const data = await loadMemory();
  const existing = data.followUps?.[userNumber];
  if (existing) {
    const remainingMs = existing.scheduledTime - Date.now();
    const remainingMin = Math.max(0, Math.round(remainingMs / 60000));
    console.log(
      chalk.yellow(`[!] [ Yuzi AI ]`),
      chalk.gray(`[${new Date().toLocaleTimeString("id-ID", { hour12: false })}]`),
      chalk.magenta(`Follow-up already scheduled, next question in ${remainingMin} minutes`),
    );
    return;
  }

  const evalContext = typeof context === "string" ? context.toLowerCase() : "";
  const hasQuestionMark = evalContext.includes("?") || evalContext.endsWith("?");

  if (!hasQuestionMark) return;

  const waitMinutes = Math.floor(Math.random() * 30) + 15;
  const scheduledTime = Date.now() + waitMinutes * 60000;

  await setPendingFollowUp(userNumber, topic, scheduledTime);
  console.log(
    chalk.cyan(`[+] [ Yuzi AI ]`),
    chalk.gray(`[${new Date().toLocaleTimeString("id-ID", { hour12: false })}]`),
    chalk.green(`Follow-up scheduled, next question in ~${waitMinutes} minutes`),
  );
}

export async function processDueFollowUps(yuzi) {
  const data = await loadMemory();
  const now = Date.now();
  const followUps = data.followUps || {};

  const pendingEntries = Object.entries(followUps).filter(
    ([, followUp]) => followUp.scheduledTime > now,
  );

  if (pendingEntries.length > 0) {
    for (const [userNumber, followUp] of pendingEntries) {
      const remainingMs = followUp.scheduledTime - now;
      const remainingMin = Math.max(0, Math.round(remainingMs / 60000));
      console.log(
        chalk.cyan(`[*] [ Yuzi AI ]`),
        chalk.gray(`[${new Date().toLocaleTimeString("id-ID", { hour12: false })}]`),
        chalk.magenta(`Next follow-up for ${userNumber} in ${remainingMin} minutes`),
      );
    }
  }

  for (const [userNumber, followUp] of Object.entries(followUps)) {
    if (followUp.scheduledTime <= now) {
      console.log(
        chalk.cyan(`[*] [ Yuzi AI ]`),
        chalk.gray(`[${new Date().toLocaleTimeString("id-ID", { hour12: false })}]`),
        chalk.magenta("Processing follow-up for owner"),
      );

      const ownerJid = botConfig.ownerNum[0] + "@s.whatsapp.net";
      try {
        await yuzi.sendMessage(ownerJid, {
          text: `_eh btw, masih ingin nambahin sesuatu nih? atau udahan aja?_\n\n_${followUp.topic}_`,
        });
        console.log(
          chalk.green(`[+] [ Yuzi AI ]`),
          chalk.gray(`[${new Date().toLocaleTimeString("id-ID", { hour12: false })}]`),
          chalk.green("Follow-up sent"),
        );
      } catch (err) {
        console.log(
          chalk.red(`[!] [ Yuzi AI ]`),
          chalk.gray(`[${new Date().toLocaleTimeString("id-ID", { hour12: false })}]`),
          chalk.red("Follow-up send failed"),
        );
      }

      delete data.followUps[userNumber];
    }
  }

  await saveMemory(data);
}
