import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  CalendarDays,
  ChartColumnIncreasing,
  CircleHelp,
  CirclePlus,
  Clock3,
  Crown,
  Filter,
  House,
  Landmark,
  Lightbulb,
  Lock,
  LockKeyhole,
  LucideIcon,
  Mail,
  PiggyBank,
  Plus,
  PlusCircle,
  Repeat,
  Rocket,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
  Wallet,
  WalletCards,
} from 'lucide-react-native';

export type ProfileIconOption = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export type ProfileFrameOption = {
  key: string;
  label: string;
  borderColor: string;
  borderWidth: number;
  backgroundColor: string;
};

export const DEFAULT_PROFILE_ICON_KEY = 'icon_01';
export const DEFAULT_PROFILE_FRAME_KEY = 'frame_01';
export const MAX_PROFILE_ICONS = 30;
export const MAX_PROFILE_FRAMES = 10;

const ICON_COMPONENTS: LucideIcon[] = [
  User,
  Wallet,
  Landmark,
  Target,
  Trophy,
  Crown,
  Shield,
  Bell,
  ChartColumnIncreasing,
  PiggyBank,
  Sparkles,
  Rocket,
  Lightbulb,
  CircleHelp,
  Mail,
  Lock,
  LockKeyhole,
  Clock3,
  Filter,
  Search,
  Plus,
  CirclePlus,
  PlusCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  WalletCards,
  CalendarDays,
  House,
  Repeat,
  ShieldCheck,
];

const ICON_LABELS = [
  'Usuario',
  'Carteira',
  'Banco',
  'Meta',
  'Conquista',
  'Mestre',
  'Protecao',
  'Alerta',
  'Relatorio',
  'Economia',
  'Brilho',
  'Foco',
  'Ideia',
  'Ajuda',
  'Contato',
  'Cadeado',
  'Seguranca',
  'Tempo',
  'Filtro',
  'Busca',
  'Somar',
  'Adicionar',
  'Novo',
  'Alta',
  'Baixa',
  'Cartoes',
  'Agenda',
  'Casa',
  'Rotina',
  'Guardiao',
];

export const PROFILE_ICON_OPTIONS: ProfileIconOption[] = ICON_COMPONENTS.map((icon, index) => ({
  key: `icon_${String(index + 1).padStart(2, '0')}`,
  label: ICON_LABELS[index],
  icon,
}));

export const PROFILE_FRAME_OPTIONS: ProfileFrameOption[] = [
  { key: 'frame_01', label: 'Bronze', borderColor: '#f48c25', borderWidth: 3, backgroundColor: '#fff7ed' },
  { key: 'frame_02', label: 'Prata', borderColor: '#94a3b8', borderWidth: 3, backgroundColor: '#f8fafc' },
  { key: 'frame_03', label: 'Ouro', borderColor: '#f59e0b', borderWidth: 4, backgroundColor: '#fffbeb' },
  { key: 'frame_04', label: 'Esmeralda', borderColor: '#10b981', borderWidth: 4, backgroundColor: '#ecfdf5' },
  { key: 'frame_05', label: 'Safira', borderColor: '#3b82f6', borderWidth: 4, backgroundColor: '#eff6ff' },
  { key: 'frame_06', label: 'Ametista', borderColor: '#8b5cf6', borderWidth: 4, backgroundColor: '#f5f3ff' },
  { key: 'frame_07', label: 'Rubi', borderColor: '#ef4444', borderWidth: 4, backgroundColor: '#fef2f2' },
  { key: 'frame_08', label: 'Onix', borderColor: '#334155', borderWidth: 4, backgroundColor: '#f1f5f9' },
  { key: 'frame_09', label: 'Aurora', borderColor: '#14b8a6', borderWidth: 5, backgroundColor: '#f0fdfa' },
  { key: 'frame_10', label: 'Lendaria', borderColor: '#eab308', borderWidth: 5, backgroundColor: '#fefce8' },
];

export const getUnlockedIconsCount = (level: number) => Math.max(1, Math.min(MAX_PROFILE_ICONS, 10 + (Math.max(level, 1) - 1)));
export const getUnlockedFramesCount = (level: number) => Math.max(1, Math.min(MAX_PROFILE_FRAMES, 1 + Math.floor(Math.max(level, 1) / 10)));

export const getIconRequiredLevel = (iconKey: string) => {
  const index = PROFILE_ICON_OPTIONS.findIndex((item) => item.key === iconKey) + 1;
  if (index <= 0) return Infinity;
  return Math.max(1, index - 9);
};

export const getFrameRequiredLevel = (frameKey: string) => {
  const index = PROFILE_FRAME_OPTIONS.findIndex((item) => item.key === frameKey) + 1;
  if (index <= 0) return Infinity;
  return index === 1 ? 1 : (index - 1) * 10;
};

export const isIconUnlocked = (iconKey: string, level: number) => getIconRequiredLevel(iconKey) <= Math.max(level, 1);
export const isFrameUnlocked = (frameKey: string, level: number) => getFrameRequiredLevel(frameKey) <= Math.max(level, 1);

export const normalizeProfileIconKey = (value?: string | null) =>
  PROFILE_ICON_OPTIONS.some((item) => item.key === value) ? String(value) : DEFAULT_PROFILE_ICON_KEY;

export const normalizeProfileFrameKey = (value?: string | null) =>
  PROFILE_FRAME_OPTIONS.some((item) => item.key === value) ? String(value) : DEFAULT_PROFILE_FRAME_KEY;

export const getProfileIconOption = (iconKey?: string | null) => {
  const normalized = normalizeProfileIconKey(iconKey);
  return PROFILE_ICON_OPTIONS.find((item) => item.key === normalized) ?? PROFILE_ICON_OPTIONS[0];
};

export const getProfileFrameOption = (frameKey?: string | null) => {
  const normalized = normalizeProfileFrameKey(frameKey);
  return PROFILE_FRAME_OPTIONS.find((item) => item.key === normalized) ?? PROFILE_FRAME_OPTIONS[0];
};
