import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { listenToOrder, listenToAgentLocation } from '../firebase/services';

const OrderTrackingScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [agentLocation, setAgentLocation] = useState(null);

  useEffect(() => {
    const unsubscribeOrder = listenToOrder(orderId, (updatedOrder) => {
      setOrder(updatedOrder);

      if (updatedOrder.deliveryAgentId) {
        const unsubscribeLocation = listenToAgentLocation(updatedOrder.deliveryAgentId, (loc) => {
          setAgentLocation(loc);
        });
        return () => unsubscribeLocation();
      }
    });

    return () => unsubscribeOrder();
  }, [orderId]);

  if (!order) return <View style={styles.centered}><Text>Loading tracking...</Text></View>;

  const getStatusStep = (status) => {
    const steps = ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
    return steps.indexOf(status);
  };

  const currentStep = getStatusStep(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order #{orderId.slice(-6).toUpperCase()}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: order.deliveryLat || 28.6139,
            longitude: order.deliveryLng || 77.2090,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {order.deliveryLat && (
            <Marker
              coordinate={{ latitude: order.deliveryLat, longitude: order.deliveryLng }}
              title="Delivery Location"
              pinColor="red"
            />
          )}
          {agentLocation && (
            <Marker
              coordinate={{ latitude: agentLocation.lat, longitude: agentLocation.lng }}
              title="Delivery Partner"
            >
              <View style={styles.riderMarker}>
                <Icon name="bike" size={24} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      <ScrollView style={styles.statusSheet} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.statusHeader}>
          <Text style={styles.restaurantName}>{order.restaurantName}</Text>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>

        <View style={styles.stepper}>
          {['Order Placed', 'Confirmed', 'Kitchen', 'On the Way', 'Delivered'].map((label, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepLineContainer}>
                <View style={[styles.stepDot, index <= currentStep && styles.activeStepDot]} />
                {index < 4 && <View style={[styles.stepLine, index < currentStep && styles.activeStepLine]} />}
              </View>
              <Text style={[styles.stepLabel, index <= currentStep && styles.activeStepLabel]}>{label}</Text>
            </View>
          ))}
        </View>

        {order.deliveryAgentName && (
          <View style={styles.agentInfo}>
            <View style={styles.agentAvatar}>
              <Icon name="account" size={30} color="#666" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.agentName}>{order.deliveryAgentName}</Text>
              <Text style={styles.agentTag}>Your delivery partner</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Icon name="phone" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.orderDetailCard}>
          <Text style={styles.detailTitle}>Order Summary</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemText}>{item.quantity}x {item.name}</Text>
              <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Paid Amount</Text>
            <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  mapContainer: { height: 300, width: '100%' },
  map: { ...StyleSheet.absoluteFillObject },
  riderMarker: {
    backgroundColor: '#FF5252',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusSheet: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  restaurantName: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  statusText: { color: '#FF5252', fontWeight: 'bold', fontSize: 16 },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ddd' },
  activeStepDot: { backgroundColor: '#FF5252' },
  stepLine: { height: 2, flex: 1, backgroundColor: '#ddd' },
  activeStepLine: { backgroundColor: '#FF5252' },
  stepLabel: { fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' },
  activeStepLabel: { color: '#222', fontWeight: 'bold' },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  agentAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  agentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  agentTag: { fontSize: 12, color: '#888' },
  callBtn: { padding: 10 },
  orderDetailCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
  },
  detailTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemText: { color: '#666' },
  itemPrice: { color: '#444', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#FF5252' },
});

export default OrderTrackingScreen;
