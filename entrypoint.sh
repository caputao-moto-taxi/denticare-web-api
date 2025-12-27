# entrypoint.sh
#!/bin/sh
set -e  # Interrompe em caso de erro

npx prisma generate
npx prisma migrate deploy
exec npm run start  # Usa 'exec' para garantir que o Node seja o processo principal
