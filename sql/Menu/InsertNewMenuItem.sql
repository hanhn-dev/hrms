DECLARE @MenuId INT;
DECLARE @MenuName VARCHAR(50) = 'Advance Setup';
DECLARE @NavigateURL VARCHAR(50) = '/HRM/AdvanceModule/SetupAdvanceTypes.aspx';
DECLARE @PageName VARCHAR(50) = 'SetupAdvanceTypes.aspx';
DECLARE @EmployerId INT = 10;
DECLARE @Icon VARCHAR(50) = 'assetMapping';
DECLARE @ParentMenuId INT = 3; -- Admin Configuration
DECLARE @Parentseq INT;

SELECT @MenuId = 1155

SELECT @Parentseq = MAX( parentseq)  FROM TMenuHierarchy 

IF NOT EXISTS (SELECT 1 FROM dbo.tMenuDetails WHERE MenuId= @MenuId AND MenuName=@MenuName AND Employerid=@EmployerId)
BEGIN
    INSERT INTO dbo.tMenuDetails
    (
        MenuId,
        MenuName,
        NavigateURL,
        PageName,
        ISActive,
        Employerid,
        CreatedBy,
        CreatedDate,
        iconname
    )
    VALUES
    (   @MenuId,
        @MenuName,
        @NavigateURL,
        @PageName,
        1, -- ISActive - bit
        @EmployerId,    -- Employerid - int
        -1,    -- CreatedBy - int
        GETDATE(),    -- CreatedDate - datetime
        @Icon
    )
END

IF NOT EXISTS (SELECT 1 FROM dbo.TMenuHierarchy WHERE MenuId=@MenuId AND Employerid=@EmployerId)
BEGIN
    INSERT INTO dbo.TMenuHierarchy
    (
        MenuId,
        ParentMenuId,
        CreateDate,
        CreatedBy,
        Employerid,
        parentseq
    )
    VALUES
    (   @MenuId,
        @ParentMenuId,
        GETDATE(),
        -1,
        @EmployerId,
        @Parentseq
    )
END

IF NOT EXISTS (SELECT 1 FROM dbo.TRolePagesMapping WHERE PageId=@MenuId AND Employerid=@EmployerId)
BEGIN
    INSERT INTO dbo.TRolePagesMapping(RoleId, PageId, CreatedBy, CreationDate, UpdatedBy, UpdatedDate, EmployerId, CreationDateUtcTime)
    SELECT
    RoleId,
    @MenuId AS PageId,
    -1 AS CreatedBy,
    GETDATE() AS CreationDate,
    -1 AS UpdatedBy,
    GETDATE() AS UpdatedDate,
    @EmployerId AS EmployerId,
    GETUTCDATE() AS CreationDateUtcTime
    FROM dbo.TRoles
    WHERE Employerid = @EmployerId OR RoleID = 1 --Admin
END

UPDATE TDynamicMenuHierarchy SET DynamicMenuXML = '<?xml version="1.0" encoding="utf-16"?>
<Tree AllowNodeEditing="True" EnableDragAndDrop="True" EnableDragAndDropBetweenNodes="True" OnClientContextMenuItemClicked="OnClientContextMenuItemClicked" FeatureGroupID="RadTreeViewDynamicMenu" EnableAjaxSkinRendering="False" RenderMode="Lightweight" Height="600px">
  <Node Text="Dynamic Menu" Value="1" Expanded="True" Selected="True">
    <Node Text="Home" Value="2" Expanded="True" />
    <Node Text="Admin Configuration" Value="3" Expanded="True">
      <Node Text="Organization Setup" Value="13">
        <Node Text="Add Organization" Value="24" Expanded="True" />
        <Node Text="Create Organization Structure" Value="14" Expanded="True" />
        <Node Text="View Organization Chart" Value="25" Expanded="True" />
        <Node Text="Sync Customer Credentials" Value="78" Expanded="True" />
      </Node>
      <Node Text="Access Right Management" Value="17" Expanded="True" />
      <Node Text="Confirmation Management" Value="61" Expanded="True" />
      <Node Text="Performance Management" Value="62" Expanded="True" />
      <Node Text="Workflow Management" Value="18" Expanded="True">
        <Node Text="Workflow Group Setup" Value="16" Expanded="True" />
        <Node Text="Add Workflow" Value="26" Expanded="True" />
        <Node Text="Define Workflow" Value="27" Expanded="True" />
      </Node>
      <Node Text="Attendance Management" Value="19" Expanded="True" />
      <Node Text="Leave Management" Value="20" Expanded="True" />
      <Node Text="Question Builder" Value="21">
        <Node Text="Add Questionnaire" Value="30" Expanded="True" />
        <Node Text="Set Interview Template" Value="86" Expanded="True" />
        <Node Text="Assign Question Template" Value="31" Expanded="True" />
      </Node>
      <Node Text="Email Template Builder" Value="22" Expanded="True" />
      <Node Text="Setup Masters" Value="15" Expanded="True" />
      <Node Text="Home Page Setup" Value="23" Expanded="True" />
      <Node Text="Policy Documents Setup" Value="64" Expanded="True" />
      <Node Text="Recruitment Management" Value="68" Expanded="True" />
      <Node Text="Setup &amp;amp; Config Change Tracker" Value="81" Expanded="True" />
      <Node Text="Separation Management" Value="82" Expanded="True" />
      <Node Text="Manage Scheduler" Value="84" Expanded="True" />
      <Node Text="Setup Employee Self Service" Value="90" Expanded="True" />
      <Node Text="User Management" Value="12">
        <Node Text="Windows Login Setup" Value="41" Expanded="True" />
        <Node Text="Create New User" Value="38" Expanded="True" />
        <Node Text="Disable User" Value="39" Expanded="True" />
      </Node>
      <Node Text="Travel and Expense Options Setup" Value="95" Expanded="True" />
      <Node Text="Permission Setup" Value="96" Expanded="True" />
      <Node Text="RA Options Setup" Value="105" Expanded="True" />
      <Node Text="RA Permission Setup" Value="106" Expanded="True" />
      <Node Text="Training Options Setup" Value="115" Expanded="True" />
      <Node Text="Training Permission Setup" Value="116" Expanded="True" />
      <Node Text="Conference Room Booking Options Setup" Value="121" Expanded="True" />
      <Node Text="Conference Room Booking Permission Setup" Value="122" Expanded="True" />
      <Node Text="Pre-Onboarding Configure Setup" Value="147" Expanded="True" />
      <Node Text="My Details Field Configuration" Value="1154" Expanded="True" />
	  <Node Text="Advance Setup" Value="1155" Expanded="True" />
      <Node Text="Master Question Bank" Value="113" Expanded="True" />
      <Node Text="Questionnaire Options Setup" Value="132" Expanded="True" />
      <Node Text="Config Setup" Value="170" />
      <Node Text="Seal/Signature Master" Value="155" />
      <Node Text="Donor Information Setup" Value="505" />
      <Node Text="Compensation" Value="406">
        <Node Text="Setup Compensation" Value="407" />
        <Node Text="Compensation Config" Value="412" />
      </Node>
      <Node Text="Customer Config" Value="160" />
      <Node Text="Setup Charts" Value="613" />
      <Node Text="Payroll Details" Value="413" />
      <Node Text="Setup Violations &amp; Occurrence" Value="415" />
    </Node>
    <Node Text="Employee Management" Value="11">
      <Node Text="Pre-Onboarding Candidate" Value="146" Expanded="True" />
      <Node Text="Employee Creation" Value="4" Expanded="True" />
      <Node Text="Search Employee" Value="32" Expanded="True" />
      <Node Text="Employee Bulk Update" Value="58" Expanded="True" />
      <Node Text="Bulk Document Import" Value="83" Expanded="True" />
      <Node Text="Background Verification" Value="89" Expanded="True" />
      <Node Text="Remote Location" Value="127" />
      <Node Text="Compension" Value="144" Expanded="True" />
      <Node Text="Removed Welcome Emails" Value="408" Expanded="True" />
      <Node Text="GeoTracking Config" Value="618" />
    </Node>
    <Node Text="My Details" Value="5" Expanded="True" />
    <Node Text="Leave &amp;amp; Attendance" Value="6" Expanded="True" />
    <Node Text="Performance Assessment" Value="85">
      <Node Text="Notifications" Value="611" />
      <Node Text="Assessment Status" Value="605" />
      <Node Text="Normalization" Value="606" />
      <Node Text="Appraisal Due" Value="607" />
      <Node Text="Employee Assessments" Value="603" />
      <Node Text="Goal Setting" Value="604" />
    </Node>
    <Node Text="Policy Documents" Value="65">
      <Node Text="Self Attestation" Value="66" Expanded="True" />
    </Node>
    <Node Text="Employee Self Service" Value="7" Expanded="True" />
    <Node Text="Separation" Value="8" Expanded="True" />
    <Node Text="Reports &amp;amp; Analytics" Value="9">
      <Node Text="Report Builder" Value="55" Expanded="True" />
      <Node Text="Static Reports" Value="56" Expanded="True" />
      <Node Text="Manage Reports" Value="57" Expanded="True" />
      <Node Text="Dynamic Graphical Reports" Value="614" />
    </Node>
    <Node Text="Recruitment" Value="69">
      <Node Text="RRS Dashboard" Value="70" Expanded="True" />
      <Node Text="Sourcing Dashboard" Value="76" />
      <Node Text="Shortlisting Dashboard" Value="125" Expanded="True" />
      <Node Text="Candidate Referral" Value="71" Expanded="True" />
      <Node Text="View Job Postings" Value="72" Expanded="True" />
      <Node Text="Interview Dashboard" Value="73" Expanded="True" />
      <Node Text="Candidate Dashboard" Value="74" Expanded="True" />
      <Node Text="RRS Approved By Me" Value="75" Expanded="True" />
      <Node Text="Candidate Tracker" Value="79" Expanded="True" />
      <Node Text="Resume Bank" Value="80" Expanded="True" />
      <Node Text="Notifications" Value="616" />
      <Node Text="Dashboard" Value="617" />
      <Node Text="Candidate login Link" Value="1150" />
    </Node>
    <Node Text="Travel" Value="91">
      <Node Text="Travel Request" Value="92" Expanded="True" />
      <Node Text="Report" Value="94" Expanded="True" />
    </Node>
    <Node Text="Expense &amp;amp; Reimbursement" Value="97">
      <Node Text="Expense Request" Value="93" Expanded="True" />
      <Node Text="Report" Value="98" Expanded="True" />
    </Node>
    <Node Text="Resource Allocation" Value="100">
      <Node Text="Manage Allocation" Value="101" Expanded="True" />
      <Node Text="Manage Access" Value="102" Expanded="True" />
      <Node Text="Shared Allocation" Value="103" Expanded="True" />
      <Node Text="Reports" Value="104" Expanded="True" />
    </Node>
    <Node Text="LMS" Value="110">
      <Node Text="Trainings" Value="111" Expanded="True" />
      <Node Text="TNI Setup" Value="117" Expanded="True">
        <Node Text="Manage TNI" Value="112" Expanded="True" />
        <Node Text="Manage Goal Setting" Value="118" Expanded="True" />
      </Node>
      <Node Text="Reports" Value="114" Expanded="True" />
      <Node Text="Survey" Value="119" Expanded="True" />
      <Node Text="Notifications" Value="615" />
    </Node>
    <Node Text="Conference Room Booking" Value="120">
      <Node Text="My Bookings" Value="123" Expanded="True" />
      <Node Text="Master Data" Value="124" Expanded="True" />
    </Node>
    <Node Text="TimePort" Value="126">
      <Node Text="Setup Masters" Value="137" />
      <Node Text="TimeSheet" Value="138" />
      <Node Text="Report" Value="139" />
      <Node Text="TimeSheet Approval" Value="140" />
      <Node Text="TimeSheet Status" Value="141" />
      <Node Text="Timesheet Export" Value="142" />
    </Node>
    <Node Text="PayRoll" Value="128">
      <Node Text="Setup Masters" Value="129" />
      <Node Text="Income Tax Declaration" Value="130" />
      <Node Text="Report" Value="131" />
    </Node>
    <Node Text="Survey" Value="133">
      <Node Text="Survey List" Value="134" Expanded="True" />
      <Node Text="Analytics" Value="135" Expanded="True" />
      <Node Text="My Participation" Value="136" Expanded="True" />
    </Node>
    <Node Text="ESS" Value="180" Expanded="True" />
    <Node Text="Asset Mapping" Value="300" Expanded="True" />
    <Node Text="Client Onboarding" Value="302" Expanded="True" />
    <Node Text="Confirmation Assessment" Value="87">
      <Node Text="Notifications" Value="612" />
      <Node Text="Confirmation Status" Value="608" />
      <Node Text="Initiate Confirmation" Value="609" />
      <Node Text="Confirmation Due" Value="610" />
      <Node Text="Employee Assessments" Value="619" />
    </Node>
    <Node Text="Task Management" Value="128" Expanded="True">
      <Node Text="Task Management" Value="901" />
    </Node>
    <Node Text="Payroll Integration" Value="1152" />
  </Node>
</Tree>'
WHERE employerid = @EmployerId 



EXEC sp_GetDynamicMenuItems 1428, 10