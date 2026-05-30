import { getRuntime, setRuntime } from "../utils/autoRead.js";
import messageConfig from "../../config/message.config.js";

export default {
  name: "Auto Read",
  command: ["autoread"],
  owner_only: true,
  category: "owner",

  async run(yuzi, msg, { args, isOwner }) {
    const input = args[0]?.toLowerCase();

    if (!input || !["on", "off", "true", "false"].includes(input)) {
      const runtime = getRuntime();
      return msg.reply(
        `Status Auto Read: ${runtime.autoRead ? "ON" : "OFF"}\n\nContoh:\n.autoread on\n.autoread off`,
      );
    }

    const newValue = input === "on" || input === "true";

    const runtime = getRuntime();
    runtime.autoRead = newValue;

    setRuntime(runtime);

    msg.reply(`✅ Auto Read ${newValue ? "diaktifkan" : "dimatikan"}`);
  },
};
