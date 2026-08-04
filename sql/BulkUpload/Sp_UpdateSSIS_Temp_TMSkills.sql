DECLARE @TMSkillsID INT = 614,
		@CustomerNumber VARCHAR(50) = 'c00026',
		@SkillType VARCHAR(50) = 'Technical',
		@SkillName VARCHAR(50) = 'react_js',
		@SkillDescription VARCHAR(50) = NULL;

EXEC Sp_UpdateSSIS_Temp_TMSkills @TMSkillsID, @SkillType, @SkillName, @SkillDescription, @CustomerNumber