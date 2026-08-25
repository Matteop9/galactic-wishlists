import { SpinnerBlock } from "@/components/Loading";

// Root fallback for any route without its own loading.tsx — instant feedback
// on every navigation while the server render streams in.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-5 py-24">
      <SpinnerBlock />
    </main>
  );
}
