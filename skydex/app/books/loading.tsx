import { SpinnerBlock } from "@/components/Loading";

export default function BooksLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-5 py-24">
      <SpinnerBlock label="Opening the book…" />
    </main>
  );
}
