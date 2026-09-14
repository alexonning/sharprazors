import {env} from "cloudflare:workers";
type Row=Record<string,unknown>;
export type QueryResult<T=Row>={results:T[],meta:{changes:number}};
export interface Statement{bind(...values:unknown[]):Statement;first<T=Row>():Promise<T|null>;all<T=Row>():Promise<QueryResult<T>>;run():Promise<QueryResult>}
export interface Database{prepare(sql:string):Statement;batch<T=Row>(statements:Statement[]):Promise<QueryResult<T>[]>}

// One D1-style API over two backends: Render Postgres when DATABASE_URL is set, Cloudflare D1 otherwise.
// Queries must run on both: "?" placeholders, quoted "end" and camelCase aliases, CAST(...) instead of "::".
export function db():Database{
  if(env.DATABASE_URL)return postgres(env.DATABASE_URL,env.DATABASE_SCHEMA);
  if(!env.DB)throw new Error("Agenda indisponível");
  return env.DB as unknown as Database;
}

type PgClient=import("pg").Client;
type PgStatement=Statement&{sql:string,values:unknown[]};
const numbered=(sql:string)=>{let n=0;return sql.replace(/\?/g,()=>"$"+(++n))};

function postgres(url:string,schema?:string):Database{
  // DATABASE_SCHEMA keeps this app's tables apart inside a shared database (same rule as scripts/pg-client.mjs).
  const options=schema&&/^[a-z_][a-z0-9_]*$/.test(schema)?`-c search_path=${schema}`:undefined;
  // Workers cannot reuse a socket across requests, so each query (or batch) opens its own connection.
  async function withClient<T>(work:(client:PgClient)=>Promise<T>){
    const {default:pg}=await import("pg");
    const client=new pg.Client({connectionString:url,options});
    await client.connect();
    try{return await work(client)}finally{client.end().catch(()=>{})}
  }
  async function execute(client:PgClient,statement:PgStatement):Promise<QueryResult<any>>{
    const result=await client.query(numbered(statement.sql),statement.values);
    return {results:result.rows,meta:{changes:result.rowCount??0}};
  }
  const statement=(sql:string,values:unknown[]=[]):PgStatement=>({
    sql,values,
    bind:(...next)=>statement(sql,next),
    first:async()=>(await withClient(client=>execute(client,statement(sql,values)))).results[0]??null,
    all:()=>withClient(client=>execute(client,statement(sql,values))),
    run:()=>withClient(client=>execute(client,statement(sql,values)))
  });
  return {
    prepare:sql=>statement(sql),
    // Same guarantee as D1 batches: all statements commit together or none do.
    batch:statements=>withClient(async client=>{
      await client.query("BEGIN");
      try{
        const results=[];
        for(const s of statements as PgStatement[])results.push(await execute(client,s));
        await client.query("COMMIT");
        return results;
      }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e}
    })
  };
}
