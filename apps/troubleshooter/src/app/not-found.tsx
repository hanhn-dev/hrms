import { Result } from "antd";
import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Result
        status="404"
        title="Not found"
        extra={<Link href="/">Back to employers</Link>}
      />
    </div>
  );
}
