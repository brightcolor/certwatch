import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { teams, teamMemberships, tenantInvites, tenants, users } from "../apps/api/src/storage/repositories.js";
import { migrate } from "../apps/api/src/storage/db.js";

migrate();

const suffix = () => randomUUID().slice(0, 8);
const user = (prefix: string) => users.create(`${prefix}-${suffix()}@example.com`, "hash", "viewer");

describe("multi-tenant team access", () => {
  it("only adds team members that already belong to the tenant", () => {
    const owner = user("owner");
    const outsider = user("outsider");
    const tenant = tenants.create(`Tenant ${suffix()}`, owner.id);
    const team = teams.create(tenant.id, "Operations", "Private operations checks.", "private", owner.id);

    expect(teamMemberships.add(tenant.id, team.id, outsider.id, "team_member")).toBeNull();

    tenants.addMember(tenant.id, outsider.id, "viewer");
    const member = teamMemberships.add(tenant.id, team.id, outsider.id, "team_member");

    expect(member?.teamId).toBe(team.id);
    expect(teams.listForUser(tenant.id, outsider.id, "viewer").map((item) => item.id)).toContain(team.id);
  });

  it("keeps at least one active owner in each tenant and team", () => {
    const owner = user("owner");
    const tenant = tenants.create(`Tenant ${suffix()}`, owner.id);
    const team = teams.create(tenant.id, "Security", "Security checks.", "private", owner.id);

    expect(tenants.activeOwnerCount(tenant.id)).toBe(1);
    expect(teamMemberships.activeOwnerCount(tenant.id, team.id)).toBe(1);
  });

  it("accepts tenant invites with an initial team membership", () => {
    const owner = user("owner");
    const invited = user("invited");
    const tenant = tenants.create(`Tenant ${suffix()}`, owner.id);
    const team = teams.create(tenant.id, "Support", "Customer-facing checks.", "private", owner.id);
    const invite = tenantInvites.create(tenant.id, invited.email, "viewer", owner.id, team.id, "team_member");

    tenantInvites.accept(invite, invited.id);

    expect(tenants.forUser(invited.id).map((item) => item.tenantId)).toContain(tenant.id);
    expect(teamMemberships.get(tenant.id, team.id, invited.id)?.role).toBe("team_member");
  });
});
