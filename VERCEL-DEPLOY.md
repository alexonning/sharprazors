# Deploy na Vercel

O projeto Vercel é `sd-assessoria/sharprazors`. A configuração em
`vercel.json` compila com Next.js; o build Vinext usado no Render continua
disponível pelo comando `pnpm build`.

O Next.js resolve `@/db/runtime` para `db/runtime.node.ts`, que lê as
variáveis do servidor. Vinext continua usando o módulo Cloudflare.
O certificado público em `db/supabase-certificate.ts` corresponde ao
arquivo `db/supabase-prod-ca-2021.crt`; atualize ambos ao trocar o certificado.

Antes de usar a agenda, configure no painel da Vercel:

- `DATABASE_URL`: conexão existente do Supabase pelo Session Pooler, porta
  5432, com `sslmode=verify-full`.
- `DATABASE_SCHEMA`: `sharprazors` (também é o padrão para Supabase).

Use o mesmo banco de produção para preservar clientes, reservas e contas
administrativas. Não é necessário recriar o administrador.

Antes de publicar a versão com histórico dos agendamentos, aplique a migração
aditiva de `db/postgres.sql` com `node scripts/postgres-migrate.mjs`, usando
`DATABASE_URL` e `DATABASE_SCHEMA` do ambiente de destino. Se as variáveis
estiverem em um arquivo local, use `node --env-file=.env.local scripts/postgres-migrate.mjs`.
A Vercel não executa essa migração automaticamente. O script é transacional e
pode ser executado novamente depois da publicação.

Cada nova reserva guarda nome do serviço, duração, valor e nome do barbeiro,
além de cliente, telefone, data e horário. Alterações nos cadastros não mudam
esses dados. Reservas antigas mantêm a duração calculada pelos horários já
gravados e recebem uma cópia dos nomes disponíveis na migração. O valor antigo
não pode ser recuperado do catálogo atual: permanece como “Valor não registrado”.
Valores novos sob consulta continuam distintos de preço zero. O total gasto
no histórico soma apenas reservas finalizadas com valor registrado.

Para instalações SQLite/D1 que seguem as migrações Drizzle, a equivalente é
`drizzle/0005_booking_history.sql`. Ela também inclui status e barbeiros,
ausentes nas migrações SQLite anteriores. Instalações que adicionaram essas
estruturas manualmente precisam conciliar essas operações antes de aplicar o arquivo.

Depois de configurar as variáveis, publique com `vercel --prod` e confira
`/api/site`, `/api/barbers`, a disponibilidade e o acesso ao painel.
Arquivos de credenciais e estado local estão excluídos em `.vercelignore`.

As adaptações precisam estar no Git para que futuros deploys automáticos
do repositório usem a mesma configuração.
