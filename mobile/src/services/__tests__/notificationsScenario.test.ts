import { buildManualNotificationScenario } from '../notifications';
import { AppPreferences } from '../../types/settings';
import { FinancialRecordDto } from '../../types/financialRecord';

const basePrefs: AppPreferences = {
  dark_mode: false,
  notifications_enabled: true,
  device_push_enabled: true,
  notification_permission_prompted: true,
  notify_due_today: true,
  notify_due_tomorrow: true,
  notify_weekly_summary: true,
  notify_xp_and_badges: true,
  large_text: false,
  font_scale: 1,
  reduce_motion: false,
  larger_touch_targets: false,
  onboarding_seen: true,
  onboarding_mode: null,
  tutorial_reopen_enabled: true,
};

const record = (overrides: Partial<FinancialRecordDto>): FinancialRecordDto => ({
  id: Number(overrides.id ?? 1),
  title: String(overrides.title ?? 'Lançamento'),
  description: overrides.description ?? null,
  amount: String(overrides.amount ?? '100'),
  record_type: overrides.record_type ?? 'launch',
  flow_type: overrides.flow_type ?? 'expense',
  category: overrides.category ?? null,
  status: overrides.status ?? 'pending',
  due_date: String(overrides.due_date ?? '2026-04-08'),
  paid_at: overrides.paid_at ?? null,
  recurring: overrides.recurring ?? false,
  recurrence_type: overrides.recurrence_type ?? 'none',
  recurrence_count: overrides.recurrence_count ?? 1,
  group_code: overrides.group_code ?? null,
  installments_total: overrides.installments_total ?? 1,
  installment_number: overrides.installment_number ?? 1,
  notes: overrides.notes ?? null,
  priority: overrides.priority ?? 'normal',
});

describe('notifications weekly summary scenario', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-08T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('considers only current week pending records up to today', () => {
    const records: FinancialRecordDto[] = [
      record({ id: 1, due_date: '2026-04-07', amount: '3000', flow_type: 'income' }),
      record({ id: 2, due_date: '2026-04-08', amount: '1000', flow_type: 'expense' }),
      record({ id: 3, due_date: '2026-04-03', amount: '2000', flow_type: 'expense' }),
      record({ id: 4, due_date: '2026-03-31', amount: '800', flow_type: 'expense' }), // semana anterior
      record({ id: 5, due_date: '2026-04-10', amount: '700', flow_type: 'expense' }), // futuro
      record({ id: 6, due_date: '2026-04-07', amount: '400', flow_type: 'expense', status: 'received' }), // concluído
    ];

    const steps = buildManualNotificationScenario({ records, prefs: basePrefs, userName: 'Teste' });
    const weekly = steps.find((step) => step.kind === 'weekly_summary');

    expect(weekly).toBeDefined();
    expect(weekly?.data?.pending_count).toBe(2);
    expect(weekly?.data?.pending_income_total).toBe(3000);
    expect(weekly?.data?.pending_expense_total).toBe(1000);
    expect(weekly?.data?.projected_balance).toBe(2000);
    expect(String(weekly?.body)).toContain('Até hoje nesta semana');
  });
});
