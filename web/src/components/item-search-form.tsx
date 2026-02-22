import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useItemSearch } from "../hooks/use-item-search";
import { useProjectMutations } from "../hooks/use-project-mutations";
import { useResizablePanel } from "../hooks/use-resizable-panel";
import type { SearchResult } from "../types/issue";

export interface ItemSearchFormProps {
  type: "issue" | "pr";
  owner: string;
  projectId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function ItemSearchForm({
  type,
  owner,
  projectId,
  onSuccess,
  onClose,
}: ItemSearchFormProps) {
  const { width, handleMouseDown } = useResizablePanel(
    "panel-width:item-search-form",
    400,
  );
  const [inputValue, setInputValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const { results, search, loading } = useItemSearch();
  const { addToProject } = useProjectMutations();

  const handleInputChange = (_: React.SyntheticEvent, value: string) => {
    setInputValue(value);
    search(value, owner, type);
  };

  const handleSelect = async (
    _: React.SyntheticEvent,
    value: SearchResult | null,
  ) => {
    if (!value) return;
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
  const placeholder = type === "issue" ? "Issue を検索..." : "PR を検索...";

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
        <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#24292f" }}>
          {title}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#656d76" }}>
          ×
        </IconButton>
      </Stack>

      {addError && (
        <Alert severity="error" sx={{ py: 0.5, fontSize: 12 }}>
          {addError}
        </Alert>
      )}

      <Autocomplete<SearchResult>
        options={results}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={handleSelect}
        getOptionLabel={(option) => `#${option.number} ${option.title}`}
        isOptionEqualToValue={(option, value) => option.nodeId === value.nodeId}
        filterOptions={(x) => x}
        loading={loading}
        disabled={adding}
        size="small"
        renderInput={(params) => (
          <TextField {...params} label="検索" placeholder={placeholder} />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.nodeId}>
            <Stack direction="column" gap={0.25} sx={{ width: "100%" }}>
              <Stack direction="row" gap={0.5} alignItems="center">
                <Chip
                  label={option.state}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    bgcolor: option.state === "open" ? "#dafbe1" : "#f0e6ff",
                    color: option.state === "open" ? "#1a7f37" : "#8250df",
                  }}
                />
                <Typography sx={{ fontSize: 11, color: "#656d76" }}>
                  {option.repo}#{option.number}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, color: "#24292f" }}>
                {option.title}
              </Typography>
            </Stack>
          </li>
        )}
        noOptionsText={inputValue ? "結果なし" : "検索ワードを入力してください"}
      />
    </Box>
  );
}
