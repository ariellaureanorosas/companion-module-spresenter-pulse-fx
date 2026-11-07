# Spresenter Pulse FX

Este módulo controla o plugin **Pulse FX** do Spresenter pelo Bitfocus Companion.
Ele liga o efeito Strobe ou Pulse enquanto um botão está pressionado e desliga ao
soltar, sem precisar de script ou de duas ações HTTP montadas à mão.

O módulo **não abre porta e não faz conexões de entrada**: ele chama a API do
Spresenter, que entrega o pedido ao Pulse FX.

## Antes de começar

1. **Pulse FX 1.4.1 ou superior** instalado e ativo no Spresenter. (O botão da
   trava de 3 Hz só existe a partir da 1.4.1; o resto funciona na 1.4.0.)
2. **API externa ligada** em Configurações do Spresenter.
3. Um **token** com o escopo `plugins:invoke`.
4. A **porta da API** (normalmente `5050`; a `8080` é o painel web).

## Configuração da conexão

| Campo | Padrão | Observação |
|---|---|---|
| Endereço do Spresenter | `127.0.0.1` | Aceita IP, nome da máquina e `host:porta`. |
| Porta da API | `5050` | A porta da API, não a do painel web. |
| Token | vazio | Guardado no cofre de segredos do Companion. |
| Atualizar estado a cada | `2` s | Alimenta feedbacks e variáveis. |

Ao salvar, o módulo consulta o estado do Pulse FX. Se o token estiver errado ou a
API estiver desligada, a conexão aparece com erro e a variável `last_error`
explica o motivo.

## Botão momentâneo (segurar para acender)

Na aba **Presets**, use:

- **Pulse FX → Segurar para acender → Strobe** (ou **Pulse**): aperta → liga, solta → desliga.
- **Pulse FX → Segurar para acender → Hit (momentâneo)**: aperta → dispara um flash único (dura o `decayMs`), solta → não faz nada (o hit para sozinho).

Vinheta e Moldura podem ser usadas com Strobe, Pulse e Hit. Ao escolher uma
delas em **Área**, os campos **Espessura** e **Suavização** aparecem para ajustar
o desenho — inclusive no Hit.

Os presets **Segurar para acender** já vêm com:

- **Apertar:** ação *Ligar efeito contínuo*.
- **Soltar:** ação *Desligar efeito contínuo*.
- **Feedback:** *Efeito ativo na camada* — o botão fica verde enquanto o efeito
  iniciado por este módulo estiver ativo **e no modo do botão**. É isso que faz
  o botão Strobe não acender junto com o Pulse.

O preset usa a **seleção do painel** do Pulse FX (saída e camada escolhidas no
painel). Para fixar outra camada, edite as opções **Saída** e **Camada** nas duas
ações do botão.

Há também **Pulse FX → Segurança → Trava de 3 Hz**: um toque alterna a trava e o
botão fica verde enquanto ela estiver ligada.

## Ações

| Ação | O que faz |
|---|---|
| **Ligar efeito contínuo** | Liga Strobe, Pulse ou Hit na saída e camada escolhidas. |
| **Desligar efeito contínuo** | Desliga o efeito iniciado por este módulo. |
| **Alternar efeito contínuo** | Liga se não houver efeito deste módulo; desliga se houver. |
| **Parar todos os efeitos** | Encerra qualquer efeito, de qualquer dono, em todas as camadas. |
| **Trava de 3 Hz** | Liga, desliga ou alterna a trava de frequência. |

Sem **Forçar**, *Desligar* preserva um efeito ligado pelo painel ou pela
automação. **Forçar** encerra qualquer dono.

## Feedbacks

| Feedback | Quando fica ativo |
|---|---|
| **Efeito ativo na camada** | Há um efeito na saída/camada para o dono e o modo escolhidos. |
| **Efeito é Strobe/Pulse** | O efeito da camada está no modo escolhido. |
| **Trava de 3 Hz ligada** | A trava de frequência está ativa no Pulse FX. |
| **Sem conexão com o Spresenter** | A última consulta de estado falhou. |

## Variáveis

`connection`, `last_error`, `plugin_version`, `safety_lock`, `effect_count`,
`effect_summary`, `selection` e `endpoint`.

## Limitações

- **O ciclo de segurar é do Companion.** Se o Companion for encerrado com o botão
  pressionado, o `stop` não chega e o efeito permanece no palco. Use **Parar
  tudo** no painel do Pulse FX ou no próprio Companion.
- **A trava de 3 Hz vale para o módulo.** Com a trava ligada, uma frequência
  acima de 3 Hz é reduzida pelo plugin; a resposta informa o valor aplicado.
- **O módulo controla Strobe, Pulse e Hit.** Hit é disparo único: aperta uma vez,
  o flash roda pelo `decayMs` e para sozinho.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `401` / `403` | Token sem `plugins:invoke` ou API externa desligada. |
| `404` | Pulse FX antigo (antes de 1.4.1) ou plugin desativado. |
| `409` | A camada existe, mas o overlay não pôde ser aplicado. |
| Botão não fica verde | O efeito está em outra camada ou foi iniciado pelo painel. Ajuste o modo, o dono ou o alvo do feedback. |
