import { VoipClient } from "baileys-caller";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import delay from "../utils/delayFunction.js";
import botConfig from "../../config/bot.config.js";

let downloadMediaMessage = null;

async function getDownloader() {
  if (downloadMediaMessage) return downloadMediaMessage;
  try {
    const mod = await import("@whiskeysockets/baileys");
    downloadMediaMessage = mod.downloadMediaMessage;
  } catch {}
  return downloadMediaMessage;
}

const AUTH_DIR = "yuzi_rtc_session";
const CREDS_FILE = path.join("./" + AUTH_DIR, "creds.json");
const TMP_DIR = "./tmp";

let voipClient = null;
let isConnecting = false;
let activeCall = null;
let clientStartedAt = null;
let lastError = null;
let lastCallTarget = null;
let lastCallAt = null;
let isEndingCall = false;

export async function autoConnectRTC() {
  if (isConnecting || voipClient) return;
  if (!fs.existsSync(CREDS_FILE)) return;

  isConnecting = true;
  lastError = null;

  try {
    const client = new VoipClient({ authDir: AUTH_DIR });

    client.on?.("qr", (qr) => {
      console.log("\n[RTC QR GENERATED]");
      console.log(qr);
    });

    client.on?.("connecting", () => {
      console.log("[RTC] Auto-connecting...");
    });

    client.on?.("open", () => {
      console.log("[RTC] Auto-connected successfully.");
    });

    client.on?.("error", (err) => {
      console.log("[RTC AUTO-CONNECT ERROR]", err.message || err);
      lastError = err.message || String(err);
    });

    await client.connect();
    voipClient = client;
    clientStartedAt = Date.now();

  } catch (err) {
    lastError = err.message || String(err);
    console.log("[RTC AUTO-CONNECT ERROR]", lastError);
  } finally {
    isConnecting = false;
  }
}

if (!global.__rtcRefs) {
  global.__rtcRefs = new Set();
}

function hasSession() {
  return fs.existsSync(CREDS_FILE);
}

function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

function formatUptime(ms) {
  if (!ms) return "-";
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  return hour + "h " + (min % 60) + "m " + (sec % 60) + "s";
}

function getRTCStatus() {
  return {
    session: hasSession(),
    connecting: isConnecting,
    connected: !!voipClient,
    activeCall: !!activeCall,
    endingCall: isEndingCall,
    uptime: clientStartedAt ? formatUptime(Date.now() - clientStartedAt) : "-",
    lastCallTarget: lastCallTarget || "-",
    lastCallAt: lastCallAt ? new Date(lastCallAt).toLocaleString("id-ID") : "-",
    lastError: lastError || "-"
  };
}

async function waitForEndingCall(timeoutMs) {
  let waited = 0;
  while (isEndingCall && waited < timeoutMs) {
    await sleep(300);
    waited += 300;
  }
  return !isEndingCall;
}

async function clearCall(conn, msg, tmpFile) {
  if (isEndingCall) {
    await waitForEndingCall(20000);
    return;
  }

  if (!activeCall) {
    return;
  }

  isEndingCall = true;
  const call = activeCall;
  activeCall = null;
  global.__rtcRefs.delete(call);

  try {
    console.log("[RTC] Ending call...");
    if (typeof call.end === "function") {
      call.end();
    }
    if (typeof call.waitForEnd === "function") {
      await Promise.race([call.waitForEnd(), sleep(6000)]);
    } else {
      await sleep(2000);
    }
  } catch (err) {
    console.error("[RTC END]", err.message || err);
  }

  console.log("[RTC] Call cleared.");
  isEndingCall = false;

  if (tmpFile) {
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch (e) {}
  }
}

async function hardResetRTC() {
  try {
    if (activeCall) {
      try { activeCall.end(); } catch {}
    }
  } catch {}

  activeCall = null;
  isEndingCall = false;

  try {
    if (voipClient) {
      try { voipClient.disconnect(); } catch {}
    }
  } catch {}

  voipClient = null;
  await sleep(3000);
}

async function connectRTC() {
  const client = new VoipClient({ authDir: AUTH_DIR });
  await client.connect();
  voipClient = client;
  clientStartedAt = Date.now();
}

function prepareAudio(inputPath) {
  return new Promise(function(resolve, reject) {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    const outPath = path.join(TMP_DIR, "rtc_" + Date.now() + ".wav");

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-ar", "16000",
      "-ac", "1",
      "-acodec", "pcm_s16le",
      "-af", "volume=1.8",
      outPath
    ]);

    let stderr = "";

    ffmpeg.stderr.on("data", function(chunk) {
      stderr += chunk.toString();
    });

    ffmpeg.on("error", reject);

    ffmpeg.on("close", function(code) {
      if (code !== 0) {
        return reject(new Error(stderr || ("ffmpeg exited with code " + code)));
      }
      resolve(outPath);
    });
  });
}

function attachCallListeners(call, conn, jid, msg, tmpFile) {
  const state = {
    cleaned: false,
    connected: false,
    ringing: false,
    ringingTimeout: null
  };

  async function cleanup(message) {
    if (state.cleaned) return;
    state.cleaned = true;
    clearTimeout(state.ringingTimeout);
    if (activeCall === call) {
      activeCall = null;
    }
    global.__rtcRefs.delete(call);

    try {
      conn.sendMessage(jid, { text: message }, { quoted: msg });
    } catch (e) {}
  }

  call.on("ringing", async function() {
    if (state.cleaned) return;
    state.ringing = true;
    clearTimeout(state.ringingTimeout);
    try {
      conn.sendMessage(jid, { text: "🔔 *Panggilan sedang berdering...*" }, { quoted: msg });
    } catch (e) {}
  });

  call.on("connected", async function() {
    if (state.cleaned) return;
    state.connected = true;
    try {
      conn.sendMessage(jid, { text: "✅ *Panggilan tersambung!*" }, { quoted: msg });
    } catch (e) {}
  });

  call.on("ended", function(reason) {
    cleanup("📵 *Panggilan berakhir*" + (reason ? ":\n`" + reason + "`" : "."));
  });

  call.on("error", async function(err) {
    if (
      err.message?.includes("CALL_TIMEOUT") ||
      err.message?.includes("already active")
    ) {
      try {
        conn.sendMessage(jid, { text: "🔄 *RTC error, resetting...*" }, { quoted: msg });
      } catch (e) {}
      await hardResetRTC();
      await connectRTC();
      try {
        conn.sendMessage(jid, { text: "🟢 *RTC recovered, coba lagi*" }, { quoted: msg });
      } catch (e) {}
      return;
    }

    lastError = err && err.message ? err.message : String(err);
    cleanup("❌ *RTC Error:*\n`" + lastError + "`");
  });

  state.ringingTimeout = setTimeout(async function() {
    if (state.cleaned || state.ringing) return;
    try {
      if (typeof call.end === "function") call.end();
    } catch (e) {}
    cleanup(
      "⏱️ *Tidak ada respons dari WA server (15 detik)*.\n" +
      "_Kemungkinan cooldown — coba beberapa detik lagi_"
    );
  }, 15000);

  setTimeout(async function() {
    if (state.cleaned || state.ringing || state.connected) return;
    try {
      conn.sendMessage(jid, { text: "⌛ *Masih menunggu respons server...*" }, { quoted: msg });
    } catch (e) {}
  }, 5000);
}

export default {
  name: "RTC Call",
  command: ["rtc", "call", "rtclogin", "rtcend", "rtcstatus", "rtcreconnect", "rtcdevice"],
  owner_only: true,
  description: "VoIP call via WhatsApp",
  category: "tools",

  async run(yuzi, msg, { jid, args, command }) {
    const m = msg;
    const conn = yuzi;
    const usedPrefix = botConfig.prefix;
    const isRTC = /^rtc$/i.test(command);
    const isCall = /^call$/i.test(command);

    // HELP
    if (args[0] === "--help" || args[0] === "-h" || args[0] === "help") {
      return m.reply(
        "📞 *RTC Call Commands*\n\n" +
        "• `" + usedPrefix + "rtc <nomor>` — Telepon target\n" +
        "• `" + usedPrefix + "rtc <nomor> <audio>` — Telepon dengan audio\n" +
        "• `" + usedPrefix + "rtc` (reply pesan) — Telepon pengirim reply\n" +
        "• `" + usedPrefix + "rtc` (reply audio) — Telepon pengirim + pakai audio\n" +
        "• `" + usedPrefix + "rtclogin` — Login VoIP (scan QR)\n" +
        "• `" + usedPrefix + "rtcstatus` — Cek status RTC\n" +
        "• `" + usedPrefix + "rtcdevice` — Info device RTC\n" +
        "• `" + usedPrefix + "rtcend` — Akhiri panggilan\n" +
        "• `" + usedPrefix + "rtcreconnect` — Reconnect RTC\n\n" +
        "*Contoh:*\n" +
        usedPrefix + "rtc 628123456789\n" +
        usedPrefix + "rtc 628123456789 ./audio.mp3\n" +
        "(reply pesan) " + usedPrefix + "rtc"
      );
    }

    // LOGIN
    if (/^rtclogin$/i.test(command)) {
      if (isConnecting) {
        return m.reply("🟡 *QR login sedang berjalan...*");
      }

      if (voipClient) {
        return m.reply("🟢 *VoIP sudah connected.*");
      }

      isConnecting = true;
      lastError = null;

      const client = new VoipClient({ authDir: AUTH_DIR });

      try {
        if (fs.existsSync("./" + AUTH_DIR)) {
          console.log("[RTC] Using existing session to reconnect...");
        }

        client.on?.("qr", (qr) => {
          console.log("\n[RTC QR GENERATED]");
          console.log(qr);
          conn.sendMessage(jid, {
            text: "📡 *RTC QR GENERATED*\n\nSilakan cek console untuk melihat QR code.\n⏱ Timeout: 60 detik"
          }, { quoted: msg });
        });

        client.on?.("connecting", () => {
          conn.sendMessage(jid, { text: "🟡 *RTC connecting...*" }, { quoted: msg });
        });

        client.on?.("open", () => {
          conn.sendMessage(jid, { text: "🟢 *RTC connected.*" }, { quoted: msg });
        });

        const timeout = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("QR login timeout (60s)"));
          }, 60000);
        });

        await Promise.race([client.connect(), timeout]);

        voipClient = client;
        clientStartedAt = Date.now();

        return m.reply("🟢 *VoIP client siap digunakan.*");

      } catch (err) {
        lastError = err.message || String(err);
        console.log("[RTC LOGIN ERROR]", lastError);

        try {
          if (client?.disconnect) client.disconnect();
        } catch {}
        voipClient = null;

        if (lastError.includes("not scanned") || lastError.includes("timeout")) {
          try {
            fs.rmSync("./" + AUTH_DIR, { recursive: true, force: true });
          } catch {}
        }

        return m.reply("❌ *LOGIN FAILED*\n\nReason: " + lastError + "\n\nHint: QR mungkin tidak discan / expired");

      } finally {
        isConnecting = false;
      }
    }

    // STATUS
    if (/^rtcstatus$/i.test(command)) {
      const s = getRTCStatus();
      return m.reply(
        "📡 *RTC STATUS*\n\n" +
        "• Session File  : " + (s.session ? "✅ Ada" : "❌ Tidak ada") + "\n" +
        "• Client        : " + (s.connected ? "🟢 Connected" : s.connecting ? "🟡 Connecting..." : "🔴 Disconnected") + "\n" +
        "• Active Call   : " + (s.activeCall ? "📞 Ya" : "📴 Tidak") + "\n" +
        "• Ending Call   : " + (s.endingCall ? "🟡 Cleanup..." : "⚪ Tidak") + "\n" +
        "• Uptime        : " + s.uptime + "\n" +
        "• Last Target   : " + s.lastCallTarget + "\n" +
        "• Last Call     : " + s.lastCallAt + "\n" +
        "• Last Error    : " + s.lastError + "\n" +
        "• Native Refs   : " + global.__rtcRefs.size
      );
    }

    // DEVICE INFO
    if (/^rtcdevice$/i.test(command)) {
      const deviceInfo = {
        user: voipClient?.user || null,
        me: voipClient?.authState?.creds?.me || null,
        connected: !!voipClient,
        sessionDir: "./" + AUTH_DIR
      };

      const userNum = deviceInfo.user?.id || deviceInfo.me?.id || "-";
      const userName = deviceInfo.user?.name || deviceInfo.me?.name || "-";

      return m.reply(
        "📱 *RTC DEVICE INFO*\n\n" +
        "• Status        : " + (deviceInfo.connected ? "🟢 Connected" : "🔴 Disconnected") + "\n" +
        "• Session Dir   : " + deviceInfo.sessionDir + "\n" +
        "• Phone Number  : " + (userNum !== "-" ? "@" + userNum : "- ") + "\n" +
        "• Name          : " + userName
      );
    }

    // RECONNECT
    if (/^rtcreconnect$/i.test(command)) {
      if (isConnecting) {
        return m.reply("🟡 *Sedang connecting, tunggu...*");
      }

      isConnecting = true;
      lastError = null;

      await m.reply("🔄 *Reconnecting VoIP client...*");

      try {
        if (voipClient) {
          try { voipClient.disconnect(); } catch (e) {}
          voipClient = null;
        }

        await sleep(2000);

        const client = new VoipClient({ authDir: AUTH_DIR });

        await Promise.race([
          client.connect(),
          new Promise(function(_, reject) {
            setTimeout(function() {
              reject(new Error("Connect timeout (60s)"));
            }, 60000);
          })
        ]);

        voipClient = client;
        clientStartedAt = Date.now();

        return m.reply("✅ *Reconnect berhasil.*");

      } catch (err) {
        voipClient = null;
        lastError = err.message || String(err);

        return m.reply("❌ *Reconnect gagal:*\n" + lastError);

      } finally {
        isConnecting = false;
      }
    }

    // END CALL
    if (/^rtcend$/i.test(command)) {
      if (isEndingCall) {
        return m.reply("🟡 *Sedang mengakhiri panggilan...*");
      }

      if (!activeCall) {
        return m.reply("📵 *Tidak ada panggilan aktif.*");
      }

      await m.reply("🟡 *Mengakhiri panggilan...*");

      await clearCall(conn, msg, null);

      return m.reply("📵 *Panggilan ditutup.*");
    }

    // CALL
    if (isRTC || isCall) {
      if (!hasSession()) {
        return m.reply("❌ *Session belum ada.*\nGunakan: *" + usedPrefix + "rtclogin*");
      }

      // Auto-connect if session exists but client not connected
      if (!voipClient) {
        if (isConnecting) {
          return m.reply("🟡 *RTC sedang connecting, tunggu...*");
        }
        isConnecting = true;
        lastError = null;
        try {
          const client = new VoipClient({ authDir: AUTH_DIR });
          await client.connect();
          voipClient = client;
          clientStartedAt = Date.now();
          console.log("[RTC] Auto-connected on first .rtc call");
        } catch (err) {
          lastError = err.message || String(err);
          console.log("[RTC] Auto-connect failed:", lastError);
        } finally {
          isConnecting = false;
        }
        if (!voipClient) {
          return m.reply("❌ *VoIP client belum connect.*\nGunakan: *" + usedPrefix + "rtclogin*");
        }
      }

      const rawAudio = args[1];
      let quotedAudio = null;

      if (msg.quoted?.message) {
        const quotedMsg = msg.quoted.message;
        let mediaMsg = quotedMsg;
        if (quotedMsg.viewOnceMessageV2?.message) mediaMsg = quotedMsg.viewOnceMessageV2.message;
        else if (quotedMsg.viewOnceMessage?.message) mediaMsg = quotedMsg.viewOnceMessage.message;
        else if (quotedMsg.ephemeralMessage?.message) mediaMsg = quotedMsg.ephemeralMessage.message;

        if (mediaMsg?.audioMessage) {
          try {
            let buffer = null;
            const dl = await getDownloader();
            if (dl) {
              buffer = await dl(msg.quoted, "buffer", {}, { reuploadRequest: yuzi?.updateMediaMessage });
            }
            if (buffer) {
              quotedAudio = path.join(TMP_DIR, "quoted_" + Date.now() + ".mp3");
              fs.writeFileSync(quotedAudio, buffer);
              console.log("[RTC] Quoted audio downloaded:", quotedAudio);
            } else {
              console.log("[RTC] Quoted audio buffer is null");
            }
          } catch (e) {
            console.log("[RTC] Download quoted audio error:", e.message);
          }
        }
      }

      const audioPath = rawAudio || quotedAudio;

      // Get target from: args[0] > quoted sender > jid
      const quotedSender = msg.quoted?.sender || msg.quoted?.key?.participant?.split("@")[0].split(":")[0] || "";
      const target = args[0]
        ? args[0].replace(/\D/g, "")
        : quotedSender.replace(/\D/g, "") ||
            jid.replace(/\D/g, "").split("@")[0] ||
            msg.key?.participantAlt?.split("@")[0].split(":")[0] ||
            msg.key?.participantPn?.split("@")[0].split(":")[0] ||
            msg.key?.remoteJidAlt?.split("@")[0].split(":")[0] ||
            "";

      if (!target) {
        return m.reply(
          "❌ *Format salah!*\n\n" +
          "*Usage:* `" + usedPrefix + "rtc <nomor> [audio]`\n" +
          "*Contoh:* `" + usedPrefix + "rtc 628123456789`\n" +
          "*Note:* Bisa reply audio untuk menggunakan sebagai suara call\n" +
          "*Note:* Bisa reply pesan untuk dapatkan nomor target otomatis"
        );
      }

      if (isEndingCall) {
        await conn.sendMessage(
          jid,
          { text: "⏳ *Menunggu cleanup panggilan sebelumnya...*" },
          { quoted: msg }
        );

        const ok = await waitForEndingCall(20000);
        if (!ok) {
          return m.reply("❌ *Timeout menunggu cleanup. Coba lagi.*");
        }
      }

      if (activeCall) {
        await conn.sendMessage(
          jid,
          { text: "⏳ *Menutup panggilan sebelumnya...*" },
          { quoted: msg }
        );

        await clearCall(conn, msg, null);
      }

      let audioSource = "silence";
      let tmpFile = null;

      if (audioPath && audioPath !== "silence") {
        if (!fs.existsSync(audioPath)) {
          return m.reply("❌ *File audio tidak ditemukan.*");
        }

        try {
          await m.reply("🎵 *Memproses audio...*");
          tmpFile = await prepareAudio(audioPath);
          audioSource = tmpFile;

        } catch (err) {
          console.error(err);

          try {
            if (tmpFile && fs.existsSync(tmpFile)) {
              fs.unlinkSync(tmpFile);
            }
          } catch (e) {}

          return m.reply("❌ *Gagal proses audio:*\n" + err.message);
        }
      }

      // Debug logging
      console.log("[RTC] Audio source:", audioSource || "silence");
      console.log("[RTC] Target:", target);
      console.log("[RTC] VoipClient ready:", !!voipClient);

      await conn.sendMessage(
        jid,
        { text: "📞 *Menghubungi " + target + "...*" },
        { quoted: msg }
      );

      try {
        if (activeCall) throw new Error("Masih ada active call");
        if (isEndingCall) throw new Error("RTC masih cleanup");

        let call;

        try {
          await delay(500);

          if (activeCall) {
            throw new Error("CALL_STILL_ACTIVE");
          }

          call = await Promise.race([
            voipClient.call(target, { audioSource: audioSource }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("CALL_TIMEOUT")), 20000)
            )
          ]);

        } catch (err) {
          if (err.message && err.message.toLowerCase().includes("already active")) {
            console.log("[RTC] Native stuck, reconnecting background...");

            (async function() {
              try {
                if (voipClient) {
                  try { voipClient.disconnect(); } catch (e) {}
                  voipClient = null;
                }

                await sleep(2000);
                isConnecting = true;

                const client = new VoipClient({ authDir: AUTH_DIR });
                await client.connect();

                voipClient = client;
                clientStartedAt = Date.now();

                console.log("[RTC] Background reconnect success");
              } catch (e) {
                console.error("[RTC] Background reconnect failed:", e);
                lastError = e.message || String(e);
                voipClient = null;
              } finally {
                isConnecting = false;
              }
            })();

            throw new Error(
              "Native call masih aktif di WASM.\n" +
              "Client sedang reconnect, tunggu beberapa detik lalu coba lagi."
            );
          }

          if (err.message?.includes("Could not resolve LID")) {
            throw new Error("Nomor target tidak dikenali oleh server. Pastikan nomor aktif WhatsApp.");
          }

          throw err;
        }

        activeCall = call;
        global.__rtcRefs.add(call);

        lastCallTarget = target;
        lastCallAt = Date.now();
        lastError = null;

        attachCallListeners(call, conn, jid, msg, tmpFile);

        if (call.waitForEnd) {
          await call.waitForEnd();
        }

        console.log("[RTC] Call finished normally, activeCall should be null");

      } catch (err) {
        console.error("[RTC CALL ERROR]", err);
        console.log("[RTC] activeCall after error:", activeCall ? "exists" : "null");

        try {
          if (tmpFile && fs.existsSync(tmpFile)) {
            fs.unlinkSync(tmpFile);
          }
        } catch (e) {}

        try {
          if (quotedAudio && fs.existsSync(quotedAudio)) {
            fs.unlinkSync(quotedAudio);
          }
        } catch (e) {}

        activeCall = null;
        lastError = err.message || String(err);

        return m.reply("❌ *Gagal melakukan panggilan:*\n" + lastError);
      }
    }
  }
};