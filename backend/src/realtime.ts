import { EventEmitter } from "node:events";

// In-process bus for live admin updates. Assumes a single backend instance; with several instances, events stay local to each.
export const partnerEvents = new EventEmitter();
partnerEvents.setMaxListeners(0);

export type PartnerActivityEvent = {
  id: string;
  actor_email: string;
  actor_role: string;
  event: string;
  target_email: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export const PARTNER_ACTIVITY_CHANNEL = "partner-activity";
export const NEHA_MESSAGE_CHANNEL = "neha-message";
export const AGENT_STATUS_CHANNEL = "agent-status";
