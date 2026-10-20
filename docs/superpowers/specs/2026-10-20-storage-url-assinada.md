# Storage com URL assinada — design do Bloco 3b parte 2

**Data:** 2026-10-20
**Status:** aprovado e implantado em produção em 2026-10-20 (`0008` + `0009` + deploy `3cc260e`)
**Escopo:** `funcionarios-fotos-smader` e `arquivos-smader` privados, com URL
assinada emitida para o que está publicado. `manuais-imagens-smader` fica
público nesta fase, com risco residual registrado.
**Depende de:** Bloco 3b parte 1 (`0004_storage_gate.sql`, já aplicada).
**Não muda:** `publish_status`, contratos existentes de `DB.*`, fallback local.

## 1. Problema

Hoje os 3 buckets são `public = true`. Em bucket público, o Supabase serve o
objeto por URL **sem consultar policy**. Resultado: um arquivo enviado junto com
um rascunho nasce acessível por URL para qualquer pessoa que conheça o caminho
(N5). O gate da parte 1 fechou listagem/escrita, mas não o acesso por URL.

## 2. Decisão de arquitetura

**Opção escolhida: bucket privado + URL assinada emitida pelo cliente, com uma
policy de `SELECT` que só enxerga objeto de registro publicado.**

Fluxo:

1. O app carrega os registros publicados (RLS de `public.*` já garante isso).
2. Para cada objeto referenciado (`storage_path` / `foto_storage_path`), o app
   chama `storage.from(bucket).createSignedUrl(path, 3600)` com o JWT da sessão
   (anon no site, authenticated no painel).
3. A Storage API consulta a policy de `SELECT` em `storage.objects`.
   - Objeto de registro **publicado** → policy libera → URL assinada (1 h).
   - Objeto de registro **rascunho** → policy nega → sem URL.
4. A URL assinada fica **só em memória**, nunca no banco nem no localStorage.

Por que não Edge Function nesta fase:

- A policy de `SELECT` já expressa a regra ("publicado pode, rascunho não") sem
  service role no caminho da requisição.
- Menos peças: nenhum deploy, nenhum secret novo, nenhum cold start.
- A autorização do dono para a Edge Function (decisão #10) fica reservada para
  o caso que a RLS não conseguir expressar. Hoje não é o caso.

Custo aceito: o `anon` passa a poder **assinar** URLs de objetos publicados e
listar apenas esses nomes. Isso é equivalente ao que o site já publica; rascunho
continua invisível.

## 3. Buckets

| Bucket | Fase | Policy nova |
|---|---|---|
| `funcionarios-fotos-smader` | **privado** | `SELECT` para `anon, authenticated` quando existe funcionário `published` com aquele `foto_storage_path` |
| `arquivos-smader` | **privado** | `SELECT` para `anon, authenticated` quando existe arquivo `published` com aquele `storage_path` |
| `manuais-imagens-smader` | **privado (3c/13)** | `SELECT` para `anon, authenticated` quando manual `published` referencia o path em `passos[]` |

As policies de `authenticated` já existentes (`0004`/`0006`) continuam valendo:
`admin` e `servidor` (`pode_editar()`) assinam rascunho para pré-visualizar no
painel. As novas policies são **aditivas** (OR), restritas a publicado.

### Por que `manuais` ficou de fora do 3b2

As imagens de manual não têm coluna própria: vivem dentro de `manuais.passos`
(JSON/HTML). Não havia join confiável por objeto. Fechar o bucket sem vínculo
quebraria as imagens de manual. O 3c/13 resolveu com a Opção A: a policy usa
`passos[].imagem_storage_path` e a `0011` fechou o bucket. A tabela
`manuais_imagens` segue adiada.

## 4. Contrato de código (aditivo)

Em `db.js`:

```js
DB.createSignedUrl(bucket, path, expiresIn = 3600)
DB.createSignedUrls(bucket, paths, expiresIn = 3600)
DB.resolveStorageUrls(colecao)   // preenche cache em memória
```

- Cache `Map` em memória, chave `bucket/path`, valor `{ url, expiresAt }`.
- Renova quando faltar menos de 5 min.
- Nunca persiste. `_persistLocal` continua sem URL assinada.
- Se `_sb` não existir ou o path estiver vazio, devolve `''` (fallback local).

Normalização:

- `funcionarios.foto` deixa de receber URL pública nova. O valor legado
  (base64/URL externa/URL pública antiga) é preservado como fallback; quando o
  bucket fica privado, essa URL antiga deixa de funcionar e vale o `foto_url`.
- `funcionarios.foto_url` (runtime, não persistido) recebe a URL assinada.
- `script.js` e `admin.js` passam a usar `foto_url || foto` (4 pontos no
  `script.js`, 2 no `admin.js`).
- `arquivos`: `url_assinada` runtime; o clique de download resolve/renova a URL
  antes de baixar. `arquivo_data` (base64 local) continua tendo prioridade.

## 5. Ordem de implantação (sem janela quebrada)

1. **Aplicar `0008_storage_policies_assinatura.sql`** (só as policies), com os
   buckets ainda públicos. É aditiva e não muda nada visível. A Storage API
   exige `SELECT` para assinar **mesmo em bucket público**; sem esta etapa o
   código novo cairia no fallback. **[Feito em produção em 2026-10-20.]**
2. **Publicar o código** com URL assinada. Ele funciona nos dois modelos.
   **[Feito: commit `3cc260e`.]**
3. **Validar no projeto de teste** (`zoywmvuswyosehlddmma`) aplicando a `0009`
   (bucket privado) e exercitando foto e download. **[Feito via policy/SQL no
   teste.]**
4. **Aplicar a `0009` em produção**. **[Feito em 2026-10-20.]**
5. Reverter é barato: `update storage.buckets set public = true` + (opcional)
   `drop policy`.

## 6. Migrations

- `supabase/migrations/0008_storage_policies_assinatura.sql`: 2 policies
  `SELECT` aditivas (publicado). Não toca no bucket.
- `supabase/migrations/0009_storage_buckets_privados.sql`: `public = false` em
  `arquivos-smader` e `funcionarios-fotos-smader`. Rollback comentado.

## 7. Validação

**Executado em 2026-10-20 no projeto de teste (`zoywmvuswyosehlddmma`):**

- `0008` aplicada e provada com as policies reais: `anon` enxergou apenas
  `t6s/publicado.pdf` e `t6s/foto-publicada.jpg`; `servidor` enxergou também os
  dois rascunhos. Transação revertida, nada persistido.
- `0009` aplicada: `arquivos-smader` e `funcionarios-fotos-smader` com
  `public=false`; `manuais-imagens-smader` segue `public=true`.
- T6.5 após as duas migrations: **232 casos, 0 falhas**.
- `npm run check`: **93 testes**, 0 erros de lint, guard 29/11/0.
- E2E local: 8 passed / 2 skipped (mesmo baseline).

A validação ponta a ponta no **projeto de teste** segue pendente (precisa da
anon/publishable key e de um objeto real); a validação ponta a ponta foi feita
em **produção** após o deploy.

**Produção (2026-10-20):** `0008` (`20261020151915`) e `0009` (`20261020152424`)
aplicadas; código `3cc260e` no GitHub Pages. API com a anon key: arquivo e foto
publicados → sign 200 + download 200; path sem registro → 400. No site real:
15/15 fotos carregadas, download `Modelo - Ofício.docx` sem falha, zero erros de
JS. A URL pública antiga pode responder por cache; com cache-busting → 400.
`manuais-imagens-smader` foi fechado no 3c/13 (`0010`/`0011`); 60/60 imagens
validadas via URL assinada, URL pública 400 e rascunho anônimo 400.

Passos previstos para essa validação de app:

1. Foto de funcionário publicado renderiza; foto de rascunho não é assinada.
2. Download de arquivo publicado abre; rascunho não.
3. `npm test` continua verde; nenhum teste existente alterado.

## 8. Fora de escopo

- Fechar `manuais-imagens-smader` — implementado depois no 3c/13 (`0010`/`0011`).
- Apagar objetos órfãos ou o arquivo do rascunho `id=45` (decisão #9).
- Mascarar campos sensíveis (pendência separada do Bloco 6).
- Rotação de chaves/URL já conhecida: registro, não tarefa.

## 9. Pendência para o dono

Para o teste ponta a ponta, preciso da **anon/publishable key do projeto de
teste** (a chave pública do `zoywmvuswyosehlddmma`, não a `service_role`). Ela é
segura no browser; sem ela, a validação para no SQL e no teste unitário.
