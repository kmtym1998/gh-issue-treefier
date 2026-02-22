import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useState } from "react";
import { useIssueCreation } from "../hooks/use-issue-creation";
import { buildIssueId } from "../hooks/use-project-issues";
import { useProjectMutations } from "../hooks/use-project-mutations";
import { useResizablePanel } from "../hooks/use-resizable-panel";
import type { Issue, IssueTemplate } from "../types/issue";
import type { ProjectField } from "../types/project";

export interface IssueCreateFormProps {
  repos: string[];
  projectId: string;
  projectFields: ProjectField[];
  onSuccess: (issue: Issue, continueCreating: boolean) => void;
  onClose: () => void;
}

export function IssueCreateForm({
  repos,
  projectId,
  projectFields,
  onSuccess,
  onClose,
}: IssueCreateFormProps) {
  const { width, handleMouseDown } = useResizablePanel(
    "panel-width:issue-create-form",
    400,
  );
  const [repoInputValue, setRepoInputValue] = useState("");
  const [templates, setTemplates] = useState<IssueTemplate[]>([]);
  const [collaborators, setCollaborators] = useState<
    { login: string; avatarUrl: string }[]
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [continueCreating, setContinueCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createIssue, fetchTemplates, fetchCollaborators } =
    useIssueCreation();
  const { addToProject, updateFieldValue } = useProjectMutations();

  const selectableFields = projectFields.filter(
    (f) => f.dataType === "SINGLE_SELECT" || f.dataType === "ITERATION",
  );

  const handleRepoSelect = useCallback(
    async (repo: string | null) => {
      setTemplates([]);
      setCollaborators([]);
      setSelectedTemplate("");
      const r = repo ?? "";
      if (!r) return;
      const parts = r.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) return;
      const [owner, repoName] = parts;
      const [fetchedTemplates, fetchedCollaborators] = await Promise.all([
        fetchTemplates(owner, repoName),
        fetchCollaborators(owner, repoName),
      ]);
      setTemplates(fetchedTemplates);
      setCollaborators(fetchedCollaborators);
    },
    [fetchTemplates, fetchCollaborators],
  );

  const handleTemplateChange = useCallback(
    (templateName: string) => {
      setSelectedTemplate(templateName);
      const template = templates.find((t) => t.name === templateName);
      if (template) {
        setTitle(template.title ?? "");
        setBody(template.body ?? "");
      }
    },
    [templates],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const parts = repoInputValue.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) return;
      const [owner, repo] = parts;
      if (!title.trim()) return;

      setSubmitting(true);
      setError(null);

      let createdNodeId: string;
      let createdNumber: number;
      let createdUrl: string;
      try {
        const created = await createIssue({
          owner,
          repo,
          title: title.trim(),
          body: body || undefined,
          assignees: assignees.length > 0 ? assignees : undefined,
        });
        createdNodeId = created.node_id;
        createdNumber = created.number;
        createdUrl = created.html_url;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Issue の作成に失敗しました",
        );
        setSubmitting(false);
        return;
      }

      let itemId: string;
      try {
        itemId = await addToProject(projectId, createdNodeId);
      } catch (err) {
        setError(
          `Issue は作成されましたが、プロジェクトへの追加に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
        );
        setSubmitting(false);
        return;
      }

      for (const [fieldId, optionId] of Object.entries(fieldValues)) {
        if (!optionId) continue;
        const field = projectFields.find((f) => f.id === fieldId);
        if (!field) continue;
        const value =
          field.dataType === "SINGLE_SELECT"
            ? { singleSelectOptionId: optionId }
            : { iterationId: optionId };
        try {
          await updateFieldValue(projectId, itemId, fieldId, value);
        } catch {
          // フィールド更新失敗は無視して続行
        }
      }

      setSubmitting(false);
      if (continueCreating) {
        setTitle("");
        setBody("");
        setSelectedTemplate("");
      }
      onSuccess(
        {
          id: buildIssueId(owner, repo, createdNumber),
          number: createdNumber,
          owner,
          repo,
          title: title.trim(),
          state: "open",
          body: body || "",
          labels: [],
          assignees: assignees.map((a) => ({ login: a, avatarUrl: "" })),
          url: createdUrl,
          fieldValues: {},
        },
        continueCreating,
      );
    },
    [
      repoInputValue,
      title,
      body,
      assignees,
      fieldValues,
      projectId,
      projectFields,
      continueCreating,
      createIssue,
      addToProject,
      updateFieldValue,
      onSuccess,
    ],
  );

  const repoParts = repoInputValue.split("/");
  const isRepoValid =
    repoParts.length === 2 && !!repoParts[0] && !!repoParts[1];

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        position: "relative",
        width,
        p: 2,
        borderLeft: "1px solid #d0d7de",
        bgcolor: "#fff",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: "col-resize",
          zIndex: 1,
          "&:hover": { bgcolor: "#0969da4d" },
        }}
      />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#24292f" }}>
          Issue を作成
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#656d76" }}>
          ×
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ py: 0.5, fontSize: 12 }}>
          {error}
        </Alert>
      )}

      <Autocomplete
        freeSolo
        options={repos}
        inputValue={repoInputValue}
        onInputChange={(_, value) => setRepoInputValue(value)}
        onChange={(_, value) =>
          handleRepoSelect(typeof value === "string" ? value : null)
        }
        size="small"
        renderInput={(params) => (
          <TextField
            {...params}
            label="リポジトリ"
            placeholder="owner/repo"
            required
          />
        )}
        disabled={submitting}
      />

      {templates.length > 0 && (
        <FormControl size="small">
          <InputLabel>テンプレート</InputLabel>
          <Select
            label="テンプレート"
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            disabled={submitting}
          >
            <MenuItem value="">
              <em>なし</em>
            </MenuItem>
            {templates.map((t) => (
              <MenuItem key={t.name} value={t.name}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField
        size="small"
        label="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        disabled={submitting}
      />

      <TextField
        size="small"
        label="本文"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        multiline
        minRows={5}
        disabled={submitting}
      />

      <Autocomplete
        multiple
        freeSolo
        options={collaborators.map((c) => c.login)}
        value={assignees}
        onChange={(_, value) => setAssignees(value)}
        size="small"
        renderInput={(params) => <TextField {...params} label="Assignees" />}
        disabled={submitting}
      />

      {selectableFields.map((field) => (
        <FormControl key={field.id} size="small">
          <InputLabel>{field.name}</InputLabel>
          <Select
            label={field.name}
            value={fieldValues[field.id] ?? ""}
            onChange={(e) =>
              setFieldValues((prev) => ({
                ...prev,
                [field.id]: e.target.value,
              }))
            }
            disabled={submitting}
          >
            <MenuItem value="">
              <em>なし</em>
            </MenuItem>
            {field.options.map((opt) => (
              <MenuItem key={opt.id} value={opt.id}>
                {opt.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}

      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={continueCreating}
            onChange={(e) => setContinueCreating(e.target.checked)}
            disabled={submitting}
          />
        }
        label={<Typography sx={{ fontSize: 13 }}>続けて作成する</Typography>}
        sx={{ m: 0 }}
      />

      <Button
        type="submit"
        variant="contained"
        color="success"
        size="small"
        disabled={submitting || !title.trim() || !isRepoValid}
        sx={{ textTransform: "none", fontSize: 13 }}
      >
        {submitting ? "作成中..." : "Issue を作成"}
      </Button>
    </Box>
  );
}
