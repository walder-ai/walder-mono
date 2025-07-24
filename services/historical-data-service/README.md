# Historical Data Service

Автономный микросервис для загрузки и хранения исторических 5-минутных OHLCV данных криптовалютных пар в Redis Time Series.

## Особенности

🔄 **Автономная работа** - загружает и обновляет данные без вмешательства  
📊 **Redis Time Series** - хранение без ретеншиона в папке `5m`  
⚡ **Rate Limiting** - защита от превышения лимитов API Binance  
🔁 **Fault Tolerance** - retry с exponential backoff  
📈 **Spot & Futures** - поддержка обоих рынков  
🗓️ **Historical Backfill** - загрузка с 2025-01-01 по сегодня  
🕒 **Real-time Updates** - постоянное обновление свежих данных  

## Структура данных в Redis

```
5m:binance:spot:BTCUSDT:open     -> Time Series данные
5m:binance:spot:BTCUSDT:high     -> Time Series данные  
5m:binance:spot:BTCUSDT:low      -> Time Series данные
5m:binance:spot:BTCUSDT:close    -> Time Series данные
5m:binance:spot:BTCUSDT:volume   -> Time Series данные

5m:progress:binance:spot:BTCUSDT -> Последний timestamp
```

## API Endpoints

- `GET /health` - Статус сервиса
- `GET /status` - Конфигурация и статус планировщика  
- `GET /progress` - Прогресс загрузки всех символов
- `POST /backfill/:marketType/:symbol` - Запуск backfill для символа
- `POST /update/:marketType/:symbol` - Обновление символа
- `POST /scheduler/backfill` - Запуск backfill всех символов
- `POST /scheduler/update` - Обновление всех символов

## Конфигурация

### Основные переменные

```bash
HISTORICAL_START_DATE=2025-01-01    # Дата начала загрузки
HISTORICAL_TIMEFRAME=5m             # Таймфрейм данных
HISTORICAL_BATCH_SIZE=1000          # Размер батча
REDIS_KEY_PREFIX=5m                 # Префикс ключей Redis

EXCHANGE_REQUESTS_PER_MINUTE=1200   # Лимит запросов в минуту
EXCHANGE_REQUEST_DELAY=100          # Задержка между запросами

SCHEDULER_INTERVAL=300000           # Интервал обновления (5 мин)
SCHEDULER_BACKFILL_INTERVAL=3600000 # Интервал backfill (1 час)
```

## Принципы DRY & SOLID

✅ **Single Responsibility** - каждый класс имеет одну ответственность  
✅ **Open/Closed** - легко расширяется новыми биржами/рынками  
✅ **Liskov Substitution** - провайдеры взаимозаменяемы  
✅ **Interface Segregation** - минимальные интерфейсы  
✅ **Dependency Inversion** - зависимости через интерфейсы  

## Развертывание

```bash
# Разработка
bun run dev

# Production
bun run build
bun run start

# Docker
docker build -t historical-data-service .
docker run -p 3001:3001 historical-data-service

# Kubernetes
kubectl apply -f k8s/
```

## Архитектура

Сервис следует той же архитектуре, что и `market-fetcher`, но адаптирован для исторических данных:

- **Features**: Historical data management, Scheduling
- **Shared**: Exchange providers, Cache, Interfaces, Models  
- **Utils**: Rate limiting, Symbol normalization
- **Config**: Environment-based configuration

Полностью автономен и fault-tolerant для непрерывной работы. 