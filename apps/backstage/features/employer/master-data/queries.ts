import { loadMasterDataPage, type MasterDataPageData } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export async function loadMasterData(
  employerId: number,
  listKey: string | null,
): Promise<MasterDataPageData> {
  await requireRootAdmin();
  return loadMasterDataPage(await getHrmsDb(), employerId, listKey);
}
