# Covivo 🏠

**Covivo** é um sistema completo e moderno para gestão de moradias compartilhadas (repúblicas, colivings e apartamentos divididos). Ele simplifica o controle financeiro, a organização de tarefas e a convivência entre os moradores, trazendo transparência para o dia a dia da casa.

## 🚀 Principais Funcionalidades

- **Gestão Financeira Transparente**: Controle de despesas coletivas e individuais, com cálculo automático de rateio (divisão igualitária ou baseada em percentuais/pesos).
- **Controle de Pagamentos**: Envio de comprovantes de rateio e pendências diretamente pela plataforma, com fluxo de aprovação exclusivo para administradores.
- **Despesas Recorrentes**: Configuração de contas fixas mensais (aluguel, internet, condomínio, etc.) que são geradas automaticamente a cada ciclo de fechamento.
- **Cartões de Crédito e Parcelamentos**: Organização de despesas pessoais e da casa divididas em parcelas e faturas de cartões, distribuídas corretamente nos meses vigentes.
- **Estoque e Compras**: Controle de quantidade de itens de uso comum e criação de listas de compras colaborativas para mercado e limpeza.
- **Ferramentas de Convivência**: Mural de avisos interativo com pins, regras da casa definidas pelo grupo e sistema de votações para decisões democráticas.
- **Prestação de Contas**: Geração de relatórios mensais e por período detalhados em formatos PDF e CSV, com log completo de auditoria para ações de administradores.
- **Dashboards Dinâmicos**: Visões separadas para o resumo da casa, acompanhamento da evolução de gastos individuais e visão gerencial de inadimplência para os administradores.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 com Vite e TypeScript
- **Estilização**: Tailwind CSS, shadcn/ui (Radix UI) e Framer Motion/Recharts (para animações e gráficos)
- **Roteamento**: React Router Dom v6
- **Gerenciamento de Estado & Dados**: TanStack Query v5 (React Query)
- **Backend & Autenticação**: Supabase (PostgreSQL com RLS, Storage para comprovantes e documentos, Edge Functions e Autenticação OAuth)
- **Formulários e Validação**: React Hook Form integrado com Zod

## 📁 Estrutura do Projeto

O projeto segue uma arquitetura baseada em features e boas práticas de React moderno:

- `/src/components`: Componentes reutilizáveis, divididos entre componentes base de UI (`/ui`), layout (`/layout`) e blocos específicos de negócio (`/dashboard`, `/onboarding`).
- `/src/contexts`: Gerenciamento de estado global da aplicação (ex: `AuthContext` com gerenciamento de sessão e perfil do usuário ativo).
- `/src/pages`: Páginas da aplicação mapeadas pelo roteador.
- `/src/hooks`: Custom hooks para abstração de lógica complexa (ex: `useCycleDates` para lidar com as datas de fechamento e vencimento de despesas de forma reativa).
- `/src/integrations/supabase`: Cliente do Supabase e as tipagens estritas geradas a partir do banco de dados relacional.
- `/src/lib`: Funções utilitárias (ex: cálculos de datas e competências, formatação, validações).
- `/supabase`: Configurações de infraestrutura do backend, Edge Functions (envio de emails via Resend e geração de relatórios em PDF/CSV) e migrações SQL de banco de dados.

## ⚙️ Pré-requisitos

- **Node.js** (versão 18 ou superior recomendada)
- Um gerenciador de pacotes: npm, yarn, pnpm ou bun
- Uma conta e projeto no [Supabase](https://supabase.com/) contendo o schema de tabelas, policies de Row Level Security (RLS) e Edge Functions.

## 🚀 Como executar o projeto localmente

1. **Clone o repositório:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd <NOME_DA_PASTA>
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A aplicação será iniciada com suporte a hot-reload, acessível via navegador (geralmente `http://localhost:8080`).

## 🔑 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto contendo as integrações necessárias. Exemplo:

```env
VITE_APP_URL="http://localhost:8080"
# Variáveis do Supabase configuradas localmente para apontar para seu projeto
```

## 🏗️ Build para Produção

Para gerar a versão de produção otimizada:
```bash
npm run build
```
Os artefatos estáticos serão gerados na pasta `/dist`, prontos para serem servidos ou hospedados (Vercel, Netlify, Render, etc).