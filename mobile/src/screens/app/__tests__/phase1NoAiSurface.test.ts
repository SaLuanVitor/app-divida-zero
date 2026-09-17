import fs from 'fs';
import path from 'path';

const readScreen = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', `${name}.tsx`), 'utf-8');

describe('phase 1 surface without AI', () => {
  it('keeps most AI services out of the main app screens during gradual rollout', () => {
    const filesWithoutAi = ['Relatorios', 'Lancamentos', 'AppSettings', 'NotificationSettings'];

    filesWithoutAi.forEach((file) => {
      const source = readScreen(file);
      expect(source).not.toContain('services/ai');
    });

    const home = readScreen('Home');
    expect(home).toContain('getDailyMessageToday');
    expect(home).toContain('getAiNextAction');
    expect(home).not.toContain('getAiAlerts');
    expect(home).not.toContain('getAiReportsBriefing');
    expect(home).not.toContain('getAiCategorizeRecord');
  });

  it('does not show AI labels in user-facing main screens', () => {
    const combined = [
      readScreen('Home'),
      readScreen('Relatorios'),
      readScreen('Lancamentos'),
      readScreen('AppSettings'),
      readScreen('NotificationSettings'),
    ].join('\n');

    expect(combined).not.toContain('Assistente IA');
    expect(combined).not.toContain('Sugerir com IA');
    expect(combined).not.toContain('Resumo inteligente');
  });
});
