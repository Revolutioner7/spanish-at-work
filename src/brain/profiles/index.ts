import type { Profile } from "../types";
import { scott } from "./scott";

export type { Profile };

export const PROFILES = {
  scott,
} satisfies Record<string, Profile>;
