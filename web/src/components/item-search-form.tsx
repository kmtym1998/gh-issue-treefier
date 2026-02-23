import { Alert, Box, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useProjectMutations } from "../hooks/use-project-mutations";
import { useResizablePanel } from "../hooks/use-resizable-panel";
import type { SearchResult } from "../types/issue";
import { ItemSearchAutocomplete } from "./item-search-autocomplete";

export interface ItemSearchFormProps {
  type: "issue" | "pr";
  owner: string;
  projectId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const ItemSearchForm = ({
  type,
  owner,
  projectId,
  onSuccess,
  onClose,
}: ItemSearchFormProps) => {
  const { width, handleMouseDown } = useResizablePanel(
    "panel-width:item-search-form",
    400,
  );
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const { addToProject } = useProjectMutations();

  const handleSelect = async (value: SearchResult) => {
    setAdding(true);
    setAddError(null);
    try {
      await addToProject(projectId, value.nodeId);
      onSuccess();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "追加に失敗しました");
    } finally {
      setAdding(false);
    }
  };

  const title = type === "issue" ? "Issue を追加" : "PR を追加";

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
        <Typography variant="subtitle2" sx={{ color: "text.primary" }}>
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "text.secondary" }}
        >
          ×
        </IconButton>
      </Stack>

      {addError && <Alert severity="error">{addError}</Alert>}

      <ItemSearchAutocomplete
        owner={owner}
        type={type}
        onSelect={handleSelect}
        disabled={adding}
      />
    </Box>
  );
};
