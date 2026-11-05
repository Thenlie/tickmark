/** What the user picks first. Decides which grade scales and fields apply. */
export type Kind = 'boulder' | 'rope' | 'ice';

/** OpenBeta discipline flags. A climb can have several. */
export type Discipline =
  | 'trad'
  | 'sport'
  | 'tr'
  | 'aid'
  | 'alpine'
  | 'mixed'
  | 'ice'
  | 'snow'
  | 'bouldering'
  | 'deepwatersolo';

/** Primary grade systems, named after OpenBeta's `GradeType` fields. */
export type GradeSystem = 'yds' | 'french' | 'uiaa' | 'ewbank' | 'vscale' | 'font' | 'wi';

/** OpenBeta `SafetyEnum`, minus UNSPECIFIED (stored as null). */
export type Safety = 'PG' | 'PG13' | 'runout' | 'R' | 'X';

export type Climb = {
  id: string;
  createdAt: number;
  updatedAt: number;
  kind: Kind;
  disciplines: Discipline[];
  areaId: string | null;
  name: string;
  gradeSystem: GradeSystem;
  grade: string | null;
  safety: Safety | null;
  aidGrade: string | null;
  mixedGrade: string | null;
  commitment: string | null;
  lengthM: number | null;
  bolts: number | null;
  fa: string;
  description: string;
  approach: string;
  protection: string;
  lat: number | null;
  lng: number | null;
  gpsAccuracyM: number | null;
  gpsAt: number | null;
};

export type Pitch = {
  climbId: string;
  number: number;
  grade: string | null;
  lengthM: number | null;
  bolts: number | null;
  disciplines: Discipline[];
  description: string;
};

export type Photo = {
  id: string;
  climbId: string;
  /** Relative to `Paths.document`. */
  path: string;
  position: number;
  caption: string;
  createdAt: number;
};

export type Area = {
  id: string;
  name: string;
  parentId: string | null;
  ancestors: string[];
  pathTokens: string[];
  gradeContext: string | null;
  isLeaf: boolean;
  isBoulder: boolean;
  lat: number | null;
  lng: number | null;
  fetchedAt: number;
  childrenFetchedAt: number | null;
};
