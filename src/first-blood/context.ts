import { createContext, useContext } from "react";

export interface FirstBloodEvent {
  team: string;
  service: string;
  color?: string;
}

export type TriggerFirstBlood = (event: FirstBloodEvent) => void;
export type TriggerFirstBloodBatch = (events: FirstBloodEvent[]) => void;

export const FirstBloodContext = createContext<TriggerFirstBlood>(() => {});
export const FirstBloodBatchContext =
  createContext<TriggerFirstBloodBatch | null>(null);

export const useFirstBlood = (): TriggerFirstBlood =>
  useContext(FirstBloodContext);
export const useFirstBloodBatch = (): TriggerFirstBloodBatch | null =>
  useContext(FirstBloodBatchContext);
