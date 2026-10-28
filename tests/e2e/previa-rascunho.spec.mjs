/**
 * Fase 2.3 — previa de rascunho, handshake real no navegador.
 *
 * O painel abre `index.html?previa=1` num iframe e manda o rascunho por
 * `postMessage`. O publico so aceita a mensagem com origem, `source`, nonce e
 * colecao validos; o registro fica em memoria e o painel de detalhe abre como
 * o visitante veria. Nada e gravado.
 *
 * Os contratos puros estao em `tests/unit/previa-rascunho.test.mjs`. Aqui o que
 * importa e o iframe de verdade: a mensagem atravessa a janela, o detalhe
 * renderiza e o modo normal ignora tudo.
 */

import { test, expect } from '@playwright/test';

const FUNCIONARIO = {
  id: 9001,
  nome: 'Rascunho de Teste',
  cargo: 'Analista Ambiental',
  lotacao: 'SMA',
  publish_status: 'draft',
};

// Formato real do payload: irmaos publicados da mesma colecao + um rascunho
// que nunca pode aparecer.
const RELACIONADOS = {
  funcionarios: [
    { id: 9002, nome: 'Colega Publicado', cargo: 'Fiscal', publish_status: 'published' },
    { id: 9003, nome: 'Colega Rascunho', cargo: 'Fiscal', publish_status: 'draft' },
  ],
};

/** Coloca um iframe de previa na pagina e devolve o nonce que ele publicou. */
async function montarIframePrevia(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.id = 'previa-test-frame';
    frame.title = 'previa de teste';
    frame.src = '/index.html?previa=1';
    frame.style.cssText = 'position:fixed;inset:0;width:900px;height:700px;border:0;z-index:99999';

    const limite = setTimeout(
      () => reject(new Error('o iframe de previa nao enviou o nonce')),
      20_000,
    );

    window.addEventListener('message', (evento) => {
      if (!evento.data || evento.data.tipo !== 'sisagri-previa-pronta') return;
      clearTimeout(limite);
      resolve(evento.data.nonce);
    });

    document.body.appendChild(frame);
  }));
}

async function frameDaPrevia(page) {
  const handle = await page.locator('#previa-test-frame').elementHandle();
  const frame = await handle.contentFrame();
  expect(frame).not.toBeNull();
  return frame;
}

async function esperarBoot(page) {
  await expect(page.locator('#boot-screen')).toHaveClass(/is-hidden/, { timeout: 30_000 });
}

test.describe('previa de rascunho', () => {
  test('1. o iframe abre o detalhe publico com o rascunho recebido', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    const nonce = await montarIframePrevia(page);
    const frame = await frameDaPrevia(page);

    await page.evaluate(({ nonce, registro, relacionados }) => {
      const frame = document.getElementById('previa-test-frame');
      frame.contentWindow.postMessage({
        tipo: 'sisagri-previa-registro',
        nonce,
        colecao: 'funcionarios',
        registro,
        relacionados,
      }, location.origin);
    }, { nonce, registro: FUNCIONARIO, relacionados: RELACIONADOS });

    await expect(frame.locator('#func-detail-overlay')).toBeVisible();
    await expect(frame.locator('#func-detail-content')).toContainText('Rascunho de Teste');

    const estado = await frame.evaluate(() => ({
      modo: document.body.classList.contains('modo-previa'),
      foraDaSecao: document.getElementById('func-detail-overlay').parentNode === document.body,
      funcionarios: window.DB.get('funcionarios').map((f) => `${f.id}:${f.publish_status}`),
    }));

    expect(estado.modo).toBe(true);
    // O overlay nasce dentro da secao, que fica oculta no modo previa.
    expect(estado.foraDaSecao).toBe(true);
    // O rascunho e promovido a publicado so na copia em memoria, na frente
    // dos irmaos publicados; o irmao rascunho fica de fora.
    expect(estado.funcionarios).toEqual(['9001:published', '9002:published']);
  });

  test('2. o iframe recusa origem, nonce e payload invalidos', async ({ page }) => {
    await page.goto('/index.html');
    await esperarBoot(page);

    const nonce = await montarIframePrevia(page);
    const frame = await frameDaPrevia(page);

    const resultado = await frame.evaluate(({ nonce, registro }) => {
      function enviar(extra) {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            tipo: 'sisagri-previa-registro',
            nonce,
            colecao: 'funcionarios',
            registro,
            relacionados: {},
            ...extra.data,
          },
          origin: extra.origin || location.origin,
          source: window.parent,
        }));
      }

      // Origem de outro site, nonce errado e registro invalido: nada entra.
      enviar({ origin: 'https://evil.test', data: { registro: { ...registro, id: 9002 } } });
      enviar({ data: { nonce: 'nonce-errado', registro: { ...registro, id: 9003 } } });
      enviar({ data: { registro: null } });

      return {
        funcionarios: window.DB.get('funcionarios').map((f) => f.id),
        aberto: document.getElementById('func-detail-overlay').classList.contains('open'),
      };
    }, { nonce, registro: FUNCIONARIO });

    expect(resultado.funcionarios).toEqual([]);
    expect(resultado.aberto).toBe(false);
  });

  test('3. o modo previa nao carrega dados publicos nem persiste', async ({ page }) => {
    const pedidos = [];
    page.on('request', (req) => {
      try {
        pedidos.push(new URL(req.url()).pathname);
      } catch {
        /* requisicao sem URL valida: ignora */
      }
    });

    await page.goto('/index.html?previa=1');
    await expect(page.locator('body')).toHaveClass(/modo-previa/);

    const estado = await page.evaluate(() => ({
      boot: document.getElementById('boot-screen').classList.contains('is-hidden'),
      funcionarios: window.DB.get('funcionarios').length,
      manuais: window.DB.get('manuais').length,
    }));

    expect(estado.boot).toBe(true);
    expect(estado.funcionarios).toBe(0);
    expect(estado.manuais).toBe(0);
    expect(pedidos).not.toContain('/dados.js');
  });

  test('4. o modal v2 ganha o botao Previa antes do Salvar', async ({ page }) => {
    // Nao precisa de login: `abrirModalV2` e as funcoes `form*` sao globais.
    // Foi aqui que o insertBefore quebrou (o Salvar nao e filho do rodape).
    await page.goto('/admin.html');
    await page.waitForFunction(() => typeof window.abrirModalV2 === 'function');

    const existente = await page.evaluate(() => {
      window.abrirModalV2(
        window.formVeiculo({ id: 1, nome: 'Veiculo', publish_status: 'published' }),
        { id: 1, publish_status: 'published' },
      );
      const botao = document.querySelector('[data-acao="abrir-previa"]');
      const proximo = botao && botao.nextElementSibling;
      return {
        existe: !!botao,
        colecao: botao ? botao.dataset.colecao : null,
        id: botao ? botao.dataset.id : null,
        desabilitado: !!(botao && botao.disabled),
        dentroDoFooter: !!(botao && botao.closest('.footer-actions')),
        antesDoSalvar: !!(proximo && proximo.dataset.acao === 'salvar-modal'),
      };
    });

    expect(existente).toEqual({
      existe: true,
      colecao: 'veiculos',
      id: '1',
      desabilitado: false,
      dentroDoFooter: true,
      antesDoSalvar: true,
    });

    const novo = await page.evaluate(() => {
      window.abrirModalV2(window.formVeiculo(), {});
      const botao = document.querySelector('[data-acao="abrir-previa"]');
      return { existe: !!botao, desabilitado: !!(botao && botao.disabled) };
    });
    expect(novo).toEqual({ existe: true, desabilitado: true });

    const semDetalhePublico = await page.evaluate(() => {
      window.abrirModalV2(window.formFerias(), {});
      return !!document.querySelector('[data-acao="abrir-previa"]');
    });
    expect(semDetalhePublico).toBe(false);
  });
});
