const path = require("path");

/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: [
    "@hrms/db",
    "antd",
    "@ant-design/icons",
    "@ant-design/cssinjs",
    "@ant-design/nextjs-registry",
    "rc-util",
    "rc-pagination",
    "rc-picker",
  ],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-mssql"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};
