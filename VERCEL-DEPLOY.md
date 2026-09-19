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
administrativas. Não é necessário recriar o administrador ou executar
migrações se esse banco já estiver configurado.

Depois de configurar as variáveis, publique com `vercel --prod` e confira
`/api/site`, `/api/barbers`, a disponibilidade e o acesso ao painel.
Arquivos de credenciais e estado local estão excluídos em `.vercelignore`.

As adaptações precisam estar no Git para que futuros deploys automáticos
do repositório usem a mesma configuração.
