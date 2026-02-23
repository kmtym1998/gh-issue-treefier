import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import type { ProjectField } from "../types/project";

export interface IssueFormFieldsProps {
  collaborators: { login: string; avatarUrl: string }[];
  projectFields: ProjectField[];
  title: string;
  body: string;
  assignees: string[];
  fieldValues: Record<string, string>;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onAssigneesChange: (v: string[]) => void;
  onFieldValuesChange: (v: Record<string, string>) => void;
  disabled?: boolean;
  /** 指定した場合のみ state の Select を表示する */
  state?: "open" | "closed";
  onStateChange?: (v: "open" | "closed") => void;
}

export const IssueFormFields = ({
  collaborators,
  projectFields,
  title,
  body,
  assignees,
  fieldValues,
  onTitleChange,
  onBodyChange,
  onAssigneesChange,
  onFieldValuesChange,
  disabled,
  state,
  onStateChange,
}: IssueFormFieldsProps) => {
  const selectableFields = projectFields.filter(
    (f) => f.dataType === "SINGLE_SELECT" || f.dataType === "ITERATION",
  );

  return (
    <>
      {state !== undefined && onStateChange && (
        <FormControl>
          <InputLabel>State</InputLabel>
          <Select
            label="State"
            value={state}
            onChange={(e) => onStateChange(e.target.value as "open" | "closed")}
            disabled={disabled}
          >
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </Select>
        </FormControl>
      )}

      <TextField
        label="タイトル"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        required
        disabled={disabled}
      />

      <TextField
        label="本文"
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        multiline
        minRows={5}
        disabled={disabled}
      />

      <Autocomplete
        multiple
        freeSolo
        openOnFocus
        options={collaborators.map((c) => c.login)}
        value={assignees}
        onChange={(_, value) => onAssigneesChange(value)}
        renderInput={(params) => <TextField {...params} label="担当者" />}
        renderOption={(props, option) => {
          const collaborator = collaborators.find((c) => c.login === option);
          return (
            <Box component="li" {...props}>
              <Avatar
                src={collaborator?.avatarUrl}
                alt={option}
                sx={{ width: 24, height: 24, mr: 1 }}
              />
              {option}
            </Box>
          );
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const collaborator = collaborators.find((c) => c.login === option);
            return (
              <Chip
                {...getTagProps({ index })}
                key={option}
                label={option}
                avatar={<Avatar src={collaborator?.avatarUrl} alt={option} />}
                size="small"
              />
            );
          })
        }
        disabled={disabled}
        noOptionsText="コラボレーターを取得できませんでした"
      />

      {selectableFields.map((field) => (
        <FormControl key={field.id}>
          <InputLabel>{field.name}</InputLabel>
          <Select
            label={field.name}
            value={fieldValues[field.id] ?? ""}
            onChange={(e) =>
              onFieldValuesChange({
                ...fieldValues,
                [field.id]: e.target.value,
              })
            }
            disabled={disabled}
          >
            <MenuItem value="">
              <em>なし</em>
            </MenuItem>
            {field.options.map((opt) => (
              <MenuItem key={opt.id} value={opt.id}>
                {opt.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}
    </>
  );
};
