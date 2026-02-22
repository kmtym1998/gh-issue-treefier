import { useCallback, useState } from "react";
import { graphql } from "../api-client";
import { invalidateCache } from "../lib/cache";
import type { ProjectFieldUpdate } from "../types/issue";

const ADD_PROJECT_ITEM_MUTATION = `
  mutation AddProjectItem($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: {
      projectId: $projectId
      contentId: $contentId
    }) {
      item {
        id
      }
    }
  }
`;

const UPDATE_FIELD_VALUE_MUTATION = `
  mutation UpdateFieldValue($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: $value
    }) {
      projectV2Item { id }
    }
  }
`;

interface AddProjectItemResponse {
  data: {
    addProjectV2ItemById: {
      item: { id: string };
    };
  };
}

export interface UseProjectMutationsResult {
  addToProject: (projectId: string, contentNodeId: string) => Promise<string>;
  updateFieldValue: (
    projectId: string,
    itemId: string,
    fieldId: string,
    value: ProjectFieldUpdate["value"],
  ) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export const useProjectMutations = (
  onSuccess?: () => void,
): UseProjectMutationsResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addToProject = useCallback(
    async (projectId: string, contentNodeId: string): Promise<string> => {
      setLoading(true);
      setError(null);
      try {
        const result = await graphql<AddProjectItemResponse>(
          ADD_PROJECT_ITEM_MUTATION,
          { projectId, contentId: contentNodeId },
        );
        invalidateCache(projectId);
        onSuccess?.();
        return result.data.addProjectV2ItemById.item.id;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  const updateFieldValue = useCallback(
    async (
      projectId: string,
      itemId: string,
      fieldId: string,
      value: ProjectFieldUpdate["value"],
    ): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await graphql(UPDATE_FIELD_VALUE_MUTATION, {
          projectId,
          itemId,
          fieldId,
          value,
        });
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

  return { addToProject, updateFieldValue, loading, error };
};
