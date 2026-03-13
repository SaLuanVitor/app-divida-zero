import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { ArrowLeft, CircleHelp, Mail, MessageCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Card from '../../components/Card';

const faqs = [
  {
    question: 'Como lancar uma nova divida ou ganho?',
    answer: 'Toque no botao "+" na barra inferior e escolha entre "Novo ganho" ou "Nova divida".',
  },
  {
    question: 'Como marcar como pago ou recebido?',
    answer: 'Na lista do mes, use os botoes "Pagar" ou "Receber" no card do lancamento.',
  },
  {
    question: 'Por que meu XP mudou apos exclusoes?',
    answer: 'Quando um registro e removido, o sistema recalcula e ajusta os pontos relacionados.',
  },
];

const HelpSupport = () => {
  const navigation = useNavigation<any>();

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
            <Text className="text-slate-900 text-xl font-bold">Ajuda e suporte</Text>
            <Text className="text-slate-500 dark:text-slate-300 text-xs">Dividas comuns e contato com o suporte.</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Card className="p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <CircleHelp size={16} color="#64748b" />
            <Text className="text-slate-700 font-bold ml-2">Perguntas frequentes</Text>
          </View>

          {faqs.map((faq, index) => (
            <View key={faq.question} className={`${index !== faqs.length - 1 ? 'border-b border-slate-100' : ''} py-3`}>
              <Text className="text-slate-900 font-semibold">{faq.question}</Text>
              <Text className="text-slate-500 dark:text-slate-300 text-sm mt-1">{faq.answer}</Text>
            </View>
          ))}
        </Card>

        <Card className="p-4">
          <Text className="text-slate-700 font-bold mb-3">Canais de suporte</Text>

          <TouchableOpacity className="h-11 rounded-xl bg-slate-100 px-3 flex-row items-center mb-2" onPress={openMail}>
            <Mail size={16} color="#0f172a" />
            <Text className="text-slate-800 font-semibold ml-2">Enviar e-mail</Text>
          </TouchableOpacity>

          <View className="h-11 rounded-xl bg-slate-100 px-3 flex-row items-center">
            <MessageCircle size={16} color="#0f172a" />
            <Text className="text-slate-800 font-semibold ml-2">Chat no app (em breve)</Text>
          </View>
        </Card>
      </View>
    </Layout>
  );
};

export default HelpSupport;




