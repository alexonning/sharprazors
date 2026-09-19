import {env} from "@/db/runtime";
import {postgresConfig,openPostgresClient} from "./postgres-config.mjs";
import supabaseRootCertificate from "./supabase-certificate";
type Row=Record<string,unknown>;
export type QueryResult<T=Row>={results:T[],meta:{changes:number}};
export interface Statement{bind(...values:unknown[]):Statement;first<T=Row>():Promise<T|null>;all<T=Row>():Promise<QueryResult<T>>;run():Promise<QueryResult>}
export interface Database{prepare(sql:string):Statement;batch<T=Row>(statements:Statement[],options?:{serializeBookings?:boolean}):Promise<QueryResult<T>[]>}

// One D1-style API over two backends: Supabase/Postgres when DATABASE_URL is set, D1 otherwise.
// Queries must run on both: "?" placeholders, quoted "end" and camelCase aliases, CAST(...) instead of "::".
export function db():Database{
  if(env.DATABASE_URL)return postgres(env.DATABASE_URL,env.DATABASE_SCHEMA);
  if(!env.DB)throw new Error("Agenda indisponível");
  const d1=env.DB as unknown as Database;
  return {prepare:sql=>d1.prepare(sql),batch:statements=>d1.batch(statements)};
}

type PgClient=import("pg").Client;
type PgStatement=Statement&{sql:string,values:unknown[]};
const numbered=(sql:string)=>{let n=0;return sql.replace(/\?/g,()=>"$"+(++n))};

function postgres(url:string,schema?:string):Database{
  const config=postgresConfig(url,schema,supabaseRootCertificate);
  // Workers cannot reuse a socket across requests, so each query (or batch) opens its own connection.
  async function withClient<T>(work:(client:PgClient)=>Promise<T>){
    const {default:pg}=await import("pg");
    const client=new pg.Client(config.clientConfig);
    await openPostgresClient(client,config.schema);
    try{return await work(client)}finally{await client.end().catch(()=>{})}
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
    batch:(statements,options)=>withClient(async client=>{
      await client.query("BEGIN");
      try{
        // A separate lock statement gives the following SELECT/INSERT a fresh
        // snapshot after any concurrent reservation commits. D1 batches already
        // serialize writes; Postgres needs this explicit transaction lock.
        if(options?.serializeBookings)await client.query('LOCK TABLE bookings IN SHARE ROW EXCLUSIVE MODE');
        const results=[];
        for(const s of statements as PgStatement[])results.push(await execute(client,s));
        await client.query("COMMIT");
        return results;
      }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e}
    })
  };
}
