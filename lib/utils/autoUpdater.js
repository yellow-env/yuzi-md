import axios from "axios";

const GITHUB_REPO = "yellow-env/bot-wa";
import chalk from "chalk";
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

async function getLocalVersion() {
  try {
    const pkg = JSON.parse(
      await import("fs").then((fs) =>
        fs.promises.readFile("./package.json", "utf8"),
      ),
    );
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

async function getRemoteVersion() {
  try {
    const response = await axios.get(RELEASES_URL, {
      headers: { Accept: "application/vnd.github.v3+json" },
      timeout: 10000,
    });
    return response.data.tag_name?.replace(/^v/, "") || response.data.tag_name;
  } catch {
    return null;
  }
}

function compareVersions(local, remote) {
  const l = local.split(".").map(Number);
  const r = remote.split(".").map(Number);
  for (let i = 0; i < Math.max(l.length, r.length); i++) {
    const lv = l[i] || 0;
    const rv = r[i] || 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

export async function checkForUpdates() {
  const localVersion = await getLocalVersion();
  const remoteVersion = await getRemoteVersion();

  if (!remoteVersion)
    return { hasUpdate: false, localVersion, remoteVersion: null };

  return {
    localVersion,
    remoteVersion,
    hasUpdate: compareVersions(localVersion, remoteVersion),
  };
}

export async function performUpdate() {
  return await performUpdateClone();
}

async function performUpdateClone() {
  const { execSync } = await import("child_process");
  const path = await import("path");
  fs.mkdirSync("./.tmp_update", { recursive: true });

  console.log(
    chalk.yellow("[*]"),
    chalk.cyan("[HOSHINO UPDATER]"),
    "Mengunduh pembaruan...",
  );

  try {
    execSync(
      `git clone --depth 1 https://github.com/${GITHUB_REPO}.git .tmp_update`,
      {
        stdio: "inherit",
        cwd: process.cwd(),
      },
    );
  } catch (err) {
    cleanTmp();
    throw new Error(`Clone gagal: ${err.message}`);
  }

  const IGNORE = [
    "node_modules",
    "package-lock.json",
    "tmp",
    "database",
    "session",
    ".git",
    ".tmp_update",
  ];

  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE.includes(entry.name)) continue;
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(d, { recursive: true });
        copyRecursive(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    }
  }

  try {
    copyRecursive("./.tmp_update", process.cwd());
  } finally {
    cleanTmp();
  }

  console.log(
    chalk.green("[+]"),
    chalk.cyan("[HOSHINO UPDATER]"),
    "Update berhasil! Silakan restart bot.",
  );
  process.exit(0);
}

function cleanTmp() {
  const rimraf = (dir) => {
    try {
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = `${dir}/${entry.name}`;
          if (entry.isDirectory()) rimraf(full);
          else fs.unlinkSync(full);
        }
        fs.rmdirSync(dir);
      }
    } catch {}
  };
  rimraf("./.tmp_update");
}

export async function runUpdateChecker() {
  try {
    console.log(
      chalk.yellow("[*]"),
      chalk.cyan("[HOSHINO UPDATER]"),
      "Memeriksa pembaruan...",
    );
    const { localVersion, remoteVersion, hasUpdate } = await checkForUpdates();

    if (!remoteVersion) {
      console.log(
        chalk.red("[-]"),
        chalk.red("[HOSHINO UPDATER]"),
        "Tidak dapat mengakses GitHub releases",
      );
      return false;
    }

    if (!hasUpdate) {
      console.log(
        chalk.green("[+]"),
        chalk.cyan("[HOSHINO UPDATER]"),
        `Bot sudah versi terbaru (v${localVersion})`,
      );
      return false;
    }

    console.log(
      chalk.yellow("[!]"),
      chalk.cyan("[HOSHINO UPDATER]"),
      `Versi baru tersedia!`,
    );
    console.log(
      chalk.yellow("[!]"),
      chalk.cyan("[HOSHINO UPDATER]"),
      `v${localVersion} → v${remoteVersion}`,
    );

    const readline = await import("readline-sync");
    if (
      !readline.keyInYNStrict(
        chalk.yellow("[?]"),
        chalk.cyan("[HOSHINO UPDATER]"),
        "Apakah mau update sekarang?",
        chalk.gray("[Y/n]"),
      )
    ) {
      console.log(
        chalk.yellow("[!]"),
        chalk.cyan("[HOSHINO UPDATER]"),
        "Melewati update.",
      );
      return false;
    }

    await performUpdate();
    console.log(
      chalk.green("[+]"),
      chalk.cyan("[HOSHINO UPDATER]"),
      "Update berhasil! Silakan restart bot.",
    );
    process.exit(0);
  } catch (error) {
    console.log(
      chalk.red("[-]"),
      chalk.red("[HOSHINO UPDATER]"),
      "Tidak dapat memeriksa update:",
      error.message,
    );
    return false;
  }
}
