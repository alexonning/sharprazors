import {env} from "cloudflare:workers";
export function db(){if(!env.DB)throw new Error("Agenda indisponível");return env.DB}
