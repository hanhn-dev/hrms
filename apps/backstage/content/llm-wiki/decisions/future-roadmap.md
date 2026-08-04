# Future Roadmap

What appears to be in-flight or intentionally deferred, inferred from recent
git history and source artifacts. This is not an authoritative roadmap (none is
committed); treat as directional signal.

## Recently added (direction of travel)

From recent merge commits on `master`:

- **Mobile Management** — a new module (PR 21787). Supported by
  `TMobileUser`/`TMobileCustomer`/`TMobileNotification`/`TMobileTracking` and
  `TUsers.LatestMobileAppVersion`. The product is extending to mobile.
- **Geo-tagging tag in/out** — geo attendance enhancements (PR 21213,
  `TGeoTagging*`).
- **Invalid-login auditing** — `TDeviceInvalidLoginAttemptDetails` (PR 16723),
  a security-hardening direction.
- **Payroll/email-template optimization** — production optimization of email
  template SPs (PR 22227).
- **Device cleanup on deactivation** — SP to remove all devices when an employee
  is deactivated (PR 17754).

## Apparently deferred / in-progress (cleanup debt)

- **Status-encoding unification** — the mixed `LeaveStatus` word/char encoding and
  the `Remove-ApproveStatus` migration suggest a not-yet-complete standardization.
- **Object hygiene** — many `_bkp<date>`, `_History`, `_V2`, and per-tenant
  variant objects accumulate; consolidating/removing dead variants is latent debt.
- **Foreign-key / constraint hardening** — relationships are mostly
  convention-based; tightening them is a possible future direction.

<!-- TODO: needs input — there is no committed roadmap; the above is inferred from
git history and would benefit from team confirmation. -->
