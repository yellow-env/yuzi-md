import util from "util";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve("./package.json"), "utf-8"),
);

const loadedModules = {};

for (const dep of Object.keys(packageJson.dependencies || {})) {
  try {
    loadedModules[dep] = await import(dep);
  } catch {
    try {
      loadedModules[dep] = require(dep);
    } catch {}
  }
}

export default {
  package: "Runtime Eval",
  command: ["run"],
  owner_only: true,
  description: "Run JavaScript code",
  category: "owner",

  async run(yuzi, msg, { body, args, isOwner }) {
    const jid = msg.key.remoteJid;

    if (!isOwner) {
      return await yuzi.sendMessage(
        jid,
        {
          text: "Owner only.",
        },
        { quoted: msg },
      );
    }

    if (args.includes("--help")) {
      const deps = Object.keys(loadedModules);

      const helpText =
        `Runtime Eval Help\n\n` +
        `Basic:\n` +
        `\`\`\`.run return "hello"\`\`\`\n` +
        `\`\`\`.run console.log("test")\`\`\`\n\n` +
        `Available Variables:\n` +
        `- \`yuzi\`\n` +
        `- \`msg\`\n` +
        `- \`jid\`\n` +
        `- \`args\`\n` +
        `- \`console\`\n` +
        `- \`util\`\n` +
        `- \`modules\`\n\n` +
        `Import Package:\n` +
        `\`\`\`const axios = modules["axios"].default\`\`\`\n` +
        `\`\`\`const cheerio = modules["cheerio"]\`\`\`\n\n` +
        `Example Axios:\n` +
        `\`\`\`.run\n` +
        `\`\`\`const axios = modules["axios"].default\`\`\`\n` +
        `\`\`\`const res = await axios.get("https://api.github.com")\`\`\`\n` +
        `\`\`\`return res.data\n\n` +
        `Example Send Message:\n` +
        `\`\`\`.run\`\`\`\n` +
        `\`\`\`await yuzi.sendMessage(jid, {\`\`\`\n` +
        `  \`\`\`text: "Hello\`\`\`"\n` +
        `\`\`\`})\`\`\`\n\n` +
        `Example Read File:\n` +
        `\`\`\`.run\`\`\`\n` +
        `\`\`\`const fs = modules["fs"]\`\`\`\n` +
        `\`\`\`return fs.readFileSync("./package.json", "utf8")\`\`\`\n\n` +
        `Installed Packages:\n` +
        deps.join(", ");

      return await yuzi.sendMessage(
        jid,
        {
          text:
            helpText.length > 4000 ? helpText.slice(0, 4000) + "..." : helpText,
        },
        { quoted: msg },
      );
    }

    const code = body.replace(/^\.run\s*/i, "").trim();

    if (!code) {
      return await yuzi.sendMessage(
        jid,
        {
          text: "Masukkan kode atau gunakan --help",
        },
        { quoted: msg },
      );
    }

    const logs = [];

    const fakeConsole = {
      ...console,

      log: (...a) => {
        logs.push(
          a
            .map((v) =>
              typeof v === "string"
                ? v
                : util.inspect(v, {
                    depth: 3,
                  }),
            )
            .join(" "),
        );
      },
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(
        async function () {},
      ).constructor;

      const executor = new AsyncFunction(
        "yuzi",
        "msg",
        "jid",
        "args",
        "console",
        "util",
        "modules",

        `
          ${code}
          `,
      );

      const result = await executor(
        yuzi,
        msg,
        jid,
        args,
        fakeConsole,
        util,
        loadedModules,
      );

      let output = "";

      if (logs.length) {
        output += "Console:\n" + logs.join("\n");
      }

      if (result !== undefined) {
        if (output) {
          output += "\n\n";
        }

        output +=
          "Result:\n" +
          util.inspect(result, {
            depth: 5,
          });
      }

      if (!output) {
        output = "Executed.";
      }

      if (output.length > 4000) {
        output = output.slice(0, 4000) + "...";
      }

      await yuzi.sendMessage(
        jid,
        {
          text: output,
        },
        { quoted: msg },
      );
    } catch (e) {
      await yuzi.sendMessage(
        jid,
        {
          text: util.inspect(e),
        },
        { quoted: msg },
      );
    }
  },
};
