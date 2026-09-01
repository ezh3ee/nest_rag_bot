## Repository exploration rules

- Never search or read files inside node_modules, dist, .git or coverage.
- Do not inspect generated files unless explicitly required.
- Prefer source files under src/.
- Inspect package.json before searching dependency internals.
- Only inspect dependency type declarations when the public API cannot be inferred from package.json or existing project usage.

## Repository exploration

- Do not read or search node_modules/, dist/, .git/ or other generated directories.
- Prefer source files under src/.
- Do not inspect dependency internals unless the task cannot be completed using the public API or existing project usage.
- When investigating a task, first inspect only files directly related to it.
- Avoid broad repository-wide searches unless necessary.
- DO not read .env files
- DO TESTS using both build and start:dev

## Git-воркфлоу (обязательно если говорою "залей/запушь/закоммить на github")

- Никогда не коммить в main.
- Под задачу создай ветку: git checkout -b {feature/refactor/fix/и_т.д.}/КОРОТКОЕ-ИМЯ-ЗАДАЧИ
- Перед коммитом запусти: npx tsc --noEmit -p tsconfig.build.json и npx eslint "src/**/*.ts". Если красное — чини до коммита.
- Коммить с подписью бота:
  git -c user.name="Opencode" -c user.email="opencode@agents.local" commit -m "{ЧТО СДЕЛАЛ}"
- git push -u origin ai/ИМЯ или head
- gh pr create --title "{ЧТО СДЕЛАЛ}" --body "{Коротко: что изменено и зачем}"
- НЕ нажимай merge. Жди моего решения.
- Если я говорю «почини комменты на PR N»:

# 1. gh pr view N --comments

1. gh api repos/ТВОЙ_ЛОГИН/НАЗВАНИЕ_ПРОЕКТА/pulls/N/comments
   Прочитай оба вывода, исправь всё в той же ветке, закоммить, запушь. PR обновится сам.

## Правила по коду

1. ИНЪЕКЦИЯ КОНФИГОВ — ВСЕГДА ЧЕРЕЗ @Inject(config.KEY)
   Все конфигы инжектятся в конструктор ТОЛЬКО через @Inject(config.KEY).
   Никогда не передавай тип конфига напрямую без @Inject.

2. ЗАПРЕТ НА as КАСТЫ
   Избегай as кастов. Если нужен каст - это признак плохой архитектуры. Используй альтернативы.
   Делай тайпгарды используя Zod.

3. НОРМАЛИЗАЦИЯ
   Если discriminated union, созлдавай adapter фунции которая нормализует конфиг в объект.

4. НЕ СОЗДАВАЙ ВНУТРЕННИЕ ТИПЫ-КОСТЫЛИ
   Никогда не создавай LlmConfigInternal, ConfigInternal и подобные интерфейсы со всеми полями опциональными.

5. УБИРАЙ ДЕФОЛТЫ ИЗ ВЫЗОВОВ
   Если значение опционально в конфиге, не передавай дефолт в вызов. Передавай только если задано.

6. ! DEFINITE ASSIGNMENT — КОГДА ЭТО НОРМА
   ! допустим только для полей, которые инициализируются в onModuleInit() или других lifecycle hooks NestJS.

7. ПРОВЕРКИ
   После написания кода ОБЯЗАТЕЛЬНО запусти в этом порядке:

   # 1. Typecheck

   npx tsc --noEmit -p tsconfig.build.json

   # 2. Build

   npm run build

   # 3. Lint

   npm run lint

   # 4. Runtime check (КРИТИЧНО!)

   npm run start:dev

   Если start:dev падает с UnknownDependenciesException:
   Проверь что в конструкторе есть @Inject(config.KEY) для всех конфигов
   Проверь что импорты не import type (только import type для типов, но import для классов)
   Проверь что провайдер зарегистрирован в module.providers
