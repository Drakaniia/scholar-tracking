export interface ChangedField {
  key: string;
  label: string;
  before: string;
  after: string;
}

type FieldLabels<T extends Record<string, unknown>> = Partial<Record<keyof T, string>>;

function normalizeValue(value: unknown): unknown {
  if (value === undefined || value === null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

function formatValue(value: unknown): string {
  const normalized = normalizeValue(value);

  if (normalized === '') {
    return 'Blank';
  }

  if (Array.isArray(normalized)) {
    return normalized.map(formatValue).join(', ');
  }

  return String(normalized);
}

function valuesMatch(left: unknown, right: unknown) {
  return JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));
}

export function getChangedFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  labels: FieldLabels<T>
): ChangedField[] {
  return Object.keys(labels).flatMap((key) => {
    const fieldKey = key as keyof T;

    if (valuesMatch(before[fieldKey], after[fieldKey])) {
      return [];
    }

    return [
      {
        key,
        label: labels[fieldKey] || key,
        before: formatValue(before[fieldKey]),
        after: formatValue(after[fieldKey]),
      },
    ];
  });
}

export function hasChangedFields(changes: readonly ChangedField[]) {
  return changes.length > 0;
}
