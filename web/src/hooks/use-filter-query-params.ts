import { useCallback, useMemo } from "react";
import type { FilterValues } from "../components/filter-panel";

const FIELD_PREFIX = "field.";

const defaults: FilterValues = {
  owner: "",
  state: "open",
  projectId: "",
  fieldFilters: {},
};

const parseQueryParams = (search: string): Partial<FilterValues> => {
  const params = new URLSearchParams(search);
  const result: Partial<FilterValues> = {};

  const owner = params.get("owner");
  if (owner) result.owner = owner;

  const state = params.get("state");
  if (state === "open" || state === "closed" || state === "all") {
    result.state = state;
  }

  const projectId = params.get("project_id");
  if (projectId) result.projectId = projectId;

  const fieldFilters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith(FIELD_PREFIX) && value) {
      fieldFilters[key.slice(FIELD_PREFIX.length)] = value;
    }
  }
  if (Object.keys(fieldFilters).length > 0) {
    result.fieldFilters = fieldFilters;
  }

  return result;
};

const buildQueryParams = (filters: FilterValues): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.owner !== defaults.owner) {
    params.set("owner", filters.owner);
  }
  if (filters.state !== defaults.state) {
    params.set("state", filters.state);
  }
  if (filters.projectId !== defaults.projectId) {
    params.set("project_id", filters.projectId);
  }
  for (const [key, value] of Object.entries(filters.fieldFilters)) {
    if (value) {
      params.set(`${FIELD_PREFIX}${key}`, value);
    }
  }

  return params;
};

export const useFilterQueryParams = () => {
  const initialFilters = useMemo(
    () => parseQueryParams(window.location.search),
    [],
  );

  const syncToUrl = useCallback((filters: FilterValues) => {
    const params = buildQueryParams(filters);
    const qs = params.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, []);

  return { initialFilters, syncToUrl };
};
