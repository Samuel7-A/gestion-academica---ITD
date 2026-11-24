import { describe, expect, it } from 'vitest';
import { analyzeGradebook } from './grades-analytics';

const activities = [
  { id: 'A1', title: 'Examen 1', bimester: 1 },
  { id: 'A2', title: 'Examen 2', bimester: 2 }
];
const students = [
  {
    student_id: 'S1',
    grades: [{ activity_id: 'A1', value: 0, updated_at: '2026-11-21T10:00:00Z' }],
    bimester_averages: { bimester_1: 0, bimester_2: null },
    current_average: 0
  },
  {
    student_id: 'S2',
    grades: [{ activity_id: 'A1', value: 20, updated_at: '2026-11-22T10:00:00Z' }],
    bimester_averages: { bimester_1: 20, bimester_2: null },
    current_average: 20
  }
];

describe('estadísticas del gradebook, sin valores de relleno', () => {
  it('calcula promedios y cobertura a partir de notas registradas', () => {
    const s = analyzeGradebook(activities, students);
    expect(s.activities[0].grade).toBe('10.00');
    expect(s.activities[0].weight).toBe('2/2');
    expect(s.activities[0].status).toBe('Con notas');
    expect(s.overallAverage).toBe('10.00');
    expect(s.gradesRecorded).toBe(2);
    expect(s.totalStudents).toBe(2);
  });

  it('no confunde nota cero con nota ausente', () => {
    const s = analyzeGradebook(activities, students);
    expect(s.bimesters[0].averageScore).toBe('10.00');
    expect(s.bimesters[1].averageScore).toBe('—');
    expect(s.activities[1].grade).toBe('—');
    expect(s.activities[1].status).toBe('Sin notas');
  });

  it('conserva el estado vacío cuando todavía no hay notas', () => {
    const s = analyzeGradebook(activities, []);
    expect(s.overallAverage).toBe('—');
    expect(s.activities[0].weight).toBe('0/0');
    expect(s.bimesters[0].progressPercentage).toBe(0);
  });
});
