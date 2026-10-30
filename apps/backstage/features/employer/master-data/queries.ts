import { loadMasterDataPage, type MasterDataPageData } from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export async function loadMasterData(
  employerId: number,
  listKey: string | null,
  filters: { page?: number | null; pageSize?: number | null; q?: string | null } = {},
): Promise<MasterDataPageData> {
  await requireFeature("employers");
  return loadMasterDataPage(await getHrmsDb(), employerId, listKey, filters);
}
