import { bootHomeApplication } from "./public/js/home/app.js?v=phase10-11-runtime-fix-20260426h";

bootHomeApplication().catch((error) => {
  console.error("[PlayMatrix] Home application boot failed", error);
  if (typeof window.__PM_REPORT_CLIENT_ERROR__ === "function") {
    window.__PM_REPORT_CLIENT_ERROR__("home.boot", error, { source: "script.js" });
  }
});
