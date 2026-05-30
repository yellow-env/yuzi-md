import fs from "fs";

const DB_PATH = "./database/thumbs.json";

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, "[]");
  }
}

export function getThumbs() {
  ensureDB();

  return JSON.parse(fs.readFileSync(DB_PATH));
}

export function saveThumbs(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function addThumb(data) {
  const thumbs = getThumbs();

  const index = thumbs.findIndex((v) => v.name === data.name);

  if (index !== -1) {
    thumbs[index] = data;
  } else {
    thumbs.push(data);
  }

  saveThumbs(thumbs);
}

export function getThumb(name) {
  return getThumbs().find(
    (v) => v.name.toLowerCase() === name.toLowerCase(),
  );
}