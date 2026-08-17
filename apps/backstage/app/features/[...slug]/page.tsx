import { notFound } from "next/navigation";
import { FeatureArticle } from "@/components/features/feature-article";
import {
  getFeatureDoc,
  getFeatureSlugs,
  getFeatureVersions,
} from "@/lib/features";

export const dynamicParams = true;

export function generateStaticParams(): { slug: string[] }[] {
  if (process.env.NODE_ENV === "development") return [];
  return getFeatureSlugs().map((slug) => ({ slug: slug.split("/") }));
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<React.JSX.Element> {
  const { slug: segments } = await params;
  const slug = segments.join("/");

  if (!getFeatureSlugs().includes(slug)) {
    notFound();
  }

  const doc = getFeatureDoc(slug);
  return <FeatureArticle doc={doc} versions={getFeatureVersions(doc.currentSlug)} />;
}
