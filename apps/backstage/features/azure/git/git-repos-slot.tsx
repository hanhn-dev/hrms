import { Alert } from "antd";
import type { GitTraceCatalog } from "@/features/azure/git/catalog";
import { GitPanel } from "@/features/azure/git/git-panel";
import { errorMessage, rethrowRedirect } from "@/features/azure/git/git-text";
import { loadGitCatalog } from "@/features/azure/git/queries";

export async function GitReposSlot(): Promise<React.JSX.Element> {
  let catalog: GitTraceCatalog;
  try {
    catalog = await loadGitCatalog();
  } catch (error) {
    rethrowRedirect(error);
    return <Alert title={errorMessage(error)} type="error" />;
  }

  if (catalog.repositories.length === 0) {
    return <Alert title="This Azure DevOps project has no Git repositories." type="info" />;
  }

  return <GitPanel catalog={catalog} />;
}
