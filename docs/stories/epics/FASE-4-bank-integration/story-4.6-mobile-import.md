# Story 4.6 — Mobile: Import Screen + Transaction Review

> **Fase:** 4 — Integração Bancária
> **Subfase:** 4a1 — Upload + Parsing
> **Story:** 4.6 — Mobile: Import Screen
> **Prioridade:** Alta
> **Dependências:** Stories 4.4 + 4.5 (backend endpoints prontos)

---

## Acceptance Criteria

- [ ] AC-01: Tela "Importar Extrato" acessível pelo menu Profile
- [ ] AC-02: File picker para selecionar arquivos .ofx, .qfx, .csv
- [ ] AC-03: Upload com barra de progresso visível
- [ ] AC-04: Polling automático de status a cada 3s
- [ ] AC-05: Ao finalizar, navega para tela de revisão
- [ ] AC-06: Tela de revisão lista transações pending + duplicate
- [ ] AC-07: Duplicatas sinalizadas com ícone + reason (amarelo = fuzzy, vermelho = exact)
- [ ] AC-08: Checkbox de seleção individual + "Selecionar todas"
- [ ] AC-09: Botão "Aceitar selecionadas" + "Rejeitar" em lote
- [ ] AC-10: Confirmação antes de aceitar/rejeitar
- [ ] AC-11: Após aceitar, feedback de sucesso + atualização automática da lista
- [ ] AC-12: Tratamento de erros: upload inválido, timeout, falha de parsing
- [ ] AC-13: Guia "Como exportar extrato" com passo-a-passo por banco (modal)

---

## Files

### Mobile API Service

```typescript
// mobile/src/services/bankStatements.ts
import api from './api';

export interface ImportedTransaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  flow_type: 'income' | 'expense';
  suggested_category: string | null;
  ai_confidence: number | null;
  original_category: string | null;
  status: 'pending' | 'duplicate' | 'accepted' | 'rejected';
  duplicate_reason: 'exact_match' | 'fuzzy_match' | null;
  duplicate_of_id: number | null;
}

export interface UploadResponse {
  batch_id: string;
  status: 'processing';
  message: string;
}

export interface StatusResponse {
  batch_id: string;
  status: 'processing' | 'done' | 'error';
  total?: number;
  pending?: number;
  duplicates?: number;
}

export const bankStatementsApi = {
  upload: (file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append('file', file as any);
    return api.post<UploadResponse>('/bank/statements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getStatus: (batchId: string) =>
    api.get<StatusResponse>(`/bank/statements/${batchId}/status`),

  getPending: () =>
    api.get<{ transactions: ImportedTransaction[] }>('/bank/transactions/pending'),

  accept: (transactionIds: number[]) =>
    api.post('/bank/transactions/accept', { transaction_ids: transactionIds }),

  reject: (transactionIds: number[]) =>
    api.post('/bank/transactions/reject', { transaction_ids: transactionIds }),

  merge: (id: number, financialRecordId: number) =>
    api.post(`/bank/transactions/${id}/merge`, { financial_record_id: financialRecordId }),
};
```

### Import Screen

```typescript
// mobile/src/screens/app/BankImportScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bankStatementsApi } from '../../services/bankStatements';

export default function BankImportScreen({ navigation }: any) {
  const [uploading, setUploading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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
      const response = await bankStatementsApi.upload({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      setBatchId(response.data.batch_id);
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
          Alert.alert('Erro', 'Falha ao processar o extrato.');
        }
      } catch {
        clearInterval(interval);
        setUploading(false);
      }
    }, 3000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-2">Importar Extrato</Text>
      <Text className="text-gray-500 mb-6">
        Exporte seu extrato bancário (OFX ou CSV) e importe automaticamente.
      </Text>

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
```

### Review Screen

```typescript
// mobile/src/screens/app/BankReviewScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bankStatementsApi, ImportedTransaction } from '../../services/bankStatements';

export default function BankReviewScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const res = await bankStatementsApi.getPending();
      setTransactions(res.data.transactions);
    } catch {
      Alert.alert('Erro', 'Falha ao carregar transações.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map(t => t.id)));
    }
  };

  const handleAccept = async () => {
    if (selected.size === 0) {
      Alert.alert('Selecione', 'Selecione ao menos uma transação.');
      return;
    }
    setAccepting(true);
    try {
      await bankStatementsApi.accept(Array.from(selected));
      Alert.alert('Sucesso', `${selected.size} transações importadas!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.error || 'Falha ao importar.');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (selected.size === 0) return;
    Alert.alert('Rejeitar', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rejeitar',
        style: 'destructive',
        onPress: async () => {
          await bankStatementsApi.reject(Array.from(selected));
          loadTransactions();
          setSelected(new Set());
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ImportedTransaction }) => (
    <TouchableOpacity
      className={`p-4 mb-2 rounded-xl border ${
        selected.has(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      } ${item.status === 'duplicate' ? 'border-yellow-400 bg-yellow-50' : ''}`}
      onPress={() => toggleSelect(item.id)}
    >
      <View className="flex-row justify-between">
        <Text className="flex-1 font-medium" numberOfLines={1}>
          {item.description}
        </Text>
        <Text className={`font-bold ${item.flow_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
          {item.flow_type === 'income' ? '+' : '-'}R$ {item.amount}
        </Text>
      </View>
      <View className="flex-row mt-1">
        <Text className="text-gray-400 text-sm">{item.date}</Text>
        {item.suggested_category && (
          <Text className="text-gray-400 text-sm ml-4">{item.suggested_category}</Text>
        )}
        {item.status === 'duplicate' && (
          <View className="ml-auto">
            <Text className="text-yellow-600 text-xs">
              {item.duplicate_reason === 'exact_match' ? '⚠️ Duplicata' : '🔶 Possível dup.'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-2">Revisar Transações</Text>
      <Text className="text-gray-500 mb-4">
        {transactions.length} transações encontradas
      </Text>

      <TouchableOpacity onPress={selectAll} className="mb-2">
        <Text className="text-blue-500">
          {selected.size === transactions.length ? 'Desmarcar todas' : 'Selecionar todas'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={transactions}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        className="flex-1"
      />

      {selected.size > 0 && (
        <View className="flex-row pt-4 gap-3">
          <TouchableOpacity
            className="flex-1 bg-green-500 py-3 rounded-xl items-center"
            onPress={handleAccept}
            disabled={accepting}
          >
            <Text className="text-white font-semibold">
              {accepting ? '...' : `Aceitar (${selected.size})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-500 py-3 rounded-xl items-center"
            onPress={handleReject}
          >
            <Text className="text-white font-semibold">Rejeitar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
```

### Navigation Registration

```typescript
// Em AppNavigator.tsx — adicionar:
import BankImportScreen from '../screens/app/BankImportScreen';
import BankReviewScreen from '../screens/app/BankReviewScreen';

// No stack:
<Stack.Screen name="BankImport" component={BankImportScreen} options={{ title: 'Importar Extrato' }} />
<Stack.Screen name="BankReview" component={BankReviewScreen} options={{ title: 'Revisar' }} />
```

### Menu Item

```typescript
// Em Profile.tsx — adicionar botão:
<TouchableOpacity
  className="flex-row items-center py-4 border-b border-gray-100"
  onPress={() => navigation.navigate('BankImport')}
>
  <Text className="text-lg">🏦 Importar Extrato</Text>
  <Text className="ml-auto text-gray-400">{'>'}</Text>
</TouchableOpacity>
```
