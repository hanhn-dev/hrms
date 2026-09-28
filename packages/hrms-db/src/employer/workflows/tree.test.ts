import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actorFromName,
  encodeWorkflowDefinitionTree,
  flattenWorkflowDetails,
  isWorkflowPartial,
  notificationCsv,
  parseWorkflowDefinitionTree,
  resolveWorkflowStatus,
  workflowRoleCode,
} from "./tree.ts";

const ADVANCE_REQUEST_XML = `<?xml version="1.0" encoding="utf-16"?>

<Tree AllowNodeEditing="True" OnClientContextMenuShowing="OnClientContextMenuShowing" FeatureGroupID="RadTreeViewWorkflow" EnableAjaxSkinRendering="False" RenderMode="Lightweight">
	<Node Text="Advance Request" Value="treeView_Advance Request" Expanded="True" AllowEdit="False"><Node Text="Level1" Value="Level1" Expanded="True" AllowEdit="False">
			<Node Text="APPROVERS" Value="Level1-APPROVERS" Expanded="True" AllowEdit="False">
				<Node Text="Functional Authority" Value="INITIATOR :: Functional Authority" />
            </Node>
			<Node Text="NOTIFICATIONS" Value="Level1-NOTIFICATIONS" Expanded="True" AllowEdit="False">
				<Node Text="Initiator" Value="INITIATOR :: Initiator" />
				<Node Text="Accountant" Value="INITIATOR :: Accountant" />
				<Node Text="Functional Authority" Value="INITIATOR :: Functional Authority" />
				<Node Text="Reporting Authority" Value="INITIATOR :: Reporting Authority" />
			</Node>
		</Node><Node Text="Level2" Value="Level2" Expanded="True" AllowEdit="False">
			<Node Text="APPROVERS" Value="Level2-APPROVERS" Expanded="True" AllowEdit="False">
				<Node Text="Reporting Authority" Value="INITIATOR :: Reporting Authority" />
            </Node>
			<Node Text="NOTIFICATIONS" Value="Level2-NOTIFICATIONS" Expanded="True" AllowEdit="False">
				<Node Text="Initiator" Value="INITIATOR :: Initiator" />
				<Node Text="Accountant" Value="INITIATOR :: Accountant" />
			</Node>
		</Node><Node Text="NOTIFY APPROVAL" Value="NOTIFY APPROVAL1" Expanded="True" AllowEdit="False">
			<Node Text="NOTIFICATIONS" Value="NOTIFY APPROVAL1-NOTIFICATIONS1" Expanded="True" AllowEdit="False">
				<Node Text="Initiator" Value="INITIATOR :: Initiator" />
			</Node>
		</Node><Node Text="NOTIFY REJECTION" Value="NOTIFY REJECTION2" Expanded="True" AllowEdit="False">
			<Node Text="NOTIFICATIONS" Value="NOTIFY REJECTION2-NOTIFICATIONS2" Expanded="True" AllowEdit="False">
				<Node Text="Accountant" Value="INITIATOR :: Accountant" />
			</Node>
		</Node><Node Text="NOTIFY PULLBACK" Value="NOTIFY PULLBACK3" Expanded="True" AllowEdit="False">
			<Node Text="NOTIFICATIONS" Value="NOTIFY PULLBACK3-NOTIFICATIONS3" Expanded="True" AllowEdit="False">
				<Node Text="Reporting Authority" Value="INITIATOR :: Reporting Authority" />
			</Node>
		</Node>
	</Node>
</Tree>
`;

const NOTIFICATION_ONLY_XML = `<?xml version="1.0" encoding="utf-16"?>
<Tree FeatureGroupID="RadTreeViewWorkflow">
	<Node Text="AnonymousSurvey-Survey" Value="treeView_AnonymousSurvey-Survey">
		<Node Text="Level1" Value="Level1">
			<Node Text="NOTIFICATIONS" Value="Level1-NOTIFICATIONS">
				<Node Text="Initiator" Value="INITIATOR :: Initiator" />
			</Node>
		</Node>
	</Node>
</Tree>
`;

describe("workflowRoleCode", () => {
  it("maps built-in names including previous-level codes", () => {
    assert.equal(workflowRoleCode("Functional Authority"), "F");
    assert.equal(workflowRoleCode("Reporting Authority"), "R");
    assert.equal(workflowRoleCode("initiator"), "I");
    assert.equal(workflowRoleCode("Previous Level Functional Authority"), "PF");
    assert.equal(workflowRoleCode("Previous Level Reporting Authority"), "PR");
    assert.equal(workflowRoleCode("RecruitmentAdmin"), "B");
    assert.equal(workflowRoleCode("Accountant"), "U");
  });
});

describe("notificationCsv", () => {
  it("uses role codes for built-ins and names for groups", () => {
    assert.equal(
      notificationCsv([
        actorFromName("Functional Authority"),
        actorFromName("Accountant"),
        actorFromName("Initiator"),
      ]),
      "F,Accountant,I",
    );
  });
});

describe("parseWorkflowDefinitionTree", () => {
  it("reads levels, approvers, and notify nodes from classic RadTree XML", () => {
    const tree = parseWorkflowDefinitionTree(ADVANCE_REQUEST_XML);
    assert.ok(tree);
    assert.equal(tree.rootText, "Advance Request");
    assert.equal(tree.levels.length, 2);
    assert.deepEqual(
      tree.levels[0]?.approvers.map((actor) => actor.name),
      ["Functional Authority"],
    );
    assert.deepEqual(
      tree.levels[0]?.notifications.map((actor) => actor.name),
      [
        "Initiator",
        "Accountant",
        "Functional Authority",
        "Reporting Authority",
      ],
    );
    assert.equal(tree.levels[1]?.approvers[0]?.roleCode, "R");
    assert.deepEqual(
      tree.notifyApproval.map((actor) => actor.roleCode),
      ["I"],
    );
    assert.equal(tree.notifyRejection[0]?.name, "Accountant");
    assert.equal(tree.notifyPullback[0]?.roleCode, "R");
  });

  it("reads notification-only levels without approvers", () => {
    const tree = parseWorkflowDefinitionTree(NOTIFICATION_ONLY_XML);
    assert.ok(tree);
    assert.equal(tree.levels[0]?.approvers.length, 0);
    assert.equal(tree.levels[0]?.notifications[0]?.name, "Initiator");
  });
});

describe("encodeWorkflowDefinitionTree", () => {
  it("round-trips a parsed tree", () => {
    const original = parseWorkflowDefinitionTree(ADVANCE_REQUEST_XML);
    assert.ok(original);
    const encoded = encodeWorkflowDefinitionTree(original);
    const again = parseWorkflowDefinitionTree(encoded);
    assert.deepEqual(again, original);
    assert.match(encoded, /FeatureGroupID="RadTreeViewWorkflow"/);
    assert.match(encoded, /Value="INITIATOR :: Functional Authority"/);
  });
});

describe("isWorkflowPartial and status", () => {
  it("flags a missing approver or notify node as partial", () => {
    const complete = parseWorkflowDefinitionTree(ADVANCE_REQUEST_XML);
    assert.ok(complete);
    assert.equal(isWorkflowPartial(complete, false), false);
    assert.equal(
      resolveWorkflowStatus({ treeXml: ADVANCE_REQUEST_XML, isPartial: false }),
      "completed",
    );

    const missingApprover = {
      ...complete,
      levels: [{ ...complete.levels[0]!, approvers: [] }, complete.levels[1]!],
    };
    assert.equal(isWorkflowPartial(missingApprover, false), true);
    assert.equal(resolveWorkflowStatus({ treeXml: null, isPartial: false }), "not-defined");
  });

  it("only requires notifications for notification-only workflows", () => {
    const tree = parseWorkflowDefinitionTree(NOTIFICATION_ONLY_XML);
    assert.ok(tree);
    assert.equal(isWorkflowPartial(tree, true), false);
    assert.equal(isWorkflowPartial(tree, false), true);
  });
});

describe("flattenWorkflowDetails", () => {
  it("writes one detail row per approver and resolves group RoleIds", () => {
    const tree = parseWorkflowDefinitionTree(ADVANCE_REQUEST_XML);
    assert.ok(tree);
    const rows = flattenWorkflowDetails(
      tree,
      new Map([
        ["Functional Authority", 11],
        ["Reporting Authority", 22],
        ["Accountant", 33],
      ]),
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.workflowRole, "F");
    assert.equal(rows[0]?.managerId, 11);
    assert.equal(rows[0]?.routingLevel, 1);
    assert.equal(rows[0]?.levelNotifications, "I,Accountant,F,R");
    assert.equal(rows[0]?.approversNotifications, "I");
    assert.equal(rows[0]?.rejectionNotifications, "Accountant");
    assert.equal(rows[0]?.pullbackNotifications, "R");
    assert.equal(rows[1]?.workflowRole, "R");
    assert.equal(rows[1]?.managerId, 22);
  });

  it("rejects an unresolved custom group", () => {
    const tree = parseWorkflowDefinitionTree(ADVANCE_REQUEST_XML);
    assert.ok(tree);
    tree.levels[0]?.approvers.push(actorFromName("Missing Group"));
    assert.throws(
      () => flattenWorkflowDetails(tree, new Map([["Functional Authority", 11]])),
      /Missing Group/,
    );
  });
});
