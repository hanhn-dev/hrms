#!/usr/bin/env node
/**
 * Deploy the local Legacy/rewritten Count SPs to DEV and compare fixture counts.
 *
 * Usage (from HRMS.Core.WebAPI.Node so sequelize resolves):
 *   node "d:/hrms/sql/troubleshooting/employee/reportee-count-rewrite/run-compare.js" --deploy-legacy
 *   node "d:/hrms/sql/troubleshooting/employee/reportee-count-rewrite/run-compare.js" --deploy-new
 *   node "d:/hrms/sql/troubleshooting/employee/reportee-count-rewrite/run-compare.js" --compare
 *   node "d:/hrms/sql/troubleshooting/employee/reportee-count-rewrite/run-compare.js" --drop-legacy
 */
const fs = require("fs");
const path = require("path");

const API_ROOT = "d:/TDG HRMS/SourceCode/HRMS.CoreAPI/HRMS.Core.WebAPI.Node";
const Sequelize = require(path.join(API_ROOT, "node_modules/sequelize"));
const { QueryTypes } = Sequelize;

function loadSequelizer() {
  const configPath = path.join(API_ROOT, "Config/dbSettings.DEV.json");
  const config = require(configPath).dbConfig;
  const parameters = {
    dialect: "mssql",
    host: config.server,
    username: config.user,
    password: config.password,
    database: config.database,
    dialectOptions: {
      options: {
        requestTimeout: 10 * 60 * 1000,
      },
    },
    retry: {
      timeout: config.requestTimeout,
    },
    pool: {
      min: config.pool.min,
      max: config.pool.max,
      idle: config.pool.idleTimeoutMillis,
      evict: config.pool.evictionRunIntervalMillis,
    },
    logging: false,
  };

  if (config.server.includes("\\")) {
    Reflect.deleteProperty(parameters, "host");
    const [server, instanceName] = config.server.split("\\");
    parameters.dialectOptions.options.server = server;
    parameters.dialectOptions.options.instanceName = instanceName;
    parameters.dialectOptions.options.port = 1433;
  }

  return {
    sequelizer: new Sequelize(parameters),
    database: config.database,
  };
}
const HERE = __dirname;
const NEW_SP =
  "d:/TDG HRMS DB/HRMS-DATABASE/HRMS/STOREPROCEDURE/Sp_CM_Mydetails_DirectIndirectReports_Count.sql";

const EMPLOYEES = [1431, 1432];
const RANKS = [-1, 0, 1, -2, -3];
const ACTIVE_VALUES = [null, "Y", "N"];
const EMPLOYERS = [10, 46];

function splitGoBatches(sql) {
  return sql
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function runBatches(sequelizer, sql) {
  for (const batch of splitGoBatches(sql)) {
    await sequelizer.query(batch);
  }
}

async function execCount(sequelizer, procedureName, employeeId, rankLevel, isActive, employerId) {
  const rows = await sequelizer.query(`EXEC ${procedureName} :employeeId, :rankLevel, :isActive, :employerId`, {
    type: QueryTypes.SELECT,
    replacements: {
      employeeId,
      rankLevel,
      isActive,
      employerId,
    },
  });
  return Number(rows[0]?.EmployeeCount || 0);
}

async function compare(sequelizer) {
  const deltas = [];
  const legacyByKey = new Map();

  for (const employeeId of EMPLOYEES) {
    for (const rankLevel of RANKS) {
      for (const isActive of ACTIVE_VALUES) {
        for (const employerId of EMPLOYERS) {
          const key = `${employeeId}|${rankLevel}|${isActive ?? "NULL"}|${employerId}`;
          const legacyCount = await execCount(
            sequelizer,
            "dbo.Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy",
            employeeId,
            rankLevel,
            isActive,
            employerId
          );
          const newCount = await execCount(
            sequelizer,
            "dbo.Sp_CM_Mydetails_DirectIndirectReports_Count",
            employeeId,
            rankLevel,
            isActive,
            employerId
          );
          legacyByKey.set(key, legacyCount);
          if (legacyCount !== newCount) {
            deltas.push({ employeeId, rankLevel, isActive, employerId, legacyCount, newCount });
          }
          console.log(
            `single ${key} legacy=${legacyCount} new=${newCount}${legacyCount === newCount ? "" : " DELTA"}`
          );
        }
      }
    }
  }

  const nullLegacy = await execCount(
    sequelizer,
    "dbo.Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy",
    1431,
    0,
    null,
    null
  );
  const nullNew = await execCount(
    sequelizer,
    "dbo.Sp_CM_Mydetails_DirectIndirectReports_Count",
    1431,
    0,
    null,
    null
  );
  if (nullLegacy !== nullNew) {
    deltas.push({
      employeeId: 1431,
      rankLevel: 0,
      isActive: null,
      employerId: null,
      legacyCount: nullLegacy,
      newCount: nullNew,
    });
  }
  console.log(`null-employer 1431|0|NULL|NULL legacy=${nullLegacy} new=${nullNew}`);

  const csvChecks = [];
  for (const employeeId of [1431, 1432]) {
    for (const rankLevel of [0, 1, -2, -3]) {
      const csvNew = await execCount(
        sequelizer,
        "dbo.Sp_CM_Mydetails_DirectIndirectReports_Count",
        employeeId,
        rankLevel,
        null,
        "10,46"
      );
      const csvLegacySum =
        (legacyByKey.get(`${employeeId}|${rankLevel}|NULL|10`) || 0) +
        (legacyByKey.get(`${employeeId}|${rankLevel}|NULL|46`) || 0);
      const csvDelta = csvNew - csvLegacySum;
      csvChecks.push({ employeeId, rankLevel, csvNew, csvLegacySum, csvDelta });
      console.log(
        `csv ${employeeId}|${rankLevel}|NULL|10,46 new=${csvNew} legacySum=${csvLegacySum} delta=${csvDelta}`
      );
    }
  }

  return { deltas, csvChecks };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const { sequelizer, database } = loadSequelizer();
  console.log(`Connected to ${database}`);

  try {
    if (args.has("--deploy-legacy")) {
      await runBatches(
        sequelizer,
        fs.readFileSync(path.join(HERE, "Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy.sql"), "utf8")
      );
      console.log("Deployed _Legacy");
    }

    if (args.has("--deploy-new")) {
      await runBatches(sequelizer, fs.readFileSync(NEW_SP, "utf8"));
      console.log("Deployed rewritten Count SP");
    }

    if (args.has("--compare")) {
      const { deltas, csvChecks } = await compare(sequelizer);
      const csvFailed = csvChecks.filter((check) => check.csvDelta !== 0);
      if (deltas.length > 0 || csvFailed.length > 0) {
        console.error(JSON.stringify({ deltas, csvFailed }, null, 2));
        process.exitCode = 1;
      } else {
        console.log("Compare passed: zero single-employer deltas; csv matches legacy sum.");
      }
    }

    if (args.has("--drop-legacy")) {
      await runBatches(sequelizer, fs.readFileSync(path.join(HERE, "drop-legacy.sql"), "utf8"));
      console.log("Dropped _Legacy");
    }
  } finally {
    await sequelizer.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
