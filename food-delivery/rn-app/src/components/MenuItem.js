import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../redux/slices/cartSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MenuItem = ({ item, restaurantId, restaurantName, hasOwnDelivery }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items);
  const cartItem = cartItems.find((i) => i.id === item.id);
  const qty = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    dispatch(addToCart({ item, restaurantId, restaurantName, hasOwnDelivery }));
  };

  const handleRemove = () => {
    dispatch(removeFromCart(item.id));
  };

  return (
    <View style={[styles.card, !item.available && styles.unavailable]}>
      <Image source={{ uri: item.image }} style={styles.img} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {!item.available && (
            <View style={styles.unavailBadge}>
              <Text style={styles.unavailText}>Unavailable</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.bottom}>
          <Text style={styles.price}>₹{item.price.toFixed(0)}</Text>
          {item.available ? (
            qty === 0 ? (
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyContainer}>
                <TouchableOpacity style={styles.qtyBtn} onPress={handleRemove}>
                  <Icon name="minus" size={20} color="#FF5252" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={handleAdd}>
                  <Icon name="plus" size={20} color="#FF5252" />
                </TouchableOpacity>
              </View>
            )
          ) : (
            <Text style={styles.soldOut}>Sold out</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unavailable: {
    opacity: 0.6,
  },
  img: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  info: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    marginRight: 10,
  },
  unavailBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unavailText: {
    fontSize: 10,
    color: '#d32f2f',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginVertical: 4,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  addBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF5252',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 14,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF5252',
    borderRadius: 6,
  },
  qtyBtn: {
    padding: 5,
    paddingHorizontal: 8,
  },
  qtyText: {
    paddingHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  soldOut: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default MenuItem;
