# 📢 Dentcare API

---

## 🚀 Get Started

### ✅ Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- NestJS CLI (opcional, para desenvolvimento local)

## Arquitetura dos módulos

Os módulos de domínio seguem a estrutura usada por `plans`:

```text
<module>/
  application/useCases/       # casos de uso da aplicação
  domain/                     # comandos e contratos dos repositórios
  infra/db/prisma/            # adaptadores de persistência
  infra/http/controllers/     # controllers e DTOs HTTP
  <module>.providers.ts       # composição das dependências
  <module>.module.ts
```

Os controllers tratam a entrada HTTP; os casos de uso dependem dos contratos
de domínio; os providers ligam esses contratos às implementações Prisma. DTOs
HTTP não devem ser usados como contratos internos de domínio.

## Desenvolvimento local

Configure `DATABASE_URL` com a ligação PostgreSQL, `JWT_SECRET` e
`JWT_REFRESH_SECRET` com segredos fortes e distintos no ambiente local. Não
inclua esses valores no controlo de versões. Para uploads, configure
`R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`. Os
nomes `CLOUDFLARE_*` antigos continuam aceites como fallback. O bucket R2 deve
permanecer privado; a API serve os ficheiros após validar a autorização.

```bash
pnpm install
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm start:dev
```

Para testar a ligação real ao R2, execute
`RUN_R2_INTEGRATION_TESTS=true pnpm exec jest src/shared/infra/storage/__tests__/aws-s3.storage.int.spec.ts --runInBand`.
O teste usa uma chave aleatória e tenta remover o objeto no fim.

A API escuta em `http://localhost:3000` por padrão (`PORT` pode alterar a porta).
O Swagger está disponível em `/api/doc`. No frontend, `VITE_API_URL` define a
origem da API e, se omitida, usa `http://localhost:3000`.

## Fluxos persistentes

Os endpoints protegidos exigem um token bearer obtido pelo fluxo de
autenticação.
O Swagger documenta os DTOs e os restantes endpoints.

- `GET /patients` e `POST /patients` consultam e criam pacientes no âmbito da
  clínica/filial do utilizador autenticado.
- `POST /patients/:id/avatar`, `POST /doctors/:id/avatar` e
  `POST /chat/conversations/:id/messages` recebem multipart com o campo `file`
  ou `files`; os ficheiros clínicos, anexos do chat e avatares são guardados no
  R2. Os downloads exigem autenticação e autorização do recurso.
- `GET /doctors` e `POST /doctors` consultam e criam médicos. A disponibilidade
  de agendamento depende dos dias e horários definidos no perfil do médico.
- `GET /appointments` e `POST /appointments` consultam e criam agendamentos.
  `GET /appointments/availability?doctorId=...&date=YYYY-MM-DD` devolve os
  horários disponíveis para o médico nessa data.
- `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/reschedule` e
  `PATCH /appointments/:id/complete` alteram agendamentos existentes. Os
  horários têm duração de 30 minutos; conclusão é permitida a administradores
  e médicos.
- `POST /x-ray-analyses` recebe `patientId`, `type`, `region` e `file` em
  `multipart/form-data`, guarda a imagem em armazenamento privado e devolve a
  análise persistida. `GET /x-ray-analyses` lista os registos e
  `GET /x-ray-analyses/:id/file` entrega a imagem apenas a utilizadores clínicos
  autorizados da filial.

O menu Raio-X requer um endpoint multimodal privado compatível com OpenAI e o
armazenamento R2 já usado para exames. Para inferência local sem custo por
pedido, pode usar o [Ollama](https://ollama.com/download) com um modelo de visão
instalado localmente, como `qwen3-vl:8b`. Configure no ambiente da API:

```env
XRAY_AI_BASE_URL=http://localhost:11434/v1
XRAY_AI_MODEL=qwen3-vl:8b
XRAY_AI_PROVIDER=ollama
XRAY_AI_API_KEY=ollama
```

Ollama ignora a chave local; `ollama` é apenas um valor de compatibilidade.
Se a API correr num container e Ollama no host macOS, use
`http://host.docker.internal:11434/v1` como URL. Para outros endpoints,
`XRAY_AI_PROVIDER` pode ser `openai-compatible` (valor padrão), e a chave deve
ser a credencial fornecida pelo administrador do serviço. A aplicação envia a
imagem apenas para o endpoint configurado; sem URL ou modelo, a análise falha
explicitamente. Não guarde chaves reais no controlo de versões. São aceites
imagens JPG/JPEG e PNG até 10 MB; DICOM ainda não é suportado. A inferência
local não tem cobrança por chamada, mas usa os recursos da máquina e a licença
do modelo deve ser verificada para o uso pretendido. O resultado é apoio à
decisão e exige revisão profissional, não é um diagnóstico.

O registo de uma clínica requer que exista pelo menos um plano não removido no
banco.
`pnpm db:seed` configura a moeda Kwanza (`Kz`) e o plano inicial **Essencial**:
**15.000 Kz**, **30 dias**, **1 filial**. Estes são valores iniciais, não uma
integração de cobrança ou aplicação automática de limites de subscrição.
A rotina preserva o primeiro plano não removido, caso já exista, e pode ser
executada novamente sem duplicar o plano ou alterar preços existentes.
Execute-a também após preparar um novo banco; o registo público não cria planos
automaticamente.

O chat persiste mensagens de texto via REST; a interface atual ainda não envia
anexos. O fluxo de criação de médicos ainda precisa de uma etapa de entrega de
credenciais ou redefinição de senha antes de poder ser usado para iniciar sessão.

## Paginação e filtros

As listagens `GET /patients`, `/doctors`, `/appointments`, `/users`, `/stock`,
`/treatment-plans`, `/plans`, `/x-ray-analyses`, `/chat/conversations`,
`/chat/conversations/contacts` e `/chat/conversations/:id/messages` devolvem:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

- `page` começa em **1**; `pageSize` aceita **10**, **25** ou **50** (padrão 10).
- `search` pesquisa os campos relevantes de cada recurso, sem distinguir
  maiúsculas de minúsculas. Nomes completos são pesquisados por palavras.
- `dateFrom` e `dateTo` usam `YYYY-MM-DD`, com ambas as datas incluídas.
  Os limites são dias UTC: data da consulta em agendamentos, início em planos
  de tratamento, última atualização nas conversas e criação nos demais recursos.
- Filtros inválidos ou não suportados pelo recurso devolvem **400**.
  Um intervalo de datas invertido também devolve **400**.
- O total é calculado com os mesmos filtros e permissões da consulta.
  Páginas além da última devolvem `data: []` e preservam o total real.
  Quando não há resultados, `totalPages` é 0.

| Recurso                          | Filtros adicionais                                                              |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Pacientes                        | `status=active/inactive`                                                        |
| Médicos                          | `status=active/inactive`, `specialty` (valor exato), `type=FULL_TIME/PART_TIME` |
| Agendamentos                     | `status=pending/confirmed/cancelled/completed`, `doctorId`, `patientId`         |
| Utilizadores                     | `status=active/inactive`, `role`                                                |
| Estoque                          | `category=protection/anesthesia/instruments/materials`                          |
| Planos de tratamento             | `status=planned/in-progress/completed`, `doctorId`, `patientId`                 |
| Análises de Raio-X               | `type=periapical/panoramic/bitewing/cephalometric`                              |
| Conversas                        | `category=staff/patients/post-care`                                             |
| Contactos do chat                | `role`                                                                          |
| Planos de subscrição e mensagens | Pesquisa e datas                                                                |

Exemplo: `GET /patients?page=2&pageSize=25&search=Ana&status=active`.
O histórico do chat é paginado a partir das mensagens mais recentes; as mensagens
de cada página são apresentadas em ordem cronológica.

No frontend, pacientes, médicos, agendamentos, utilizadores, estoque, planos de
tratamento, Raio-X e chat utilizam paginação no banco. Seletores de pacientes e
médicos também permitem pesquisar e percorrer páginas. Histórico clínico de
demonstração, procedimentos do dashboard, notificações e ajuda usam filtros e
paginação **locais**; isso não adiciona persistência a essas demonstrações.

Validação dos auxiliares do frontend, a partir da pasta do frontend, com
Node.js 22.6 ou superior:

```bash
node --experimental-strip-types --test src/lib/pagination.test.mjs
```
