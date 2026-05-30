import chalk from "chalk";

export default {
  name: "Fetch Profile",
  command: ["fp", "fetchprofile"],
  category: "tools",

  async run(yuzi, msg, { jid, args }) {
    try {
      const m = msg.message;

      const mentioned = m?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

      const quoted = m?.extendedTextMessage?.contextInfo?.participant;

      let target;

      if (args.includes("-g")) {
        if (!jid.endsWith("@g.us")) {
          return yuzi.sendMessage(
            jid,
            {
              text: "Command ini hanya bisa dipakai di grup",
            },
            { quoted: msg },
          );
        }

        target = jid;
      } else if (args.includes("-s")) {
        target = msg.key.participant || msg.key.remoteJid;
      } else if (mentioned) {
        target = mentioned;
      } else if (quoted) {
        target = quoted;
      } else {
        const numberArg = args.find((a) => !a.startsWith("-"));

        if (numberArg) {
          target = numberArg.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        } else {
          target = msg.key.participant || jid;
        }
      }

      let pp;

      try {
        pp = await yuzi.profilePictureUrl(target, "image");
      } catch {
        pp = "https://telegra.ph/file/24fa902ead26340f3df2c.png";
      }

      let caption;

      if (target.endsWith("@g.us")) {
        const metadata = await yuzi.groupMetadata(target);

        caption =
          `Group Profile\n\n` + `Nama: ${metadata.subject}\n` + `ID: ${target}`;
      } else {
        caption = `User Profile\n\n` + `Nomor: @${target.split("@")[0]}`;
      }

      await yuzi.sendMessage(
        jid,
        {
          image: { url: pp },
          caption,
          mentions: target.endsWith("@g.us") ? [] : [target],
        },
        { quoted: msg },
      );
    } catch (e) {
      console.log(chalk.red("[-] [FETCH PROFILE]"), e);

      await yuzi.sendMessage(
        jid,
        {
          text: "Error:\n" + e.message,
        },
        { quoted: msg },
      );
    }
  },
};
