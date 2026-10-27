export type LoginFailure = {
  title: string;
  body: string;
  reference: string;
};

export function loginFailure(error: string): LoginFailure {
  if (error === "AccessDenied") {
    return {
      title: "Sign-in was cancelled",
      body: "Microsoft did not finish sign-in. This also happens when the account is not assigned to Backstage. Ask an administrator to assign the account, then try again.",
      reference: error,
    };
  }
  if (error === "Configuration") {
    return {
      title: "Backstage sign-in is unavailable",
      body: "The Microsoft connection is not set up. Contact a Backstage administrator.",
      reference: error,
    };
  }
  if (
    error === "OAuthSignin" ||
    error === "OAuthCallback" ||
    error === "Callback"
  ) {
    return {
      title: "Sign-in did not finish",
      body: "Microsoft returned an error before a session was created. Try again. If it keeps failing, contact an administrator.",
      reference: error,
    };
  }
  return {
    title: "Sign-in failed",
    body: "Something went wrong signing in with Microsoft. Try again.",
    reference: error,
  };
}
