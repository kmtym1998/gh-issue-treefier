import { useEffect, useState } from "react";
import { graphql } from "../api-client";
import type {
  GitHubProjectV2FieldNode,
  GitHubProjectV2Node,
} from "../types/github";
import type {
  Project,
  ProjectField,
  ProjectFieldOption,
  ProjectFieldType,
} from "../types/project";

const SUPPORTED_FIELD_TYPES: Set<string> = new Set([
  "TEXT",
  "NUMBER",
  "DATE",
  "SINGLE_SELECT",
  "ITERATION",
]);

/**
 * GraphQL ProjectV2 ノードを内部の Project 型に変換する。
 */
const parseProjects = (nodes: GitHubProjectV2Node[]): Project[] =>
  nodes.map((n) => ({
    id: n.id,
    title: n.title,
    number: n.number,
  }));

/**
 * GraphQL ProjectV2 フィールドノードを内部の ProjectField 型に変換する。
 * サポートしないフィールド型（ASSIGNEES, LABELS 等）は除外する。
 */
const parseProjectFields = (
  nodes: GitHubProjectV2FieldNode[],
): ProjectField[] =>
  nodes
    .filter((n) => SUPPORTED_FIELD_TYPES.has(n.dataType))
    .map((n) => ({
      id: n.id,
      name: n.name,
      dataType: n.dataType as ProjectFieldType,
      options: extractOptions(n),
    }));

const extractOptions = (
  node: GitHubProjectV2FieldNode,
): ProjectFieldOption[] => {
  if (node.dataType === "SINGLE_SELECT" && node.options) {
    return node.options.map((o) => ({ id: o.id, name: o.name, color: o.color ?? undefined }));
  }
  if (node.dataType === "ITERATION" && node.configuration?.iterations) {
    return node.configuration.iterations.map((i) => ({
      id: i.id,
      name: i.title,
    }));
  }
  return [];
};

const PROJECTS_QUERY_USER = `
  query($owner: String!) {
    user(login: $owner) {
      projectsV2(first: 20) {
        nodes { id title number }
      }
    }
  }
`;

const PROJECTS_QUERY_ORG = `
  query($owner: String!) {
    organization(login: $owner) {
      projectsV2(first: 20) {
        nodes { id title number }
      }
    }
  }
`;

const FIELDS_QUERY = `
  query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        fields(first: 50) {
          nodes {
            ... on ProjectV2Field {
              id name dataType
            }
            ... on ProjectV2SingleSelectField {
              id name dataType
              options { id name color }
            }
            ... on ProjectV2IterationField {
              id name dataType
              configuration {
                iterations { id title }
              }
            }
          }
        }
      }
    }
  }
`;

interface ProjectsGraphQLResponse {
  data: {
    user?: { projectsV2: { nodes: GitHubProjectV2Node[] } };
    organization?: { projectsV2: { nodes: GitHubProjectV2Node[] } };
  };
}

interface FieldsGraphQLResponse {
  data: {
    node: {
      fields: { nodes: GitHubProjectV2FieldNode[] };
    };
  };
}

export interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: Error | null;
}

export interface UseProjectFieldsResult {
  fields: ProjectField[];
  loading: boolean;
  error: Error | null;
}

export const useProjects = (owner: string): UseProjectsResult => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!owner) return;

    let cancelled = false;

    const fetchProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        // user クエリを試行し、結果がなければ organization クエリにフォールバック
        let nodes: GitHubProjectV2Node[];
        try {
          const res = await graphql<ProjectsGraphQLResponse>(
            PROJECTS_QUERY_USER,
            { owner },
          );
          nodes = res.data.user?.projectsV2.nodes ?? [];
        } catch {
          nodes = [];
        }

        if (nodes.length === 0) {
          try {
            const res = await graphql<ProjectsGraphQLResponse>(
              PROJECTS_QUERY_ORG,
              { owner },
            );
            nodes = res.data.organization?.projectsV2.nodes ?? [];
          } catch {
            // user でも organization でも見つからない場合は空
          }
        }

        if (!cancelled) {
          setProjects(parseProjects(nodes));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProjects();
    return () => {
      cancelled = true;
    };
  }, [owner]);

  return { projects, loading, error };
};

export const useProjectFields = (projectId: string): UseProjectFieldsResult => {
  const [fields, setFields] = useState<ProjectField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const fetchFields = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await graphql<FieldsGraphQLResponse>(FIELDS_QUERY, {
          projectId,
        });
        if (!cancelled) {
          setFields(parseProjectFields(res.data.node.fields.nodes));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchFields();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { fields, loading, error };
};
