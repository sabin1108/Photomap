import { Profiler } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useAuthStore } from "./store/useAuthStore";
import { installProfilerHelpers, isProfilerEnabled, recordProfilerCommit } from "./lib/performanceProfiler";

// Supabase 인증 상태 구독 초기화 (앱 전체에서 한 번만)
useAuthStore.getState()._init();

installProfilerHelpers();

const app = isProfilerEnabled ? (
  <Profiler id="PhotomapApp" onRender={recordProfilerCommit}>
    <App />
  </Profiler>
) : (
  <App />
);

createRoot(document.getElementById("root")!).render(app);
