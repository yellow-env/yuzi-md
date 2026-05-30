import { getRuntime, setRuntime } from "../utils/autoRead.js";
import messageConfig from "../../config/message.config.js";

export default {
  name: "Self Mode",
  command: ["self"],
  category: "owner",
  owner_only: true,

  async run(yuzi, msg, { args, isOwner }) {
    const input = args[0]?.toLowerCase();

    if (!input || !["on", "off", "true", "false"].includes(input)) {
      const runtime = getRuntime();
      return msg.reply(
        `Status Self Mode: ${runtime.self ? "ON" : "OFF"}\n\nContoh:\n.self on\n.self off`,
      );
    }

    const newValue = input === "on" || input === "true";

    const runtime = getRuntime();
    runtime.self = newValue;

    setRuntime(runtime);

    msg.reply(`✅ Self Mode ${newValue ? "diaktifkan" : "dimatikan"}`);
  },
};
