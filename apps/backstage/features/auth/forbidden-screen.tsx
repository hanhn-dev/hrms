import Link from "next/link";
import { signOutToLogin } from "@/components/auth/auth-actions";
import {
  AuthNotice,
  authNoticePrimaryClass,
  authNoticeSecondaryClass,
} from "@/features/auth/auth-notice";

export function ForbiddenScreen({
  title,
  body,
}: {
  title: string;
  body: string;
}): React.JSX.Element {
  return (
    <AuthNotice
      title={title}
      body={body}
      actions={
        <>
          <Link className={authNoticePrimaryClass()} href="/docs">
            Back to docs
          </Link>
          <form action={signOutToLogin}>
            <button className={authNoticeSecondaryClass()} type="submit">
              Sign out
            </button>
          </form>
        </>
      }
    />
  );
}
