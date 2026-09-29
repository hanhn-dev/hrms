/** @type {import('next').NextConfig} */
const path = require("path");

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
  async redirects() {
    // Old guide URLs lived under /features; guides now live under /docs/guides.
    // Do not catch-all /features — that path is the operator console.
    const guideMenus = [
      "admin-configuration",
      "asset-management",
      "leave-and-attendance",
      "lms",
      "my-details",
      "platform",
      "recruitment",
      "reports-and-analytics",
      "separation",
    ];

    const menuRedirects = guideMenus.flatMap((menu) => [
      {
        source: `/features/${menu}`,
        destination: `/docs/guides/${menu}`,
        permanent: true,
      },
      {
        source: `/features/${menu}/:path*`,
        destination: `/docs/guides/${menu}/:path*`,
        permanent: true,
      },
    ]);

    return [
      {
        source: "/features/authentication",
        destination: "/docs/guides/platform/authentication",
        permanent: true,
      },
      {
        source: "/features/workflow",
        destination: "/docs/guides/admin-configuration/workflow",
        permanent: true,
      },
      {
        source: "/features/attendance",
        destination: "/docs/guides/leave-and-attendance/attendance",
        permanent: true,
      },
      {
        source: "/features/leave-management",
        destination: "/docs/guides/leave-and-attendance/leave-management",
        permanent: true,
      },
      {
        source: "/features/separation",
        destination: "/docs/guides/separation/separation",
        permanent: true,
      },
      {
        source: "/features/edit",
        destination: "/docs/guides/edit",
        permanent: true,
      },
      {
        source: "/features/edit/:path*",
        destination: "/docs/guides/edit/:path*",
        permanent: true,
      },
      {
        source: "/features/proposals",
        destination: "/docs/guides/proposals",
        permanent: true,
      },
      {
        source: "/features/proposals/:path*",
        destination: "/docs/guides/proposals/:path*",
        permanent: true,
      },
      ...menuRedirects,
    ];
  },
};
