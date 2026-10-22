INSERT INTO "permissions" (
    "id", "name", "description", "slug", "isSystem", "createdAt", "updatedAt"
)
VALUES
    (gen_random_uuid(), 'Ver documentos clínicos', 'Consultar e descarregar documentos gerados.', 'documents.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Gerir documentos clínicos', 'Gerar justificativos de falta e termos de responsabilidade.', 'documents.manage', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Ver finanças da clínica', 'Consultar indicadores e movimentos financeiros da sucursal.', 'finances.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP,
    "deletedAt" = NULL;

INSERT INTO "role_permissions" (
    "id", "roleId", "permissionId", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    roles."id",
    permissions."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "roles" roles
JOIN "permissions" permissions
    ON permissions."slug" IN ('documents.read', 'documents.manage')
WHERE roles."slug" IN ('admin', 'doctor', 'nurse', 'secretary')
ON CONFLICT ("roleId", "permissionId") DO UPDATE
SET "deletedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" (
    "id", "roleId", "permissionId", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    roles."id",
    permissions."id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "roles" roles
JOIN "permissions" permissions
    ON permissions."slug" = 'finances.read'
WHERE roles."slug" IN ('admin', 'secretary')
ON CONFLICT ("roleId", "permissionId") DO UPDATE
SET "deletedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;
