import type { RepoId } from "./model.ts";

export const CHECKOUTS: Record<RepoId, { title: string; help: string }> = {
  "hrms-db": {
    title: "HRMS Database",
    help: "Folder that contains HRMS-DATABASE",
  },
  sourcecode: {
    title: "HRMS Web",
    help: "SourceCode folder that contains HRMS.CoreAPI/HRMS.Core.WebAPI.Node. This same root also holds HRMS.Web.",
  },
  "hrms-sdk": {
    title: "HRMS SDK",
    help: "Folder whose package.json name is @hrms/sdk",
  },
};
