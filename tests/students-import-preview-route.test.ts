import * as XLSX from 'xlsx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  student: {
    findFirst: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => authMock);

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

function createWorkbookFile(rows: Record<string, string>[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  return new File([buffer], 'students.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function createImportPreviewRequest(rows: Record<string, string>[]) {
  const formData = new FormData();
  formData.append('file', createWorkbookFile(rows));

  return new Request('http://localhost/api/students/import/preview', {
    method: 'POST',
    body: formData,
  });
}

describe('students import preview route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getSession.mockResolvedValue({ id: 1, role: 'ADMIN' });
    prismaMock.student.findFirst.mockResolvedValue(null);
  });

  it('does not treat a strand column as the student program', async () => {
    const { POST } = await import('@/app/api/students/import/preview/route');

    const response = await POST(
      createImportPreviewRequest([
        {
          firstName: 'Ana',
          lastName: 'Reyes',
          strand: 'STEM',
          gradeLevel: 'SENIOR_HIGH',
          yearLevel: 'Grade 11',
          status: 'Active',
        },
      ]) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.valid).toBe(0);
    expect(body.data.invalid).toBe(1);
    expect(body.data.errors[0].errors).toContain('program is required');
  });
});
