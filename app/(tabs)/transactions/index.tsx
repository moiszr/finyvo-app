import { View, Text } from 'react-native';

export default function TransactionsScreen() {
  return (
    <View className="flex-1 bg-white px-6 py-6">
      <Text className="text-xl font-extrabold text-gray-900">
        Transacciones
      </Text>

      <View className="mt-4 rounded-2xl bg-gray-50 p-4 shadow-card">
        <Text className="text-gray-800 font-semibold">
          Tarjeta con NativeWind
        </Text>
        <Text className="text-gray-500 mt-1">
          Sombra sutil y radios grandes.
        </Text>
      </View>
    </View>
  );
}
