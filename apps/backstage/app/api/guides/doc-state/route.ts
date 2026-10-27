import { NextResponse } from "next/server";
import { currentGateUser } from "@/shared/auth";
import { featureFileExists, isFeatureArchiveSlug } from "@/lib/guides";
import { canAccessProposal, getPendingProposal } from "@/lib/proposals";

export async function GET(request: Request): Promise<NextResponse> {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!slug || isFeatureArchiveSlug(slug) || !featureFileExists(slug)) {
    return NextResponse.json({
      canEdit: false,
      hasPending: false,
      pendingHref: undefined as string | undefined,
    });
  }

  const user = await currentGateUser();
  const pending = getPendingProposal(slug);
  const canOpen = Boolean(
    pending && user && canAccessProposal(pending, user),
  );

  return NextResponse.json({
    canEdit: Boolean(user) && !pending,
    hasPending: Boolean(pending),
    pendingHref:
      canOpen && pending ? `/docs/guides/proposals/${pending.id}` : undefined,
  });
}
