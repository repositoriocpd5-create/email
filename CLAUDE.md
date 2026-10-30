# Orientações do projeto

Este projeto é a Central de e-mails de Joe Amado. Foi entregue como frontend funcional em React/JavaScript com dados de demonstração, pronto para evoluir com um backend de e-mail.

## Começar

- `npm install`
- `npm run dev`
- `npm test`
- `npm run build`

Preservar a identidade visual de `src/styles.css`: cinza perolado, superfícies brancas, azul nas ações e cores pastéis para distinguir as dez contas. Os temas claro e escuro devem manter legibilidade e contraste. A lista unificada e a leitura usam colunas no desktop e navegação de lista/leitura em telas menores. As dez contas devem continuar fáceis de identificar e acessar.

## Comportamentos que devem permanecer

1. Os contadores são derivados das mensagens. Não usar números estáticos na interface.
2. Mostrar claramente a identidade usada para responder. Avisar se ela diferir da conta que recebeu a mensagem.
3. Preservar a mensagem aberta quando ela for marcada como lida dentro do filtro de não lidas.
4. Não deixar exclusões ou arquivamentos sem feedback. Preservar lixeira, confirmação para exclusão definitiva e Desfazer nas ações recuperáveis.
5. Manter tooltips por mouse e foco, nomes acessíveis nos ícones, navegação por teclado, foco contido nos modais e preferência por movimento reduzido.
6. Pedir permissão para notificações somente por ação do usuário. Som e recebimentos automáticos ficam desativados inicialmente.
7. O botão Enviar é local na demonstração. Nunca indicar que um provedor recebeu uma mensagem quando o envio não aconteceu.
8. Dados e HTML recebidos por e-mail não podem executar JavaScript ou introduzir conteúdo ativo na aplicação.

## Para implementar e-mail real

Antes de escolher adaptadores, identificar os provedores das dez contas e o ambiente de execução pretendido (local ou servidor). A interface atual não possui autenticação ou API e não solicita senhas.

Implementar uma camada de serviço separada da interface para substituir `createInitialMessages`, `createIncoming` e as operações locais. Manter um modo demo explicitamente separado. Implementar autenticação, autorização por usuário, conexão/revogação de contas, armazenamento de tokens no servidor e sincronização conforme a documentação oficial atual de cada provedor.

Não armazenar client secrets, senhas de e-mail, tokens de refresh ou segredos de sessão no bundle React, em variáveis `VITE_*`, no localStorage, nos logs ou no repositório. Usar cookies de sessão adequados, proteção contra CSRF quando aplicável, validação de entrada, controle de tamanho de anexos e autorização em cada rota. As configurações de segurança devem corresponder ao ambiente de implantação.

O contrato de serviço pode oferecer operações para listar contas, listar mensagens paginadas, buscar/ler mensagens, alterar leitura/favoritos/pastas, salvar rascunhos, enviar, baixar anexos e acompanhar eventos de recebimento. Não inventar integrações funcionais: conectar cada operação de fato ao provedor e tratar falhas, expiração de autorização, limites e reenvio com segurança.

Adicionar verificações que cubram isolamento entre contas/usuários, idempotência de envio, falhas de sincronização, persistência e sanitização. Os testes existentes validam as regras locais e a preservação/limpeza do conteúdo formatado; não validam provedores externos.


## Editor de mensagens

O editor usa Tiptap 3 e mantém `body` (texto para busca/prévia) e `bodyHtml` (HTML formatado). Preservar ambos ao salvar rascunho, enviar, responder ou encaminhar. `src/rich-text.js` é a fronteira para renderização de HTML: não renderizar HTML sem a limpeza definida ali. Manter bloqueados SVG, imagens remotas, scripts e atributos de evento. O renderer precisa continuar compatível com mensagens antigas que só possuem `body`.

Os ícones de inserção são funcionais: arquivo local, link, emoji, imagem local incorporada e assinatura. Não adicionar ações de serviços externos sem integração real.
