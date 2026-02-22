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
import type { Issue } from "../types/issue";

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
}

export function IssueDetail({
  issue,
  onClose,
  onAddSubIssue,
  onAddBlockedBy,
}: IssueDetailProps) {
  const [childNumber, setChildNumber] = useState("");
  const [blockerNumber, setBlockerNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddSubIssue = useCallback(
    async (e: SubmitEvent) => {
      e.preventDefault();
      if (!issue || !onAddSubIssue || !childNumber.trim()) return;

      const num = Number.parseInt(childNumber.trim(), 10);
      if (Number.isNaN(num) || num <= 0) {
        setFormError("Invalid issue number");
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        await onAddSubIssue(issue.owner, issue.repo, issue.number, num);
        setChildNumber("");
      } catch (err) {
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
        setFormError("Invalid issue number");
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        await onAddBlockedBy(issue.owner, issue.repo, issue.number, num);
        setBlockerNumber("");
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to add");
      } finally {
        setSubmitting(false);
      }
    },
    [issue, onAddBlockedBy, blockerNumber],
  );

  if (!issue) return null;

  return (
    <Box
      sx={{
        width: 280,
        p: 2,
        borderLeft: "1px solid #d0d7de",
        bgcolor: "#fff",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        fontSize: 13,
      }}
    >
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
        <IconButton size="small" onClick={onClose} sx={{ color: "#656d76" }}>
          ×
        </IconButton>
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
            <Stack key={a.login} direction="row" alignItems="center" gap={0.5}>
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
