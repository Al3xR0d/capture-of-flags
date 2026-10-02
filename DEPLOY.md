# Развертывание CTF Dashboard

## Быстрый старт

### 1. Сборка и запуск

```bash
# Сборка и запуск в продакшене
docker-compose -f docker-compose.prod.yml up --build -d

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f dashboard-frontend
```

### 2. Доступ к приложению

- **Основное приложение:** http://localhost:80
- **Логи (если включен мониторинг):** http://localhost:8080

## Адреса API

Источники данных задаются в `public/config.json` (см. README). В
`docker-compose.prod.yml` файл смонтирован в контейнер, поэтому после правки
достаточно обновить страницу борды — пересборка не нужна.

## Расширенные опции

### SSL/HTTPS развертывание

```bash
# Создать SSL сертификаты в директории nginx/ssl/
mkdir -p nginx/ssl
# Поместить cert.pem и key.pem в nginx/ssl/

# Запуск с SSL
docker-compose -f docker-compose.prod.yml --profile ssl up -d
```

### Мониторинг логов

```bash
# Запуск с мониторингом логов
docker-compose -f docker-compose.prod.yml --profile monitoring up -d
```

### Полное развертывание (SSL + мониторинг)

```bash
docker-compose -f docker-compose.prod.yml --profile ssl --profile monitoring up -d
```

## Управление

### Остановка

```bash
# Остановка всех сервисов
docker-compose -f docker-compose.prod.yml down

# Остановка с удалением volumes
docker-compose -f docker-compose.prod.yml down -v
```

### Обновление

```bash
# Пересборка и перезапуск
docker-compose -f docker-compose.prod.yml up --build -d

# Обновление только фронтенда
docker-compose -f docker-compose.prod.yml up --build -d dashboard-frontend
```

### Очистка

```bash
# Удаление неиспользуемых образов
docker image prune -f

# Полная очистка Docker
docker system prune -a -f
```

## Структура сервисов

- **dashboard-frontend** - React приложение (порт 80)
- **nginx-proxy** - Reverse proxy с SSL (порт 443, профиль: ssl)
- **log-monitor** - Мониторинг логов (порт 8080, профиль: monitoring)

## Переменные окружения

Основные переменные для настройки:

```bash
# В docker-compose.prod.yml
environment:
  - NODE_ENV=production
```

## Мониторинг

### Health checks

```bash
# Проверка здоровья контейнера
curl http://localhost:80/health

# Проверка через Docker
docker-compose -f docker-compose.prod.yml exec dashboard-frontend wget -q --spider http://localhost:80/
```

### Логи

```bash
# Логи всех сервисов
docker-compose -f docker-compose.prod.yml logs

# Логи конкретного сервиса
docker-compose -f docker-compose.prod.yml logs dashboard-frontend

# Следить за логами в реальном времени
docker-compose -f docker-compose.prod.yml logs -f
```

## Troubleshooting

### Проблемы с портами

```bash
# Проверить занятые порты
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# Изменить порты в docker-compose.prod.yml
ports:
  - "8080:80"  # Вместо 80:80
```

### Проблемы с правами

```bash
# Проверить права на файлы
ls -la nginx/

# Исправить права
sudo chown -R $USER:$USER nginx/
```

### Очистка и пересборка

```bash
# Полная пересборка без кеша
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```
