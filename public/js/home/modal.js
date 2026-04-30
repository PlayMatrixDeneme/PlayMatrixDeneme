import { qsa } from "./dom-utils.js";
import { installHomeModalManager } from './modals.js';
import { installMobileGesturePolicy } from './mobile-scroll.js';

export function installModalSafety(root = document) {
  installMobileGesturePolicy();
  installHomeModalManager(root);
  qsa(".ps-modal:not(.active):not(.is-open)", root).forEach((modal) => {
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;
  });
  qsa(".sheet-shell:not(.is-open)", root).forEach((sheet) => {
    sheet.setAttribute("aria-hidden", "true");
  });
}
