import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useAuthStore } from "./store/useAuthStore";

// Supabase 인증 상태 구독 초기화 (앱 전체에서 한 번만)
useAuthStore.getState()._init();

createRoot(document.getElementById("root")!).render(<App />);
