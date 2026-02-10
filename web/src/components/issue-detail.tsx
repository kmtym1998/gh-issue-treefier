import { type FormEvent, useCallback, useState } from "react";
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
    async (e: FormEvent) => {
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
    async (e: FormEvent) => {
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
    <div style={styles.panel}>
      <div style={styles.header}>
        <span
          style={{
            ...styles.badge,
            background: issue.state === "open" ? "#dafbe1" : "#f0e6ff",
            color: issue.state === "open" ? "#1a7f37" : "#8250df",
          }}
        >
          {issue.state}
        </span>
        <button type="button" style={styles.closeButton} onClick={onClose}>
          &times;
        </button>
      </div>

      <div style={styles.repoBadge}>
        {issue.owner}/{issue.repo}
      </div>

      <h3 style={styles.title}>
        <span style={styles.number}>#{issue.number}</span> {issue.title}
      </h3>

      {issue.assignees.length > 0 && (
        <div style={styles.assignees}>
          {issue.assignees.map((a) => (
            <div key={a.login} style={styles.assignee}>
              <img src={a.avatarUrl} alt={a.login} style={styles.avatar} />
              <span>{a.login}</span>
            </div>
          ))}
        </div>
      )}

      {issue.labels.length > 0 && (
        <div style={styles.labels}>
          {issue.labels.map((label) => (
            <span
              key={label.name}
              style={{
                ...styles.label,
                background: `#${label.color}`,
                color: isLightColor(label.color) ? "#24292f" : "#fff",
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {issue.body && <p style={styles.body}>{issue.body}</p>}

      {onAddSubIssue && (
        <form onSubmit={handleAddSubIssue} style={styles.form}>
          <label style={styles.formLabel} htmlFor="sub-issue-input">
            Add Sub-Issue
          </label>
          <div style={styles.formRow}>
            <input
              id="sub-issue-input"
              type="text"
              placeholder="Issue #"
              value={childNumber}
              onChange={(e) => setChildNumber(e.target.value)}
              style={styles.input}
              disabled={submitting}
            />
            <button
              type="submit"
              style={styles.submitButton}
              disabled={submitting || !childNumber.trim()}
            >
              {submitting ? "..." : "Add"}
            </button>
          </div>
          {formError && <p style={styles.formError}>{formError}</p>}
        </form>
      )}

      {onAddBlockedBy && (
        <form onSubmit={handleAddBlockedBy} style={styles.form}>
          <label style={styles.formLabel} htmlFor="blocked-by-input">
            Add Blocked By
          </label>
          <div style={styles.formRow}>
            <input
              id="blocked-by-input"
              type="text"
              placeholder="Issue #"
              value={blockerNumber}
              onChange={(e) => setBlockerNumber(e.target.value)}
              style={styles.input}
              disabled={submitting}
            />
            <button
              type="submit"
              style={styles.blockedByButton}
              disabled={submitting || !blockerNumber.trim()}
            >
              {submitting ? "..." : "Add"}
            </button>
          </div>
          {formError && <p style={styles.formError}>{formError}</p>}
        </form>
      )}

      <a
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        View on GitHub
      </a>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 280,
    padding: 16,
    borderLeft: "1px solid #d0d7de",
    background: "#fff",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontSize: 13,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  closeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    color: "#656d76",
    lineHeight: 1,
    padding: "2px 6px",
  },
  repoBadge: {
    fontSize: 11,
    color: "#656d76",
    background: "#f6f8fa",
    padding: "2px 6px",
    borderRadius: 4,
    alignSelf: "flex-start",
    fontFamily: "monospace",
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "#24292f",
    lineHeight: 1.4,
  },
  number: {
    color: "#656d76",
    fontWeight: 400,
  },
  labels: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  label: {
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500,
  },
  assignees: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  assignee: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#24292f",
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: "50%",
  },
  body: {
    margin: 0,
    fontSize: 12,
    color: "#656d76",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    maxHeight: 200,
    overflowY: "auto" as const,
  },
  form: {
    borderTop: "1px solid #d0d7de",
    paddingTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#24292f",
  },
  formRow: {
    display: "flex",
    gap: 4,
  },
  input: {
    flex: 1,
    padding: "4px 8px",
    fontSize: 12,
    border: "1px solid #d0d7de",
    borderRadius: 4,
    outline: "none",
  },
  submitButton: {
    padding: "4px 10px",
    fontSize: 12,
    background: "#2da44e",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  blockedByButton: {
    padding: "4px 10px",
    fontSize: 12,
    background: "#cf222e",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  formError: {
    margin: 0,
    fontSize: 11,
    color: "#cf222e",
  },
  link: {
    color: "#0969da",
    fontSize: 13,
    textDecoration: "none",
  },
};
