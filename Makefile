.DEFAULT_GOAL := help

COMPOSE := docker compose
RUN := $(COMPOSE) run --rm app

.PHONY: help install dev build test lint fmt

help: ## Показать эту справку
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости (в докере)
	$(RUN) npm install

dev: ## Запустить dev-сервер на http://localhost:5173
	$(COMPOSE) up app

build: ## Собрать прод-версию в dist/
	$(RUN) npm run build

test: ## Запустить тесты
	$(RUN) npm test

lint: ## Проверить код линтерами (eslint + prettier)
	$(RUN) npm run lint

fmt: ## Отформатировать код (prettier)
	$(RUN) npm run fmt
