EXEC sp_GetOrganisationHierarchy 10

SELECT * FROM dbo.TOrgHierarchyDetails WHEre Employerid = 10
SELECT * FROM dbo.TOrganisationHierarchy WHERE Employerid = 10

UPDATE dbo.TOrganisationHierarchy SET OrgXML = '<?xml version="1.0" encoding="utf-16"?>
<Tree AllowNodeEditing="True" EnableDragAndDrop="True" EnableDragAndDropBetweenNodes="True" FeatureGroupID="RadTreeViewOrgStructure" EnableAjaxSkinRendering="False" RenderMode="Lightweight" CssClass="RadTreeCustomHeight">
	<Node Text="Test - Cloud Customer" Value="1148" Expanded="True">
		<Node Text="IT" Value="1149" Expanded="True" />
		<Node Text="Admin" Value="1150" Expanded="True" />
		<Node Text="HR" Value="1151">
			<Node Text="HR Manager" Value="1152" Expanded="True">
				<Node Text="HR trainee" Value="1153" Expanded="True" />
				<Node Text="HRA" Value="1154" Expanded="True" />
			</Node>
		</Node>
		<Node Text="Sales" Value="1155" Expanded="True" />
		<Node Text="Networking" Value="1156" Expanded="True" />
		<Node Text="NBA" Value="1157" Expanded="True" />
		<Node Text="Norton" Value="1158" Expanded="True" />
		<Node Text="  HRMS " Value="1159" Selected="True">
			<Node Text="SAL-A" Value="1160" Expanded="True" />
			<Node Text="SB" Value="1161" Expanded="True" />
		</Node>
		<Node Text="SALES-FALCONS" Value="1162">
			<Node Text="HYDERABAD" Value="1163" Expanded="True">
				<Node Text="VIJAYAWADA" Value="1164" Expanded="True">
					<Node Text="Vizag" Value="1165" Expanded="True" />
				</Node>
			</Node>
		</Node>
		<Node Text="SALES-HAWKS" Value="1166">
			<Node Text="PUNE" Value="1167" Expanded="True">
				<Node Text="KOLHAPUR" Value="1168" Expanded="True">
					<Node Text="Solapur" Value="1169" Expanded="True" />
				</Node>
			</Node>
		</Node>
		<Node Text="L&amp;T" Value="1170">
			<Node Text="HRM" Value="1171" Expanded="True" />
		</Node>
		<Node Text="SITE" Value="1172" Expanded="True">
			<Node Text="SA-4" Value="1173" Expanded="True" />
			<Node Text="SA-1" Value="1174" Expanded="True" />
		</Node>
		<Node Text="SITE" Value="1175" Expanded="True">
			<Node Text="SA-3" Value="1176" Expanded="True">
				<Node Text="SA-6" Value="1177" Expanded="True" />
				<Node Text="SA-4" Value="1178" Expanded="True" />
			</Node>
			<Node Text="SA-4" Value="1179" Expanded="True">
				<Node Text="SA-5" Value="1180" Expanded="True" />
			</Node>
		</Node>
		<Node Text="ABCD" Value="1181" Expanded="True" />
		<Node Text="ABCD" Value="1182" Expanded="True" />
		<Node Text="tniTest" Value="1183" Expanded="True" />
		<Node Text="TNITest" Value="1184" Expanded="True" />
		<Node Text="HRMS Test" Value="1185" Expanded="True" />
	</Node>
</Tree>
' WHERE Employerid = 10