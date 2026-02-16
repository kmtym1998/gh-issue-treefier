import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { GitHubProjectV2Item } from "../types/github";

interface CacheEntry {
  projectId: string;
  items: GitHubProjectV2Item[];
  cachedAt: number;
}

export interface SavedNodePositions {
  graphKey: string;
  positions: Record<string, { x: number; y: number }>;
}

interface CacheDB extends DBSchema {
  projectItems: {
    key: string;
    value: CacheEntry;
  };
  nodePositions: {
    key: string;
    value: SavedNodePositions;
  };
}

const DB_NAME = "gh-issue-treefier";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

function getDB(): Promise<IDBPDatabase<CacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("projectItems", { keyPath: "projectId" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("nodePositions", { keyPath: "graphKey" });
        }
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

export async function getNodePositions(
  graphKey: string,
): Promise<SavedNodePositions | null> {
  try {
    const db = await getDB();
    return (await db.get("nodePositions", graphKey)) ?? null;
  } catch {
    return null;
  }
}

export async function setNodePositions(
  graphKey: string,
  positions: Record<string, { x: number; y: number }>,
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("nodePositions", { graphKey, positions });
  } catch {
    // no-op
  }
}
