# CTF Live Map

Борда Attack-Defence: карта команд с анимированными атаками, статусами сервисов
и щитами Wazuh. React 19 + Vite + TypeScript.

```bash
npm install
npm run dev     # дев-сервер
npm run build   # typecheck + сборка в dist/
npm run lint
```

Деплой — см. [DEPLOY.md](DEPLOY.md).

## Режимы (URL-параметры)

| Параметр        | Что делает                                                        |
|-----------------|-------------------------------------------------------------------|
| `mode=screen`   | Режим проектора: без hover/фильтров, ТОП-10. По умолчанию — интерактивный (hover, фильтр по команде, ТОП-5). |
| `team=N`        | Подсветить свою команду («ВЫ»).                                    |
| `mock=1`        | Моки вместо API (каждый опрос — новый раунд).                      |
| `teams=N`       | Сколько команд в моках (по умолчанию 16, максимум 30).             |
| `poll=MS`       | Период опроса, перекрывает `pollMs` из конфига (в моках по умолчанию 20 с). |

Например: `/?mode=screen`, `/?team=9`, `/?mock=1&teams=30&poll=10000`.

## Источники данных

Адреса читаются в рантайме из [`public/config.json`](public/config.json) — в docker
файл смонтирован поверх, менять без пересборки. Основной источник —
**бэкенд борды** [`ctf-board-backend`](../ctf-board-backend) поверх forcad-rs:
очки, SLA, first blood, таймеры, пауза и атаки почти в реальном времени (SSE).
Если `board.url` пустой — борда работает на старом API (`scoreboard`).

```json
{
  "title": "CTF · Attack-Defence",
  "pollMs": 150000,
  "requestTimeoutMs": 10000,
  "maxArcs": 40,
  "sources": {
    "board": { "url": "http://localhost:8090" },
    "scoreboard": { "url": "http://10.62.0.120:8000/ctfdata/" },
    "shields": { "url": "http://gitlabapps.ctflab.local:8080/ctf-backend/api/wazuh/activity" }
  }
}
```

Источник с пустым/отсутствующим `url` выключен. Если источник не ответил или
ответ невалидный — его данные просто не отображаются:

- **board** — поток `GET /api/stream`; при обрыве EventSource переподключается сам,
  до этого бейдж «НЕТ СВЯЗИ». Чего бэкенд не прислал (очки, таймеры…) — того на борде нет.
- **scoreboard** не ответил до первых данных → «НЕТ ДАННЫХ»; после — остаются
  последние данные, бейдж «НЕТ СВЯЗИ».
- **shields** не ответил → щитов и их легенды нет.

### Контракт

`GET scoreboard` → `{ NumRound, TeamData[] }`, где команда —
`{ team_id, team_name, team_pos, ServData[{ serv_name, serv_status }], AttackData[{ victeam_id, victeam_name, victeam_cflag, serv_name? }] }`.
`AttackData[].serv_name` — опционально: если есть, дуга атаки красится в цвет сервиса, иначе нейтральная.
Статусы — коды ForcAD: 101 UP, 102 CORRUPT, 103 MUMBLE, 104 DOWN, 110 CHECK FAILED.
Сервисы берутся из ответа (в порядке появления).

`GET shields` → `{ "team-1": true, "team-2": false, ... }`.

Типы — [`src/api/types.ts`](src/api/types.ts), разбор — [`src/api/normalize.ts`](src/api/normalize.ts).

## Как показываются данные

С бэкендом борды:

- Атаки приходят пачками раз в ~2 с (бэкенд склеивает одинаковые кражи и
  режет пачку), дуги одной пачки разносятся во времени. Цвет — сервис,
  золотая дуга с подписью — first blood.
- Очки и места — по формуле forcad (`Σ score × checks_passed / checks`),
  SLA по сервисам и stolen/lost за игру — в подсказке.
- Таймеры раунда и игры (`TOTAL_ROUNDS` на бэкенде), на паузе — плашка «ПАУЗА»,
  таймер замирает.

Со старым API:

- Каждый ответ — снапшот раунда. Атаки раунда раскидываются дугами по окну
  опроса (85% от `pollMs`), один раз на раунд; число на дуге — `victeam_cflag`.
- Команды с `true` у Wazuh получают один пульс щита за раунд в случайный момент окна.
- ↑/↓ — изменение `team_pos` относительно прошлого раунда.
- Карточки расставлены по `team_id` и не прыгают при смене мест.
- Сервисы обозначаются двухсимвольными кодами: VA VibeAura, BF BioForge, SH SmartHome,
  SC SleepCaps, SK SKUDS. Для новых сервисов код строится автоматически
  (заглавные буквы CamelCase или первая + следующая буква), коды и цвета — `src/game/constants.ts`.
- Фон карты — [Radar](https://reactbits.dev/backgrounds/radar) из React Bits (`src/components/Radar.tsx`, WebGL через `ogl`).

## Структура

```
src/
  api/         types.ts (контракт), normalize.ts, sources.ts (http/mock), mock*.ts
  game/        engine.ts (состояние, расписание дуг/щитов, отрисовка канваса),
               view.ts (данные для UI), layout.ts, constants.ts
  hooks/       useBoard.ts — движок + опрос источников
  components/  Header, MapView, TeamCard, TeamTooltip, Sidebar
  config.ts    config.json + URL-параметры
```

Новый источник — реализовать `Source<T>` в `src/api/sources.ts` и
нормализатор в `normalize.ts`; UI показывает только то, что пришло.
