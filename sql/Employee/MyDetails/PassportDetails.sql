-- GET --
EXEC SP_BulkUpdateProfile_GetEmployeeDetailsForGivenFields N'1431', N'1847,1848,1849,83211,1850,1851,1852,83377,83543,83709'

-- UPDATE --
EXEC Usp_Mydetails_Enhanced_Process_Template N'1431', 4, N'[{"ID":1431,"Employment Number":"00002","Employee Name":"Abhishek Test 2 Neour","Name as in Passport":"Pauljohn1","Passport Number":"82AC26B938w","Expiry/Renewal Date":"01-Feb-2033","Date of Birth":null,"ECNR Required":true,"Place of Issue":"HYD","Issue Date":"01-Feb-2023","Country of Birth":null,"State of Birth":null,"City Of Birth":null,"Action":"Update","errorFields":[],"isValid":true}]', N'ID,Employee Name,Name as in Passport,Passport Number,Expiry/Renewal Date,Date of Birth,ECNR Required,Place of Issue,Issue Date,Country of Birth,State of Birth,City Of Birth,Employment Number'