export interface Issue {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: Label[];
  url: string;
}

export interface Label {
  name: string;
  color: string;
}

/** DAG のエッジ。source が target をブロックしている関係。 */
export interface Dependency {
  source: number;
  target: number;
}
