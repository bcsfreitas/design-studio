---
studioId: 0g9bmx69w3gbpxxw
title: Sobre este protótipo
description: As telas do eru de hoje, navegáveis, com dados de exemplo e os estados de cada uma.
---

Este protótipo recria o eru como ele está hoje, com o sistema **Eru** (as cores Telperion, Geist e Cormorant, e os componentes do próprio eru). Os dados são de exemplo, e nada fala com o Hermes: dá para clicar, digitar e abrir menus à vontade. Recarregar a página volta tudo ao começo.

## Como está organizado

Cada pasta é uma área do eru, na ordem da coluna de ícones. A tela principal da área vem primeiro; os detalhes vêm em seguida; a pasta **Estados** guarda os momentos difíceis de ver no dia a dia: carregando, erro, vazio e outros próprios de cada tela.

- [Início](Início/Início.tsx), com o astrolábio dos projetos no céu.
- [Sessão](Sessão/Sessão.tsx): a conversa com o agente, a [sessão nova](<Sessão/Nova sessão.tsx>), o turno [respondendo](Sessão/Estados/Respondendo.tsx), o [pedido de aprovação](<Sessão/Estados/Pedindo aprovação.tsx>), a [pergunta](Sessão/Estados/Pergunta.tsx) e, em **Painéis**, a sessão com o navegador, o terminal, os arquivos ou os agentes abertos.
- [Projeto](<Projeto/Visão geral.tsx>): as cinco abas da página do projeto.
- [Sessões](Sessões/Sessões.tsx), [Agendamentos](Agendamentos/Agendamentos.tsx), [Memória](Memória/Memória.tsx), [Arquivos](Arquivos/Arquivos.tsx) e [Perfis](Perfis/Perfis.tsx).

O modo claro e o escuro seguem o botão de modo do estúdio.

## O que fica de fora

Só o layout de computador. O terminal é desenhado, não é um terminal de verdade; a página do navegador e as imagens são ilustrações; as notas usam um campo de texto simples no lugar do editor do eru. Movimentos que dependem do servidor (enviar de fato, sincronizar, rodar um agendamento) são simulados.

## Para explorar variações

Duplique uma tela, ou peça ao agente uma variação apontando para ela. Os pedaços compartilhados ficam em `_components/`: a moldura (`shell/`), o céu (`sky/`) e os dados de exemplo (`data/`).
