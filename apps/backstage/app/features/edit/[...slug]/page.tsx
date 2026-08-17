import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/auth";
import { FeatureEditor } from "@/components/features/feature-editor";
import {
  featureFileExists,
  getFeatureDoc,
  isFeatureArchiveSlug,
  readFeatureRaw,
} from "@/lib/features";
import { getPendingProposal } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export default async function FeatureEditPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<React.JSX.Element> {
  if (!isAuthConfigured()) {
    redirect("/features");
  }

  const session = await auth();
  if (!session?.user) {
    redirect("/features");
  }

  const { slug: segments } = await params;
  const slug = segments.join("/");

  if (!featureFileExists(slug) || isFeatureArchiveSlug(slug)) {
    notFound();
  }

  const pending = getPendingProposal(slug);
  if (pending) {
    redirect(`/features/proposals/${pending.id}`);
  }

  const doc = getFeatureDoc(slug);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <p className="border-b border-slate-200 px-6 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <Link href={`/features/${slug}`}>← Back to {doc.title}</Link>
      </p>
      <FeatureEditor
        initialMarkdown={readFeatureRaw(slug)}
        slug={slug}
        title={doc.title}
      />
    </div>
  );
}
