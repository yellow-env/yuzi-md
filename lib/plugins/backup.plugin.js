import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import chalk from "chalk";
import util from "util";

const execAsync = util.promisify(exec);

export default {
  package: "Backup System",
  command: ["backup"],
  owner_only: true,
  description: "Backup script atau database",
  category: "owner",

  async run(yuzi, msg, { args }) {
    const react = async (emoji) => {
      try {
        await yuzi.sendMessage(msg.key.remoteJid, {
          react: {
            text: emoji,
            key: msg.key,
          },
        });
      } catch {}
    };
    const jid = msg.key.remoteJid;

    const type = args[0]?.toLowerCase();

    await react("⏳");

    if (!type || !["script", "sc", "database", "db"].includes(type)) {
      return await yuzi.sendMessage(
        jid,
        {
          text: "Usage:\n.backup script\n.backup database",
        },
        { quoted: msg },
      );
    }

    const isWindows = os.platform() === "win32";

    const rootDir = process.cwd();

    const backupDir = path.join(rootDir, "tmp_backup");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    await react("📦");

    const timestamp = Date.now();

    let zipName = "";
    let zipPath = "";

    try {
      if (type === "script" || type === "sc") {
        zipName = `script-backup-${timestamp}.zip`;

        zipPath = path.join(backupDir, zipName);

        const ignoreList = [
          "tmp",
          "node_modules",
          "yuzi_session",
          "package-lock.json",
          ".npm",
          ".git",
          ".cache",
          "tmp_backup",
        ];

        if (isWindows) {
          const exclude = ignoreList
            .map((v) => `-xr!${v} -xr!${v}\\*`)
            .join(" ");

          const command = `powershell Compress-Archive -Path * -DestinationPath "${zipPath}" -Force`;

          await execAsync(command, {
            cwd: rootDir,
            shell: true,
          });
        } else {
          const exclude = ignoreList
            .map((v) => `--exclude='${v}' --exclude='${v}/*'`)
            .join(" ");

          const command = `zip -r "${zipPath}" . ${exclude}`;

          await execAsync(command, {
            cwd: rootDir,
          });
        }
      }

      if (type === "database" || type === "db") {
        zipName = `database-backup-${timestamp}.zip`;

        zipPath = path.join(backupDir, zipName);

        const databasePath = path.join(rootDir, "database");

        if (!fs.existsSync(databasePath)) {
          return await yuzi.sendMessage(
            jid,
            {
              text: "Folder database tidak ditemukan.",
            },
            { quoted: msg },
          );
        }

        if (isWindows) {
          const command = `powershell Compress-Archive -Path "database\\*" -DestinationPath "${zipPath}" -Force`;

          await execAsync(command, {
            cwd: rootDir,
            shell: true,
          });
        } else {
          const command = `zip -r "${zipPath}" database`;

          await execAsync(command, {
            cwd: rootDir,
          });
        }
      }

      await react("📤");

      await yuzi.sendMessage(
        jid,
        {
          document: fs.readFileSync(zipPath),
          mimetype: "application/zip",
          fileName: zipName,
          caption: `Backup ${type} berhasil dibuat.`,
        },
        { quoted: msg },
      );

      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }

      await react("✅");
    } catch (e) {
      console.log(chalk.red("[-] [BACKUP]"), e.message);

      await react("❌");

      await yuzi.sendMessage(
        jid,
        {
          text: `Backup gagal.\n\n${e.message}`,
        },
        { quoted: msg },
      );
    }
  },
};
