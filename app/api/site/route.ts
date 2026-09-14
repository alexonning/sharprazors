import {loadConfig} from "@/lib/site-config";
export async function GET(){try{return Response.json(await loadConfig(),{headers:{"Cache-Control":"no-store"}})}catch(e){console.error("site config",e);return Response.json({error:"Não foi possível carregar os dados da barbearia."},{status:503})}}
