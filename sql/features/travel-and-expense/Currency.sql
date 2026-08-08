EXEC SP_GET_CURRENCY '11/9/2023', "USD"

SELECT currencycode,CurrencyName,* FROM dbo.TCountry WHERE currencycode IS NOT NULL ORDER BY 1