import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useProjectFields, useProjects } from "../hooks/use-projects";
import type { Project, ProjectField } from "../types/project";

export interface FilterValues {
  owner: string;
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        <TextField
          label="オーナー"
          value={filters.owner}
          placeholder="owner"
          onChange={(e) => update({ owner: e.target.value })}
        />
        <TextField
          select
          label="State"
          value={filters.state}
          onChange={(e) =>
            update({ state: e.target.value as FilterValues["state"] })
          }
          sx={{ minWidth: 100 }}
        >
          <MenuItem value="open">Open</MenuItem>
          <MenuItem value="closed">Closed</MenuItem>
          <MenuItem value="all">すべて</MenuItem>
        </TextField>
      </Stack>

      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        <ProjectSelect
          projects={projects}
          loading={projectsLoading}
          value={filters.projectId}
          disabled={!filters.owner}
          onChange={handleProjectChange}
        />
      </Stack>

      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        {fieldsLoading && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", alignSelf: "center" }}
          >
            フィールドを読み込み中...
          </Typography>
        )}
        {fields.map((field) => (
          <FieldFilter
            key={field.id}
            field={field}
            value={filters.fieldFilters[field.id] ?? ""}
            onChange={handleFieldFilterChange}
          />
        ))}
      </Stack>
    </Box>
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
    <TextField
      select
      label="Project"
      id="filter-project"
      value={value}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 200 }}
    >
      <MenuItem value="">{loading ? "読み込み中..." : "-- 選択してください --"}</MenuItem>
      {projects.map((p) => (
        <MenuItem key={p.id} value={p.id}>
          #{p.number} {p.title}
        </MenuItem>
      ))}
    </TextField>
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
    <TextField
      select
      label={field.name}
      value={value}
      onChange={(e) => onChange(field.id, e.target.value)}
      sx={{ minWidth: 120 }}
    >
      <MenuItem value="">すべて</MenuItem>
      {field.options.map((opt) => (
        <MenuItem key={opt.id} value={opt.id}>
          {opt.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
