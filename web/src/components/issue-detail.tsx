import type { Issue } from "../types/issue";

export interface IssueDetailProps {
  issue: Issue | null;
  onClose: () => void;
}

export function IssueDetail({ issue, onClose }: IssueDetailProps) {
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
  link: {
    color: "#0969da",
    fontSize: 13,
    textDecoration: "none",
  },
};
