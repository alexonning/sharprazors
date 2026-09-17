import {db} from "@/db/raw";

export async function GET(){
  try{
    const result=await db().prepare("SELECT id,name FROM barbers WHERE active=1 ORDER BY position,name").all();
    return Response.json(result.results,{headers:{"Cache-Control":"public, max-age=60"}});
  }catch(e){console.error("barbers load failed",e);return Response.json([],{headers:{"Cache-Control":"public, max-age=60"}})}
}
