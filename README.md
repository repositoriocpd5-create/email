# Central de e-mails · Joe Amado

Interface em **React + JavaScript + CSS**, versão 1.1, construída com Vite e ícones Lucide. A proposta mantém a paleta cinza perolada e os acentos pastéis da referência, com caixa de entrada unificada e identificação visual das dez contas.

## O que está entregue

- Dez identidades visíveis na lateral, com nomes, endereços, cores e contadores calculados a partir das mensagens.
- Caixa unificada ou filtrada por conta. Busca sem distinção de acentos em remetente, assunto, endereço, corpo e nome de anexo.
- Filtros por não lidas, favoritas e anexos; ordenação por data; seleção e ações em lote.
- Leitura no mesmo espaço; largura dos painéis ajustável no desktop; navegação de lista e leitura em telas menores.
- Nova mensagem, resposta, encaminhamento, Cc/Cco e validação dos destinatários.
- Editor de texto com fonte, tamanho, negrito, itálico, sublinhado, tachado, cores, realce, alinhamento, listas, recuos, citação, desfazer/refazer e remoção de formatação.
- Barra de ícones para anexar arquivo, inserir link, emoji, imagem local e assinatura. A barra de formatação pode ser mostrada ou ocultada.
- Janela de composição expansível. A formatação é preservada nos rascunhos, nas mensagens de demonstração enviadas e nos encaminhamentos.
- Rascunho salvo ao fechar a composição ou clicar em Salvar rascunho. A edição de um rascunho preserva seu identificador.
- Anexos locais com upload e download. Até três anexos, 1 MB por arquivo e 2 MB por mensagem, para respeitar o armazenamento local.
- Arquivamento e lixeira recuperável com opção Desfazer. Exclusão definitiva exige confirmação na interface.
- Avisos de recebimento, central de notificações, som opcional e pedido de permissão para notificações do navegador.
- Recebimentos automáticos de exemplo, opcionais, a cada 45 segundos enquanto a página está aberta.
- Tema claro/escuro, lista confortável/compacta, tooltips acessíveis por foco, efeitos de hover e suporte a movimento reduzido.
- Persistência das mensagens, contas e preferências no localStorage. Sem sincronização entre computadores.

**Esta versão é uma demonstração funcional do frontend. Não há backend de e-mail, autenticação de provedores ou conexão com caixas reais.** O botão Enviar salva em Enviados no navegador. O botão Receber exemplo gera uma mensagem fictícia. Alterar os endereços em Gerenciar contas personaliza as identidades, sem conectá-las a provedores. Os formulários não solicitam senhas.

## Executar no seu computador

Requisito: Node.js 22 ou superior, com npm.

1. Extraia o ZIP e abra a pasta do projeto no VS Code ou Claude Code.
2. Instale as dependências:

```bash
npm install
```

3. Inicie a aplicação:

```bash
npm run dev
```

4. Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

No Windows, também é possível abrir **Iniciar-Windows.cmd**, que executa a instalação inicial e abre o servidor de desenvolvimento.

Para verificar as regras de busca, contagem e organização:

```bash
npm test
```

Para gerar a versão de produção:

```bash
npm run build
```

Para visualizar o build local:

```bash
npm run preview
```

O HTML de `dist` precisa ser servido por HTTP. Não abra `index.html` diretamente como arquivo local. A fonte DM Sans é opcional e carregada pela folha de estilos; sem acesso à fonte, o sistema usa a fonte do computador.

## Testar a experiência

1. Clique em **Receber exemplo** para testar contador e aviso de chegada.
2. Abra a central pelo sino. Os avisos de teste ficam disponíveis durante a sessão atual.
3. Clique em uma conta para restringir a caixa ou em Todas as caixas para voltar à visão unificada.
4. Passe o mouse sobre os ícones ou navegue com Tab para descobrir os tooltips.
5. Responda a uma mensagem. Se trocar a identidade, um aviso indica que a conta difere da destinatária original.
6. Feche uma composição com conteúdo para salvá-la como rascunho.
7. Explore Preferências para testar tema escuro, densidade, som e recebimentos automáticos.

As notificações nativas dependem da permissão do usuário e do suporte do navegador. Elas são solicitadas somente ao clicar em Ativar avisos do navegador; os avisos internos funcionam sem essa permissão. A notificação nativa é usada quando a aba fica em segundo plano. O aplicativo não recebe mensagens nem executa tarefas quando está fechado.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `src/App.jsx` | Componentes, navegação, modais e fluxos de mensagens |
| `src/styles.css` | Identidade visual, temas, estados, tooltips e responsividade |
| `src/data.js` | Dez identidades e dados demonstrativos |
| `src/mail.js` | Busca, filtros, contadores, validação e anexos |
| `src/id.js` | Identificadores locais compatíveis com ambientes HTTP e HTTPS |
| `src/components/RichTextEditor.jsx` | Editor Tiptap, ferramentas de texto e opções de inserção |
| `src/rich-text.js` | Conversão de texto antigo, validação de links e limpeza do HTML |
| `src/rich-editor.css` | Formatação do editor e leitura das mensagens |
| `tests/rich-text.test.js` | Preservação de estilos, conteúdo e bloqueio de HTML ativo |
| `src/main.jsx` | Inicialização do React |
| `tests/mail.test.js` | Regras da caixa de entrada e contadores |
| `CLAUDE.md` | Orientações para continuar o projeto no Claude Code |

## Próxima etapa: contas reais

O código atual não deve receber credenciais reais no frontend. A integração exige uma implementação adicional no servidor, escolhida conforme os provedores das suas dez contas. O frontend foi separado de seus dados de exemplo para facilitar essa evolução.

A implementação deve incluir autenticação do usuário, associação das contas a esse usuário, autorização dos provedores, armazenamento protegido das credenciais/tokens, consulta e sincronização das mensagens e envio pelo provedor correto. Contas Gmail/Google Workspace e Microsoft devem seguir os métodos e escopos suportados pelos respectivos provedores; outros provedores podem exigir uma integração IMAP/SMTP no servidor.

Como contrato inicial, podem ser implementadas rotas para listar contas, listar mensagens com paginação, ler mensagens, atualizar favoritos/leitura/pasta, gerenciar rascunhos, enviar mensagens e baixar anexos. Recebimentos podem atualizar o frontend por SSE ou WebSocket após sincronização no servidor. Essas rotas são um plano de evolução, não serviços já implementados neste pacote.

Antes de usar dados reais, substituir a persistência de mensagens em localStorage por uma estratégia adequada de sessão/cache e armazenamento no servidor. Tratar HTML de e-mail como conteúdo não confiável: sanitizar, isolar a renderização, bloquear conteúdo ativo e controlar imagens remotas. A versão 1.1 utiliza Tiptap para editar e DOMPurify para limpar o HTML antes de salvar e renderizar. São permitidas apenas as marcas e os estilos necessários à composição; scripts, atributos de evento, imagens remotas e SVG são removidos. Mensagens antigas em texto continuam sendo escapadas antes da conversão para HTML.

## Limites da demonstração

- E-mails, nomes e anexos iniciais são fictícios.
- Mensagens, identidades e preferências persistem apenas no mesmo navegador/origem; limpar os dados do site apaga essas alterações.
- Avisos da central, resposta rápida ainda não enviada e seleção atual são mantidos somente durante a sessão da página.
- O navegador pode limitar o armazenamento. Se ele encher, o aplicativo informa que as alterações mais recentes estão apenas na sessão.
- A identidade Joe Amado é visual e não representa login ou autenticação.


## Editor de mensagens · versão 1.1

Selecione um trecho e use a barra de formatação. Para formatar o texto inteiro, clique na área de escrita e pressione Ctrl+A antes de escolher fonte ou tamanho. O botão Aa alterna a barra. Ctrl+B, Ctrl+I e Ctrl+U aplicam marcas; Ctrl+K abre a inserção de link enquanto o editor está focado. Ctrl+Z desfaz e Ctrl+Shift+Z refaz.

Imagens no corpo aceitam PNG, JPG, WebP e GIF de até 700 KB por arquivo, com limite de 2 MB para o HTML com imagens. Elas são incorporadas à mensagem de demonstração e consomem o armazenamento local. Use a seleção da imagem e Backspace para removê-la. Os anexos seguem os limites próprios já descritos.

A assinatura pode ser editada antes da inserção. O botão não modifica assinaturas dos seus provedores. Nenhuma integração com Google Drive ou modo confidencial foi simulada.

A suíte inclui 13 testes: sete da caixa de entrada e seis da preservação e limpeza do conteúdo formatado. Os testes não realizam envio a provedores de e-mail.
