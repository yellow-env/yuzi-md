import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AIRich } from "../utils/MessageBuilderV4.4.js";
import chalk from "chalk";
import botConfig from "../../config/bot.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGIN_DIR = __dirname;

function getAllPluginFiles(dir) {
  let results = [];

  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(getAllPluginFiles(fullPath));
    } else if (file.endsWith(".js")) {
      results.push(fullPath);
    }
  }

  return results;
}

function detectAccess(code = "") {
  const ownerOnly =
    code.includes("owner_only: true") || code.includes("ownerOnly: true");

  const groupOnly =
    code.includes("group_only: true") || code.includes("groupOnly: true");

  const privateOnly =
    code.includes("private_only: true") || code.includes("privateOnly: true");

  if (ownerOnly) return "owner";
  if (groupOnly) return "group";
  if (privateOnly) return "private";

  return "public";
}

export default {
  name: "Get Plugin",
  command: ["getplugin", "gp"],
  owner_only: true,
  category: "owner",

  async run(yuzi, msg, { jid, args, plugins }) {
    try {
      if (!plugins) {
        return await yuzi.sendMessage(
          jid,
          {
            text: "❌ Plugins tidak tersedia",
          },
          {
            quoted: msg,
          },
        );
      }

      const files = getAllPluginFiles(PLUGIN_DIR);

      const textArgs = args.join(" ").trim();

      const isFileList =
        textArgs.includes("--file-list") || textArgs.includes("--file-lists");

      const fileFlagIndex = args.findIndex((v) => v === "--file");

      if (isFileList) {
        const fileList = {
          success: true,
          bot_name: botConfig.botName,
          version: botConfig.botVersion || "1.0.0",
          total_plugins: files.length,
          plugins_data: [],
        };

        files.forEach((file, i) => {
          const relative = path.relative(PLUGIN_DIR, file);

          let access = "public";

          try {
            const code = fs.readFileSync(file, "utf8");

            access = detectAccess(code);
          } catch {}

          fileList.plugins_data.push({
            index: i + 1,
            file_name: relative,
            access,
          });
        });

        const rich = new AIRich(yuzi)
          .setTitle("Plugin File List")
          .addText(
            [
              `Total Plugin Files : ${fileList.total_plugins}`,
              "",
              "ACCESS TYPE",
              "━━━━━━━━━━━━━━",
              "owner   → Owner only command",
              "group   → Group only command",
              "private → Private chat only",
              "public  → Available everywhere",
              "",
              "JSON PREVIEW",
            ].join("\n"),
          )
          .addCode("json", JSON.stringify(fileList, null, 2).slice(0, 12000));

        return await rich.send(jid, {
          quoted: msg,
        });
      }

      if (fileFlagIndex !== -1 && args[fileFlagIndex + 1]) {
        const targetFile = args[fileFlagIndex + 1].toLowerCase();

        const foundFile = files.find((file) =>
          path.basename(file).toLowerCase().includes(targetFile),
        );

        if (!foundFile) {
          return await yuzi.sendMessage(
            jid,
            {
              text: "❌ File plugin tidak ditemukan",
            },
            {
              quoted: msg,
            },
          );
        }

        const code = fs.readFileSync(foundFile, "utf8");

        const preview = code.slice(0, 4000);

        const rich = new AIRich(yuzi)
          .setTitle("Plugin Source")
          .addText(
            [
              `📁 File : ${path.basename(filePath)}`,
              `📦 Size : ${(code.length / 1024).toFixed(2)} KB`,
              `🧩 Command : ${commands.join(", ")}`,
              `🔐 Access : ${detectAccess(code)}`,
              "",
              code.length > 4000
                ? "Preview only, full source attached below."
                : "Full source loaded.",
            ].join("\n"),
          )
          .addCode(
            "javascript",
            preview + (code.length > 4000 ? "\n\n// ... truncated" : ""),
          );

        await rich.send(jid, {
          quoted: msg,
        });
        return await yuzi.sendMessage(
          jid,
          {
            document: Buffer.from(code),
            fileName: path.basename(foundFile),
            mimetype: "application/javascript",
            caption: path.basename(foundFile),
          },
          {
            quoted: msg,
          },
        );
      }

      const query = args[0]?.toLowerCase()?.trim();

      if (!query) {
        return await yuzi.sendMessage(
          jid,
          {
            text: [
              "Contoh Penggunaan:",
              "",
              ".gp menu",
              ".gp --file menu.js",
              ".gp --file-list",
            ].join("\n"),
          },
          {
            quoted: msg,
          },
        );
      }

      const plugin = plugins.find((p) => {
        if (!p?.command) return false;

        const cmds = Array.isArray(p.command) ? p.command : [p.command];

        return cmds.map((v) => String(v).toLowerCase()).includes(query);
      });

      if (!plugin) {
        return await yuzi.sendMessage(
          jid,
          {
            text: "❌ Plugin tidak ditemukan",
          },
          {
            quoted: msg,
          },
        );
      }

      let filePath = null;

      const commands = Array.isArray(plugin.command)
        ? plugin.command.map((v) => String(v).toLowerCase())
        : [String(plugin.command).toLowerCase()];

      for (const file of files) {
        const base = path.basename(file, ".js").toLowerCase();

        if (commands.includes(base) || base === query) {
          filePath = file;
          break;
        }
      }

      if (!filePath) {
        for (const file of files) {
          const base = path.basename(file, ".js").toLowerCase();

          if (
            commands.some((cmd) => base.startsWith(cmd) || cmd.startsWith(base))
          ) {
            filePath = file;
            break;
          }
        }
      }

      if (!filePath) {
        return await yuzi.sendMessage(
          jid,
          {
            text: "❌ File plugin tidak ditemukan",
          },
          {
            quoted: msg,
          },
        );
      }

      const code = fs.readFileSync(filePath, "utf8");

      const preview = code.slice(0, 4000);

      const rich = new AIRich(yuzi)
        .setTitle("Plugin Source")
        .addText(
          [
            `📁 File : ${path.basename(filePath)}`,
            `📦 Size : ${(code.length / 1024).toFixed(2)} KB`,
            `🧩 Command : ${commands.join(", ")}`,
            `🔐 Access : ${detectAccess(code)}`,
            "",
            code.length > 4000
              ? "Preview only, full source attached below."
              : "Full source loaded.",
          ].join("\n"),
        )
        .addCode(
          "javascript",
          preview + (code.length > 4000 ? "\n\n// ... truncated" : ""),
        );

      await rich.send(jid, {
        quoted: msg,
      });

      await yuzi.sendMessage(
        jid,
        {
          document: Buffer.from(code),
          fileName: path.basename(filePath),
          mimetype: "application/javascript",
          caption: path.basename(filePath),
        },
        {
          quoted: msg,
        },
      );
    } catch (err) {
      console.error(chalk.red("[-] [GET PLUGIN]"), err);

      await yuzi.sendMessage(
        jid,
        {
          text: "❌ Gagal mengambil plugin\n\n" + (err?.message || String(err)),
        },
        {
          quoted: msg,
        },
      );
    }
  },
};
