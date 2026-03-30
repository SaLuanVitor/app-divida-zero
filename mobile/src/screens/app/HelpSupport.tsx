import React from 'react';
import AppText from '../../components/AppText';
import { View, TouchableOpacity, Linking } from 'react-native';
import { ArrowLeft, CircleHelp, Mail, MessageCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { useAccessibility } from '../../context/AccessibilityContext';

const faqs = [
  {
    question: 'Como lançar uma nova dívida ou ganho?',
    answer: 'Toque no botão "+" na barra inferior e escolha entre "Novo ganho" ou "Nova dívida".',
  },
  {
    question: 'Como marcar como pago ou recebido?',
    answer: 'Na lista do mês, use os botões "Pagar" ou "Receber" no card do lançamento.',
  },
  {
    question: 'Por que meu XP mudou após exclusões?',
    answer: 'Quando um registro é removido, o sistema recalcula e ajusta os pontos relacionados.',
  },
];

const HelpSupport = () => {
  const navigation = useNavigation<any>();
  const { fontScale, largerTouchTargets } = useAccessibility();
  const rowHeight = Math.max(Math.round(44 * Math.max(fontScale, 1)), largerTouchTargets ? 52 : 44);

  const openMail = async () => {
    const url = 'mailto:suporte.dividazero@gmail.com?subject=Suporte%20-%20D%C3%ADvida%20Zero';
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  return (
    <Layout scrollable contentContainerClassName="bg-[#f8f7f5] dark:bg-black p-0">
      <View className="bg-white dark:bg-[#121212] px-4 pt-4 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <AppText className="text-slate-900 text-xl font-bold">Ajuda e suporte</AppText>
            <AppText className="text-slate-500 dark:text-slate-300 text-xs">Dúvidas comuns e contato com o suporte.</AppText>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <CircleHelp size={16} color="#64748b" />
            <AppText className="text-slate-700 font-bold ml-2">Perguntas frequentes</AppText>
          </View>

          {faqs.map((faq, index) => (
            <View key={faq.question} className={`${index !== faqs.length - 1 ? 'border-b border-slate-100' : ''} py-3`}>
              <AppText className="text-slate-900 font-semibold">{faq.question}</AppText>
              <AppText className="text-slate-500 dark:text-slate-300 text-sm mt-1">{faq.answer}</AppText>
            </View>
          ))}
        </Card>

        <Card className="p-4">
          <AppText className="text-slate-700 font-bold mb-3">Canais de suporte</AppText>

          <TouchableOpacity
            className="rounded-xl bg-slate-100 px-3 flex-row items-center mb-2"
            style={{ minHeight: rowHeight, height: rowHeight }}
            onPress={openMail}
          >
            <Mail size={16} color="#0f172a" />
            <AppText className="text-slate-800 font-semibold ml-2">Enviar e-mail</AppText>
          </TouchableOpacity>

          <View className="rounded-xl bg-slate-100 px-3 flex-row items-center" style={{ minHeight: rowHeight, height: rowHeight }}>
            <MessageCircle size={16} color="#0f172a" />
            <AppText className="text-slate-800 font-semibold ml-2">Chat no app (em breve)</AppText>
          </View>
        </Card>
      </View>
    </Layout>
  );
};

export default HelpSupport;

