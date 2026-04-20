export interface LocalDailyMessage {
  id: number;
  date: string;
  title: string;
  body: string;
}

const DAILY_MESSAGES: Array<{ title: string; body: string }> = [
  { title: 'Comece pelo essencial', body: 'Registre primeiro o que vence hoje para ter clareza do dia.' },
  { title: 'Pequenos passos contam', body: 'Uma ação simples agora evita acúmulo e reduz estresse depois.' },
  { title: 'Priorize com calma', body: 'Escolha uma pendência importante e finalize antes de abrir outra.' },
  { title: 'Constância vence pressa', body: 'Manter o ritmo diário é mais eficaz do que mudanças radicais.' },
  { title: 'Organize por categoria', body: 'Separar ganhos e despesas facilita enxergar onde ajustar.' },
  { title: 'Reveja seu mês', body: 'Olhe seu saldo projetado para antecipar decisões da semana.' },
  { title: 'Evite atrasos', body: 'Ative lembretes e confira os próximos vencimentos com antecedência.' },
  { title: 'Celebre progresso', body: 'Cada registro concluído é um avanço real no seu controle.' },
  { title: 'Mantenha foco', body: 'Evite comparar metas; concentre-se na próxima ação do seu plano.' },
  { title: 'Planeje o próximo passo', body: 'Defina agora uma ação para amanhã e reduza indecisão.' },
  { title: 'Revise prioridades', body: 'Se tudo parece urgente, comece pelo que gera maior impacto.' },
  { title: 'Ajuste sem culpa', body: 'Mudanças no plano fazem parte; o importante é continuar.' },
  { title: 'Visão de longo prazo', body: 'Decisões consistentes hoje fortalecem sua meta principal.' },
  { title: 'Feche o dia bem', body: 'Antes de sair, confirme se os registros do dia estão atualizados.' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dayNumberFromLocalDate = (date: Date) =>
  Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / DAY_MS);

export const getLocalDailyMessage = (referenceDate: Date = new Date()): LocalDailyMessage => {
  const dayNumber = dayNumberFromLocalDate(referenceDate);
  const safeIndex = ((dayNumber % DAILY_MESSAGES.length) + DAILY_MESSAGES.length) % DAILY_MESSAGES.length;
  const message = DAILY_MESSAGES[safeIndex];

  return {
    id: safeIndex + 1,
    date: toDateKey(referenceDate),
    title: message.title,
    body: message.body,
  };
};

export const localDailyMessagesCatalog = DAILY_MESSAGES;
