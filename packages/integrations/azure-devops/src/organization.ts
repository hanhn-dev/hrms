export function normalizeOrganizationIdentity(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

/** Parses the organization name from an Azure DevOps org URL. */
export function getOrganizationIdentity(orgUrl: string): string {
  try {
    const parsedUrl = new URL(orgUrl);
    const host = parsedUrl.hostname.toLowerCase();

    if (host === 'dev.azure.com' || host.endsWith('.dev.azure.com')) {
      const [organization] = parsedUrl.pathname.split('/').filter(Boolean);
      if (!organization) {
        throw new Error(`Unable to determine organization from org URL: ${orgUrl}`);
      }
      return normalizeOrganizationIdentity(decodeURIComponent(organization));
    }

    const visualStudioMatch = host.match(/^([^.]+)\.visualstudio\.com$/i);
    if (visualStudioMatch?.[1]) {
      return normalizeOrganizationIdentity(visualStudioMatch[1]);
    }

    throw new Error(`Unsupported Azure DevOps organization URL: ${orgUrl}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsupported')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Unable to determine')) {
      throw error;
    }
    throw new Error(`Invalid Azure DevOps organization URL: ${orgUrl}`);
  }
}
