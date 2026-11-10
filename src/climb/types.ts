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

/**
 * Where a climb is in the trip to OpenBeta. `local` has never been queued; `pending` is
 * queued and waiting for a connection; `failed` was rejected and needs the user.
 */
export type SyncState = 'local' | 'pending' | 'submitted' | 'failed';

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
  syncState: SyncState;
  /** Why the last send was rejected. Only set when `syncState` is `failed`. */
  syncError: string | null;
  /** `updatedAt` of the version OpenBeta accepted, so later edits show as unsent. */
  submittedVersion: number | null;
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
