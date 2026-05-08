import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { addToCart, removeFromCart, clearCart } from '../redux/slices/cartSlice';
import { placeOrder } from '../firebase/services';

const CartScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items, totalAmount, restaurantId, restaurantName, restaurantHasOwnDelivery } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ customerName: '', deliveryAddress: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, customerName: user.name || '' }));
    }
  }, [user]);

  const deliveryFee = items.length ? (restaurantHasOwnDelivery ? 0 : 40) : 0;
  const total = totalAmount + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!form.customerName || !form.deliveryAddress) {
      Alert.alert('Error', 'Please provide delivery details');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        restaurantId,
        restaurantName,
        items: items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
        totalAmount: total,
        deliveryFee,
        subtotal: totalAmount,
        deliveryAddress: form.deliveryAddress,
        customerName: form.customerName,
        customerId: user?.uid || null,
        status: 'Placed',
      };

      const result = await placeOrder(orderData);
      dispatch(clearCart());
      Alert.alert('Success', 'Order placed successfully!', [
        { text: 'Track Order', onPress: () => navigation.navigate('OrderTracking', { orderId: result.id }) },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to place order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="cart-outline" size={100} color="#ddd" />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.browseBtnText}>Browse Restaurants</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.image }} style={styles.itemImg} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
      </View>
      <View style={styles.qtyControls}>
        <TouchableOpacity onPress={() => dispatch(removeFromCart(item.id))}>
          <Icon name="minus-circle-outline" size={24} color="#FF5252" />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => dispatch(addToCart({ item, restaurantId }))}>
          <Icon name="plus-circle-outline" size={24} color="#FF5252" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Review Order</Text>
          <Text style={styles.restaurantName}>from {restaurantName}</Text>
        </View>

        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.itemList}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={form.customerName}
            onChangeText={(text) => setForm({ ...form, customerName: text })}
            placeholder="John Doe"
          />
          <Text style={styles.label}>Delivery Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.deliveryAddress}
            onChangeText={(text) => setForm({ ...form, deliveryAddress: text })}
            placeholder="123 Main St, City, State"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{totalAmount.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹{deliveryFee.toFixed(0)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(0)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.placeOrderBtn}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderBtnText}>Place Order · ₹{total.toFixed(0)}</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  restaurantName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
    marginBottom: 30,
  },
  browseBtn: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemList: {
    padding: 15,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  itemImg: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#FF5252',
    fontWeight: '700',
    marginTop: 4,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#222',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    margin: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: '#666',
    fontSize: 15,
  },
  summaryValue: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5252',
  },
  placeOrderBtn: {
    backgroundColor: '#FF5252',
    margin: 15,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
  },
  placeOrderBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CartScreen;
