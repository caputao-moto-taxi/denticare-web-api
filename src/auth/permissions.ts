import { SetMetadata } from '@nestjs/common';
import { AuthUser } from './auth-user';

export const PERMISSION_METADATA_KEY = 'requiredPermissions';

export const PERMISSION_CATALOG = [
  {
    slug: 'dashboard.view',
    name: 'Ver dashboard',
    description: 'Aceder ao dashboard.',
  },
  {
    slug: 'dashboard.full',
    name: 'Ver dashboard completo',
    description: 'Ver indicadores globais e financeiros do dashboard.',
  },
  {
    slug: 'appointments.read.all',
    name: 'Ver todos os agendamentos',
    description: 'Consultar os agendamentos da sucursal.',
  },
  {
    slug: 'appointments.read.assigned',
    name: 'Ver consultas atribuídas',
    description: 'Consultar apenas as consultas atribuídas ao utilizador.',
  },
  {
    slug: 'appointments.create',
    name: 'Criar agendamentos',
    description: 'Criar novos agendamentos.',
  },
  {
    slug: 'appointments.manage',
    name: 'Gerir agendamentos',
    description: 'Alterar, remarcar, concluir ou cancelar agendamentos.',
  },
  {
    slug: 'patients.read',
    name: 'Ver pacientes',
    description: 'Consultar os registos dos pacientes.',
  },
  {
    slug: 'patients.contacts.read',
    name: 'Ver contactos dos pacientes',
    description:
      'Consultar telefone, email, endereço e contacto de emergência.',
  },
  {
    slug: 'patients.clinical.read',
    name: 'Ver dados clínicos',
    description: 'Consultar notas, diagnósticos, exames e dados clínicos.',
  },
  {
    slug: 'patients.clinical.write',
    name: 'Editar dados clínicos',
    description: 'Registar ou alterar informações clínicas.',
  },
  {
    slug: 'patients.financial.read',
    name: 'Ver dados financeiros dos pacientes',
    description:
      'Consultar movimentos, saldos e recibos financeiros dos pacientes.',
  },
  {
    slug: 'patients.financial.write',
    name: 'Registar pagamentos dos pacientes',
    description: 'Registar movimentos financeiros dos pacientes.',
  },
  {
    slug: 'patients.manage',
    name: 'Gerir pacientes',
    description: 'Criar, editar e remover registos de pacientes.',
  },
  {
    slug: 'chat.read',
    name: 'Aceder ao chat',
    description: 'Consultar conversas e contactos do chat.',
  },
  {
    slug: 'chat.send',
    name: 'Enviar mensagens',
    description: 'Criar conversas e enviar mensagens.',
  },
  {
    slug: 'stock.read',
    name: 'Ver stock',
    description: 'Consultar o stock disponível para venda.',
  },
  {
    slug: 'stock.sell',
    name: 'Vender artigos do stock',
    description: 'Registar vendas e baixar artigos do stock.',
  },
  {
    slug: 'stock.manage',
    name: 'Gerir stock',
    description: 'Criar, editar, repor e remover artigos do stock.',
  },
  {
    slug: 'doctors.read',
    name: 'Ver médicos',
    description: 'Consultar a lista de médicos.',
  },
  {
    slug: 'doctors.manage',
    name: 'Gerir médicos',
    description: 'Criar, editar e remover médicos.',
  },
] as const;

export type PermissionSlug = (typeof PERMISSION_CATALOG)[number]['slug'];

export const RequirePermissions = (...permissions: PermissionSlug[]) =>
  SetMetadata(PERMISSION_METADATA_KEY, permissions);

export function resolvePermissions(
  role: string,
  rolePermissions: string[],
  userOverrides: { slug: string; granted: boolean }[],
) {
  if (role === 'admin' || role === 'administrator') {
    return PERMISSION_CATALOG.map(({ slug }) => slug);
  }

  const effective = new Set(rolePermissions);
  for (const override of userOverrides) {
    if (override.granted) effective.add(override.slug);
    else effective.delete(override.slug);
  }
  return PERMISSION_CATALOG.filter(({ slug }) => effective.has(slug)).map(
    ({ slug }) => slug,
  );
}

export function hasPermission(user: AuthUser, permission: PermissionSlug) {
  return (
    user.role === 'admin' ||
    user.role === 'administrator' ||
    user.permissions?.includes(permission) === true
  );
}
