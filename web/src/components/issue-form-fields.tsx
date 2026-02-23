import {
  Autocomplete,
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
}

export function IssueFormFields({
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
}: IssueFormFieldsProps) {
  const selectableFields = projectFields.filter(
    (f) => f.dataType === "SINGLE_SELECT" || f.dataType === "ITERATION",
  );

  return (
    <>
      <TextField
        size="small"
        label="タイトル"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        required
        disabled={disabled}
      />

      <TextField
        size="small"
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
        size="small"
        renderInput={(params) => <TextField {...params} label="Assignees" />}
        disabled={disabled}
        noOptionsText="コラボレーターを取得できませんでした"
      />

      {selectableFields.map((field) => (
        <FormControl key={field.id} size="small">
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
}
