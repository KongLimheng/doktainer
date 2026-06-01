import Link from "next/link";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "rgba(59,130,246,0.1)",
          border: "1px solid rgba(59,130,246,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={28} style={{ color: "#3b82f6" }} />
      </div> */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 150,
          height: 150,
          borderRadius: 14,
          // background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
          marginBottom: 0,
        }}
      >
        <img
          src="/assets/images/img-chibi-fixing.png"
          alt="Logo"
          width={150}
          height={150}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: "#3b82f6",
            lineHeight: 1,
            marginBottom: 10,
            marginTop: -25,
          }}
        >
          404
        </h1>
        <p
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Page Not Found
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320 }}>
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 22px",
          borderRadius: 9,
          background: "#3b82f6",
          color: "white",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <Home size={15} /> Back to Dashboard
      </Link>
    </div>
  );
}
