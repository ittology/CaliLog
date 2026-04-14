// pre-built calisthenics progression templates
// users can use these as starting points
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutPlan } from '../types';

export function createDefaultPlans(): WorkoutPlan[] {
  const now = new Date().toISOString();

  return [
    // first pullup program
    {
      id: uuidv4(),
      name: 'Get Your First Pullup',
      createdAt: now,
      updatedAt: now,
      exercises: [
        {
          id: uuidv4(),
          progressions: [
            { 
              id: uuidv4(), 
              name: 'Dead Hang', 
              targetSets: 3, 
              targetValue: 30, 
              unit: 'seconds', 
              notes: 'Grip the bar tight. Shoulders away from ears. Build fundamental grip and shoulder stability.' 
            },
            { 
              id: uuidv4(), 
              name: 'Scapular Pullups', 
              targetSets: 3, 
              targetValue: 10, 
              unit: 'reps', 
              notes: 'Pull shoulders down without bending elbows. This teaches the initial phase of the pullup.' 
            },
            { 
              id: uuidv4(), 
              name: 'Negative Pullups', 
              targetSets: 3, 
              targetValue: 5, 
              unit: 'reps', 
              notes: 'Jump to the top and lower yourself as slowly as possible (aim for 5 seconds).' 
            },
            { 
              id: uuidv4(), 
              name: 'The Pullup', 
              targetSets: 3, 
              targetValue: 8, 
              unit: 'reps', 
              notes: 'Congratulations! Full range of motion: chin over bar, full extension at the bottom.',
            },
          ],
        },
      ],
    },

    // basic full body workout
    {
      id: uuidv4(),
      name: 'Full Body Basics',
      createdAt: now,
      updatedAt: now,
      exercises: [
        {
          id: uuidv4(), // push
          progressions: [
            { 
              id: uuidv4(), 
              name: 'Pushups', 
              targetSets: 3, 
              targetValue: 15, 
              unit: 'reps', 
              notes: 'Keep your body as straight as a plank. Elbows tucked in slightly.',
              videoUrl: 'https://youtube.com/shorts/pKZ-lkKKMws?si=bRSN0aysJPNEhgDT'
            },
          ],
        },
        {
          id: uuidv4(), // pull
          progressions: [
            { 
              id: uuidv4(), 
              name: 'Pullups', 
              targetSets: 3, 
              targetValue: 8, 
              unit: 'reps', 
              notes: 'Full range of motion. Chin over the bar and full extension at the bottom.' 
            },
          ],
        },
        {
          id: uuidv4(), // legs
          progressions: [
            { 
              id: uuidv4(), 
              name: 'Squats', 
              targetSets: 3, 
              targetValue: 20, 
              unit: 'reps', 
              notes: 'Heels flat on the floor. Go as deep as possible.',
            },
          ],
        },
      ],
    },
  ];
}
