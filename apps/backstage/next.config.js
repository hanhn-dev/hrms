/** @type {import('next').NextConfig} */
module.exports = {
  async redirects() {
    return [
      {
        source: "/features/authentication",
        destination: "/features/platform/authentication",
        permanent: true,
      },
      {
        source: "/features/workflow",
        destination: "/features/admin-configuration/workflow",
        permanent: true,
      },
      {
        source: "/features/attendance",
        destination: "/features/leave-and-attendance/attendance",
        permanent: true,
      },
      {
        source: "/features/leave-management",
        destination: "/features/leave-and-attendance/leave-management",
        permanent: true,
      },
      {
        source: "/features/separation",
        destination: "/features/separation/separation",
        permanent: true,
      },
    ];
  },
};
