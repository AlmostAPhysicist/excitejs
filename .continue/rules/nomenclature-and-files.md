---
description: ExciteJS Core Rules
---

### 1. File Headers
* Every single code file MUST start with a single-line comment stating its filename and extension.
* Example: `//observable.ts` or `//clicker.tsx`

### 2. Strict Nomenclature Matrix
You must apply the exact casing styles depending on the semantic type of the token:

| Category | Token Types | Casing Style | Examples |
| :--- | :--- | :--- | :--- |
| **Data & State** | Variables, parameters, object properties, primitive values, configuration flags. | `snake_case` | `init_value`, `paused_reaction`, `auto_deps` |
| **Execution** | Functions, object methods, utility routines, inline handlers. | `camelCase` | `trigger()`, `preact()`, `initFn()`, `registerScheduler()` |
| **Architectural** | Components, UI Elements, Classes, Factories that instantiate objects. | `PascalCase` | `Observable()`, `Reactor()`, `Clicker()` |
| **File System** | Module filenames, directory names. | `snake_case` | `main.ts`, `observable.ts`, `reactor.ts` |