import {
  signInWithDev,
  signInWithEntra,
} from "@/components/auth/auth-actions";
import {
  AuthNotice,
  authNoticePrimaryClass,
  authNoticeSecondaryClass,
} from "@/features/auth/auth-notice";
import { loginFailure, type LoginFailure } from "@/features/auth/login-failure";

export function LoginScreen({
  error,
  entra,
  dev,
  callbackUrl,
}: {
  error?: string;
  entra: boolean;
  dev: boolean;
  callbackUrl: string;
}): React.JSX.Element {
  const failure: LoginFailure | null = error
    ? loginFailure(error)
    : !entra && !dev
      ? loginFailure("Configuration")
      : null;

  return (
    <AuthNotice
      title={failure?.title ?? "Sign in to Backstage"}
      body={
        failure?.body ??
        "Use your Microsoft work account to open docs and the areas assigned to you."
      }
      reference={failure?.reference}
      actions={
        <>
          {entra ? (
            <form action={signInWithEntra}>
              <input name="callbackUrl" type="hidden" value={callbackUrl} />
              <button className={authNoticePrimaryClass()} type="submit">
                Sign in with Microsoft
              </button>
            </form>
          ) : null}
          {dev ? (
            <form action={signInWithDev}>
              <input name="callbackUrl" type="hidden" value={callbackUrl} />
              <button
                className={
                  entra ? authNoticeSecondaryClass() : authNoticePrimaryClass()
                }
                type="submit"
              >
                Dev sign in
              </button>
            </form>
          ) : null}
        </>
      }
    />
  );
}
