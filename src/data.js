import { createId } from './id.js';

export const DEFAULT_ACCOUNTS = [
  { id: 'work', name: 'Trabalho', email: 'trabalho@exemplo.com', color: '#397cf5', tone: '#e7f0ff', initials: 'T' },
  { id: 'personal', name: 'Pessoal', email: 'pessoal@exemplo.com', color: '#e97975', tone: '#fcebe9', initials: 'P' },
  { id: 'study', name: 'Estudos', email: 'estudos@exemplo.com', color: '#4aa982', tone: '#e4f4eb', initials: 'E' },
  { id: 'projects', name: 'Projetos', email: 'projetos@exemplo.com', color: '#9b7bd3', tone: '#f0eafb', initials: 'P' },
  { id: 'clients', name: 'Clientes', email: 'clientes@exemplo.com', color: '#39a5c6', tone: '#e5f4fa', initials: 'C' },
  { id: 'finance', name: 'Financeiro', email: 'financeiro@exemplo.com', color: '#cf9b39', tone: '#fff3db', initials: 'F' },
  { id: 'support', name: 'Suporte', email: 'suporte@exemplo.com', color: '#35a7a5', tone: '#e1f3f1', initials: 'S' },
  { id: 'news', name: 'Newsletter', email: 'newsletter@exemplo.com', color: '#7b8ca8', tone: '#eaf0f7', initials: 'N' },
  { id: 'backup', name: 'Backup', email: 'backup@exemplo.com', color: '#b47c9f', tone: '#f4e9f1', initials: 'B' },
  { id: 'events', name: 'Eventos', email: 'eventos@exemplo.com', color: '#df839f', tone: '#fceaf0', initials: 'E' },
];

const templates = {
  work: [
    ['Mariana Costa', 'mariana@exemplo.com', 'Reunião de alinhamento', 'Olá, Joe,\n\nPodemos confirmar nossa reunião de alinhamento para amanhã, às 10h?\nEnviei a pauta em anexo para você consultar antes do encontro.\n\nObrigada,\nMariana Costa'],
    ['Equipe de projetos', 'equipe@exemplo.com', 'Prioridades para esta semana', 'Olá, Joe,\n\nOrganizamos as prioridades da semana para sua análise. Podemos compartilhar as observações até sexta-feira.\n\nUm abraço,\nEquipe de projetos'],
    ['Rafael Almeida', 'rafael@exemplo.com', 'Retorno sobre a proposta', 'Olá, Joe,\n\nObrigado pelo envio da proposta. Revisamos o documento e temos algumas sugestões para conversar na próxima reunião.\n\nAté breve,\nRafael'],
  ],
  personal: [
    ['Pedro Santos', 'pedro@exemplo.com', 'Vamos combinar o fim de semana?', 'Oi, Joe!\n\nQue tal um almoço no sábado? Podemos combinar o horário e escolher um lugar com calma.\n\nMe avisa quando puder.\nPedro'],
    ['Ana Oliveira', 'ana@exemplo.com', 'As fotos do nosso encontro', 'Oi, Joe,\n\nFoi ótimo encontrar todo mundo! Separei algumas lembranças do dia.\n\nAté a próxima,\nAna'],
  ],
  study: [
    ['Plataforma de estudos', 'estudos@exemplo.com', 'Seu material de revisão', 'Olá, Joe,\n\nSeu material de revisão está disponível. Reserve um tempo para revisar as anotações e resolver os exercícios da semana.\n\nBons estudos!'],
    ['Grupo de estudos', 'grupo@exemplo.com', 'Encontro de revisão confirmado', 'Olá!\n\nNosso próximo encontro de revisão está confirmado. Leve suas anotações e as dúvidas dos últimos exercícios.\n\nAté lá!'],
  ],
  projects: [
    ['Ana Souza', 'ana.souza@exemplo.com', 'Documentos do projeto', 'Olá, Joe,\n\nEnvio os arquivos para sua revisão. Os pontos que precisam de validação estão indicados no documento.\n\nFico à disposição para conversarmos.\nAna Souza'],
    ['Equipe de desenvolvimento', 'dev@exemplo.com', 'Nova versão pronta para revisão', 'Olá, Joe,\n\nConcluímos os ajustes combinados. A nova versão está pronta para você avaliar os fluxos e o acabamento da interface.\n\nEquipe de desenvolvimento'],
  ],
  clients: [
    ['Carlos Lima', 'carlos@exemplo.com', 'Confirmação de atendimento', 'Olá, Joe,\n\nSeu atendimento foi confirmado. Agradecemos o retorno e seguimos à disposição para os próximos passos.\n\nAtenciosamente,\nCarlos Lima'],
    ['Beatriz Ferreira', 'beatriz@exemplo.com', 'Podemos agendar uma conversa?', 'Olá, Joe,\n\nGostaria de conversar sobre os próximos passos do projeto. Você tem disponibilidade nesta semana?\n\nObrigada,\nBeatriz'],
  ],
  finance: [
    ['Equipe Financeira', 'financeiro@exemplo.com', 'Relatório mensal disponível', 'Olá, Joe,\n\nO resumo de outubro já está disponível para conferência. Verifique os lançamentos e nos avise se encontrar alguma divergência.\n\nAtenciosamente,\nEquipe Financeira'],
    ['Contabilidade', 'contabilidade@exemplo.com', 'Conferência de documentos', 'Olá, Joe,\n\nOs documentos recebidos foram organizados para a conferência mensal. Precisamos validar os últimos registros antes do fechamento.\n\nContabilidade'],
  ],
  support: [
    ['Suporte técnico', 'suporte@exemplo.com', 'Atualização da sua solicitação', 'Olá, Joe,\n\nSua solicitação foi atualizada. Nossa equipe está analisando as informações que você enviou.\n\nResponderemos por este mesmo canal.\nEquipe de suporte'],
    ['Central de atendimento', 'atendimento@exemplo.com', 'Como foi seu atendimento?', 'Olá, Joe,\n\nConcluímos o atendimento da sua solicitação. Se ainda precisar de ajuda, responda a esta mensagem.\n\nCentral de atendimento'],
  ],
  news: [
    ['Boletim de tecnologia', 'boletim@exemplo.com', 'Sua leitura da semana chegou', 'Olá, Joe,\n\nSelecionamos conteúdos sobre tecnologia, organização e design para sua leitura da semana.\n\nBoa leitura!'],
    ['Design em pauta', 'design@exemplo.com', 'Ideias para interfaces mais simples', 'Olá!\n\nNesta edição, reunimos ideias sobre hierarquia visual, acessibilidade e organização da informação.\n\nAté a próxima edição.'],
  ],
  backup: [
    ['Rotina de backup', 'backup@exemplo.com', 'Cópia de segurança concluída', 'Olá, Joe,\n\nA rotina de demonstração foi concluída. Este e-mail é um exemplo de aviso automático de cópia de segurança.\n\nSistema de backup'],
  ],
  events: [
    ['Fernanda Oliveira', 'fernanda@exemplo.com', 'Programação do evento', 'Olá, Joe,\n\nSeguem os detalhes da nossa programação. A recepção começará às 9h, seguida pela apresentação dos participantes.\n\nConfirme sua presença respondendo a esta mensagem.\n\nAté lá,\nFernanda Oliveira'],
    ['Equipe de organização', 'eventos@exemplo.com', 'Lembrete: encontro da próxima semana', 'Olá, Joe,\n\nPassando para lembrar do encontro da próxima semana. Vamos compartilhar a programação final em breve.\n\nEquipe de organização'],
  ],
};

export function createInitialMessages(now = Date.now()) {
  const counts = [12, 8, 6, 9, 5, 11, 4, 3, 2, 9];
  const messages = [];
  DEFAULT_ACCOUNTS.forEach((account, ai) => {
    for (let j = 0; j < counts[ai] + 3; j++) {
      const t = templates[account.id][j % templates[account.id].length];
      const rank = j * 10 + ai;
      const read = ai === 0 ? j === 0 || j >= counts[ai] + 1 : j >= counts[ai];
      const attachment = [0, 5, 3, 12, 18, 23, 28, 33, 42, 51, 63, 72].includes(rank);
      messages.push({
        id: `demo-${account.id}-${j}`, accountId: account.id, sender: t[0], from: t[1],
        to: account.email, subject: t[2], body: t[3], date: now - (rank * 17 + 8) * 60000,
        folder: 'inbox', read, starred: [1, 3, 5, 12, 21, 38, 42, 65].includes(rank),
        attachments: attachment ? [{ id: `file-${rank}`, name: rank === 0 ? 'Pauta-da-reuniao.txt' : 'Documento-de-exemplo.txt', type: 'text/plain', content: rank === 0 ? 'PAUTA DA REUNIÃO\n\n1. Prioridades da semana\n2. Revisão das entregas\n3. Próximos passos\n\nDocumento ilustrativo da Central de e-mails.' : 'DOCUMENTO DE EXEMPLO\n\nArquivo de demonstração da Central de e-mails.\nNenhum dado real está incluído neste documento.', size: 248 }] : [],
      });
    }
  });
  messages.push({ id: 'demo-draft', accountId: 'work', sender: 'Trabalho', from: 'trabalho@exemplo.com', to: 'equipe@exemplo.com', subject: 'Retorno sobre as próximas entregas', body: 'Olá, equipe,\n\nEstou revisando os pontos que conversamos.', date: now - 7200000, folder: 'drafts', read: true, starred: false, attachments: [] });
  return messages;
}

export function createIncoming(account, now = Date.now()) {
  const choices = templates[account.id] || templates.work;
  const t = choices[Math.floor(Math.random() * choices.length)];
  return { id: `incoming-${createId()}`, accountId: account.id, sender: t[0], from: t[1], to: account.email, subject: t[2], body: t[3], date: now, folder: 'inbox', read: false, starred: false, attachments: [] };
}

export const DEFAULT_SETTINGS = { theme: 'light', density: 'comfortable', notifications: true, sound: false, autoReceive: false };
