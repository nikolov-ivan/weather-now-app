# WeatherNow — Project Plan за сайт за времето

## 1. Цел
Да създадем малък, но реално работещ сайт за времето, който може да бъде деплойнат онлайн още в първата версия.

**Работно име:** WeatherNow  
**Подход:** първо MVP, после постепенно разширяване.

## 2. MVP функционалност
- Търсене на град по име.
- Показване на текущо време.
- Прогноза за 7 дни.
- Loading state.
- Error state.
- Responsive layout.

## 3. Технологии
- React
- TypeScript
- Vite
- Open-Meteo API
- Vercel или Netlify за deployment

Backend не е нужен в първата версия.

## 4. Milestones

| Milestone | Цел | Готово когато... |
|---|---|---|
| M1 — Basic working app | Сайтът работи локално | Можеш да напишеш град и да видиш реална прогноза |
| M2 — Better UX | По-добър интерфейс | Сайтът изглежда добре на телефон и desktop |
| M3 — Deployment | Сайтът е онлайн | Имаш публичен URL |
| M4 — Portfolio quality | Проектът изглежда професионално | Има README, screenshots, tests и GitHub Actions |

## 5. От къде да започнеш
1. Създай нов Vite React + TypeScript проект.
2. Стартирай го локално.
3. Изчисти default UI-a.
4. Направи прост layout: header, search поле, weather секция.
5. Създай models: Location и Weather.
6. Създай api/geocodingApi.ts и първо направи само city search.
7. След това добави weatherApi.ts и current weather.
8. Накрая добави DailyForecast компонент.

## 6. Команди за старт
```bash
npm create vite@latest weather-app -- --template react-ts
cd weather-app
npm install
npm run dev
```

## 7. Първи backlog

| ID | Task | Definition of Done |
|---|---|---|
| TASK-001 | Create Vite React TypeScript project | Project runs locally with npm run dev |
| TASK-002 | Clean default app UI | Page has header, search area and empty weather content area |
| TASK-003 | Create Location model | Location type includes id/name/country/latitude/longitude |
| TASK-004 | Create geocoding API client | Can search city and return list of locations |
| TASK-005 | Create SearchBox component | User can type city and submit search |
| TASK-006 | Create weather API client | Can fetch current weather for latitude/longitude |
| TASK-007 | Create CurrentWeatherCard | Displays current weather data |
| TASK-008 | Add error/loading states | UI shows loading and friendly errors |
| TASK-009 | Create DailyForecast component | Displays 7-day forecast |
| TASK-010 | Prepare first deployment | Production build succeeds with npm run build |

## 8. Първи checkpoint
**Мога да търся Varna и да получа latitude/longitude.**

Това е първата реална цел. След нея добавяме weather data и визуализация.
