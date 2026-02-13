import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { GitHubProjectV2Item } from "../types/github";

interface CacheEntry {
  projectId: string;
  items: GitHubProjectV2Item[];
  cachedAt: number;
}

interface CacheDB extends DBSchema {
  projectItems: {
    key: string;
    value: CacheEntry;
  };
}

const DB_NAME = "gh-issue-treefier";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

function getDB(): Promise<IDBPDatabase<CacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("projectItems", { keyPath: "projectId" });
      },
    });
  }
  return dbPromise;
}

export async function getCachedItems(
  projectId: string,
): Promise<CacheEntry | null> {
  try {
    const db = await getDB();
    return (await db.get("projectItems", projectId)) ?? null;
  } catch {
    return null;
  }
}

export async function setCachedItems(
  projectId: string,
  items: GitHubProjectV2Item[],
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("projectItems", {
      projectId,
      items,
      cachedAt: Date.now(),
    });
  } catch {
    // no-op
  }
}

export async function invalidateCache(projectId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("projectItems", projectId);
  } catch {
    // no-op
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear("projectItems");
  } catch {
    // no-op
  }
}
