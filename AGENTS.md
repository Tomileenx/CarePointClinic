<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Architecture

- Booking data comes only from the external Spring Boot API via validated server functions in `src/lib/booking-api.functions.ts`, which attach `X-API-Key` from the `BOOKING_API_KEY` secret. Why: the key must never reach the browser; no mock data.
- All HTTP and error mapping lives in `src/services/apiClient.ts` (unwraps proxy results); components never call fetch. Why: one place for error handling.
- No localStorage/sessionStorage persistence and no secrets in `VITE_` vars. Why: assessment requirements.
- Validate proxy inputs and documented responses through shared browser-safe schemas before use; enforce documented success statuses. Why: malformed upstream data must never be rendered as a confirmed booking.
