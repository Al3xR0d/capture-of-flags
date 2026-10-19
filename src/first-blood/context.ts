import { createContext, useContext } from 'react';

export interface FirstBloodEvent {
  /** Название атакующей команды — пишется на флаге */
  team: string;
  /** Название сервиса — пишется на гранях куба */
  service: string;
  /** Цвет команды (флаг, маркер в списке), по умолчанию #ff2e63 */
  color?: string;
}

export type TriggerFirstBlood = (event: FirstBloodEvent) => void;
export type TriggerFirstBloodBatch = (events: FirstBloodEvent[]) => void;

export const FirstBloodContext = createContext<TriggerFirstBlood>(() => {});
export const FirstBloodBatchContext = createContext<TriggerFirstBloodBatch | null>(null);

/** Возвращает функцию запуска анимации: firstBlood({ team, service, color }) */
export const useFirstBlood = (): TriggerFirstBlood => useContext(FirstBloodContext);

/** Возвращает batch-триггер для запуска анимации с несколькими событиями, или null вне провайдера */
export const useFirstBloodBatch = (): TriggerFirstBloodBatch | null =>
  useContext(FirstBloodBatchContext);
