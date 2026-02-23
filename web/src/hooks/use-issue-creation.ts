import { useCallback, useState } from "react";
import { graphql, restGet, restPatch, restPost } from "../api-client";
import type { CreateIssueParams, IssueTemplate } from "../types/issue";

export interface CreatedIssue {
  id: number;
  node_id: string;
  number: number;
  title: string;
  html_url: string;
}

interface IssueTemplatesResponse {
  data: {
    repository: {
      issueTemplates: Array<{
        name: string;
        title: string;
        body: string;
        about: string;
      }>;
    };
  };
}

interface Collaborator {
  login: string;
  avatar_url: string;
}

const ISSUE_TEMPLATES_QUERY = `
  query GetIssueTemplates($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      issueTemplates {
        name
        title
        body
        about
      }
    }
  }
`;

export interface UpdateIssueParams {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body?: string;
  assignees?: string[];
  state?: "open" | "closed";
}

export interface UseIssueCreationResult {
  createIssue: (params: CreateIssueParams) => Promise<CreatedIssue>;
  updateIssue: (params: UpdateIssueParams) => Promise<CreatedIssue>;
  fetchTemplates: (owner: string, repo: string) => Promise<IssueTemplate[]>;
  fetchCollaborators: (
    owner: string,
    repo: string,
  ) => Promise<Array<{ login: string; avatarUrl: string }>>;
  loading: boolean;
  error: Error | null;
}

export const useIssueCreation = (): UseIssueCreationResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createIssue = useCallback(
    async (params: CreateIssueParams): Promise<CreatedIssue> => {
      setLoading(true);
      setError(null);
      try {
        return await restPost<CreatedIssue>(
          `repos/${params.owner}/${params.repo}/issues`,
          {
            title: params.title,
            body: params.body,
            assignees: params.assignees,
          },
        );
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateIssue = useCallback(
    async (params: UpdateIssueParams): Promise<CreatedIssue> => {
      setLoading(true);
      setError(null);
      try {
        return await restPatch<CreatedIssue>(
          `repos/${params.owner}/${params.repo}/issues/${params.number}`,
          {
            title: params.title,
            body: params.body,
            assignees: params.assignees,
            state: params.state,
          },
        );
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchTemplates = useCallback(
    async (owner: string, repo: string): Promise<IssueTemplate[]> => {
      try {
        const result = await graphql<IssueTemplatesResponse>(
          ISSUE_TEMPLATES_QUERY,
          { owner, name: repo },
        );
        return (result.data.repository.issueTemplates ?? []).map((t) => ({
          name: t.name,
          title: t.title,
          body: t.body,
        }));
      } catch {
        return [];
      }
    },
    [],
  );

  const fetchCollaborators = useCallback(
    async (
      owner: string,
      repo: string,
    ): Promise<Array<{ login: string; avatarUrl: string }>> => {
      try {
        const result = await restGet<Collaborator[]>(
          `repos/${owner}/${repo}/collaborators`,
        );
        return result.map((c) => ({
          login: c.login,
          avatarUrl: c.avatar_url,
        }));
      } catch {
        return [];
      }
    },
    [],
  );

  return {
    createIssue,
    updateIssue,
    fetchTemplates,
    fetchCollaborators,
    loading,
    error,
  };
};
