# Sharp Razors — projeto completo

Projeto de agendamento com React, TypeScript, Vinext, Tailwind e Cloudflare D1.
Inclui a versão com máscara de telefone, animações e ícone do Instagram.

## Executar localmente

Instale Node.js 22.13 ou superior e pnpm 11.19.0. Abra o terminal na pasta extraída `sharp-razors`.

```sh
pnpm install --frozen-lockfile
pnpm build
```

Na primeira execução, crie as tabelas do banco local aplicando as migrações em ordem:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_modern_puppet_master.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_ordinary_the_executioner.sql
pnpm dev
```

Abra o endereço informado no terminal (normalmente http://localhost:5173).
Aplique as migrações uma única vez em cada banco local novo.
Para executar a versão compilada, use `pnpm start` após `pnpm build`.

## Painel administrativo (/admin)

Em `/admin` o administrador altera WhatsApp e telefone, horário de funcionamento, serviços (duração e valor), ausências em datas e horários específicos e a lista de telefones bloqueados (clientes que não podem agendar). As mudanças aparecem imediatamente no agendamento.

Depois de aplicar todas as migrações da pasta `drizzle/`, crie (ou redefina) o acesso:

```sh
node scripts/admin-user.mjs admin SuaSenhaForte
```

No Render, defina as variáveis `ADMIN_USERNAME` e `ADMIN_PASSWORD`; o acesso é criado apenas na primeira inicialização e a senha trocada pelo painel é mantida depois.

## Banco de dados em produção (Postgres)

Com `DATABASE_URL` definida, o site usa Postgres; sem ela, usa o D1 local (`pnpm dev`). As mesmas consultas SQL funcionam nos dois.

- `DATABASE_URL`: conexão do Postgres (no Render, use a URL interna).
- `DATABASE_SCHEMA` (opcional): schema próprio dentro de um banco compartilhado, por exemplo `sharprazors`.

Ao iniciar, `scripts/render-start.sh` executa `scripts/postgres-migrate.mjs`, que cria o schema, as tabelas (`db/postgres.sql`) e os dados padrão sem sobrescrever o que já existe. Alterações de estrutura precisam ser feitas em `db/schema.ts` (D1) e em `db/postgres.sql` (Postgres).

## Onde editar

- `app/page.tsx`: fluxo, conteúdo e ícones da página.
- `app/globals.css`: estilos, responsividade e animações.
- `lib/phone.ts`: máscara e validação de telefone.
- `lib/booking.ts`: serviços, durações e horários de atendimento.
- `app/api/`: consulta de clientes, disponibilidade e confirmação.
- `db/` e `drizzle/`: estrutura e migrações do banco.
- `public/logo.png`: logotipo.

## Observações

O ZIP contém o código-fonte e o esquema do banco; não contém registros de clientes ou reservas de produção, credenciais, dependências instaladas ou arquivos de compilação.
O banco local inicia vazio. A validação do telefone verifica formato e DDD, sem SMS ou WhatsApp.
Serviços e durações devem ser conferidos com a barbearia antes de uso comercial.
A configuração de hospedagem original está incluída para referência. Publicar fora do ambiente original exige configurar o Worker e a ligação ao seu banco D1; não é um site exclusivamente estático.
O README original contém detalhes adicionais do runtime.
