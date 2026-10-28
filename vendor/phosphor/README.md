# Phosphor Icons 2.1.1 (vendorizado)

- Origem: https://unpkg.com/@phosphor-icons/web@2.1.1/
- Pesos originais: `regular` e `bold` (mantidos como fonte para o subset)
- Licenca: MIT (ver `LICENSE`)

Os CSS foram ajustados para carregar apenas o `.woff2` local, sem CDN.

## Subset usado pelo app

O app carrega **somente** `subset/phosphor.css` + `subset/phosphor-bold.woff2`,
gerados por `node scripts/gerar-icones.mjs` (ou `npm run icones`). O gerador lê
as classes `ph-*` citadas no código e os codepoints deste CSS e recorta a fonte.

- Não edite os arquivos de `subset/` à mão: rode o gerador.
- Ao adicionar um ícone novo, rode `npm run icones` e commite o resultado;
  `tests/unit/icones.test.mjs` falha se o subset ficar desatualizado.
- O peso `regular` não é empacotado (o app usa `bold`; a única exceção foi
  migrada). Se algum dia precisar do regular, o gerador precisa ser estendido.

Atualizar a biblioteca: baixar `src/regular/style.css`, `src/regular/Phosphor.woff2`,
`src/bold/style.css` e `src/bold/Phosphor-Bold.woff2` da mesma versao, repetir o
ajuste do `src` do `@font-face` e rodar o gerador de novo.
