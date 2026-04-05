import { Platform } from 'react-native';
import { ReportFlowFilter, ReportStatusFilter, ReportsSummaryDto } from '../types/report';

export interface ReportsPdfExportInput {
  summary: ReportsSummaryDto;
  periodLabel: string;
  filters: {
    status: ReportStatusFilter;
    flow_type: ReportFlowFilter;
    category: string | null;
  };
}

export interface ReportsPdfExportResult {
  ok: boolean;
  reason?: 'unsupported' | 'share_unavailable' | 'generation_failed' | 'download_permission_denied';
  message: string;
  shared?: boolean;
  downloaded?: boolean;
  fileUri?: string;
  filename?: string;
}

interface ReportsPdfExportPayload {
  generatedAt: string;
  periodLabel: string;
  filters: {
    status: string;
    flowType: string;
    category: string;
  };
  indicators: Array<{ label: string; value: string }>;
  monthlySummary: Array<{ label: string; value: string }>;
  trendRows: Array<{ monthLabel: string; income: string; expense: string; balance: string }>;
  categoryRows: Array<{ category: string; total: string; percentage: string }>;
  recordRows: Array<{ title: string; category: string; dueDate: string; status: string; amount: string }>;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

const formatCurrency = (value: string | number) => currencyFormatter.format(Number(value || 0));

const formatDate = (isoDate: string) => {
  const [year, month, day] = (isoDate || '').split('-');
  if (!year || !month || !day) return isoDate || '-';
  return `${day}/${month}/${year}`;
};

const toStatusLabel = (status: ReportStatusFilter) => {
  if (status === 'pending') return 'Pendentes';
  if (status === 'completed') return 'Concluídos';
  return 'Todos';
};

const toFlowLabel = (flow: ReportFlowFilter) => {
  if (flow === 'income') return 'Entradas';
  if (flow === 'expense') return 'Saídas';
  return 'Todos os tipos';
};

const toRecordStatusLabel = (status: ReportsSummaryDto['detailed_records'][number]['status']) => {
  if (status === 'pending') return 'Pendente';
  if (status === 'received') return 'Recebido';
  return 'Pago';
};

const sanitizeText = (value: unknown, fallback = '-') => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const buildReportsPdfPayload = ({ summary, periodLabel, filters }: ReportsPdfExportInput): ReportsPdfExportPayload => {
  const trendRows = summary.monthly_trend.map((item) => {
    const monthLabelRaw = monthFormatter.format(new Date(item.year, item.month - 1, 1));
    return {
      monthLabel: monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1),
      income: formatCurrency(item.income_total),
      expense: formatCurrency(item.expense_total),
      balance: formatCurrency(item.balance),
    };
  });

  return {
    generatedAt: dateTimeFormatter.format(new Date()),
    periodLabel: sanitizeText(periodLabel, '-'),
    filters: {
      status: toStatusLabel(filters.status),
      flowType: toFlowLabel(filters.flow_type),
      category: sanitizeText(filters.category, 'Todas as categorias'),
    },
    indicators: [
      { label: 'Saldo quitado no período', value: formatCurrency(summary.period_indicators.settled_balance_total) },
      { label: 'Projeção no período', value: formatCurrency(summary.period_indicators.projected_balance_total) },
      { label: 'Pendente a receber', value: formatCurrency(summary.period_indicators.pending_income_total) },
      { label: 'Pendente a pagar', value: formatCurrency(summary.period_indicators.pending_expense_total) },
    ],
    monthlySummary: [
      { label: 'Saldo mensal', value: formatCurrency(summary.monthly_summary.balance) },
      { label: 'Entradas', value: formatCurrency(summary.monthly_summary.income_total) },
      { label: 'Saídas', value: formatCurrency(summary.monthly_summary.expense_total) },
      { label: 'Registros', value: String(summary.monthly_summary.records_count || 0) },
    ],
    trendRows,
    categoryRows: summary.categories_breakdown.map((item) => ({
      category: sanitizeText(item.category, 'Sem categoria'),
      total: formatCurrency(item.total),
      percentage: `${Number(item.percentage || 0).toFixed(1)}%`,
    })),
    recordRows: summary.detailed_records.map((item) => ({
      title: sanitizeText(item.title, 'Lançamento'),
      category: sanitizeText(item.category, 'Sem categoria'),
      dueDate: formatDate(item.due_date),
      status: toRecordStatusLabel(item.status),
      amount: formatCurrency(item.amount),
    })),
  };
};

const buildRows = (rows: string[][]) =>
  rows
    .map((columns, rowIndex) => {
      const cells = columns
        .map((column, columnIndex) => {
          const tag = rowIndex === 0 ? 'th' : 'td';
          const className = rowIndex === 0 ? 'table-head' : columnIndex === columns.length - 1 ? 'text-right' : '';
          return `<${tag}${className ? ` class="${className}"` : ''}>${escapeHtml(column)}</${tag}>`;
        })
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

const renderReportsHtml = (payload: ReportsPdfExportPayload) => {
  const indicatorsHtml = payload.indicators
    .map((item) => `<div class="metric"><div class="metric-label">${escapeHtml(item.label)}</div><div class="metric-value">${escapeHtml(item.value)}</div></div>`)
    .join('');

  const monthlySummaryHtml = payload.monthlySummary
    .map((item) => `<li><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></li>`)
    .join('');

  const trendTableRows = buildRows([
    ['Mês', 'Entradas', 'Saídas', 'Saldo'],
    ...payload.trendRows.map((row) => [row.monthLabel, row.income, row.expense, row.balance]),
  ]);

  const categoryTableRows = buildRows([
    ['Categoria', 'Total', 'Participação'],
    ...(payload.categoryRows.length
      ? payload.categoryRows.map((row) => [row.category, row.total, row.percentage])
      : [['Sem dados para os filtros selecionados.', '-', '-']]),
  ]);

  const recordsTableRows = buildRows([
    ['Título', 'Categoria', 'Vencimento', 'Status', 'Valor'],
    ...(payload.recordRows.length
      ? payload.recordRows.map((row) => [row.title, row.category, row.dueDate, row.status, row.amount])
      : [['Sem lançamentos no período selecionado.', '-', '-', '-', '-']]),
  ]);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Relatório - Dívida Zero</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #0f172a; }
      h1, h2 { margin: 0 0 8px; }
      h1 { font-size: 22px; }
      h2 { font-size: 16px; margin-top: 20px; }
      p { margin: 0; }
      .muted { color: #475569; font-size: 12px; margin-bottom: 12px; }
      .chip { display: inline-block; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 10px; margin-right: 6px; margin-top: 6px; font-size: 12px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
      .metric { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
      .metric-label { font-size: 12px; color: #475569; margin-bottom: 4px; }
      .metric-value { font-size: 14px; font-weight: 700; }
      ul.summary { list-style: none; margin: 0; padding: 0; border: 1px solid #e2e8f0; border-radius: 10px; }
      ul.summary li { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
      ul.summary li:last-child { border-bottom: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
      th.table-head { background: #f8fafc; font-weight: 700; }
      .text-right { text-align: right; }
    </style>
  </head>
  <body>
    <h1>Relatório Financeiro</h1>
    <p class="muted">Gerado em ${escapeHtml(payload.generatedAt)}</p>

    <div class="chip">Período: ${escapeHtml(payload.periodLabel)}</div>
    <div class="chip">Status: ${escapeHtml(payload.filters.status)}</div>
    <div class="chip">Tipo: ${escapeHtml(payload.filters.flowType)}</div>
    <div class="chip">Categoria: ${escapeHtml(payload.filters.category)}</div>

    <h2>Indicadores do período</h2>
    <div class="grid">${indicatorsHtml}</div>

    <h2>Resumo mensal</h2>
    <ul class="summary">${monthlySummaryHtml}</ul>

    <h2>Tendência (últimos meses)</h2>
    <table>${trendTableRows}</table>

    <h2>Detalhamento por categoria</h2>
    <table>${categoryTableRows}</table>

    <h2>Lançamentos do período</h2>
    <table>${recordsTableRows}</table>
  </body>
</html>`;
};

const safeFileSuffix = (value: string) => value.normalize('NFD').replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();

const savePdfOnAndroid = async (sourceUri: string, filename: string): Promise<{ downloaded: boolean; reason?: 'download_permission_denied' }> => {
  if (Platform.OS !== 'android') return { downloaded: false };

  let FileSystemModule: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    FileSystemModule = require('expo-file-system');
  } catch {
    return { downloaded: false };
  }

  const saf = FileSystemModule?.StorageAccessFramework;
  if (
    !saf ||
    typeof saf.requestDirectoryPermissionsAsync !== 'function' ||
    typeof saf.createFileAsync !== 'function' ||
    typeof FileSystemModule.readAsStringAsync !== 'function' ||
    typeof FileSystemModule.writeAsStringAsync !== 'function'
  ) {
    return { downloaded: false };
  }

  try {
    const permission = await saf.requestDirectoryPermissionsAsync();
    if (!permission?.granted || !permission.directoryUri) {
      return { downloaded: false, reason: 'download_permission_denied' };
    }

    const targetUri = await saf.createFileAsync(permission.directoryUri, filename, 'application/pdf');
    const base64 = await FileSystemModule.readAsStringAsync(sourceUri, { encoding: FileSystemModule.EncodingType.Base64 });
    await FileSystemModule.writeAsStringAsync(targetUri, base64, { encoding: FileSystemModule.EncodingType.Base64 });
    return { downloaded: true };
  } catch {
    return { downloaded: false };
  }
};

export const exportReportsPdf = async (input: ReportsPdfExportInput): Promise<ReportsPdfExportResult> => {
  let PrintModule: any;
  let SharingModule: any;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    PrintModule = require('expo-print');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SharingModule = require('expo-sharing');
  } catch {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Exportação de PDF não está disponível neste ambiente.',
    };
  }

  if (typeof PrintModule?.printToFileAsync !== 'function') {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Não foi possível gerar PDF neste dispositivo.',
    };
  }

  try {
    const payload = buildReportsPdfPayload(input);
    const html = renderReportsHtml(payload);
    const file = await PrintModule.printToFileAsync({ html, base64: false });
    const filename = `relatorio-${safeFileSuffix(payload.periodLabel || 'periodo')}.pdf`;
    const downloadResult = await savePdfOnAndroid(file.uri, filename);

    const canShare = typeof SharingModule?.isAvailableAsync === 'function' ? await SharingModule.isAvailableAsync() : false;

    if (canShare && typeof SharingModule?.shareAsync === 'function') {
      await SharingModule.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Compartilhar relatório em PDF',
      });
      return {
        ok: true,
        message: downloadResult.downloaded
          ? 'PDF salvo no dispositivo e compartilhado com sucesso.'
          : 'PDF gerado e compartilhado com sucesso.',
        shared: true,
        downloaded: downloadResult.downloaded,
        fileUri: file.uri,
        filename,
      };
    }

    if (downloadResult.downloaded) {
      return {
        ok: true,
        message: 'PDF salvo no dispositivo com sucesso.',
        downloaded: true,
        fileUri: file.uri,
        filename,
      };
    }

    return {
      ok: false,
      reason: downloadResult.reason === 'download_permission_denied' ? 'download_permission_denied' : 'share_unavailable',
      fileUri: file.uri,
      message:
        downloadResult.reason === 'download_permission_denied'
          ? 'PDF gerado, mas você não permitiu salvar no dispositivo.'
          : 'PDF gerado, mas o compartilhamento não está disponível neste ambiente.',
    };
  } catch {
    return {
      ok: false,
      reason: 'generation_failed',
      message: 'Não foi possível gerar o PDF do relatório agora. Tente novamente.',
    };
  }
};
