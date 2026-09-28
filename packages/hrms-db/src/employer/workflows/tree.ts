export const WORKFLOW_ROLE_SEPARATOR = "::";

export const BUILTIN_WORKFLOW_ROLES = [
  { code: "F", name: "Functional Authority" },
  { code: "R", name: "Reporting Authority" },
  { code: "I", name: "Initiator" },
  { code: "A", name: "Activity Owner" },
  { code: "H", name: "Hiring Manager" },
  { code: "C", name: "Candidate" },
  { code: "D", name: "Recruiter" },
  { code: "B", name: "RecruitmentAdmin" },
  { code: "M", name: "Business Unit Head" },
  { code: "PF", name: "Previous Level Functional Authority" },
  { code: "PR", name: "Previous Level Reporting Authority" },
] as const;

export type WorkflowRoleCode = (typeof BUILTIN_WORKFLOW_ROLES)[number]["code"] | "U";

export type WorkflowActor = {
  name: string;
  roleCode: WorkflowRoleCode;
};

export type WorkflowLevel = {
  level: number;
  approvers: WorkflowActor[];
  notifications: WorkflowActor[];
};

export type WorkflowTree = {
  rootText: string;
  levels: WorkflowLevel[];
  notifyApproval: WorkflowActor[];
  notifyRejection: WorkflowActor[];
  notifyPullback: WorkflowActor[];
};

export type FlattenedWorkflowDetail = {
  managerId: number;
  workflowRole: string | null;
  routingLevel: number;
  levelNotifications: string;
  approversNotifications: string;
  rejectionNotifications: string;
  pullbackNotifications: string;
};

export type WorkflowDefinitionStatus = "not-defined" | "partial" | "completed";

type XmlNode = {
  text: string;
  value: string;
  children: XmlNode[];
};

const TREE_OPEN =
  '<Tree AllowNodeEditing="True" OnClientContextMenuShowing="OnClientContextMenuShowing" FeatureGroupID="RadTreeViewWorkflow" EnableAjaxSkinRendering="False" RenderMode="Lightweight">';

export function workflowRoleCode(name: string): WorkflowRoleCode {
  const trimmed = name.trim();
  const builtin = BUILTIN_WORKFLOW_ROLES.find(
    (role) =>
      role.name === trimmed ||
      (role.code === "I" && trimmed.toLowerCase() === "initiator"),
  );
  return builtin?.code ?? "U";
}

export function actorFromName(name: string): WorkflowActor {
  const trimmed = name.trim();
  return { name: trimmed, roleCode: workflowRoleCode(trimmed) };
}

export function actorFromNodeValue(value: string, fallbackText = ""): WorkflowActor {
  const parts = value.split(WORKFLOW_ROLE_SEPARATOR);
  const name = (parts[1] ?? fallbackText).trim();
  return actorFromName(name);
}

export function initiatorValue(name: string): string {
  return `INITIATOR ${WORKFLOW_ROLE_SEPARATOR} ${name}`;
}

export function notificationCsv(actors: WorkflowActor[]): string {
  return actors
    .map((actor) => (actor.roleCode === "U" ? actor.name : actor.roleCode))
    .filter((value) => value.length > 0)
    .join(",");
}

export function resolveWorkflowStatus(input: {
  treeXml: string | null | undefined;
  isPartial: boolean;
}): WorkflowDefinitionStatus {
  const tree = parseWorkflowDefinitionTree(input.treeXml);
  if (!tree || tree.levels.length === 0) {
    return "not-defined";
  }
  return input.isPartial ? "partial" : "completed";
}

export function isWorkflowPartial(
  tree: WorkflowTree,
  notificationOnly: boolean,
): boolean {
  if (tree.levels.length === 0) {
    return true;
  }
  for (const level of tree.levels) {
    if (notificationOnly) {
      if (level.notifications.length === 0) {
        return true;
      }
      continue;
    }
    if (level.approvers.length === 0 || level.notifications.length === 0) {
      return true;
    }
  }
  if (!notificationOnly) {
    if (
      tree.notifyApproval.length === 0 ||
      tree.notifyRejection.length === 0 ||
      tree.notifyPullback.length === 0
    ) {
      return true;
    }
  }
  return false;
}

export function flattenWorkflowDetails(
  tree: WorkflowTree,
  roleIdsByName: Map<string, number>,
): FlattenedWorkflowDetail[] {
  const approversNotifications = notificationCsv(tree.notifyApproval);
  const rejectionNotifications = notificationCsv(tree.notifyRejection);
  const pullbackNotifications = notificationCsv(tree.notifyPullback);
  const rows: FlattenedWorkflowDetail[] = [];

  for (const level of tree.levels) {
    const levelNotifications = notificationCsv(level.notifications);
    if (level.approvers.length === 0) {
      rows.push({
        managerId: 0,
        workflowRole: null,
        routingLevel: level.level,
        levelNotifications,
        approversNotifications,
        rejectionNotifications,
        pullbackNotifications,
      });
      continue;
    }
    for (const approver of level.approvers) {
      const managerId = roleIdsByName.get(approver.name.trim()) ?? 0;
      if (approver.roleCode === "U" && managerId === 0) {
        throw new Error(
          `Workflow group "${approver.name}" was not found for this employer.`,
        );
      }
      rows.push({
        managerId,
        workflowRole: approver.roleCode,
        routingLevel: level.level,
        levelNotifications,
        approversNotifications,
        rejectionNotifications,
        pullbackNotifications,
      });
    }
  }
  return rows;
}

export function parseWorkflowDefinitionTree(
  xml: string | null | undefined,
): WorkflowTree | null {
  if (xml == null || xml.trim() === "") {
    return null;
  }
  const treeNodes = parseXmlNodes(xml).filter((node) => node.text.length > 0);
  const root =
    findNode(treeNodes, (node) => node.text.toUpperCase() !== "TREE") ??
    treeNodes[0];
  if (!root) {
    return null;
  }
  const levels: WorkflowLevel[] = [];
  const notifyApproval: WorkflowActor[] = [];
  const notifyRejection: WorkflowActor[] = [];
  const notifyPullback: WorkflowActor[] = [];

  for (const child of root.children) {
    const label = child.text.trim().toUpperCase();
    if (label.includes("LEVEL") && !label.startsWith("NOTIFY")) {
      levels.push({
        level: parseLevelNumber(child.text, levels.length + 1),
        approvers: actorsUnder(child, "APPROVERS"),
        notifications: actorsUnder(child, "NOTIFICATIONS"),
      });
      continue;
    }
    if (label === "NOTIFY APPROVAL") {
      notifyApproval.push(...actorsUnder(child, "NOTIFICATIONS"));
      continue;
    }
    if (label === "NOTIFY REJECTION") {
      notifyRejection.push(...actorsUnder(child, "NOTIFICATIONS"));
      continue;
    }
    if (label === "NOTIFY PULLBACK") {
      notifyPullback.push(...actorsUnder(child, "NOTIFICATIONS"));
    }
  }

  if (levels.length === 0 && notifyApproval.length === 0) {
    return {
      rootText: root.text,
      levels: [],
      notifyApproval,
      notifyRejection,
      notifyPullback,
    };
  }

  return {
    rootText: root.text,
    levels,
    notifyApproval,
    notifyRejection,
    notifyPullback,
  };
}

export function encodeWorkflowDefinitionTree(tree: WorkflowTree): string {
  const rootText = tree.rootText.trim() || "Workflow";
  const levelXml = tree.levels
    .map((level) => {
      const index = level.level;
      const approvers = encodeActorNodes(level.approvers);
      const notifications = encodeActorNodes(level.notifications);
      return `<Node Text="Level${index}" Value="Level${index}" Expanded="True" AllowEdit="False">
			<Node Text="APPROVERS" Value="Level${index}-APPROVERS" Expanded="True" AllowEdit="False">${approvers}
            </Node>
			<Node Text="NOTIFICATIONS" Value="Level${index}-NOTIFICATIONS" Expanded="True" AllowEdit="False">${notifications}
			</Node>
		</Node>`;
    })
    .join("");
  const notifyXml = [
    encodeNotifyBlock("NOTIFY APPROVAL", "NOTIFY APPROVAL1", tree.notifyApproval),
    encodeNotifyBlock("NOTIFY REJECTION", "NOTIFY REJECTION2", tree.notifyRejection),
    encodeNotifyBlock("NOTIFY PULLBACK", "NOTIFY PULLBACK3", tree.notifyPullback),
  ].join("");

  return `<?xml version="1.0" encoding="utf-16"?>

${TREE_OPEN}
	<Node Text="${escapeXml(rootText)}" Value="treeView_${escapeXml(rootText)}" Expanded="True" AllowEdit="False">${levelXml}${notifyXml}
	</Node>
</Tree>
`;
}

export function emptyWorkflowTree(rootText: string, routingLevels: number): WorkflowTree {
  const levels = Array.from({ length: Math.max(routingLevels, 0) }, (_, index) => ({
    level: index + 1,
    approvers: [] as WorkflowActor[],
    notifications: [] as WorkflowActor[],
  }));
  return {
    rootText,
    levels,
    notifyApproval: [],
    notifyRejection: [],
    notifyPullback: [],
  };
}

function encodeNotifyBlock(
  text: string,
  value: string,
  actors: WorkflowActor[],
): string {
  return `<Node Text="${text}" Value="${value}" Expanded="True" AllowEdit="False">
			<Node Text="NOTIFICATIONS" Value="${value}-NOTIFICATIONS" Expanded="True" AllowEdit="False">${encodeActorNodes(actors)}
			</Node>
		</Node>`;
}

function encodeActorNodes(actors: WorkflowActor[]): string {
  if (actors.length === 0) {
    return "";
  }
  return `\n${actors
    .map(
      (actor) =>
        `\t\t\t\t<Node Text="${escapeXml(actor.name)}" Value="${escapeXml(initiatorValue(actor.name))}" />`,
    )
    .join("\n")}`;
}

function actorsUnder(parent: XmlNode, section: string): WorkflowActor[] {
  const match = parent.children.find(
    (child) => child.text.trim().toUpperCase() === section,
  );
  if (!match) {
    return [];
  }
  return match.children
    .map((child) => actorFromNodeValue(child.value, child.text))
    .filter((actor) => actor.name.length > 0);
}

function parseLevelNumber(text: string, fallback: number): number {
  const match = text.match(/(\d+)/);
  if (!match) {
    return fallback;
  }
  return Number(match[1]);
}

function findNode(
  nodes: XmlNode[],
  predicate: (node: XmlNode) => boolean,
): XmlNode | undefined {
  for (const node of nodes) {
    if (predicate(node)) {
      return node;
    }
    const nested = findNode(node.children, predicate);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

function parseXmlNodes(xml: string): XmlNode[] {
  const source = xml.replace(/^\uFEFF/, "").trim();
  const stack: XmlNode[] = [{ text: "ROOT", value: "", children: [] }];
  const tag = /<(\/)?Node\b([^>]*)(\/)?>/gi;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(source)) !== null) {
    const closing = match[1] === "/";
    const selfClosing = match[3] === "/" || Boolean(match[0].endsWith("/>"));
    if (closing) {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }
    const attrs = parseAttributes(match[2] ?? "");
    const node: XmlNode = {
      text: attrs.Text ?? attrs.text ?? "",
      value: attrs.Value ?? attrs.value ?? "",
      children: [],
    };
    stack[stack.length - 1]?.children.push(node);
    if (!selfClosing) {
      stack.push(node);
    }
  }
  return stack[0]?.children ?? [];
}

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    attrs[match[1] ?? ""] = unescapeXml(match[2] ?? "");
  }
  return attrs;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function unescapeXml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}
