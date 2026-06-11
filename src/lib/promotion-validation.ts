type PromotionOperation = 'archive' | 'promote';

type PromotionState = {
  readonly isArchived: boolean;
  readonly status: string;
  readonly graduationStatus: string | null;
};

type PromotionTargetForBlocker =
  | { readonly action: 'PROMOTE' }
  | { readonly action: 'GRADUATE' }
  | { readonly action: 'RETAIN'; readonly reason: string }
  | { readonly action: 'SEPARATE'; readonly reason: string }
  | { readonly action: 'SKIP'; readonly reason: string };

function assertNever(value: never): never {
  throw new Error(`Unhandled promotion target action: ${JSON.stringify(value)}`);
}

function operationLabel(operation: PromotionOperation) {
  return operation === 'promote' ? 'promoted' : 'archived by promotion';
}

export function getPromotionStateBlocker(
  student: PromotionState,
  operation: PromotionOperation
): string | null {
  const label = operationLabel(operation);

  if (student.isArchived) {
    return `This student is archived and cannot be ${label}.`;
  }

  if (student.status !== 'Active') {
    return `This student has status "${student.status}" and cannot be ${label}.`;
  }

  if (student.graduationStatus && student.graduationStatus !== 'Active') {
    return `This student is ${student.graduationStatus} and cannot be ${label}.`;
  }

  return null;
}

export function getPromotionTargetBlocker(target: PromotionTargetForBlocker): string | null {
  switch (target.action) {
    case 'PROMOTE':
      return null;
    case 'GRADUATE':
      return 'This student is ready for graduation, not promotion to another academic level.';
    case 'RETAIN':
      return `${target.reason}. Retained students cannot be promoted to the next level.`;
    case 'SEPARATE':
      return `${target.reason}. Change the transition decision to continue if this student should be promoted.`;
    case 'SKIP':
      return target.reason;
    default:
      return assertNever(target);
  }
}
