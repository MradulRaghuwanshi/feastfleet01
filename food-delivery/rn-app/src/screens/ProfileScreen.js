import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { logout } from '../firebase/services';
import { logout as logoutAction } from '../redux/slices/authSlice';

const ProfileScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await logout();
            dispatch(logoutAction());
          } catch (error) {
            console.error('Logout Error:', error);
          }
        },
      },
    ]);
  };

  const MenuOption = ({ icon, title, subtitle, onPress, color = '#333' }) => (
    <TouchableOpacity style={styles.option} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userPhone}>{user?.phone || '+91 98765 43210'}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Icon name="pencil" size={20} color="#FF5252" />
            </TouchableOpacity>
          </View>

          <View style={styles.walletCard}>
            <View>
              <Text style={styles.walletLabel}>Feast Wallet</Text>
              <Text style={styles.walletBalance}>₹{user?.wallet || '0.00'}</Text>
            </View>
            <TouchableOpacity style={styles.addMoneyBtn}>
              <Text style={styles.addMoneyText}>Add Money</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <MenuOption icon="map-marker-outline" title="Saved Addresses" subtitle="Home, Office, etc." onPress={() => {}} color="#4CAF50" />
          <MenuOption icon="heart-outline" title="Favourites" subtitle="Restaurants you love" onPress={() => navigation.navigate('Favourites')} color="#FF5252" />
          <MenuOption icon="wallet-outline" title="Payment Methods" subtitle="Cards, UPI, Wallets" onPress={() => {}} color="#2196F3" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & More</Text>
          <MenuOption icon="help-circle-outline" title="Help Center" onPress={() => {}} color="#673AB7" />
          <MenuOption icon="information-outline" title="About Us" onPress={() => {}} color="#607D8B" />
          <MenuOption icon="star-outline" title="Rate the App" onPress={() => {}} color="#FFC107" />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={22} color="#FF5252" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  header: { padding: 20, backgroundColor: '#fff' },
  profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 30, fontWeight: 'bold', color: '#fff' },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  userPhone: { fontSize: 14, color: '#888', marginTop: 2 },
  editBtn: { padding: 5 },
  walletCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 15,
    elevation: 4,
  },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  walletBalance: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  addMoneyBtn: { backgroundColor: '#FF5252', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  addMoneyText: { color: '#fff', fontWeight: 'bold' },
  section: { backgroundColor: '#fff', marginTop: 10, padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#999', marginBottom: 15, marginLeft: 5 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionText: { flex: 1, marginLeft: 15 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  optionSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  logoutText: { color: '#FF5252', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  version: { textAlign: 'center', color: '#ccc', marginVertical: 20, fontSize: 12 },
});

export default ProfileScreen;
