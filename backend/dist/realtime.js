import { EventEmitter } from "node:events";
// In-process bus for live admin updates. Assumes a single backend instance; with several instances, events stay local to each.
export const partnerEvents = new EventEmitter();
partnerEvents.setMaxListeners(0);
export const PARTNER_ACTIVITY_CHANNEL = "partner-activity";
