/** Fields we cache for every area. */
const AREA_FIELDS = `
  uuid
  areaName
  gradeContext
  pathTokens
  ancestors
  metadata { leaf isBoulder lat lng }
`;

export const AREA_QUERY = `
  query Area($uuid: ID) {
    area(uuid: $uuid) {
      ${AREA_FIELDS}
      children { ${AREA_FIELDS} }
      climbs { uuid name grades { yds french uiaa ewbank vscale font wi } }
    }
  }
`;

export const SEARCH_AREAS_QUERY = `
  query SearchAreas($match: String!, $limit: Int) {
    areas(filter: { area_name: { match: $match } }, limit: $limit) { ${AREA_FIELDS} }
  }
`;

export const CRAGS_NEAR_QUERY = `
  query CragsNear($lat: Float, $lng: Float, $maxDistance: Int) {
    cragsNear(lnglat: { lat: $lat, lng: $lng }, maxDistance: $maxDistance, includeCrags: true) {
      crags { ${AREA_FIELDS} }
    }
  }
`;

export const COUNTRIES_QUERY = `
  query Countries {
    countries { ${AREA_FIELDS} }
  }
`;

export type RemoteArea = {
  uuid: string;
  areaName: string;
  gradeContext: string | null;
  pathTokens: string[] | null;
  ancestors: string[] | null;
  metadata: { leaf: boolean; isBoulder: boolean | null; lat: number | null; lng: number | null };
};

export type RemoteGrades = Partial<Record<'yds' | 'french' | 'uiaa' | 'ewbank' | 'vscale' | 'font' | 'wi', string | null>>;

export type AreaQueryResult = {
  area: (RemoteArea & { children: RemoteArea[]; climbs: { uuid: string; name: string; grades: RemoteGrades | null }[] }) | null;
};
export type SearchAreasResult = { areas: RemoteArea[] };
export type CragsNearResult = { cragsNear: { crags: RemoteArea[] | null }[] };
export type CountriesResult = { countries: RemoteArea[] };

/** Adds or updates climbs in a leaf area. A climb whose `id` OpenBeta already has is updated. */
export const UPDATE_CLIMBS_MUTATION = `
  mutation UpdateClimbs($input: UpdateClimbsInput) {
    updateClimbs(input: $input)
  }
`;

export type UpdateClimbsResult = { updateClimbs: string[] | null };
