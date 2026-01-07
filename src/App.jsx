import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        color: "#eaeaea",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div>
        <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>
          This application has been deleted.
        </h1>
        <p style={{ opacity: 0.65, fontSize: "1rem" }}>
          The service is no longer available.
        </p>
      </div>
    </div>
  );
}
