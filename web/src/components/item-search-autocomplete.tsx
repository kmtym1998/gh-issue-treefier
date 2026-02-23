import {
  Autocomplete,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useItemSearch } from "../hooks/use-item-search";
import type { SearchResult } from "../types/issue";

export interface ItemSearchAutocompleteProps {
  owner: string;
  type?: "issue" | "pr";
  onSelect: (result: SearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export function ItemSearchAutocomplete({
  owner,
  type = "issue",
  onSelect,
  disabled,
  placeholder,
  label = "検索",
}: ItemSearchAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [value, setValue] = useState<SearchResult | null>(null);
  const { results, search, loading } = useItemSearch();

  useEffect(() => {
    search("", owner, type);
  }, [owner, type, search]);

  const defaultPlaceholder = type === "pr" ? "PR を検索..." : "Issue を検索...";

  const handleInputChange = (
    _: React.SyntheticEvent,
    newInputValue: string,
  ) => {
    setInputValue(newInputValue);
    search(newInputValue, owner, type);
  };

  const handleChange = (
    _: React.SyntheticEvent,
    newValue: SearchResult | null,
  ) => {
    if (!newValue) return;
    onSelect(newValue);
    setValue(null);
    setInputValue("");
  };

  return (
    <Autocomplete<SearchResult>
      options={results}
      value={value}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      getOptionLabel={(option) => `#${option.number} ${option.title}`}
      isOptionEqualToValue={(option, val) => option.nodeId === val.nodeId}
      filterOptions={(x) => x}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder ?? defaultPlaceholder}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.nodeId}>
          <Stack direction="column" gap={0.25} sx={{ width: "100%" }}>
            <Stack direction="row" gap={0.5} alignItems="center">
              <Chip
                label={option.state}
                size="small"
                sx={(theme) => ({
                  height: 18,
                  bgcolor:
                    option.state === "open"
                      ? theme.palette.issueState.openBg
                      : theme.palette.issueState.closedBg,
                  color:
                    option.state === "open"
                      ? theme.palette.issueState.openColor
                      : theme.palette.issueState.closedColor,
                })}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {option.repo}#{option.number}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "text.primary" }}>
              {option.title}
            </Typography>
          </Stack>
        </li>
      )}
      noOptionsText="結果なし"
    />
  );
}
