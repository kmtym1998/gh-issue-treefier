export interface Project {
  id: string;
  title: string;
  number: number;
}

export interface ProjectField {
  id: string;
  name: string;
  dataType: ProjectFieldType;
  options: ProjectFieldOption[];
}

export type ProjectFieldType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "SINGLE_SELECT"
  | "ITERATION";

export interface ProjectFieldOption {
  id: string;
  name: string;
}
