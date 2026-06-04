"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#07080C", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ padding: "3rem", textAlign: "center" }}>
          <h1 style={{ color: "#F5C842" }}>QUANTA</h1>
          <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
            {error.message || "Application error"}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#F5C842",
              color: "#07080C",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
