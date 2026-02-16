import {
  type CacheData,
  cacheDeleteItems,
  cacheGet,
  cachePutItems,
  cachePutNodePositions,
} from "../api-client";
import type { GitHubProjectV2Item } from "../types/github";

interface CacheEntry {
  projectId: string;
  items: GitHubProjectV2Item[];
  cachedAt: number;
}

export interface SavedNodePositions {
  projectId: string;
  positions: Record<string, { x: number; y: number }>;
}

export async function getCachedItems(
  projectId: string,
): Promise<CacheEntry | null> {
  try {
    const data: CacheData = await cacheGet(projectId);
    if (!data.items) return null;
    return {
      projectId,
      items: data.items as GitHubProjectV2Item[],
      cachedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function setCachedItems(
  projectId: string,
  items: GitHubProjectV2Item[],
): Promise<void> {
  try {
    await cachePutItems(projectId, items);
  } catch {
    // no-op
  }
}

export async function invalidateCache(projectId: string): Promise<void> {
  try {
    await cacheDeleteItems(projectId);
  } catch {
    // no-op
  }
}

export async function getNodePositions(
  projectId: string,
): Promise<SavedNodePositions | null> {
  try {
    const data: CacheData = await cacheGet(projectId);
    if (!data.nodePositions || Object.keys(data.nodePositions).length === 0) {
      return null;
    }
    return { projectId, positions: data.nodePositions };
  } catch {
    return null;
  }
}

export async function setNodePositions(
  projectId: string,
  positions: Record<string, { x: number; y: number }>,
): Promise<void> {
  try {
    await cachePutNodePositions(projectId, positions);
  } catch {
    // no-op
  }
}
