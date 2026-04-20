import fs from 'fs';
import path from 'path';

const readScreen = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', `${name}.tsx`), 'utf-8');

describe('phase 1 surface without AI', () => {
  it('keeps AI service out of the main app screens', () => {
    const files = ['Home', 'Relatorios', 'Lancamentos', 'AppSettings', 'NotificationSettings'];

    files.forEach((file) => {
      const source = readScreen(file);
      expect(source).not.toContain("services/ai");
    });
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
