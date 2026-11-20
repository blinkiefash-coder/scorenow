import type { TeamMember } from './AdminAccess'

// Kept in a non-component module so React fast refresh works for AdminAccess.tsx.
const STAFF_MODULE_COUNTS: Record<string, string[]> = {
  manager: ['overview', 'customers', 'reports', 'analytics', 'tickets', 'failed', 'health', 'audit', 'crm', 'content', 'monitor', 'assessments', 'ops'],
  support: ['customers', 'tickets', 'crm', 'assessments', 'ops'],
  analyst: ['customers', 'analytics', 'ops'],
}
const ROLE_NAMES: Record<string, string> = { owner: 'Super Admin', manager: 'Admin', support: 'Support', analyst: 'Analyst', partner: 'Partner', agent: 'Agent' }
const ABILITY_SHORT: Record<string, string> = { assign_agents: 'Assign customers', manage_agents: 'Manage agents' }

export const roleLabel = (role: string) => ROLE_NAMES[role] ?? role

export function accessSummary(member: TeamMember) {
  if (member.role === 'partner') {
    const abilities = member.permissions ?? ['assign_agents']
    return abilities.length ? abilities.map((ability) => ABILITY_SHORT[ability] ?? ability).join(' · ') : 'Portal only'
  }
  if (member.role === 'agent') return member.parent_email ? `Agent of ${member.parent_email}` : 'Assigned by Super Admin'
  const all = STAFF_MODULE_COUNTS[member.role] ?? []
  const modules = member.permissions ? all.filter((module) => member.permissions!.includes(module)) : all
  return `${modules.length}/${all.length} modules · ${member.customer_scope === 'assigned' ? 'assigned customers' : 'all customers'}`
}
