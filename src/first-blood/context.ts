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

export const FirstBloodContext = createContext<TriggerFirstBlood>(() => {});

/** Возвращает функцию запуска анимации: firstBlood({ team, service, color }) */
export const useFirstBlood = (): TriggerFirstBlood => useContext(FirstBloodContext);
