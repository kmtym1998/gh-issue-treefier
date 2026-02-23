import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type SubmitEvent, useCallback, useState } from "react";
import { useIssueCreation } from "../hooks/use-issue-creation";
import { useProjectMutations } from "../hooks/use-project-mutations";
import { useResizablePanel } from "../hooks/use-resizable-panel";
import type { Issue } from "../types/issue";
import type { ProjectField } from "../types/project";
import { IssueFormFields } from "./issue-form-fields";

export interface IssueDetailProps {
  issue: Issue | null;
  onClose: () => void;
  onAddSubIssue?: (
    owner: string,
    repo: string,
    parentNumber: number,
    childNumber: number,
  ) => Promise<void>;
  onAddBlockedBy?: (
    owner: string,
    repo: string,
    issueNumber: number,
    blockerNumber: number,
  ) => Promise<void>;
  onUpdate?: (issue: Issue) => void;
  projectId?: string;
  projectFields?: ProjectField[];
}

export function IssueDetail({
  issue,
  onClose,
  onAddSubIssue,
  onAddBlockedBy,
  onUpdate,
  projectId,
  projectFields,
}: IssueDetailProps) {
  const [childNumber, setChildNumber] = useState("");
  const [blockerNumber, setBlockerNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editFieldValues, setEditFieldValues] = useState<Record<string, string>>({});
  const [editCollaborators, setEditCollaborators] = useState<
    { login: string; avatarUrl: string }[]
  >([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { updateIssue, fetchCollaborators } = useIssueCreation();
  const { updateFieldValue } = useProjectMutations();

  const handleAddSubIssue = useCallback(
    async (e: SubmitEvent) => {
      e.preventDefault();
      if (!issue || !onAddSubIssue || !childNumber.trim()) return;

      const num = Number.parseInt(childNumber.trim(), 10);
      if (Number.isNaN(num) || num <= 0) {
        // TODO: エラーメッセージを日本語に統一する (他コンポーネントは日本語)
        setFormError("Invalid issue number");
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        await onAddSubIssue(issue.owner, issue.repo, issue.number, num);
        setChildNumber("");
      } catch (err) {
        // TODO: エラーメッセージを日本語に統一する (他コンポーネントは日本語)
        setFormError(err instanceof Error ? err.message : "Failed to add");
      } finally {
        setSubmitting(false);
      }
    },
    [issue, onAddSubIssue, childNumber],
  );

  const handleAddBlockedBy = useCallback(
    async (e: SubmitEvent) => {
      e.preventDefault();
      if (!issue || !onAddBlockedBy || !blockerNumber.trim()) return;

      const num = Number.parseInt(blockerNumber.trim(), 10);
      if (Number.isNaN(num) || num <= 0) {
        // TODO: エラーメッセージを日本語に統一する (他コンポーネントは日本語)
        setFormError("Invalid issue number");
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        await onAddBlockedBy(issue.owner, issue.repo, issue.number, num);
        setBlockerNumber("");
      } catch (err) {
        // TODO: エラーメッセージを日本語に統一する (他コンポーネントは日本語)
        setFormError(err instanceof Error ? err.message : "Failed to add");
      } finally {
        setSubmitting(false);
      }
    },
    [issue, onAddBlockedBy, blockerNumber],
  );

  const handleEditStart = useCallback(async () => {
    if (!issue) return;
    setEditTitle(issue.title);
    setEditBody(issue.body);
    setEditAssignees(issue.assignees.map((a) => a.login));
    setEditFieldValues(issue.fieldValues);
    setEditError(null);
    setEditing(true);
    const collaborators = await fetchCollaborators(issue.owner, issue.repo);
    setEditCollaborators(collaborators);
  }, [issue, fetchCollaborators]);

  const handleEditCancel = useCallback(() => {
    setEditing(false);
    setEditError(null);
  }, []);

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!issue || !onUpdate) return;
      if (!editTitle.trim()) return;

      setEditSubmitting(true);
      setEditError(null);
      try {
        await updateIssue({
          owner: issue.owner,
          repo: issue.repo,
          number: issue.number,
          title: editTitle.trim(),
          body: editBody || undefined,
          assignees: editAssignees.length > 0 ? editAssignees : [],
        });

        if (issue.itemId && projectId && projectFields) {
          for (const [fieldId, optionId] of Object.entries(editFieldValues)) {
            if (!optionId) continue;
            const field = projectFields.find((f) => f.id === fieldId);
            if (!field) continue;
            const value =
              field.dataType === "SINGLE_SELECT"
                ? { singleSelectOptionId: optionId }
                : { iterationId: optionId };
            try {
              await updateFieldValue(projectId, issue.itemId, fieldId, value);
            } catch {
              // フィールド更新失敗は無視して続行
            }
          }
        }

        onUpdate({
          ...issue,
          title: editTitle.trim(),
          body: editBody,
          assignees: editAssignees.map((login) => ({ login, avatarUrl: "" })),
          fieldValues: editFieldValues,
        });
        setEditing(false);
      } catch (err) {
        setEditError(
          err instanceof Error ? err.message : "Issue の更新に失敗しました",
        );
      } finally {
        setEditSubmitting(false);
      }
    },
    [
      issue,
      onUpdate,
      editTitle,
      editBody,
      editAssignees,
      editFieldValues,
      projectId,
      projectFields,
      updateIssue,
      updateFieldValue,
    ],
  );

  const { width, handleMouseDown } = useResizablePanel(
    "panel-width:issue-detail",
    400,
  );

  if (!issue) return null;

  return (
    <Box
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
        <Chip
          label={issue.state}
          size="small"
          sx={{
            bgcolor: issue.state === "open" ? "#dafbe1" : "#f0e6ff",
            color: issue.state === "open" ? "#1a7f37" : "#8250df",
            fontWeight: 600,
            fontSize: 12,
          }}
        />
        <Stack direction="row" alignItems="center" gap={0.5}>
          {onUpdate && !editing && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleEditStart}
              sx={{ fontSize: 12, textTransform: "none", py: 0.25, px: 1 }}
            >
              編集
            </Button>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: "#656d76" }}>
            ×
          </IconButton>
        </Stack>
      </Stack>

      <Chip
        label={`${issue.owner}/${issue.repo}`}
        variant="outlined"
        size="small"
        sx={{
          alignSelf: "flex-start",
          fontSize: 11,
          color: "#656d76",
          bgcolor: "#f6f8fa",
          fontFamily: "monospace",
          borderColor: "transparent",
        }}
      />

      {editing ? (
        <Box
          component="form"
          onSubmit={handleEditSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "#f6f8fa" },
            "& .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor: "#8c959f",
            },
            "& .MuiFormLabel-root.Mui-disabled": { color: "#8c959f" },
          }}
        >
          {editError && (
            <Alert severity="error" sx={{ py: 0.5, fontSize: 12 }}>
              {editError}
            </Alert>
          )}
          <IssueFormFields
            collaborators={editCollaborators}
            projectFields={projectFields ?? []}
            title={editTitle}
            body={editBody}
            assignees={editAssignees}
            fieldValues={editFieldValues}
            onTitleChange={setEditTitle}
            onBodyChange={setEditBody}
            onAssigneesChange={setEditAssignees}
            onFieldValuesChange={setEditFieldValues}
            disabled={editSubmitting}
          />
          <Stack direction="row" gap={1}>
            <Button
              type="submit"
              variant="contained"
              color="success"
              size="small"
              disabled={editSubmitting || !editTitle.trim()}
              sx={{ textTransform: "none", fontSize: 13, flex: 1 }}
            >
              {editSubmitting ? "保存中..." : "保存"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              size="small"
              onClick={handleEditCancel}
              disabled={editSubmitting}
              sx={{ textTransform: "none", fontSize: 13 }}
            >
              キャンセル
            </Button>
          </Stack>
        </Box>
      ) : (
        <>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontSize: 15,
              color: "#24292f",
              lineHeight: 1.4,
            }}
          >
            <Typography
              component="span"
              sx={{ color: "#656d76", fontWeight: 400, fontSize: "inherit" }}
            >
              #{issue.number}
            </Typography>{" "}
            {issue.title}
          </Typography>

          {issue.assignees.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {issue.assignees.map((a) => (
                <Stack
                  key={a.login}
                  direction="row"
                  alignItems="center"
                  gap={0.5}
                >
                  <Avatar
                    src={a.avatarUrl}
                    alt={a.login}
                    sx={{ width: 20, height: 20 }}
                  />
                  <Typography sx={{ fontSize: 12, color: "#24292f" }}>
                    {a.login}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}

          {issue.labels.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {issue.labels.map((label) => (
                <Chip
                  key={label.name}
                  label={label.name}
                  size="small"
                  sx={{
                    bgcolor: `#${label.color}`,
                    color: isLightColor(label.color) ? "#24292f" : "#fff",
                    fontSize: 11,
                    fontWeight: 500,
                    height: "auto",
                    "& .MuiChip-label": { px: 1, py: 0.25 },
                  }}
                />
              ))}
            </Stack>
          )}

          {issue.body && (
            <Typography
              sx={{
                fontSize: 12,
                color: "#656d76",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {issue.body}
            </Typography>
          )}
        </>
      )}

      {onAddSubIssue && (
        <Box
          component="form"
          onSubmit={handleAddSubIssue}
          sx={{
            borderTop: "1px solid #d0d7de",
            pt: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          <Box
            component="label"
            htmlFor="sub-issue-input"
            sx={{ fontSize: 12, fontWeight: 600, color: "#24292f" }}
          >
            Add Sub-Issue
          </Box>
          <Stack direction="row" gap={0.5}>
            <TextField
              id="sub-issue-input"
              size="small"
              placeholder="Issue #"
              value={childNumber}
              onChange={(e) => setChildNumber(e.target.value)}
              disabled={submitting}
              sx={{
                flex: 1,
                "& .MuiInputBase-input": { fontSize: 12, py: 0.5, px: 1 },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="success"
              size="small"
              disabled={submitting || !childNumber.trim()}
              sx={{
                fontSize: 12,
                minWidth: "auto",
                px: 1.25,
                py: 0.5,
                textTransform: "none",
              }}
            >
              {submitting ? "..." : "Add"}
            </Button>
          </Stack>
          {formError && (
            <Alert severity="error" sx={{ py: 0, fontSize: 11 }}>
              {formError}
            </Alert>
          )}
        </Box>
      )}

      {onAddBlockedBy && (
        <Box
          component="form"
          onSubmit={handleAddBlockedBy}
          sx={{
            borderTop: "1px solid #d0d7de",
            pt: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          <Box
            component="label"
            htmlFor="blocked-by-input"
            sx={{ fontSize: 12, fontWeight: 600, color: "#24292f" }}
          >
            Add Blocked By
          </Box>
          <Stack direction="row" gap={0.5}>
            <TextField
              id="blocked-by-input"
              size="small"
              placeholder="Issue #"
              value={blockerNumber}
              onChange={(e) => setBlockerNumber(e.target.value)}
              disabled={submitting}
              sx={{
                flex: 1,
                "& .MuiInputBase-input": { fontSize: 12, py: 0.5, px: 1 },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="error"
              size="small"
              disabled={submitting || !blockerNumber.trim()}
              sx={{
                fontSize: 12,
                minWidth: "auto",
                px: 1.25,
                py: 0.5,
                textTransform: "none",
              }}
            >
              {submitting ? "..." : "Add"}
            </Button>
          </Stack>
          {formError && (
            <Alert severity="error" sx={{ py: 0, fontSize: 11 }}>
              {formError}
            </Alert>
          )}
        </Box>
      )}

      <Link
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: "#0969da", fontSize: 13, textDecoration: "none" }}
      >
        View on GitHub
      </Link>
    </Box>
  );
}

function isLightColor(hex: string): boolean {
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
