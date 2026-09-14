import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Sharp Razors | Agende seu horário",description:"Agendamento online da Barbearia Sharp Razors. Escolha seu serviço e reserve seu horário.",icons:{icon:"/logo.png"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}
