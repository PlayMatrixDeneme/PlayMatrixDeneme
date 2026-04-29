export const appConfig = Object.freeze({
  appName: 'PlayMatrix',
  scope: 'homepage-only',
  apiBase: globalThis.PLAYMATRIX_API_BASE || '',
  backendOrigin: 'https://emirhan-siye.onrender.com',
  routes: Object.freeze({
    home: '/',
    health: '/healthz'
  })
});
