import { useCallback, useEffect, useState } from "react";
import { useProjectFields, useProjects } from "../hooks/use-projects";
import type { Project, ProjectField } from "../types/project";

export interface FilterValues {
  owner: string;
  repo: string;
  state: "open" | "closed" | "all";
  projectId: string;
  fieldFilters: Record<string, string>;
}

export interface FilterPanelProps {
  defaultValues?: Partial<FilterValues>;
  onChange: (filters: FilterValues) => void;
}

const defaultFilters: FilterValues = {
  owner: "",
  repo: "",
  state: "open",
  projectId: "",
  fieldFilters: {},
};

export function FilterPanel({ defaultValues, onChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterValues>({
    ...defaultFilters,
    ...defaultValues,
  });

  const { projects, loading: projectsLoading } = useProjects(filters.owner);
  const { fields, loading: fieldsLoading } = useProjectFields(
    filters.projectId,
  );

  const update = useCallback((patch: Partial<FilterValues>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });
  }, []);

  // プロジェクト変更時にフィールドフィルタをリセット
  const handleProjectChange = useCallback(
    (projectId: string) => {
      update({ projectId, fieldFilters: {} });
    },
    [update],
  );

  const handleFieldFilterChange = useCallback(
    (fieldId: string, value: string) => {
      setFilters((prev) => {
        const fieldFilters = { ...prev.fieldFilters };
        if (value === "") {
          delete fieldFilters[fieldId];
        } else {
          fieldFilters[fieldId] = value;
        }
        return { ...prev, fieldFilters };
      });
    },
    [],
  );

  // filters が変わるたびに親に通知
  useEffect(() => {
    onChange(filters);
  }, [filters, onChange]);

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <label style={styles.label}>
          Owner
          <input
            style={styles.input}
            type="text"
            value={filters.owner}
            placeholder="owner"
            onChange={(e) => update({ owner: e.target.value })}
          />
        </label>
        <label style={styles.label}>
          Repo
          <input
            style={styles.input}
            type="text"
            value={filters.repo}
            placeholder="repo"
            onChange={(e) => update({ repo: e.target.value })}
          />
        </label>
        <label style={styles.label}>
          State
          <select
            style={styles.select}
            value={filters.state}
            onChange={(e) =>
              update({ state: e.target.value as FilterValues["state"] })
            }
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div style={styles.row}>
        <label htmlFor="filter-project" style={styles.label}>
          Project
          <ProjectSelect
            projects={projects}
            loading={projectsLoading}
            value={filters.projectId}
            disabled={!filters.owner}
            onChange={handleProjectChange}
          />
        </label>
        {fieldsLoading && <span style={styles.hint}>Loading fields...</span>}
        {fields.map((field) => (
          <FieldFilter
            key={field.id}
            field={field}
            value={filters.fieldFilters[field.id] ?? ""}
            onChange={handleFieldFilterChange}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectSelect({
  projects,
  loading,
  value,
  disabled,
  onChange,
}: {
  projects: Project[];
  loading: boolean;
  value: string;
  disabled: boolean;
  onChange: (projectId: string) => void;
}) {
  return (
    <select
      id="filter-project"
      style={styles.select}
      value={value}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{loading ? "Loading..." : "-- Select --"}</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          #{p.number} {p.title}
        </option>
      ))}
    </select>
  );
}

function FieldFilter({
  field,
  value,
  onChange,
}: {
  field: ProjectField;
  value: string;
  onChange: (fieldId: string, value: string) => void;
}) {
  if (field.options.length === 0) return null;

  return (
    <label style={styles.label}>
      {field.name}
      <select
        style={styles.select}
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
      >
        <option value="">All</option>
        {field.options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 12,
    borderBottom: "1px solid #d0d7de",
    fontSize: 13,
  },
  row: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontWeight: 600,
    color: "#24292f",
  },
  input: {
    padding: "4px 8px",
    border: "1px solid #d0d7de",
    borderRadius: 6,
    fontSize: 13,
    lineHeight: "20px",
  },
  select: {
    padding: "4px 8px",
    border: "1px solid #d0d7de",
    borderRadius: 6,
    fontSize: 13,
    lineHeight: "20px",
    background: "#fff",
  },
  hint: {
    fontSize: 12,
    color: "#656d76",
    alignSelf: "center",
  },
};
