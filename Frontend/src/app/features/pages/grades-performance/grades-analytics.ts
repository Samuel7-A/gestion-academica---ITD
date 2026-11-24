/** Estadísticas puras construidas a partir del gradebook de FastAPI.
 *  La API no ofrece fecha de examen ni ponderación por actividad; nunca se inventan.
 *  Datos académicos exclusivamente sintéticos en el prototipo.
 */
export interface AcademicActivity {
  id: string;
  title: string;
  bimester: number;
}

export interface AcademicStudent {
  student_id: string;
  grades: ReadonlyArray<{ activity_id: string; value: number; updated_at?: string | null }>;
  bimester_averages?: Partial<Record<'bimester_1' | 'bimester_2' | 'bimester_3' | 'bimester_4', number | null>>;
  current_average?: number | null;
}

export interface ActivityStatRow {
  periodName: string;
  activityType: string;
  date: string; // Última actualización de una calificación; no fecha del examen.
  grade: string; // Media real de notas registradas, no una nota ficticia.
  weight: string; // Cobertura: estudiantes calificados / estudiantes de la sección.
  status: 'Con notas' | 'Sin notas';
}

export interface BimesterSummary {
  bimesterNumber: number;
  totalActivities: number;
  averageScore: string;
  statusLabel: string;
  progressPercentage: number;
}

export interface AcademicSummary {
  activities: ActivityStatRow[];
  bimesters: BimesterSummary[];
  totalStudents: number;
  totalActivities: number;
  studentsWithAverage: number;
  gradesRecorded: number;
  overallAverage: string;
}

function validGrade(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 20;
}

function mean(numbers: number[]): number | null {
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
}

function latestDate(grades: Array<{ updated_at?: string | null }>): string {
  const times = grades
    .map(g => g.updated_at ? Date.parse(g.updated_at) : NaN)
    .filter(Number.isFinite);
  if (!times.length) return '—';
  return new Date(Math.max(...times)).toLocaleDateString('es-PE');
}

export function analyzeGradebook(
  activities: ReadonlyArray<AcademicActivity>,
  students: ReadonlyArray<AcademicStudent>
): AcademicSummary {
  const validActivities = activities.filter(a => a && typeof a.id === 'string');
  const activityIds = new Set(validActivities.map(a => a.id));
  const activityRows: ActivityStatRow[] = validActivities.map(activity => {
    const recorded = students.flatMap(student => (student.grades || []).filter(g =>
      g.activity_id === activity.id && validGrade(g.value)
    ));
    const average = mean(recorded.map(g => g.value));
    return {
      periodName: `Bimestre ${activity.bimester}`,
      activityType: activity.title || 'Actividad sin título',
      date: latestDate(recorded),
      grade: average === null ? '—' : average.toFixed(2),
      weight: `${recorded.length}/${students.length}`,
      status: average === null ? 'Sin notas' : 'Con notas'
    };
  });

  const bimesters: BimesterSummary[] = Array.from({ length: 4 }, (_, index) => {
    const bimesterNumber = index + 1;
    const key = `bimester_${bimesterNumber}` as keyof NonNullable<AcademicStudent['bimester_averages']>;
    const values = students.map(s => s.bimester_averages?.[key]).filter(validGrade);
    const average = mean(values);
    return {
      bimesterNumber,
      totalActivities: validActivities.filter(a => a.bimester === bimesterNumber).length,
      averageScore: average === null ? '—' : average.toFixed(2),
      statusLabel: average === null ? 'Sin notas registradas' : `${values.length}/${students.length} estudiantes con notas`,
      progressPercentage: average === null ? 0 : Math.round(average / 20 * 100)
    };
  });

  const currentAverages = students.map(s => s.current_average).filter(validGrade);
  const overall = mean(currentAverages);
  const gradesRecorded = students.reduce((count, student) => count + (student.grades || []).filter(g =>
    activityIds.has(g.activity_id) && validGrade(g.value)
  ).length, 0);
  return {
    activities: activityRows,
    bimesters,
    totalStudents: students.length,
    totalActivities: validActivities.length,
    studentsWithAverage: currentAverages.length,
    gradesRecorded,
    overallAverage: overall === null ? '—' : overall.toFixed(2)
  };
}
