/**
 * Converte um timestamp ISO em rótulo relativo em pt-BR.
 * Ex.: "agora", "há 5 min", "há 2 horas", "ontem", "há 3 dias", e data curta para mais velhos.
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;

  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
