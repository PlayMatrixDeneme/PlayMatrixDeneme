const CLASSIC_SCORE_ENDPOINT_CONTRACT = '/api/classic/submit';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, getIdToken, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadFirebaseWebConfig } from "../../../../firebase-runtime.js";
import { createClassicGameRuntime } from "../../shared/classic-runtime.js";

const firebaseConfig = await loadFirebaseWebConfig({ required: true, scope: "classic" });
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const API_URL = window.__PM_API__?.getApiBaseSync
  ? window.__PM_API__.getApiBaseSync()
  : String(window.__PM_RUNTIME?.apiBase || window.__PLAYMATRIX_API_URL__ || document.querySelector('meta[name="playmatrix-api-url"]')?.content || window.location.origin).trim().replace(/\/+$/, '').replace(/\/api$/i, '');

window.__PM_RUNTIME = window.__PM_RUNTIME || {};
window.__PM_RUNTIME.auth = auth;
window.__PM_RUNTIME.signOut = signOut;
window.__PM_RUNTIME.apiBase = API_URL;
window.__PM_RUNTIME.getIdToken = async (forceRefresh = false) => {
  if (!auth.currentUser) throw new Error('NO_USER');
  return getIdToken(auth.currentUser, forceRefresh);
};
window.__PLAYMATRIX_API_URL__ = API_URL;

const runtime = createClassicGameRuntime({
  auth,
  getIdToken: (user) => getIdToken(user),
  apiBase: API_URL,
  gameType: 'patternmaster',
  title: 'Pattern Master',
  statusElement: document.getElementById('status'),
  loginUrl: '/'
});

try { window.__PM_GAME_ACCOUNT_SYNC__?.start?.(); } catch (_) {}

onAuthStateChanged(auth, (user) => {
  runtime.applyAuthState(user || null);
});
