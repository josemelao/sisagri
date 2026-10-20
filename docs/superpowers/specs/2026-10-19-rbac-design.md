# RBAC do SisAgri — design aprovado (Bloco 6)

**Data:** 2026-10-19
**Aprovado por:** dono do projeto, em 2026-10-19 (conversa com o agente)
**Escopo:** papéis `admin` / `servidor` / público, com garantia no banco.

## 1. Decisões do dono

| Tema | Decisão |
|---|---|
| Papéis | `admin` faz tudo; `servidor` cria e edita, **não exclui**; público vê só publicado |
| Áreas | Fora de escopo. `servidor` edita qualquer coleção (bloqueio por página é futuro) |
| Coleções | As 14 continuam **todas públicas** quando `publish_status = 'published'` |
| Campos sensíveis | **Pendência registrada** (seção 5). Não entram neste bloco |
| Conta nova | Nasce **sem acesso**; promoção por SQL no Supabase (painel: futuro) |
| Fonte do papel | `public.app_admins.role`, lida por função `security definer` |

## 2. Matriz de classificação das 14 coleções

Todas as 14 são **públicas** (aparecem no site quando publicadas):

`acesso_rapido`, `agenda_eventos`, `arquivos`, `avisos`, `escala_ferias`,
`funcionarios`, `info_juridico`, `info_municipio`, `info_orgaos`, `manuais`,
`processos`, `servicos`, `sistemas`, `veiculos`.

Nenhuma coleção fica sem classificação. A classificação não muda nenhuma policy
de leitura: `anon` continua vendo apenas `published`.

## 3. Matriz papel × coleção × ação

Vale para as 14 coleções (não há exceção por coleção).

| Ação | `anon` | `servidor` | `admin` |
|---|---|---|---|
| SELECT publicado | sim | sim | sim |
| SELECT rascunho | não | sim | sim |
| INSERT | não | sim | sim |
| UPDATE | não | sim | sim |
| DELETE | não | **não** | sim |
| Storage: upload / listar / sobrescrever | não | sim | sim |
| Storage: excluir | não | **não** | sim |
| `admin_settings` (configurações) | não | **não** | sim |
| Promover papel | não | não | SQL hoje; RPC no futuro |

`public` = `anon` + qualquer autenticado sem papel. Rascunho nunca chega a
visitante anônimo.

## 4. Modelo de papel

`public.app_admins` ganha `role text not null check (role in ('admin','servidor'))`,
**sem default**: todo insert precisa declarar o papel. A linha existente é
migrada para `'admin'` antes do `not null`.

Funções (`security definer`, `search_path` fixo):

| Função | Retorno | Uso |
|---|---|---|
| `is_admin()` | bool | DELETE e `admin_settings` |
| `pode_editar()` | bool | INSERT/UPDATE/SELECT autenticado e Storage |
| `meu_papel()` | text/null | frontend (`DB.carregarPapel`) |

`is_admin()` mantém a assinatura atual; só passa a exigir `role = 'admin'`.

## 5. Pendência: campos sensíveis

Registrado, **fora deste bloco**:

- `funcionarios`: `cpf`, `telefone`, `email`, `matricula`
- `veiculos`: `placa`, `chassi`, `renavam`
- `escala_ferias`: `nome`, `cargo`

Motivo: `db.js` carrega 13 coleções com `select('*')`, então `anon` recebe o
registro inteiro (o card não mostra, mas o dado trafega). Mascarar exige
view/colunas explícitas e não é patch local.

## 6. Policies alteradas

- 14 × INSERT → `pode_editar()`
- 14 × UPDATE → `pode_editar()`
- 14 × SELECT `authenticated` → `published OR pode_editar()`
- 14 × DELETE → `is_admin()` (sem mudança)
- 14 × SELECT `anon` → sem mudança
- 3 buckets × (SELECT, INSERT, UPDATE) → `pode_editar()`
- 3 buckets × DELETE → `is_admin()` (sem mudança)
- `admin_settings` (3 policies) → sem mudança

Total: **42 policies de conteúdo + 9 de Storage** alteradas. Nomes e contagem
não mudam (73 em `public`, 12 em `storage.objects`).

## 7. App

- `DB.isAdminLoggedIn()` **não muda** (contrato do Bloco 5).
- Novos: `DB.carregarPapel()`, `DB.isStaff()`, `DB.podeExcluir()`.
- `admin.js`: gate de login passa a `isStaff()`; recarrega as coleções depois do
  login (para o `servidor` ver rascunhos); esconde excluir e configurações para
  quem não é `admin`.
- O banco continua sendo a garantia: a UI só evita frustração.

## 8. Prova

- `supabase/tests/05_rbac.sql` (consultas de verificação, esperado explícito).
- `npm run check` + testes de unidade do papel.
- **Pendente:** suíte 3 personas × 14 × 4 contra projeto de teste (T6.5) e
  criação de uma conta `servidor` para o teste humano.
