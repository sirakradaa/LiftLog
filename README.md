# LiftLog

A personal workout tracker modeled on [Strong](https://www.strong.app/), built with Expo (React Native + TypeScript) so it runs on Android and iOS from one codebase. Data lives on the phone in SQLite; the schema (UUIDs, `updated_at`, soft deletes) is ready for a cloud sync layer later.

This is the exact app that I wanted for my workouts. Here is the [watch companion app](https://github.com/sirakradaa/LiftLog-watch).

## Run it on your phone

1. Install [Node.js LTS](https://nodejs.org/) and, on the phone, **Expo Go** from the Play Store.
2. In this folder:
   ```powershell
     npm install
     npx expo install --fix   # aligns native package versions with the installed Expo SDK
     npx expo start
   ```
3. Scan the QR code with Expo Go (phone and PC on the same Wi-Fi; use `npx expo start --tunnel` otherwise).

If Expo Go says the project's SDK is unsupported, upgrade to the SDK Expo Go supports:
`npx expo install expo@latest` then `npx expo install --fix`.

To install it as a real standalone app later: `npx eas build -p android --profile preview` (free Expo account) produces an APK.

## Features (Strong parity)

- **Workout logging**: empty or from template; per-set weight / reps / time / distance; "Previous" column (tap to copy); tap ✓ on an empty set to fill from last time; warm-up / drop / failure sets; RPE; supersets; per-exercise and per-workout notes; pinned exercise notes (machine settings, cues).
- **Rest timer**: auto-starts on set completion (per-exercise or default duration), ±15s / skip, notification + vibration when done, waits until the end of a superset round.
- **Templates**: unlimited, organized in folders, duplicate, start, edit; offer to update the template after finishing.
- **History**: every workout with duration, volume, sets; edit, delete, repeat, save as template.
- **Exercises**: ~110 built-ins with Strong's naming, custom exercises, search, body-part filter, history, charts (est. 1RM, heaviest weight, volume, reps, duration, distance), records and rep maxes.
- **PR detection** after each workout.
- **Measurements**: bodyweight, body fat, calories, 15 body parts, with charts.
- **Tools**: plate calculator, warm-up calculator, 1RM calculator.
- **Units**: lb / kg, switchable any time without data loss.
- **Data**: JSON backup and restore, Strong-format CSV export, **import your Strong CSV export**.

## Fixes for complaints in Strong's App Store / Play Store reviews

| Complaint | LiftLog |
| --- | --- |
| Can't log a workout after the fact | History → **+** logs a past workout with date, time, duration |
| Can't reopen / merge a finished workout | Workout → ⋯ → **Resume / continue this workout** (timer continues from the saved duration) |
| Weight + duration (weighted plank) not allowed | Exercises can track any combination of weight, reps, time, distance |
| Can't convert data between exercise types | Edit exercise → swap recorded reps ↔ time; **merge** one exercise into another |
| Custom exercises can only be hidden, not deleted; can't unhide | Delete when unused; hidden filter on the Exercises tab with unhide |
| Can't rename built-in exercises | All exercises are renamable (history is linked by ID) |
| Categories limited to body parts | Separate movement-pattern field (push, pull, squat, hinge, lunge, carry, core…) |
| Plate calculator only offers fixed bar weights | Custom bars (e.g. 25 lb Smith machine) and custom plate sets, toggle missing plates |
| Can't duplicate a single exercise (Android) | Exercise menu → Duplicate exercise; set menu → Duplicate set |
| Replacing an exercise erases its notes | Replace keeps sets and notes |
| Free tier limited to 3 templates | No limits, no subscription |
| Can't pause the workout timer | Pause / resume under the workout name |
| No calorie estimate | MET-based estimate on each workout (needs a bodyweight entry) |
| Losing an in-progress workout on crash | Active workout is written to the database on every change |

## Project layout

```
app/                  screens (expo-router file-based routes)
  (tabs)/             Profile, History, Workout, Exercises, Measure
  active.tsx          in-progress workout
  workout/[id].tsx    workout detail / edit / log past workout
  template/[id].tsx   template editor
  exercise/           exercise detail and editor
  measure/[kind].tsx  measurement log + chart
  tools/              plate, warm-up, 1RM calculators
src/
  db/                 SQLite schema + migrations
  repo/               data access (exercises, workouts, templates, measurements)
  store/              zustand stores (settings, active workout)
  components/         WorkoutEditor, ExercisePicker, charts, UI kit
  lib/                units, calculations, backup/import/export, notifications
```
