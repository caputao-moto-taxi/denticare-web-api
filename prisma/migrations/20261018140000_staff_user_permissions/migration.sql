CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_permissions_userId_permissionId_key"
ON "user_permissions"("userId", "permissionId");

ALTER TABLE "user_permissions"
ADD CONSTRAINT "user_permissions_permissionId_fkey"
FOREIGN KEY ("permissionId") REFERENCES "permissions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_permissions"
ADD CONSTRAINT "user_permissions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "name", "description", "slug", "isSystem", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'Ver dashboard', 'Aceder ao dashboard.', 'dashboard.view', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver dashboard completo', 'Ver indicadores globais e financeiros do dashboard.', 'dashboard.full', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver todos os agendamentos', 'Consultar os agendamentos da sucursal.', 'appointments.read.all', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver consultas atribuídas', 'Consultar apenas as consultas atribuídas ao utilizador.', 'appointments.read.assigned', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Criar agendamentos', 'Criar novos agendamentos.', 'appointments.create', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Gerir agendamentos', 'Alterar, remarcar, concluir ou cancelar agendamentos.', 'appointments.manage', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver pacientes', 'Consultar os registos dos pacientes.', 'patients.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver contactos dos pacientes', 'Consultar telefone, email, endereço e contacto de emergência.', 'patients.contacts.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver dados clínicos', 'Consultar notas, diagnósticos, exames e dados clínicos.', 'patients.clinical.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Editar dados clínicos', 'Registar ou alterar informações clínicas.', 'patients.clinical.write', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver dados financeiros dos pacientes', 'Consultar movimentos, saldos e recibos financeiros dos pacientes.', 'patients.financial.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Registar pagamentos dos pacientes', 'Registar movimentos financeiros dos pacientes.', 'patients.financial.write', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Gerir pacientes', 'Criar, editar e remover registos de pacientes.', 'patients.manage', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Aceder ao chat', 'Consultar conversas e contactos do chat.', 'chat.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Enviar mensagens', 'Criar conversas e enviar mensagens.', 'chat.send', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver stock', 'Consultar o stock disponível para venda.', 'stock.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Gerir stock', 'Criar, editar, repor e remover artigos do stock.', 'stock.manage', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver médicos', 'Consultar a lista de médicos.', 'doctors.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Gerir médicos', 'Criar, editar e remover médicos.', 'doctors.manage', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP,
    "deletedAt" = NULL;

INSERT INTO "roles" ("id", "name", "description", "slug", "isSystem", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'Administrator', 'Clinic administrator', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Doctor', 'Clinic doctor', 'doctor', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Nurse', 'Clinic nurse', 'nurse', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Secretary', 'Clinic secretary', 'secretary', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET "deletedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), roles."id", permissions."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "roles" roles
CROSS JOIN "permissions" permissions
WHERE roles."slug" = 'admin'
ON CONFLICT ("roleId", "permissionId") DO UPDATE
SET "deletedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), roles."id", permissions."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "roles" roles
JOIN "permissions" permissions
    ON permissions."slug" IN (
        'dashboard.view',
        'appointments.read.assigned',
        'patients.read',
        'patients.clinical.read',
        'patients.clinical.write',
        'chat.read',
        'chat.send',
        'doctors.read'
    )
WHERE roles."slug" IN ('doctor', 'nurse')
ON CONFLICT ("roleId", "permissionId") DO UPDATE
SET "deletedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), roles."id", permissions."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "roles" roles
JOIN "permissions" permissions
    ON permissions."slug" IN (
        'dashboard.view',
        'appointments.read.all',
        'appointments.create',
        'appointments.manage',
        'patients.read',
        'patients.contacts.read',
        'chat.read',
        'chat.send',
        'stock.read',
        'doctors.read'
    )
WHERE roles."slug" = 'secretary'
ON CONFLICT ("roleId", "permissionId") DO UPDATE
SET "deletedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;
