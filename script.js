import { bootHome } from './scripts/app/boot-home.js';

bootHome().catch((error) => {
  console.error('[PlayMatrix] Homepage boot failed', error);
});
