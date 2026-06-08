export function isAdminRole(role?: string | null) {
  return role === 'ADMIN';
}

export function canManageStudentsAndScholarships(role?: string | null) {
  return role === 'ADMIN' || role === 'STAFF';
}

export function canManageStudentFees(role?: string | null) {
  return isAdminRole(role);
}
