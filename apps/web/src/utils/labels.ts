// Turns stored values into the words the interface shows. Anything not listed
// falls back to sentence case, so a new value never leaks as `snake_case`.
const known: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  owner: "Owner",
  member: "Member",
  viewer: "Viewer",
  maintainer: "Maintainer",
  team_member: "Team member",
  team_admin: "Team admin",
  tenant_visible: "Organization visible",
  private: "Private",
  active: "Active",
  archived: "Archived",
  disabled: "Disabled",
  pending: "Pending",
  free: "Free",
  team: "Team",
  business: "Business",
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved"
};

export const humanize = (value?: string | null) => {
  if (!value) return "";
  if (known[value]) return known[value];
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
