import { listHref } from "@/shared/list-query";

export type RolesQuery = {
  page?: number;
  q?: string | null;
  roleId?: number | null;
  grantPage?: number;
  grantQ?: string | null;
};

export function rolesListHref(employerId: number, query: RolesQuery): string {
  return listHref(
    `/employers/${employerId}/roles`,
    { page: query.page, q: query.q },
    {
      roleId: query.roleId,
      gpage: query.grantPage != null && query.grantPage > 1 ? query.grantPage : null,
      gq: query.grantQ,
    },
  );
}

export function roleGrantsHref(employerId: number, query: RolesQuery): string {
  return listHref(
    `/employers/${employerId}/roles`,
    { page: query.grantPage ?? 1, q: null },
    {
      roleId: query.roleId,
      page: query.page != null && query.page > 1 ? query.page : null,
      q: query.q,
      gq: query.grantQ,
    },
    { pageParam: "gpage" },
  );
}
