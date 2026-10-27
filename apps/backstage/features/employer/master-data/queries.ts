import { loadMasterDataPage, type MasterDataPageData } from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export async function loadMasterData(
  employerId: number,
  listKey: string | null,
): Promise<MasterDataPageData> {
  await requireFeature("employers");
  return loadMasterDataPage(await getHrmsDb(), employerId, listKey);
}
