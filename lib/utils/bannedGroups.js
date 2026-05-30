import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bannedGroupsPath = path.resolve(__dirname, "../../database/bannedGroups.json");

async function ensureBannedGroupsFile() {
  try {
    await fs.access(bannedGroupsPath);
  } catch {
    await fs.mkdir(path.dirname(bannedGroupsPath), { recursive: true });
    await fs.writeFile(bannedGroupsPath, JSON.stringify([]));
  }
}

export async function loadBannedGroups() {
  try {
    await ensureBannedGroupsFile();
    const data = await fs.readFile(bannedGroupsPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to load banned groups:", err.message);
    return [];
  }
}

export async function saveBannedGroups(groups) {
  try {
    await ensureBannedGroupsFile();
    await fs.writeFile(bannedGroupsPath, JSON.stringify(groups, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to save banned groups:", err.message);
    return false;
  }
}

export async function isBanned(groupId) {
  const bannedGroups = await loadBannedGroups();
  return bannedGroups.some((g) => g.groupId === groupId);
}

export async function addBan(groupData) {
  const bannedGroups = await loadBannedGroups();
  const existingIndex = bannedGroups.findIndex((g) => g.groupId === groupData.groupId);

  if (existingIndex !== -1) {
    return { success: false, message: "Group already banned" };
  }

  bannedGroups.push(groupData);
  const saved = await saveBannedGroups(bannedGroups);

  if (saved) {
    return { success: true, message: "Group banned successfully" };
  }
  return { success: false, message: "Failed to save banned group" };
}

export async function removeBan(groupId) {
  const bannedGroups = await loadBannedGroups();
  const filtered = bannedGroups.filter((g) => g.groupId !== groupId);

  if (filtered.length === bannedGroups.length) {
    return { success: false, message: "Group not found in banned list" };
  }

  const saved = await saveBannedGroups(filtered);

  if (saved) {
    return { success: true, message: "Group unbanned successfully" };
  }
  return { success: false, message: "Failed to remove ban" };
}