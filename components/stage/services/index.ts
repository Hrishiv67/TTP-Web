import type { ServiceId } from "../sequence";
import type { ServiceFactory } from "./types";

/** Each service's animation, loaded on demand. */
export const SERVICES: Record<ServiceId, () => Promise<{ default: ServiceFactory }>> = {
  ttp: () => import("./ttp"),
  new: () => import("./new"),
  used: () => import("./used"),
  repair: () => import("./repair"),
  balance: () => import("./balance"),
  alignment: () => import("./alignment"),
  ac: () => import("./ac"),
  washout: () => import("./washout"),
  maintenance: () => import("./maintenance"),
};

/** Services that feature a lineup tire; built before the scene first shows, since their props sit on the lineup. */
export const ON_LINEUP: ServiceId[] = ["ttp", "new", "used", "repair"];
