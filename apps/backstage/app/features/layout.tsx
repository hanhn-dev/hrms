import { FeatureNav } from "../../components/features/feature-nav";
import { getAllFeatureDocs } from "../../lib/features";

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const docs = getAllFeatureDocs().map(({ slug, title, menu, submenu }) => ({
    slug,
    title,
    menu,
    submenu,
  }));

  return (
    <div className="flex h-full min-h-0">
      <FeatureNav docs={docs} />
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
