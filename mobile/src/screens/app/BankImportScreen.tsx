import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bankStatementsApi } from '../../services/bankStatements';

export default function BankImportScreen({ navigation }: any) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/x-ofx',
          'application/vnd.intu.qfx',
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file.name?.match(/\.(ofx|qfx|csv)$/i)) {
        Alert.alert('Formato inválido', 'Use arquivos OFX, QFX ou CSV.');
        return;
      }

      setUploading(true);
      setStatus(null);
      setErrorMessage(null);
      const response = await bankStatementsApi.upload({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      pollStatus(response.data.batch_id);
    } catch (error: any) {
      setUploading(false);
      Alert.alert('Erro', error?.response?.data?.error || 'Falha ao enviar arquivo.');
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await bankStatementsApi.getStatus(id);
        setStatus(res.data.status);

        if (res.data.status === 'done') {
          clearInterval(interval);
          setUploading(false);
          navigation.replace('BankReview', { batchId: id });
        } else if (res.data.status === 'error') {
          clearInterval(interval);
          setUploading(false);
          setErrorMessage('Falha ao processar o extrato. Tente novamente com outro arquivo.');
          Alert.alert(
            'Erro no processamento',
            'O servidor não conseguiu processar o extrato. Verifique se o arquivo está válido e tente novamente.'
          );
        }
      } catch {
        clearInterval(interval);
        setUploading(false);
        setErrorMessage('Não foi possível verificar o status do processamento. Tente novamente.');
        Alert.alert('Erro', 'Falha ao consultar o status do processamento.');
      }
    }, 3000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-2">Importar Extrato</Text>
      <Text className="text-gray-500 mb-6">
        Exporte seu extrato bancário (OFX ou CSV) e importe automaticamente.
      </Text>

      {errorMessage && (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <Text className="text-red-700">{errorMessage}</Text>
        </View>
      )}

      {uploading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">Processando extrato...</Text>
          {status && <Text className="text-sm text-gray-400 mt-2">Status: {status}</Text>}
        </View>
      ) : (
        <TouchableOpacity
          className="bg-blue-500 py-4 px-6 rounded-xl items-center"
          onPress={handlePickFile}
        >
          <Text className="text-white font-semibold text-lg">Selecionar Arquivo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        className="mt-4 py-2"
        onPress={() => Alert.alert(
          'Como exportar extrato',
          'Nubank: App → Extrato → Exportar → OFX\n' +
          'Itaú: Internet Banking → Extratos → Download → OFX\n' +
          'Bradesco: App → Extrato → Exportar → OFX\n' +
          'Inter: App → Extrato → Exportar → CSV\n' +
          'Caixa: Internet Banking → Extratos → Salvar como → OFX'
        )}
      >
        <Text className="text-blue-500 text-center">Como exportar meu extrato?</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
