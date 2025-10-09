#!/bin/bash

# CTF Dashboard Deployment Script
# Использование: ./deploy.sh [options]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка наличия Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен. Установите Docker и попробуйте снова."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
        exit 1
    fi

    log_success "Docker и Docker Compose найдены"
}

# Функция помощи
show_help() {
    echo "CTF Dashboard Deployment Script"
    echo ""
    echo "Использование: $0 [OPTIONS]"
    echo ""
    echo "Опции:"
    echo "  -h, --help              Показать эту справку"
    echo "  -b, --build             Пересобрать образы"
    echo "  -s, --ssl               Запустить с SSL поддержкой"
    echo "  -m, --monitoring        Запустить с мониторингом логов"
    echo "  -d, --down              Остановить все сервисы"
    echo "  -l, --logs              Показать логи"
    echo "  -c, --clean             Очистить неиспользуемые образы"
    echo "  --restart               Перезапустить сервисы"
    echo ""
    echo "Примеры:"
    echo "  $0                      Обычный запуск"
    echo "  $0 -b                   Пересборка и запуск"
    echo "  $0 -s -m                Запуск с SSL и мониторингом"
    echo "  $0 -d                   Остановка сервисов"
}

# Переменные
BUILD=false
SSL=false
MONITORING=false
DOWN=false
LOGS=false
CLEAN=false
RESTART=false

# Обработка аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -b|--build)
            BUILD=true
            shift
            ;;
        -s|--ssl)
            SSL=true
            shift
            ;;
        -m|--monitoring)
            MONITORING=true
            shift
            ;;
        -d|--down)
            DOWN=true
            shift
            ;;
        -l|--logs)
            LOGS=true
            shift
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        --restart)
            RESTART=true
            shift
            ;;
        *)
            log_error "Неизвестная опция: $1"
            show_help
            exit 1
            ;;
    esac
done

# Основная логика
main() {
    log_info "Запуск CTF Dashboard Deployment Script"
    
    check_docker

    # Формирование команды docker-compose
    COMPOSE_CMD="docker-compose -f docker-compose.prod.yml"
    
    if [ "$SSL" = true ]; then
        COMPOSE_CMD="$COMPOSE_CMD --profile ssl"
        log_info "SSL профиль включен"
    fi
    
    if [ "$MONITORING" = true ]; then
        COMPOSE_CMD="$COMPOSE_CMD --profile monitoring"
        log_info "Мониторинг профиль включен"
    fi

    # Выполнение команд
    if [ "$DOWN" = true ]; then
        log_info "Остановка сервисов..."
        $COMPOSE_CMD down
        log_success "Сервисы остановлены"
    elif [ "$LOGS" = true ]; then
        log_info "Показ логов..."
        $COMPOSE_CMD logs -f
    elif [ "$CLEAN" = true ]; then
        log_info "Очистка неиспользуемых образов..."
        docker image prune -f
        log_success "Очистка завершена"
    elif [ "$RESTART" = true ]; then
        log_info "Перезапуск сервисов..."
        $COMPOSE_CMD restart
        log_success "Сервисы перезапущены"
    else
        # Запуск сервисов
        if [ "$BUILD" = true ]; then
            log_info "Сборка и запуск сервисов..."
            $COMPOSE_CMD up --build -d
        else
            log_info "Запуск сервисов..."
            $COMPOSE_CMD up -d
        fi
        
        log_success "Сервисы запущены"
        
        # Показать статус
        log_info "Статус сервисов:"
        $COMPOSE_CMD ps
        
        # Показать доступные URL
        echo ""
        log_info "Доступные URL:"
        echo "  - Основное приложение: http://localhost:80"
        
        if [ "$MONITORING" = true ]; then
            echo "  - Мониторинг логов: http://localhost:8080"
        fi
        
        if [ "$SSL" = true ]; then
            echo "  - HTTPS: https://localhost:443"
        fi
        
        echo ""
        log_info "Для просмотра логов используйте: $0 -l"
        log_info "Для остановки используйте: $0 -d"
    fi
}

# Запуск основной функции
main "$@"
