import { Button } from "../utils/button.js";

export default {
  package: "Button Test",
  command: ["btntest"],
  owner_only: true,
  description: "Tes interactive button",
  category: "main",

  async run(yuzi, msg) {
    const button = new Button()
      .setTitle("Hello World")
      .setSubtitle("Interactive Message")
      .setBody("Ini test button library")
      .setFooter("Powered By Nixel")
      .addReply("Ping", ".ping")
      .addReply("Owner", ".owner")
      .addUrl("GitHub", "https://github.com");

    await button.run(msg.key.remoteJid, yuzi, msg);
  },
};
