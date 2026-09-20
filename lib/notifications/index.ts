// Pluggable notification abstraction. Default no-op log.
// Wire up SMS / email / push in production via the dispatcher.

export interface NotificationEvent {
  type:
    | "complaint_registered"
    | "complaint_assigned"
    | "status_changed"
    | "complaint_resolved"
    | "needs_information";
  userId?: string;
  payload: Record<string, unknown>;
}

const subscribers: ((e: NotificationEvent) => Promise<void> | void)[] = [];

export function subscribe(fn: (e: NotificationEvent) => Promise<void> | void) {
  subscribers.push(fn);
}

export async function emit(event: NotificationEvent) {
  for (const s of subscribers) {
    try {
      await s(event);
    } catch (e) {
      console.error("[notifications]", event.type, e);
    }
  }
}
