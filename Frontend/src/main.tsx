import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PhotoProvider } from "./context/PhotoContext";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <PhotoProvider>
      <App />
    </PhotoProvider>
  </AuthProvider>
);
