/**
 * Testes de characterization de `db.js`.
 *
 * Objetivo do Bloco 4: criar a rede, nao mudar comportamento. Cada teste aqui
 * descreve o que o codigo FAZ HOJE. Onde isso diverge do que o plano v2
 * esperava, o teste esta marcado com "DIVERGENCIA CONHECIDA" e o achado foi
 * registrado em docs/qualidade/linha-de-base-lint.md, para decisao posterior.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarScripts } from '../helpers/load-script.mjs';

/** Carrega db.js no modo local (sem cliente Supabase). */
function carregarDb(opcoes = {}) {
  return carregarScripts(['db.js'], { supabase: false, ...opcoes });
}

/* ==========================================================================
   _normalizePublishStatus
   ========================================================================== */

test('_normalizePublishStatus: "draft" continua "draft"', () => {
  const h = carregarDb();
  assert.equal(h.get('_normalizePublishStatus')('draft'), 'draft');
});

test('_normalizePublishStatus: "published" continua "published"', () => {
  const h = carregarDb();
  assert.equal(h.get('_normalizePublishStatus')('published'), 'published');
});

test('status ausente vira "draft" (fail-closed)', () => {
  // Regra de seguranca: so o valor explicito 'published' publica. Qualquer
  // coisa ausente ou desconhecida fica em rascunho, para nunca aparecer no
  // site publico por acidente.
  const h = carregarDb();
  const normalizar = h.get('_normalizePublishStatus');
  assert.equal(normalizar(undefined), 'draft');
  assert.equal(normalizar(null), 'draft');
  assert.equal(normalizar(''), 'draft');
  assert.equal(normalizar('lixo'), 'draft');
  assert.equal(normalizar('PUBLISHED'), 'draft');
  assert.equal(normalizar('draft'), 'draft');
  assert.equal(normalizar('published'), 'published');
});

test('linha do Supabase sem publish_status entra como rascunho', () => {
  const h = carregarDb();
  const linha = h.get('_normalizeCollectionRecord')('avisos', { id: 1, titulo: 'X' });
  assert.equal(linha.publish_status, 'draft');
});

test('linha do Supabase com publish_status "published" continua publicada', () => {
  const h = carregarDb();
  const linha = h.get('_normalizeCollectionRecord')('avisos', {
    id: 1,
    titulo: 'X',
    publish_status: 'published',
  });
  assert.equal(linha.publish_status, 'published');
});

/* ==========================================================================
   Migracao do formato antigo (snapshot/localStorage sem o campo)
   ========================================================================== */

test('_initLocal: snapshot antigo (dados.js) sem status vira publicado', async () => {
  // dados.js foi gerado antes do campo existir. Esses 76 registros ja estavam
  // no ar, entao a migracao os marca 'published' uma vez. Sem isso, o site
  // ficaria vazio no fallback local.
  const h = carregarDb({
    dadosIniciais: { avisos: [{ id: 1, titulo: 'antigo' }, { id: 2, titulo: 'antigo 2' }] },
  });
  await h.get('_initLocal')();

  const lista = h.get('DB').get('avisos');
  assert.equal(lista.length, 2);
  assert.equal(lista[0].publish_status, 'published');
  assert.equal(lista[1].publish_status, 'published');
});

test('_initLocal: localStorage antigo sem status vira publicado', async () => {
  const h = carregarDb({
    localStorage: {
      smader_db_v1: JSON.stringify({ avisos: [{ id: 9, titulo: 'salvo antes' }] }),
    },
  });
  await h.get('_initLocal')();

  const lista = h.get('DB').get('avisos');
  assert.equal(lista[0].publish_status, 'published');
});

test('_initLocal: rascunho explicito continua rascunho na migracao', async () => {
  const h = carregarDb({
    dadosIniciais: { avisos: [{ id: 1, titulo: 'R', publish_status: 'draft' }] },
  });
  await h.get('_initLocal')();

  assert.equal(h.get('DB').get('avisos')[0].publish_status, 'draft');
});

/* ==========================================================================
   _normalizeSupabaseRow
   ========================================================================== */

test('_normalizeSupabaseRow: funcionarios espelha "lotacao" em "setor"', () => {
  const h = carregarDb();
  const row = h.get('_normalizeSupabaseRow')('funcionarios', { id: 1, lotacao: 'SEMAG' });
  assert.equal(row.setor, 'SEMAG');
  assert.equal(row.lotacao, 'SEMAG');
});

test('_normalizeSupabaseRow: funcionarios espelha "setor" em "lotacao"', () => {
  const h = carregarDb();
  const row = h.get('_normalizeSupabaseRow')('funcionarios', { id: 2, setor: 'SEMADER' });
  assert.equal(row.lotacao, 'SEMADER');
  assert.equal(row.setor, 'SEMADER');
});

test('_normalizeSupabaseRow: com os dois preenchidos, cada um mantem o seu', () => {
  const h = carregarDb();
  const row = h.get('_normalizeSupabaseRow')('funcionarios', { setor: 'A', lotacao: 'B' });
  assert.equal(row.setor, 'A');
  assert.equal(row.lotacao, 'B');
});

test('_normalizeSupabaseRow: linha nula nao explode', () => {
  const h = carregarDb();
  assert.equal(h.get('_normalizeSupabaseRow')('funcionarios', null), null);
});

/* ==========================================================================
   DB.get
   ========================================================================== */

test('DB.get: colecao inexistente devolve array vazio', () => {
  const h = carregarDb();
  // .length em vez de deepEqual: o array vem do realm do vm, entao o protótipo
  // e diferente e deepStrictEqual acusaria falso negativo.
  assert.equal(h.get('DB').get('nao_existe').length, 0);
});

test('DB.get: devolve copia profunda (mutar o resultado nao altera a base)', async () => {
  const h = carregarDb({
    dadosIniciais: { avisos: [{ id: 1, titulo: 'Original', publish_status: 'published' }] },
  });
  await h.get('_initLocal')();

  const primeira = h.get('DB').get('avisos');
  assert.equal(primeira[0].titulo, 'Original');

  primeira[0].titulo = 'MUTADO';

  const segunda = h.get('DB').get('avisos');
  assert.equal(segunda[0].titulo, 'Original');
});

test('DB.get: normaliza "draft" ao ler, sem perder o valor', async () => {
  const h = carregarDb({
    dadosIniciais: { avisos: [{ id: 1, titulo: 'R', publish_status: 'draft' }] },
  });
  await h.get('_initLocal')();

  const lista = h.get('DB').get('avisos');
  assert.equal(lista.length, 1);
  assert.equal(lista[0].publish_status, 'draft');
});

/* ==========================================================================
   URL assinada do Storage (Bloco 3b parte 2)
   ========================================================================== */

function clienteStorageFake(opcoes = {}) {
  const chamadas = [];
  const cliente = {
    storage: {
      from: (bucket) => ({
        getPublicUrl: (path) => ({
          data: { publicUrl: `https://fake.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        }),
        createSignedUrl: async (path, expiresIn) => {
          chamadas.push({ tipo: 'um', bucket, path, expiresIn });
          if (opcoes.erro) return { data: null, error: { message: 'negado' } };
          return {
            data: { signedUrl: `https://fake.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=abc` },
            error: null,
          };
        },
        createSignedUrls: async (paths, expiresIn) => {
          chamadas.push({ tipo: 'varios', bucket, paths: [...paths], expiresIn });
          if (opcoes.erro) return { data: null, error: { message: 'negado' } };
          return {
            data: paths.map((path) => ({
              path,
              signedUrl: `https://fake.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=abc`,
              error: null,
            })),
            error: null,
          };
        },
      }),
    },
  };
  return { cliente, chamadas };
}

function dbComStorage(cliente) {
  const h = carregarDb({ cliente });
  h.run('_sb = window.__clienteFake');
  return h;
}

test('DB.createSignedUrl: assina e reutiliza o cache', async () => {
  const { cliente, chamadas } = clienteStorageFake();
  const h = dbComStorage(cliente);
  const DB = h.get('DB');

  const url1 = await DB.createSignedUrl('arquivos-smader', 'a/b.pdf', 3600);
  const url2 = await DB.createSignedUrl('arquivos-smader', 'a/b.pdf', 3600);

  assert.match(url1, /a\/b\.pdf/);
  assert.equal(url2, url1);
  assert.equal(chamadas.length, 1, 'a segunda chamada deveria vir do cache');
});

test('DB.createSignedUrl: sem bucket/path devolve vazio', async () => {
  const { cliente } = clienteStorageFake();
  const h = dbComStorage(cliente);
  const DB = h.get('DB');

  assert.equal(await DB.createSignedUrl('', 'a/b.pdf'), '');
  assert.equal(await DB.createSignedUrl('arquivos-smader', ''), '');
});

test('DB.createSignedUrl: erro da Storage vira string vazia (fail-closed)', async () => {
  const { cliente } = clienteStorageFake({ erro: true });
  const h = dbComStorage(cliente);
  const DB = h.get('DB');

  assert.equal(await DB.createSignedUrl('arquivos-smader', 'a/b.pdf'), '');
});

test('DB.createSignedUrls: assina em lote e ignora paths vazios', async () => {
  const { cliente, chamadas } = clienteStorageFake();
  const h = dbComStorage(cliente);
  const DB = h.get('DB');

  const out = await DB.createSignedUrls('funcionarios-fotos-smader', ['x.jpg', '', 'y.jpg']);

  assert.match(out['x.jpg'], /x\.jpg/);
  assert.match(out['y.jpg'], /y\.jpg/);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].paths.length, 2);
});

test('_normalizeSupabaseRow: nao gera mais URL publica a partir do path', () => {
  const { cliente } = clienteStorageFake();
  const h = dbComStorage(cliente);
  const func = h.get('_normalizeSupabaseRow')('funcionarios', {
    id: 1,
    foto_storage_path: 'funcionarios/x.jpg',
    foto_storage_bucket: 'funcionarios-fotos-smader',
  });
  const arq = h.get('_normalizeSupabaseRow')('arquivos', {
    id: 1,
    storage_path: 'arquivos/x.pdf',
    storage_bucket: 'arquivos-smader',
  });

  assert.equal(func.foto, '');
  assert.equal(arq.url, '');
});

test('DB.resolveStorageUrls + DB.get: injeta foto_url sem persistir', async () => {
  const { cliente } = clienteStorageFake();
  const h = dbComStorage(cliente);
  const DB = h.get('DB');

  h.run(`_db = { funcionarios: [
    { id: 1, nome: 'Publicado', publish_status: 'published', foto_storage_path: 'f/1.jpg', foto_storage_bucket: 'funcionarios-fotos-smader' }
  ] }`);

  await DB.resolveStorageUrls('funcionarios');
  const lista = DB.get('funcionarios');

  assert.match(lista[0].foto_url, /f\/1\.jpg/);
  assert.equal(h.run('_db.funcionarios[0].foto_url'), undefined, 'a URL assinada nao pode ir para _db');

  h.run('_persistLocal()');
  const salvo = h.localStorage.getItem('smader_db_v1:local') || '';
  assert.ok(salvo, 'deveria gravar o snapshot local');
  assert.ok(!salvo.includes('foto_url'), 'a URL assinada nao pode ir para o localStorage');
});

test('DB.resolveStorageUrls + DB.get: injeta url_assinada em arquivos', async () => {
  const { cliente } = clienteStorageFake();
  const h = dbComStorage(cliente);
  const DB = h.get('DB');

  h.run(`_db = { arquivos: [
    { id: 1, nome: 'A', publish_status: 'published', storage_path: 'a/p.pdf', storage_bucket: 'arquivos-smader' }
  ] }`);

  await DB.resolveStorageUrls('arquivos');
  const lista = DB.get('arquivos');

  assert.match(lista[0].url_assinada, /a\/p\.pdf/);
  assert.equal(h.run('_db.arquivos[0].url_assinada'), undefined);
});

test('DB.resolveStorageUrls + DB.get: injeta imagem_url_assinada nos passos de manuais', async () => {
  const { cliente, chamadas } = clienteStorageFake();
  const h = dbComStorage(cliente);
  const DB = h.get('DB');

  h.run(`_db = { manuais: [
    {
      id: 1,
      titulo: 'Manual',
      publish_status: 'published',
      passos: [
        { texto: 'Com imagem', imagem: 'https://old.example/public.jpg', imagem_storage_path: 'manuais/1.jpg', imagem_storage_bucket: 'manuais-imagens-smader' },
        { texto: 'Externa', imagem: 'https://external.example/x.jpg' },
        'Passo antigo em texto'
      ]
    }
  ] }`);

  await DB.resolveStorageUrls();
  const lista = DB.get('manuais');
  const passos = lista[0].passos;

  assert.match(passos[0].imagem_url_assinada, /manuais\/1\.jpg/);
  assert.equal(passos[0].imagem, 'https://old.example/public.jpg');
  assert.equal(passos[1].imagem_url_assinada, undefined);
  assert.equal(passos[2], 'Passo antigo em texto');
  assert.equal(h.run('_db.manuais[0].passos[0].imagem_url_assinada'), undefined, 'a URL assinada nao pode ir para _db');

  h.run('_persistLocal()');
  const salvo = h.localStorage.getItem('smader_db_v1:local') || '';
  assert.ok(salvo, 'deveria gravar o snapshot local');
  assert.ok(!salvo.includes('imagem_url_assinada'), 'a URL assinada nao pode ir para o localStorage');

  assert.ok(
    chamadas.some((c) => c.tipo === 'varios' && c.bucket === 'manuais-imagens-smader' && c.paths.includes('manuais/1.jpg')),
    'resolveStorageUrls sem argumento deve assinar os paths dos passos'
  );
});

test('DB.uploadManualImageStorage: devolve path e bucket, sem URL publica', async () => {
  const uploads = [];
  const cliente = {
    storage: {
      from: (bucket) => ({
        getPublicUrl: (path) => ({
          data: { publicUrl: `https://fake.example/object/public/${bucket}/${path}` },
        }),
        upload: async (path, file) => {
          uploads.push({ bucket, path, name: file.name });
          return { error: null };
        },
      }),
    },
  };
  const h = dbComStorage(cliente);
  const DB = h.get('DB');

  const out = await DB.uploadManualImageStorage({ name: 'foto de teste.jpg' });

  assert.equal(out.url, '', 'bucket privado nao deve gerar URL publica');
  assert.equal(out.storage_bucket, 'manuais-imagens-smader');
  assert.match(out.storage_path, /^manuais\/\d+-foto-de-teste\.jpg$/);
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].bucket, 'manuais-imagens-smader');
});

/* ==========================================================================
   dbInit / modo local
   ========================================================================== */

test('_initLocal: carrega window.DADOS_INICIAIS quando o localStorage esta vazio', async () => {
  const h = carregarDb({
    dadosIniciais: { servicos: [{ id: 7, nome: 'X', publish_status: 'published' }] },
  });
  await h.get('_initLocal')();

  const servicos = h.get('DB').get('servicos');
  assert.equal(servicos.length, 1);
  assert.equal(servicos[0].id, 7);
});

test('_initLocal: localStorage tem prioridade sobre dados.js', async () => {
  const h = carregarDb({
    dadosIniciais: { servicos: [{ id: 1, nome: 'dos dados', publish_status: 'published' }] },
    localStorage: { smader_db_v1: JSON.stringify({ servicos: [{ id: 2, nome: 'do storage', publish_status: 'published' }] }) },
  });
  await h.get('_initLocal')();

  const servicos = h.get('DB').get('servicos');
  assert.equal(servicos[0].nome, 'do storage');
});

test('_initLocal: migra a chave legada seagri_db_v1', async () => {
  const h = carregarDb({
    localStorage: { seagri_db_v1: JSON.stringify({ servicos: [{ id: 3, nome: 'legado', publish_status: 'published' }] }) },
  });
  await h.get('_initLocal')();

  assert.equal(h.get('DB').get('servicos')[0].nome, 'legado');
  assert.ok(h.localStorage.getItem('smader_db_v1:local'), 'deveria gravar na chave nova');
  assert.equal(h.localStorage.getItem('seagri_db_v1'), null, 'deveria remover a chave antiga');
});

test('dbInit: no fallback local ainda assina as URLs do Storage', async () => {
  const { cliente, chamadas } = clienteStorageFake();
  // Simula o Supabase fora do ar: _initSupabase lanca e o app cai em _initLocal.
  const clienteComFalha = {
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    from: () => { throw new Error('offline'); },
    storage: cliente.storage,
  };

  const h = carregarDb({
    dadosIniciais: {
      manuais: [{
        id: 1,
        titulo: 'Manual local',
        publish_status: 'published',
        passos: [{
          texto: 'Passo com imagem',
          imagem: '',
          imagem_storage_path: 'manuais/1.jpg',
          imagem_storage_bucket: 'manuais-imagens-smader',
        }],
      }],
      arquivos: [{
        id: 1,
        nome: 'Arquivo local',
        publish_status: 'published',
        storage_path: 'arquivos/a.pdf',
        storage_bucket: 'arquivos-smader',
      }],
    },
  });
  h.window.supabase = { createClient: () => clienteComFalha };

  await h.get('dbInit')();

  const DB = h.get('DB');
  assert.equal(DB.getStatus().provider, 'local');
  assert.match(DB.get('manuais')[0].passos[0].imagem_url_assinada, /manuais\/1\.jpg/);
  assert.match(DB.get('arquivos')[0].url_assinada, /arquivos\/a\.pdf/);
  assert.ok(
    chamadas.some((c) => c.bucket === 'manuais-imagens-smader' && c.paths.includes('manuais/1.jpg')),
    'o fallback deve assinar a imagem do manual'
  );
  assert.ok(
    chamadas.some((c) => c.bucket === 'arquivos-smader' && c.paths.includes('arquivos/a.pdf')),
    'o fallback deve assinar o arquivo'
  );
});
