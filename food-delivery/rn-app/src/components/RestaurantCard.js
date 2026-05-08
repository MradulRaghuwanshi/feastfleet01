import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const RestaurantCard = ({ restaurant, isFavourite, onToggleFavourite, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.card, !restaurant.isOpen && styles.closed]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imgWrapper}>
        <Image source={{ uri: restaurant.image }} style={styles.img} />
        {!restaurant.isOpen && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Closed</Text>
          </View>
        )}
        {restaurant.offer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>🏷️ {restaurant.offer}</Text>
          </View>
        )}
        {onToggleFavourite && (
          <TouchableOpacity style={styles.favBtn} onPress={onToggleFavourite}>
            <Icon
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavourite ? '#FF5252' : '#fff'}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{restaurant.name}</Text>
          {restaurant.isFeatured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>⭐ Featured</Text>
            </View>
          )}
        </View>

        <Text style={styles.cuisine}>{restaurant.cuisine}</Text>

        {restaurant.tags?.length > 0 && (
          <View style={styles.tags}>
            {restaurant.tags.map((t, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Icon name="star" size={16} color="#FFC107" />
            <Text style={styles.metaText}>{restaurant.rating}</Text>
            <Text style={styles.reviewCount}>({restaurant.reviewCount || 0})</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="clock-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="truck-delivery" size={16} color="#666" />
            <Text style={styles.metaText}>
              {restaurant.hasOwnDelivery ? 'Free' : `₹${restaurant.deliveryFee}`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closed: {
    opacity: 0.7,
  },
  imgWrapper: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  img: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  offerBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF5252',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  info: {
    padding: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  featuredBadge: {
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredText: {
    fontSize: 10,
    color: '#FBC02D',
    fontWeight: 'bold',
  },
  cuisine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#555',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  metaText: {
    fontSize: 13,
    color: '#444',
    marginLeft: 4,
    fontWeight: '500',
  },
  reviewCount: {
    fontSize: 12,
    color: '#888',
    marginLeft: 2,
  },
});

export default RestaurantCard;
