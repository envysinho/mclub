const ROLE_LABELS = {
  SUDO: "sudo",
  ADMIN: "admin",
  USER: "user",
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? role?.toLowerCase?.() ?? "";
}

export { ROLE_LABELS };
