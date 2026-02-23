import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useState } from "react";
import { useIssueCreation } from "../hooks/use-issue-creation";
import { useProjectMutations } from "../hooks/use-project-mutations";
import { useResizablePanel } from "../hooks/use-resizable-panel";
import type { Issue, SearchResult } from "../types/issue";
import type { ProjectField } from "../types/project";
import { IssueFormFields } from "./issue-form-fields";
import { ItemSearchAutocomplete } from "./item-search-autocomplete";

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
  onDelete?: () => Promise<void>;
  projectId?: string;
  projectFields?: ProjectField[];
}

export function IssueDetail({
  issue,
  onClose,
  onAddSubIssue,
  onAddBlockedBy,
  onUpdate,
  onDelete,
  projectId,
  projectFields,
}: IssueDetailProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editState, setEditState] = useState<"open" | "closed">("open");
  const [editFieldValues, setEditFieldValues] = useState<
    Record<string, string>
  >({});
  const [editCollaborators, setEditCollaborators] = useState<
    { login: string; avatarUrl: string }[]
  >([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { updateIssue, fetchCollaborators } = useIssueCreation();
  const { updateFieldValue } = useProjectMutations();

  const handleAddSubIssue = useCallback(
    async (result: SearchResult) => {
      if (!issue || !onAddSubIssue) return;
      setSubmitting(true);
      setFormError(null);
      try {
        await onAddSubIssue(
          issue.owner,
          issue.repo,
          issue.number,
          result.number,
        );
      } catch (err) {
        setFormError(
          err instanceof Error
            ? err.message
            : "サブイシューの追加に失敗しました",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [issue, onAddSubIssue],
  );

  const handleAddBlockedBy = useCallback(
    async (result: SearchResult) => {
      if (!issue || !onAddBlockedBy) return;
      setSubmitting(true);
      setFormError(null);
      try {
        await onAddBlockedBy(
          issue.owner,
          issue.repo,
          issue.number,
          result.number,
        );
      } catch (err) {
        setFormError(
          err instanceof Error
            ? err.message
            : "Blocked By の追加に失敗しました",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [issue, onAddBlockedBy],
  );

  const handleEditStart = useCallback(async () => {
    if (!issue) return;
    setEditTitle(issue.title);
    setEditBody(issue.body);
    setEditState(issue.state);
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

  const handleDeleteConfirm = useCallback(async () => {
    if (!onDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Issue の削除に失敗しました",
      );
    } finally {
      setConfirmingDelete(false);
      setDeleting(false);
    }
  }, [onDelete]);

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
          state: editState,
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
          state: editState,
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
      editState,
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
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      <Box
        onMouseDown={handleMouseDown}
        sx={(theme) => ({
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: "col-resize",
          zIndex: 1,
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.3) },
        })}
      />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Chip
          label={issue.state}
          size="small"
          sx={(theme) => ({
            bgcolor:
              issue.state === "open"
                ? theme.palette.issueState.openBg
                : theme.palette.issueState.closedBg,
            color:
              issue.state === "open"
                ? theme.palette.issueState.openColor
                : theme.palette.issueState.closedColor,
            fontWeight: 600,
          })}
        />
        <Stack direction="row" alignItems="center" gap={0.5}>
          {onUpdate && !editing && !confirmingDelete && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleEditStart}
              sx={{ py: 0.25, px: 1 }}
            >
              編集
            </Button>
          )}
          {onDelete && !editing && !confirmingDelete && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => setConfirmingDelete(true)}
              sx={{ py: 0.25, px: 1 }}
            >
              削除
            </Button>
          )}
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "text.secondary" }}
          >
            ×
          </IconButton>
        </Stack>
      </Stack>

      {confirmingDelete && (
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            p: 1,
            borderRadius: 1,
            bgcolor: "warning.light",
            border: "1px solid",
            borderColor: "warning.main",
          }}
        >
          <Typography variant="body2" sx={{ color: "warning.dark", flex: 1 }}>
            本当に削除しますか？この操作は取り消せません。
          </Typography>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            sx={{ flexShrink: 0 }}
          >
            {deleting ? "削除中..." : "削除"}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setConfirmingDelete(false);
              setDeleteError(null);
            }}
            disabled={deleting}
            sx={{ flexShrink: 0 }}
          >
            キャンセル
          </Button>
        </Stack>
      )}

      {deleteError && <Alert severity="error">{deleteError}</Alert>}

      <Chip
        label={`${issue.owner}/${issue.repo}`}
        variant="outlined"
        size="small"
        sx={{
          alignSelf: "flex-start",
          color: "text.secondary",
          bgcolor: "grey.50",
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
          }}
        >
          {editError && <Alert severity="error">{editError}</Alert>}
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
            state={editState}
            onStateChange={setEditState}
          />
          <Stack direction="row-reverse" gap={1}>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={editSubmitting || !editTitle.trim()}
            >
              {editSubmitting ? "保存中..." : "保存"}
            </Button>
            <Button
              type="button"
              variant="text"
              onClick={handleEditCancel}
              disabled={editSubmitting}
            >
              キャンセル
            </Button>
          </Stack>
        </Box>
      ) : (
        <>
          <Typography variant="subtitle1" sx={{ color: "text.primary" }}>
            <Typography
              component="span"
              sx={{
                color: "text.secondary",
                fontWeight: 400,
                fontSize: "inherit",
              }}
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
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
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
                    color: isLightColor(label.color) ? "text.primary" : "#fff",
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
              variant="body2"
              sx={{
                color: "text.secondary",
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
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "text.primary" }}
          >
            Add Sub-Issue
          </Typography>
          <ItemSearchAutocomplete
            owner={issue.owner}
            type="issue"
            onSelect={handleAddSubIssue}
            disabled={submitting}
            label="Sub-Issue を検索"
          />
          {formError && <Alert severity="error">{formError}</Alert>}
        </Box>
      )}

      {onAddBlockedBy && (
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "text.primary" }}
          >
            Add Blocked By
          </Typography>
          <ItemSearchAutocomplete
            owner={issue.owner}
            type="issue"
            onSelect={handleAddBlockedBy}
            disabled={submitting}
            label="Blocked By を検索"
          />
          {formError && <Alert severity="error">{formError}</Alert>}
        </Box>
      )}

      <Link
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        GitHub で表示
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="currentColor"
        >
          <title>新しいタブで開く</title>
          <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
        </svg>
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
