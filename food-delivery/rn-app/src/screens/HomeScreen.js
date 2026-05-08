import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { getRestaurants } from '../firebase/services';
import RestaurantCard from '../components/RestaurantCard';

const CUISINES = ['All', 'Italian', 'American', 'Japanese', 'Mexican', 'Healthy'];

const HomeScreen = ({ navigation }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [cuisine, setCuisine] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, [cuisine]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const data = await getRestaurants(cuisine !== 'All' ? cuisine : '');
      setRestaurants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Hungry? We've got you covered.</Text>
        <Text style={styles.heroSubtitle}>Order from the best restaurants near you</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {CUISINES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, cuisine === c && styles.activeChip]}
            onPress={() => setCuisine(c)}
          >
            <Text style={[styles.chipText, cuisine === c && styles.activeChipText]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() => navigation.navigate('Restaurant', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#FF5252" style={{ marginTop: 50 }} />
          ) : (
            <Text style={styles.emptyText}>No restaurants found</Text>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  listContent: {
    paddingBottom: 20,
  },
  hero: {
    padding: 20,
    backgroundColor: '#fff',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingBottom: 15,
  },
  filterContent: {
    paddingHorizontal: 15,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeChip: {
    backgroundColor: '#FF5252',
    borderColor: '#FF5252',
  },
  chipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  activeChipText: {
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
});

export default HomeScreen;
