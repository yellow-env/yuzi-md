import messageHandler from "./lib/handler/message.handler.js";
import chalk from "chalk";

export default function connector(yuzi, plugins) {
  console.log(chalk.green("[+]"), "All System Connected!");

  yuzi.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    // 🔥 kirim plugins ke handler
    await messageHandler(yuzi, msg, plugins);
  });
}
