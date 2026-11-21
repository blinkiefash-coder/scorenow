export type PortalId = 'admin' | 'superadmin' | 'partner' | 'employee'

export type PortalConfig = {
  id: PortalId
  path: string
  roles: string[]
  title: string
  badge: string
  subtitle: string
  idLabel: string
  idPlaceholder: string
  headline: string
  description: string
  stats: Array<{ value: string; label: string }>
  footer: string
}

export const portals: Record<PortalId, PortalConfig> = {
  admin: {
    id: 'admin',
    path: '/admin',
    roles: ['manager'],
    title: 'Administrator sign in',
    badge: '🛡️ Secure operations · Admin access',
    subtitle: 'Use your admin email or ID, password and PIN.',
    idLabel: 'Administrator email or ID',
    idPlaceholder: 'admin@scorenow.in',
    headline: 'Private workspace for secure operations.',
    description: 'Manage users, partners, permissions and system activity from one protected administrator console.',
    stats: [{ value: 'Users', label: 'Roles & access' }, { value: 'Audit', label: 'Activity logs' }, { value: 'Security', label: 'Controls' }],
    footer: '🔒 Admin sessions are monitored',
  },
  superadmin: {
    id: 'superadmin',
    path: '/superadmin',
    roles: ['owner'],
    title: 'Super Admin sign in',
    badge: '👑 Highest-level access · Restricted',
    subtitle: 'Use your super admin email or ID, password and PIN.',
    idLabel: 'Super Admin email or ID',
    idPlaceholder: 'superadmin@scorenow.in',
    headline: 'Full control, with the strongest protection.',
    description: 'Oversee administrators, system settings, billing and security policies from the master control console.',
    stats: [{ value: 'Admins', label: 'Manage & assign' }, { value: 'Policies', label: 'System rules' }, { value: 'Audit', label: 'Full logs' }],
    footer: '🔒 Super admin sessions are monitored',
  },
  partner: {
    id: 'partner',
    path: '/partner',
    roles: ['partner'],
    title: 'Partner sign in',
    badge: '🔒 Secure partner access',
    subtitle: 'Use your partner email or ID, password and PIN.',
    idLabel: 'Partner email or ID',
    idPlaceholder: 'partner@yourcompany.com',
    headline: 'Grow your credit business with confidence.',
    description: 'Track referrals, manage clients and view earnings in one secure workspace built for our partners.',
    stats: [{ value: 'Leads', label: 'Submit & track' }, { value: 'Status', label: 'Live progress' }, { value: '24/7', label: 'Secure access' }],
    footer: '🔒 Partner sessions are protected',
  },
  employee: {
    id: 'employee',
    path: '/employee',
    roles: ['agent', 'support', 'analyst'],
    title: 'Employee sign in',
    badge: '🔒 Secure employee access',
    subtitle: 'Use your employee ID or work email, password and PIN.',
    idLabel: 'Employee ID or work email',
    idPlaceholder: 'EMP1024 or name@scorenow.in',
    headline: 'Your team workspace, all in one secure place.',
    description: 'Manage customer cases, track tasks and collaborate with your team through one protected employee portal.',
    stats: [{ value: 'Cases', label: 'Track & update' }, { value: 'Reports', label: 'Daily insights' }, { value: 'Support', label: 'Internal help' }],
    footer: '🔒 Employee sessions are protected',
  },
}

export const portalForPath = (pathname: string): PortalConfig | null =>
  Object.values(portals).find((portal) => portal.path === pathname) ?? null

export const portalForRole = (role?: string): PortalConfig =>
  Object.values(portals).find((portal) => role && portal.roles.includes(role)) ?? portals.admin
