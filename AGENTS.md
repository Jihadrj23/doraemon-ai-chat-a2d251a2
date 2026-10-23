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

- Chat replies come from the external Python backend (BACKEND_URL in `src/routes/api/chat.ts`, POST /chat {message}); the route verifies the bearer token and persists UIMessage parts per thread. Why: the user hosts their own model backend.
- Brand avatars use the body illustration while decorative watermarks use the separate face asset. Why: preserves distinct branding and background roles.
- Voice readouts use browser speech synthesis on explicit clicks, with one active utterance per chat and cancellation on navigation. Why: avoids sending conversation text to an additional service and prevents overlapping audio.
- Both chat entry and thread routes use a shared retryable load-error view. Why: failed network reads must not leave a blank chat or silently appear as an empty conversation.
- All chat submissions share a synchronous turn gate and transcript rows do not shrink. Why: rapid sends cannot open overlapping turns and long conversations retain chronological, non-overlapping rows.
- Streaming assistant messages receive an explicit unique message ID before persistence. Why: AI SDK defaults can otherwise overwrite earlier replies under the same stored identifier.
