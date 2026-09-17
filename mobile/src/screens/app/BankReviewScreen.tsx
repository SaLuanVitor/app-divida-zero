import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bankStatementsApi, ImportedTransaction, PendingGroup } from '../../services/bankStatements';

export default function BankReviewScreen({ navigation }: any) {
  const [groups, setGroups] = useState<PendingGroup[]>([]);
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const loadTransactions = async () => {
    try {
      const res = await bankStatementsApi.getPending();
      const flat = res.data.groups.flatMap(g => g.transactions);
      setGroups(res.data.groups);
      setTransactions(flat);
    } catch {
      Alert.alert('Erro', 'Falha ao carregar transações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

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
    Alert.alert('Confirmar importação', `Importar ${selected.size} transações?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setAccepting(true);
          try {
            await bankStatementsApi.accept(Array.from(selected));
            Alert.alert('Sucesso', `${selected.size} transações importadas!`);
            setSelected(new Set());
            loadTransactions();
          } catch (error: any) {
            Alert.alert('Erro', error?.response?.data?.error || 'Falha ao importar.');
          } finally {
            setAccepting(false);
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (selected.size === 0) return;
    Alert.alert('Rejeitar', `Rejeitar ${selected.size} transações? Tem certeza?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rejeitar',
        style: 'destructive',
        onPress: async () => {
          await bankStatementsApi.reject(Array.from(selected));
          setSelected(new Set());
          loadTransactions();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ImportedTransaction }) => {
    const isExact = item.status === 'duplicate' && item.duplicate_reason === 'exact_match';
    const isFuzzy = item.status === 'duplicate' && item.duplicate_reason === 'fuzzy_match';

    return (
      <TouchableOpacity
        className={`p-4 mb-2 rounded-xl border ${
          selected.has(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        } ${isExact ? 'border-red-400 bg-red-50' : ''} ${isFuzzy ? 'border-yellow-400 bg-yellow-50' : ''}`}
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
              <Text className={`text-xs ${isExact ? 'text-red-600' : 'text-yellow-600'}`}>
                {isExact ? '⚠️ Duplicata confirmada' : '🔶 Possível dup.'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item }: { item: PendingGroup }) => (
    <View className="mb-3">
      <Text className="text-sm font-semibold text-gray-500 mb-2">{item.date}</Text>
      {item.transactions.map(t => (
        <View key={t.id}>{renderItem({ item: t })}</View>
      ))}
    </View>
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
        data={groups}
        keyExtractor={item => String(item.date)}
        renderItem={renderGroup}
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
