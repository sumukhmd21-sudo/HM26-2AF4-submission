export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-white/60">
        The page you're looking for doesn't exist.
      </p>
      <a href="/" className="btn-primary mt-5">Go home</a>
    </div>
  );
}
