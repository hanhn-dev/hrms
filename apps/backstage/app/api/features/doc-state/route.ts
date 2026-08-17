import { NextResponse } from "next/server";
import { auth, isAuthConfigured } from "@/auth";
import { featureFileExists, isFeatureArchiveSlug } from "@/lib/features";
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

  const session = isAuthConfigured() ? await auth() : null;
  const pending = getPendingProposal(slug);
  const canOpen = Boolean(
    pending && session?.user && canAccessProposal(pending, session.user),
  );

  return NextResponse.json({
    canEdit: Boolean(session?.user) && !pending,
    hasPending: Boolean(pending),
    pendingHref:
      canOpen && pending ? `/features/proposals/${pending.id}` : undefined,
  });
}
