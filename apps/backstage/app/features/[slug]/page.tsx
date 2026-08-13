import { notFound } from "next/navigation";
import { FeatureArticle } from "../../../components/features/feature-article";
import { getFeatureDoc, getFeatureSlugs } from "../../../lib/features";

export function generateStaticParams(): { slug: string }[] {
  return getFeatureSlugs().map((slug) => ({ slug }));
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;

  if (!getFeatureSlugs().includes(slug)) {
    notFound();
  }

  const doc = getFeatureDoc(slug);

  return <FeatureArticle doc={doc} />;
}
