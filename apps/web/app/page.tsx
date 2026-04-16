export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">ai-job-bot</h1>
      <p className="text-sm opacity-70">
        Phase 0 scaffold. Health endpoint:{' '}
        <a className="underline" href="/api/health">
          /api/health
        </a>
      </p>
    </main>
  );
}
