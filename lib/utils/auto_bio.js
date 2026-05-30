function runtime(seconds) {
  seconds = Number(seconds);

  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);

  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, s && `${s}s`]
    .filter(Boolean)
    .join(" ");
}

function formatDate(date) {
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

let bioInterval;

export async function startBioRuntime(sock, db) {
  if (bioInterval) clearInterval(bioInterval);

  const startedAt = Date.now();

  bioInterval = setInterval(async () => {
    try {
      const mode = db.self ? "Self" : "Public";
      const autoRead = db.autoRead ? "On" : "Off";

      const bio = `
╭──〔 BOT STATUS 〕
│ Runtime : ${runtime(process.uptime())}
│ Mode : ${mode}
│ AutoRead : ${autoRead}
│ Started : ${formatDate(startedAt)}
╰──────────────
      `.trim();

      await sock.updateProfileStatus(bio);

    /*  console.log("[BIO UPDATE]"); */
    } catch (err) {
      console.error(err);
    }
  }, 60000);
}