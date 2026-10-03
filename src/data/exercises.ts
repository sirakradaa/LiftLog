import type { Field } from '@/types';

export const BODY_PARTS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body', 'Cardio', 'Other'];
export const PATTERNS = ['Push', 'Pull', 'Squat', 'Hinge', 'Lunge', 'Carry', 'Core', 'Isolation', 'Cardio', 'Mobility', 'Other'];
export const EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Assisted',
  'Weighted',
  'Kettlebell',
  'Band',
  'Smith Machine',
  'EZ Bar',
  'Trap Bar',
  'Other',
];
export const FIELD_LABELS: Record<Field, string> = {
  weight: 'Weight',
  reps: 'Reps',
  duration: 'Time',
  distance: 'Distance',
};

type Seed = [name: string, bodyPart: string, pattern: string, equipment: string, fields?: Field[]];

const WR: Field[] = ['weight', 'reps'];
const R: Field[] = ['reps'];
const T: Field[] = ['duration'];
const WT: Field[] = ['weight', 'duration'];
const DT: Field[] = ['distance', 'duration'];
const WD: Field[] = ['weight', 'distance'];

export const SEED_EXERCISES: Seed[] = [
  ['Bench Press (Barbell)', 'Chest', 'Push', 'Barbell', WR],
  ['Bench Press (Dumbbell)', 'Chest', 'Push', 'Dumbbell', WR],
  ['Bench Press (Smith Machine)', 'Chest', 'Push', 'Smith Machine', WR],
  ['Incline Bench Press (Barbell)', 'Chest', 'Push', 'Barbell', WR],
  ['Incline Bench Press (Dumbbell)', 'Chest', 'Push', 'Dumbbell', WR],
  ['Decline Bench Press (Barbell)', 'Chest', 'Push', 'Barbell', WR],
  ['Chest Press (Machine)', 'Chest', 'Push', 'Machine', WR],
  ['Chest Fly (Dumbbell)', 'Chest', 'Isolation', 'Dumbbell', WR],
  ['Chest Fly (Machine)', 'Chest', 'Isolation', 'Machine', WR],
  ['Cable Crossover', 'Chest', 'Isolation', 'Cable', WR],
  ['Push Up', 'Chest', 'Push', 'Bodyweight', R],
  ['Chest Dip', 'Chest', 'Push', 'Bodyweight', R],
  ['Chest Dip (Assisted)', 'Chest', 'Push', 'Assisted', WR],

  ['Deadlift (Barbell)', 'Back', 'Hinge', 'Barbell', WR],
  ['Deadlift (Trap Bar)', 'Back', 'Hinge', 'Trap Bar', WR],
  ['Bent Over Row (Barbell)', 'Back', 'Pull', 'Barbell', WR],
  ['Bent Over Row (Dumbbell)', 'Back', 'Pull', 'Dumbbell', WR],
  ['Pendlay Row (Barbell)', 'Back', 'Pull', 'Barbell', WR],
  ['T Bar Row', 'Back', 'Pull', 'Machine', WR],
  ['Seated Row (Cable)', 'Back', 'Pull', 'Cable', WR],
  ['Seated Row (Machine)', 'Back', 'Pull', 'Machine', WR],
  ['Lat Pulldown (Cable)', 'Back', 'Pull', 'Cable', WR],
  ['Lat Pulldown (Machine)', 'Back', 'Pull', 'Machine', WR],
  ['Pull Up', 'Back', 'Pull', 'Bodyweight', R],
  ['Pull Up (Assisted)', 'Back', 'Pull', 'Assisted', WR],
  ['Pull Up (Weighted)', 'Back', 'Pull', 'Weighted', WR],
  ['Chin Up', 'Back', 'Pull', 'Bodyweight', R],
  ['Back Extension', 'Back', 'Hinge', 'Bodyweight', R],
  ['Good Morning (Barbell)', 'Back', 'Hinge', 'Barbell', WR],
  ['Shrug (Barbell)', 'Back', 'Isolation', 'Barbell', WR],
  ['Shrug (Dumbbell)', 'Back', 'Isolation', 'Dumbbell', WR],
  ['Face Pull (Cable)', 'Shoulders', 'Pull', 'Cable', WR],

  ['Overhead Press (Barbell)', 'Shoulders', 'Push', 'Barbell', WR],
  ['Overhead Press (Dumbbell)', 'Shoulders', 'Push', 'Dumbbell', WR],
  ['Shoulder Press (Machine)', 'Shoulders', 'Push', 'Machine', WR],
  ['Arnold Press (Dumbbell)', 'Shoulders', 'Push', 'Dumbbell', WR],
  ['Lateral Raise (Dumbbell)', 'Shoulders', 'Isolation', 'Dumbbell', WR],
  ['Lateral Raise (Cable)', 'Shoulders', 'Isolation', 'Cable', WR],
  ['Front Raise (Dumbbell)', 'Shoulders', 'Isolation', 'Dumbbell', WR],
  ['Reverse Fly (Dumbbell)', 'Shoulders', 'Isolation', 'Dumbbell', WR],
  ['Reverse Fly (Machine)', 'Shoulders', 'Isolation', 'Machine', WR],
  ['Upright Row (Barbell)', 'Shoulders', 'Pull', 'Barbell', WR],

  ['Bicep Curl (Barbell)', 'Arms', 'Isolation', 'Barbell', WR],
  ['Bicep Curl (Dumbbell)', 'Arms', 'Isolation', 'Dumbbell', WR],
  ['Bicep Curl (Cable)', 'Arms', 'Isolation', 'Cable', WR],
  ['EZ Bar Curl', 'Arms', 'Isolation', 'EZ Bar', WR],
  ['Hammer Curl (Dumbbell)', 'Arms', 'Isolation', 'Dumbbell', WR],
  ['Preacher Curl (Barbell)', 'Arms', 'Isolation', 'Barbell', WR],
  ['Concentration Curl (Dumbbell)', 'Arms', 'Isolation', 'Dumbbell', WR],
  ['Triceps Pushdown (Cable)', 'Arms', 'Isolation', 'Cable', WR],
  ['Triceps Extension (Dumbbell)', 'Arms', 'Isolation', 'Dumbbell', WR],
  ['Overhead Triceps Extension (Cable)', 'Arms', 'Isolation', 'Cable', WR],
  ['Skullcrusher (Barbell)', 'Arms', 'Isolation', 'Barbell', WR],
  ['Close Grip Bench Press (Barbell)', 'Arms', 'Push', 'Barbell', WR],
  ['Triceps Dip', 'Arms', 'Push', 'Bodyweight', R],
  ['Wrist Curl (Barbell)', 'Arms', 'Isolation', 'Barbell', WR],

  ['Squat (Barbell)', 'Legs', 'Squat', 'Barbell', WR],
  ['Front Squat (Barbell)', 'Legs', 'Squat', 'Barbell', WR],
  ['Squat (Smith Machine)', 'Legs', 'Squat', 'Smith Machine', WR],
  ['Goblet Squat (Kettlebell)', 'Legs', 'Squat', 'Kettlebell', WR],
  ['Hack Squat', 'Legs', 'Squat', 'Machine', WR],
  ['Leg Press', 'Legs', 'Squat', 'Machine', WR],
  ['Bulgarian Split Squat (Dumbbell)', 'Legs', 'Lunge', 'Dumbbell', WR],
  ['Lunge (Dumbbell)', 'Legs', 'Lunge', 'Dumbbell', WR],
  ['Walking Lunge (Dumbbell)', 'Legs', 'Lunge', 'Dumbbell', WR],
  ['Step Up (Dumbbell)', 'Legs', 'Lunge', 'Dumbbell', WR],
  ['Romanian Deadlift (Barbell)', 'Legs', 'Hinge', 'Barbell', WR],
  ['Romanian Deadlift (Dumbbell)', 'Legs', 'Hinge', 'Dumbbell', WR],
  ['Hip Thrust (Barbell)', 'Legs', 'Hinge', 'Barbell', WR],
  ['Glute Bridge', 'Legs', 'Hinge', 'Bodyweight', R],
  ['Leg Extension (Machine)', 'Legs', 'Isolation', 'Machine', WR],
  ['Lying Leg Curl (Machine)', 'Legs', 'Isolation', 'Machine', WR],
  ['Seated Leg Curl (Machine)', 'Legs', 'Isolation', 'Machine', WR],
  ['Hip Abductor (Machine)', 'Legs', 'Isolation', 'Machine', WR],
  ['Hip Adductor (Machine)', 'Legs', 'Isolation', 'Machine', WR],
  ['Standing Calf Raise (Machine)', 'Legs', 'Isolation', 'Machine', WR],
  ['Seated Calf Raise (Machine)', 'Legs', 'Isolation', 'Machine', WR],

  ['Plank', 'Core', 'Core', 'Bodyweight', T],
  ['Plank (Weighted)', 'Core', 'Core', 'Weighted', WT],
  ['Side Plank', 'Core', 'Core', 'Bodyweight', T],
  ['Crunch', 'Core', 'Core', 'Bodyweight', R],
  ['Cable Crunch', 'Core', 'Core', 'Cable', WR],
  ['Hanging Leg Raise', 'Core', 'Core', 'Bodyweight', R],
  ['Ab Wheel', 'Core', 'Core', 'Other', R],
  ['Russian Twist', 'Core', 'Core', 'Bodyweight', R],
  ['Dead Bug', 'Core', 'Core', 'Bodyweight', R],
  ['Pallof Press (Cable)', 'Core', 'Core', 'Cable', WR],

  ['Clean (Barbell)', 'Full Body', 'Hinge', 'Barbell', WR],
  ['Power Clean (Barbell)', 'Full Body', 'Hinge', 'Barbell', WR],
  ['Snatch (Barbell)', 'Full Body', 'Hinge', 'Barbell', WR],
  ['Clean and Jerk (Barbell)', 'Full Body', 'Hinge', 'Barbell', WR],
  ['Thruster (Barbell)', 'Full Body', 'Squat', 'Barbell', WR],
  ['Kettlebell Swing', 'Full Body', 'Hinge', 'Kettlebell', WR],
  ["Farmer's Walk", 'Full Body', 'Carry', 'Dumbbell', WD],
  ['Burpee', 'Full Body', 'Cardio', 'Bodyweight', R],

  ['Running', 'Cardio', 'Cardio', 'Other', DT],
  ['Running (Treadmill)', 'Cardio', 'Cardio', 'Machine', DT],
  ['Cycling', 'Cardio', 'Cardio', 'Other', DT],
  ['Cycling (Indoor)', 'Cardio', 'Cardio', 'Machine', DT],
  ['Rowing (Machine)', 'Cardio', 'Cardio', 'Machine', DT],
  ['Elliptical Trainer', 'Cardio', 'Cardio', 'Machine', DT],
  ['Stair Climber', 'Cardio', 'Cardio', 'Machine', T],
  ['Walking', 'Cardio', 'Cardio', 'Other', DT],
  ['Swimming', 'Cardio', 'Cardio', 'Other', DT],
  ['Jump Rope', 'Cardio', 'Cardio', 'Other', T],
  ['Stretching', 'Other', 'Mobility', 'Other', T],
];

export function builtinId(name: string): string {
  return 'builtin:' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
