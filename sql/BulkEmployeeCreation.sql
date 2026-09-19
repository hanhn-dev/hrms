DECLARE @JSONResult VARCHAR(MAX),
        @JSONResult2 VARCHAR(MAX)

EXEC SP_BulkEmployeeCreationDetails
          3006,
          25,
          '[{"Date of Joining":"18-Sep-2026","Group Joining Date":"18-Sep-2026","Designation":1189,"Employee Role":106,"Work Location":4347,"Base Location":4347,"Business Unit":460,"Calendar":814,"Shift Type":1146,"Attendance Mode":"Mobile","Grade":1659,"Confirmation Due Date":null,"Confirmation Date":null,"Notice Period Type":null,"Notice Period":60,"Skill Category":null,"Previous Experience (Years)":null,"Previous Experience (Months)":null,"Previous Employment No In Current Organization":null,"Previous Experience In Current Organization (Years)":null,"Previous Experience In Current Organization (Months)":null,"Employment Type":147,"Assessment Tenure":null,"Upcoming Assessment":null,"End Of Contract":null,"Reporting Manager":24142,"Functional Manager":25146,"Comments":null,"Cost Center":null,"Is Auto Present":false,"Auto Present Effective From":null,"Universal Account no.":null,"Pension Fund N":null,"Health Insur.":null,"Vaccine":null,"AA":"sss","PO":null,"Work Email":"ramkate1@gmail.com","isValid":true,"errorFields":[],"unprocessedReasons":""}]',
          'Date of Joining,Group Joining Date,Designation,Employee Role,Work Location,Base Location,Business Unit,Calendar,Shift Type,Attendance Mode,Grade,Confirmation Due Date,Confirmation Date,Notice Period Type,Notice Period,Skill Category,Previous Experience (Years),Previous Experience (Months),Previous Employment No In Current Organization,Previous Experience In Current Organization (Years),Previous Experience In Current Organization (Months),Employment Type,Assessment Tenure,Upcoming Assessment,End Of Contract,Reporting Manager,Functional Manager,Comments,Cost Center,Is Auto Present,Auto Present Effective From,Universal Account no.,Pension Fund N,Health Insur.,Vaccine,AA,PO,Work Email',
          0,
          4880,
          6,
          14,
          @JSONResult OUTPUT,
          @JSONResult2 OUTPUT

SELECT @JSONResult, @JSONResult2