const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900";

export function AuthNotice({
  title,
  body,
  reference,
  actions,
}: {
  title: string;
  body: string;
  reference?: string;
  actions: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {body}
        </p>
        {reference ? (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Reference: {reference}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
      </section>
    </div>
  );
}

export function authNoticePrimaryClass(): string {
  return primaryButtonClass;
}

export function authNoticeSecondaryClass(): string {
  return secondaryButtonClass;
}
