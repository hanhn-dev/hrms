import { defineConfig } from "prisma/config";

const placeholder =
  "sqlserver://localhost:1433;database=placeholder;user=sa;password=placeholder;encrypt=true;trustServerCertificate=true";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? placeholder,
  },
});
