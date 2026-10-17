import { isSpecificationRubric, type Criterion, type Reflection } from './domain.ts';
import { finalReview } from './progress.ts';

export function reviewDecision(value: unknown): 'final' | 'returned' {
  if (value !== 'final' && value !== 'returned') throw new Error('Chọn xác nhận điểm hoặc trả bài chỉnh sửa.');
  return value;
}

export function initialLecturerReview(reflection: Reflection, rubric: Criterion[]) {
  const prior = finalReview(reflection);
  const matching = prior && prior.scoreScale===10 && isSpecificationRubric(prior.rubric) && JSON.stringify(prior.rubric) === JSON.stringify(rubric);
  return {
    scores: matching ? [...prior.scores] as (number | null)[] : rubric.map(() => null as number | null),
    level: matching ? prior.level : null,
    comment: prior?.comment || '',
  };
}

export function canAssess(reflection: Reflection, userId: string, versionId: string) {
  return reflection.userId !== userId && ['submitted', 'final'].includes(reflection.status) && reflection.latestVersion === versionId;
}
