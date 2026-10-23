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
- Voice readouts use Lovable AI TTS via /api/speech (authenticated, buffered WAV), auto-played when a reply finishes, one active clip per chat and cancelled on navigation. Why: user chose a natural playful voice with autoplay; real voice cloning is not done.
- Both chat entry and thread routes use a shared retryable load-error view. Why: failed network reads must not leave a blank chat or silently appear as an empty conversation.
- All chat submissions share a synchronous turn gate and transcript rows do not shrink. Why: rapid sends cannot open overlapping turns and long conversations retain chronological, non-overlapping rows.
- Streaming assistant messages receive an explicit unique message ID before persistence. Why: AI SDK defaults can otherwise overwrite earlier replies under the same stored identifier.
- Render keep-alive: scheduled ping every 10 min via /api/public/keep-alive (needs published app).
- Send only the current turn to the chat proxy, since the Python backend consumes no transcript; retain complete history in the UI and saved messages to avoid reuploading old attachments.
- Return the chat response stream before awaiting Render; keep the waiting indicator visible until text arrives, and log timings without message content to distinguish app overhead from upstream latency.
