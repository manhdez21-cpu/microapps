export * from "./config.ts";
export { verifyLicense, parsePayload, type LicensePayload, type VerifyError, type VerifyResult } from "./license.ts";
export { LICENSE_KEY, readLicenses } from "./store.ts";
export { initPro, isPro, activateLicense, deactivateLicense, onProChange, currentApp, type ActivateResult } from "./state.ts";
export { purchaseHidden, detectStore } from "./store-flag.ts";
export { openUpgradeProModal, type UpgradeOptions } from "./modal.ts";
export { requirePro, type RequireOptions } from "./gate.ts";
