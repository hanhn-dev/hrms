


EXEC dbo.Sp_TnE_GetExpenseReportData @pEmployerId = '10',                  -- varchar(max)
                                    @pViewType = 'M',                    -- varchar(10)
                                    @pEmployeeId = 1430,                   -- int
                                    @pStatusId = '1010,1020,1060,1080',                    -- varchar(1000)
                                    @pIsAdvanceRequest = NULL,          -- bit
                                    @pFromDate = NULL, -- datetime
                                    @pToDate = NULL,   -- datetime
                                    @pExpenseType = '701,702,703,704,705,706,709,710,711,712',                 -- varchar(1000)
                                    @pSpentCurrencyCodeId = NULL,          -- int
                                    @pSpentAmount = NULL,               -- decimal(10, 2)
                                    @pSpentOperator = NULL,               -- varchar(10)
                                    @pReqCurrencyCodeId = NULL,            -- int
                                    @pReqestedAmount = NULL,            -- decimal(10, 2)
                                    @pReqOperator = NULL,                 -- varchar(10)
                                    @pApprovedAmount = NULL,            -- decimal(10, 2)
                                    @pCostCenter = NULL,                  -- varchar(200)
                                    @pProjectRegion = NULL,                -- int
                                    @pPaymentModeId = NULL,                -- int
                                    @pissiteallowanceelligble = NULL,     -- varchar(50)
                                    @pBudgetCode = NULL                ,   -- varchar(50)
                                    @LoginEmployeeId = 1430,
                                    @CityCategoryID = NULL