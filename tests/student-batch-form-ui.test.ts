import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const batchFormSource = readFileSync(
  join(process.cwd(), 'src/components/forms/student-batch-form.tsx'),
  'utf8'
);
const studentFormSource = readFileSync(
  join(process.cwd(), 'src/components/forms/student-form.tsx'),
  'utf8'
);

describe('student batch form UI', () => {
  it('keeps Add More Student as a non-submit action', () => {
    expect(batchFormSource).toContain('type="button"');
    expect(batchFormSource).toContain('onClick={addEntry}');
    expect(batchFormSource).toContain('Add More Student');
  });

  it('renders embedded student entries without their own form submit root', () => {
    expect(studentFormSource).toContain("const FormRoot = embedded ? 'div' : 'form'");
    expect(studentFormSource).toContain(
      'onSubmit={embedded ? undefined : form.handleSubmit(handleFormSubmit)}'
    );
  });
});
