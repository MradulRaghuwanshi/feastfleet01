import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { getRestaurant } from '../firebase/services';
import MenuItem from '../components/MenuItem';

const RestaurantScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [restaurant, setRestaurant] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const { items, totalAmount } = useSelector((state) => state.cart);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    fetchRestaurant();
  }, [id]);

  const fetchRestaurant = async () => {
    try {
      const data = await getRestaurant(id);
      setRestaurant(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5252" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text>Restaurant not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#FF5252', marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categories = ['All', ...new Set(restaurant.menu.map((i) => i.category))];
  const filteredMenu = activeCategory === 'All'
    ? restaurant.menu
    : restaurant.menu.filter((i) => i.category === activeCategory);

  return (
    <View style={styles.container}>
      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
        <ImageBackground source={{ uri: restaurant.image }} style={styles.header}>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="star" size={16} color="#FFC107" />
                  <Text style={styles.metaText}>{restaurant.rating}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="clock-outline" size={16} color="#fff" />
                  <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
                </View>
                <Text style={styles.metaText}>{restaurant.cuisine}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.categoryBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catBtn, activeCategory === c && styles.activeCatBtn]}
                onPress={() => setActiveCategory(c)}
              >
                <Text style={[styles.catText, activeCategory === c && styles.activeCatText]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.menuList}>
          {filteredMenu.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              hasOwnDelivery={restaurant.hasOwnDelivery}
            />
          ))}
        </View>
      </ScrollView>

      {totalItems > 0 && (
        <TouchableOpacity
          style={styles.cartBar}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
        >
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{totalItems} Item{totalItems > 1 ? 's' : ''}</Text>
            <Text style={styles.cartTotal}>₹{totalAmount.toFixed(0)}</Text>
          </View>
          <View style={styles.viewCartBtn}>
            <Text style={styles.viewCartText}>View Cart</Text>
            <Icon name="chevron-right" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 240,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  headerInfo: {
    marginBottom: 10,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  metaText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBar: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
  },
  categoryContent: {
    paddingHorizontal: 15,
  },
  catBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f8f8f8',
  },
  activeCatBtn: {
    backgroundColor: '#FF5252',
  },
  catText: {
    color: '#666',
    fontWeight: '600',
  },
  activeCatText: {
    color: '#fff',
  },
  menuList: {
    padding: 15,
    paddingBottom: 100,
  },
  cartBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF5252',
    height: 60,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cartInfo: {
    flexDirection: 'column',
  },
  cartCount: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  cartTotal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
});

export default RestaurantScreen;
