import fs from "fs";
import path from "path";
import chalk from "chalk"

const logDir = path.resolve("./logs");

function getTime() {
  return new Date().toISOString();
}

function getRunTime() {
  const d = new Date();

  const pad = (n) => String(n).padStart(2, "0");

  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;

  return `${date}_${time}`;
}

const runFile = `yuzi_log_${getRunTime()}.txt`;

function getRunFile() {
  return path.join(logDir, runFile);
}

function getLatestFile() {
  return path.join(logDir, "latest.txt");
}

function ensureDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function cleanText(str) {
  return String(str)
    .replace(/\x1B\[[0-9;]*m/g, "")
    .replace(/\r/g, "");
}

function writeLog(type, args) {
  ensureDir();

  const raw = `[${getTime()}] [${type}] ${args.join(" ")}`;
  const text = cleanText(raw) + "\n";

  fs.appendFileSync(getRunFile(), text);
  fs.appendFileSync(getLatestFile(), text);
}

function overrideConsole() {
  const oldLog = console.log;
  const oldError = console.error;
  const oldWarn = console.warn;

  console.log = (...args) => {
    writeLog("LOG", args);
    oldLog(...args);
  };

  console.error = (...args) => {
    writeLog("ERROR", args);
    oldError(...args);
  };

  console.warn = (...args) => {
    writeLog("WARN", args);
    oldWarn(...args);
  };
}

export function startLogger() {
  ensureDir();
  overrideConsole();

  console.log(chalk.yellow("[*]"), "Logger started");
}