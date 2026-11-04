# companion-module-spresenter-pulse-fx

Módulo do [Bitfocus Companion](https://companion.free/) para o plugin
[Pulse FX](https://github.com/ariellaureanorosas/spresenter-pulse-fx) do
Spresenter.

O botão momentâneo liga o Strobe/Pulse/Hit ao apertar e desliga ao soltar; o estado
vem de `GET /api/v1/plugins/com.spresenter.pulse-fx/requests/state`.

## Requisitos

- Companion 4.3 ou superior (API 2.x). Testado em Companion 5.1.1.
- Pulse FX **1.4.3+** instalado e ativo no Spresenter (o botão da trava de 3 Hz
  exige a 1.4.1; efeitos e feedbacks funcionam na 1.4.0; **Hit exige 1.4.3**).
- API externa do Spresenter ligada e token com `plugins:invoke`.

## O que o módulo oferece

| Tipo | Itens |
|---|---|
| Ações | ligar, desligar, alternar, parar tudo e **trava de 3 Hz** |
| Feedbacks | efeito ativo (por dono **e por modo**), efeito é strobe/pulse/hit, trava ligada, sem conexão |
| Presets | segurar para acender (Strobe/Pulse/**Hit**), alternar, parar tudo, trava de 3 Hz |

## Desenvolvimento

```bash
npm install
npm run build      # gera dist/
npm run test
npm run check
npm run verify     # check + testes + build + manifesto
```

O `companion/manifest.json` mantém `version: "0.0.0"` de propósito: o
`companion-module-build` preenche a versão do `package.json` no pacote final.

### Pasta de desenvolvimento do Companion

O Companion lê os módulos de desenvolvimento de uma pasta que **contém** as
pastas dos módulos. Neste projeto:

```
D:\01. PROJETOS\PLUGINS SPRESENTER\companion-dev\
└── companion-module-spresenter-pulse-fx\
    ├── companion\manifest.json
    └── dist\main.js
```

No launcher do Companion: **engrenagem → Advanced Settings → Developer →
Select** e escolha `companion-dev` (a pasta de cima, não a do módulo). Ligue
**Enable Developer Modules** e reinicie a interface.

## Estrutura

| Arquivo | Papel |
|---|---|
| `src/main.ts` | Ciclo de vida, polling e variáveis. |
| `src/api.ts` | Cliente HTTP e normalização da resposta de `state`. |
| `src/payload.ts` | Montagem pura dos corpos de `start` e `stop`. |
| `src/state.ts` | Consultas puras sobre o snapshot (alvo, dono, modo). |
| `src/actions.ts` | Ações e opções dinâmicas de saída/camada. |
| `src/feedbacks.ts` | Feedbacks booleanos. |
| `src/presets.ts` | Botões momentâneos e de alternância. |

## Contrato usado

O módulo só usa as quatro ações públicas do plugin:

- `start` — liga o efeito contínuo.
- `stop` — desliga (sem `force`, preserva o efeito do painel).
- `state` — efeitos ativos, trava, seleção, saídas e camadas.
- `safetyLock` — liga/desliga a trava de 3 Hz (pedido explícito, sem alternância).

Referência completa: [docs/EXTERNAL-API.md](https://github.com/ariellaureanorosas/spresenter-pulse-fx/blob/main/docs/EXTERNAL-API.md).

## Licença

MIT.
