# Deploy com Supabase — spring-ia

O backend usa PostgreSQL (`pg`) e mantém as tabelas da barbearia no schema
`sharprazors`, separado das tabelas existentes do projeto `spring-ia`.
Não é necessário instalar o SDK do Supabase nem configurar chaves `anon`,
`publishable` ou `service_role`.

Conexão conferida no painel em 16/09/2026:

```dotenv
DATABASE_URL=...
DATABASE_SCHEMA=sharprazors
```

Substitua `ENCODED_DATABASE_PASSWORD` pela senha do PostgreSQL codificada para URL.

## Variáveis no serviço Docker do Render

| Variável | Valor | Necessidade |
| --- | --- | --- |
| `DATABASE_URL` | URI de **Connect → Session pooler**, porta **5432**, do projeto `spring-ia`, com a senha do banco e `?sslmode=verify-full` | Obrigatória |
| `DATABASE_SCHEMA` | `sharprazors` | Recomendada; padrão para hosts Supabase |
| `ADMIN_USERNAME` | Nome escolhido para acessar `/admin` | Necessária para criar o primeiro administrador |
| `ADMIN_PASSWORD` | Senha inicial do painel (recomenda-se 8 ou mais caracteres) | Necessária junto com `ADMIN_USERNAME` no primeiro início |
| `PORT` | Fornecida pelo Render; padrão `10000` | Não precisa cadastrar manualmente |

Cadastre os segredos em **Render → serviço → Environment**. Use `.env.example`
como referência, sem enviar arquivos com credenciais ao GitHub. A senha de
`DATABASE_URL` é a senha **do banco PostgreSQL**, diferente da senha da conta
Supabase e da senha de `/admin`. Caracteres especiais da senha devem ser
codificados para URL (por exemplo, `@` vira `%40`).

O painel pode mostrar `[YOUR-PASSWORD]`, sem revelar a senha atual. Nesse caso,
obtenha a senha existente com o responsável pelo banco. Redefini-la pode afetar
outros aplicativos que usam `spring-ia`.

Use o host e o usuário completos exibidos no painel, sem deduzir a região ou o
identificador do projeto. O Session Pooler permite IPv4 e mantém o `search_path`
da sessão. A porta 6543 (Transaction Pooler) não é suportada por esta configuração.
O projeto inclui o certificado raiz oficial mostrado em Database Settings → SSL
configuration e usa `sslmode=verify-full` para criptografar e validar o servidor,
seguindo a [documentação SSL do Supabase](https://supabase.com/docs/guides/platform/ssl-enforcement).

## Inicialização

O Dockerfile existente compila o Worker. Ao iniciar, `scripts/render-start.sh`:

1. Valida a URL e grava as variáveis de conexão no arquivo privado do Worker.
2. Cria o schema e aplica `db/postgres.sql` em uma transação.
3. Cria o administrador, quando as duas variáveis são fornecidas. Senhas já
   alteradas no painel são preservadas.
4. Inicia o servidor na porta informada pelo Render.

O deploy falha se faltar `DATABASE_URL`, evitando salvar agendamentos no D1
local efêmero. O usuário PostgreSQL precisa poder criar o schema e suas tabelas.
Não exponha `sharprazors` na Data API do Supabase: o acesso ocorre pelo backend.

As tabelas e os dados padrão são criados sem sobrescrever registros existentes.
Isso **não transfere registros do banco antigo**. Se houver clientes ou reservas
em produção, será necessário exportá-los e importá-los antes da troca definitiva.

## Verificação e uso local

Para aplicar a estrutura manualmente, com as variáveis configuradas no terminal:

```sh
node scripts/postgres-migrate.mjs
node scripts/admin-user.mjs --if-missing
```

Um `.env` não é carregado automaticamente por esses comandos. Com Node 22,
pode-se usar `node --env-file=.env scripts/postgres-migrate.mjs`. No desenvolvimento
do Worker, configure `DATABASE_URL` e `DATABASE_SCHEMA` em `.dev.vars` (ignorado
pelo Git); para o Worker compilado, use `node --env-file=.env scripts/worker-database-env.mjs`
após o build. Sem essas variáveis, o desenvolvimento local continua usando D1.

Após o deploy, verifique `/api/site`, o fluxo de agendamento e o login `/admin`.
No Supabase, selecione o schema `sharprazors` para consultar as tabelas.

Referência: [conexões PostgreSQL do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
