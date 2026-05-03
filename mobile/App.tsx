// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { enableScreens } from 'react-native-screens';
enableScreens(false);
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, 
  FlatList, Image, Modal, KeyboardAvoidingView, Platform, ScrollView,
  LayoutAnimation, UIManager, Animated, Easing, Keyboard, StatusBar
} from 'react-native';
import { create } from 'zustand';
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEFAULT_IP = '192.168.1.100';
const MIN_ORDER_VALUE = 5000;

// Premium Shadow System
const SHADOWS = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  glowIndigo: { shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  glowEmerald: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  glowRed: { shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }
};

// Premium Button Component
const AnimatedPressable = ({ onPress, style, children, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 20, bounciness: 5 }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 5 }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Product image mapping by category
const CATEGORY_IMAGES: Record<string, string> = {
  'Analgesics':       'https://images.unsplash.com/photo-1550572017-edd951b55104?w=300&h=300&fit=crop',
  'Antibiotics':      'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=300&h=300&fit=crop',
  'Devices':          'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=300&h=300&fit=crop',
  'Diabetic Care':    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=300&fit=crop',
  'Allergy':          'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&h=300&fit=crop',
  'Gastrointestinal': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop',
  'Vitamins':         'https://images.unsplash.com/photo-1559059699-085698eba48c?w=300&h=300&fit=crop',
  'First Aid':        'https://images.unsplash.com/photo-1583912267550-d6c2ac3196c0?w=300&h=300&fit=crop',
  'Ointments':        'https://images.unsplash.com/photo-1576602975754-7423a4f3e7e0?w=300&h=300&fit=crop',
  'Syrups':           'https://images.unsplash.com/photo-1631549919535-0b2b75c63a90?w=300&h=300&fit=crop',
  'General':          'https://images.unsplash.com/photo-1576602975754-7423a4f3e7e0?w=300&h=300&fit=crop',
};
const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop';
const getProductImage = (product: any) => CATEGORY_IMAGES[product.category] || DEFAULT_PRODUCT_IMAGE;
const getTimeOfDay = () => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; };

const useStore = create((set, get) => ({
  serverIp: DEFAULT_IP,
  setServerIp: (ip) => set({ serverIp: ip }),
  user: null,
  setUser: (user) => set({ user }),
  cart: {},
  products: [],
  setProducts: (products) => set({ products }),
  usersList: [],
  setUsersList: (usersList) => set({ usersList }),
  addToCart: (productId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    set((state) => ({ cart: { ...state.cart, [productId]: (state.cart[productId] || 0) + 1 } }));
  },
  removeFromCart: (productId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    set((state) => {
      const newCart = { ...state.cart };
      if (newCart[productId] > 1) {
        newCart[productId] -= 1;
      } else {
        delete newCart[productId];
      }
      return { cart: newCart };
    });
  },
  setCartQuantity: (productId, qty) => {
    set((state) => {
      const newCart = { ...state.cart };
      const parsedQty = parseInt(qty);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        delete newCart[productId];
      } else {
        newCart[productId] = parsedQty;
      }
      return { cart: newCart };
    });
  },
  clearCart: () => set({ cart: {} }),
  orders: [],
  setOrders: (orders) => set({ orders }),
  
  getApiUrl: () => `http://${get().serverIp}:3000/api/data`,
  getTokenUrl: () => `http://${get().serverIp}:3000/api/user/token`,
  getOtpUrl: () => `http://${get().serverIp}:3000/api/auth/otp`,
  getVerifyUrl: () => `http://${get().serverIp}:3000/api/auth/verify`,
  getSignupUrl: () => `http://${get().serverIp}:3000/api/auth/signup`,

  getTokenUrl: () => `http://${get().serverIp}:3000/api/user/token`,
  placeOrder: async (order) => {
    try {
      await fetch(get().getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'orders', item: order, action: 'create' })
      });
    } catch (e) {
      Alert.alert('Connection Error', 'Failed to reach the server. Please verify the IP address.');
      return false;
    }

    set((state) => ({
      orders: [order, ...state.orders],
      cart: {},
      user: state.user ? { ...state.user, credit_balance: state.user.credit_balance + order.total } : null
    }));
    return true;
  },
}));

// Notifications helper
async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4f46e5',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId || undefined })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }
  return token;
}


// --- Signup Screen ---
function SignupScreen({ setCurrentScreen }) {
  const [form, setForm] = useState({ phone: '', store_name: '', user_type: 'Retailer', drug_license: '', gst_number: '', registration_number: '', address: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const getSignupUrl = useStore((state) => state.getSignupUrl);

  const handleSignup = async () => {
    if(!form.phone || !form.store_name) return Alert.alert('Error', 'Phone and Firm Name are required.');
    
    setIsLoading(true);
    try {
      const res = await fetch(getSignupUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if(data.success) {
        Alert.alert('Success', 'Registration submitted. Awaiting admin approval.');
        setCurrentScreen('Login');
      } else {
        Alert.alert('Error', data.error || 'Signup failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Network Error');
    }
    setIsLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.loginContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.loginTitle, {color: '#fff'}]}>Register Firm</Text>
        <Text style={[styles.loginSubtitle, {color: '#94a3b8'}]}>Join the B2B Command Network.</Text>
        
        <TextInput style={styles.inputFieldConfig} placeholder="Firm / Clinic Name" value={form.store_name} onChangeText={(t) => setForm({...form, store_name: t})} />
        <TextInput style={[styles.inputFieldConfig, {marginTop: 12}]} placeholder="Phone Number" keyboardType="phone-pad" value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} />
        <TextInput style={[styles.inputFieldConfig, {marginTop: 12}]} placeholder="Email Address" keyboardType="email-address" value={form.email} onChangeText={(t) => setForm({...form, email: t})} />
        
        <Text style={{color: '#fff', marginTop: 20, marginBottom: 8, fontWeight: '700'}}>User Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
          {['Retailer', 'Clinic', 'Doctor', 'Doctor with Pharmacy'].map(type => (
            <TouchableOpacity key={type} onPress={() => setForm({...form, user_type: type})} style={{padding: 12, backgroundColor: form.user_type === type ? '#4f46e5' : '#1e293b', borderRadius: 12, marginRight: 8}}>
              <Text style={{color: '#fff', fontWeight: '600'}}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {form.user_type !== 'Doctor' && <TextInput style={[styles.inputFieldConfig, {marginTop: 12}]} placeholder="Drug License Number" value={form.drug_license} onChangeText={(t) => setForm({...form, drug_license: t})} />}
        {(form.user_type === 'Retailer' || form.user_type === 'Doctor with Pharmacy') && <TextInput style={[styles.inputFieldConfig, {marginTop: 12}]} placeholder="GST Number" value={form.gst_number} onChangeText={(t) => setForm({...form, gst_number: t})} />}
        {form.user_type !== 'Retailer' && <TextInput style={[styles.inputFieldConfig, {marginTop: 12}]} placeholder="Registration Number" value={form.registration_number} onChangeText={(t) => setForm({...form, registration_number: t})} />}
        <TextInput style={[styles.inputFieldConfig, {marginTop: 12}]} placeholder="Full Address" value={form.address} onChangeText={(t) => setForm({...form, address: t})} />

        <AnimatedPressable style={[styles.buttonPrimary, {marginTop: 24}]} onPress={handleSignup} disabled={isLoading}>
          <Text style={styles.buttonPrimaryText}>{isLoading ? 'Submitting...' : 'Submit Application'}</Text>
        </AnimatedPressable>
        
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setCurrentScreen('Login')}>
          <Text style={styles.configText}>ALREADY REGISTERED? LOGIN</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Login Screen ---
function LoginScreen({ setCurrentScreen }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [tempIp, setTempIp] = useState('');

  const setUser = useStore((state) => state.setUser);
  const serverIp = useStore((state) => state.serverIp);
  const setServerIp = useStore((state) => state.setServerIp);
  const getOtpUrl = useStore((state) => state.getOtpUrl);
  const getVerifyUrl = useStore((state) => state.getVerifyUrl);

  useEffect(() => { setTempIp(serverIp); }, [serverIp]);

  const requestOtp = async () => {
    Haptics.selectionAsync();
    if(phone.length < 10) return Alert.alert('Invalid', 'Enter valid 10-digit phone');
    try {
      const res = await fetch(getOtpUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if(data.success) setOtpSent(true);
      else Alert.alert('Error', data.error || 'Failed to send OTP');
    } catch(e) { Alert.alert('Error', 'Network connection failed.'); }
  };

  const verifyOtp = async () => {
    Haptics.selectionAsync();
    try {
      const res = await fetch(getVerifyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, device_info: Platform.OS })
      });
      const data = await res.json();
      if(data.success) {
        setUser(data.user);
        setCurrentScreen('Home');
      } else if (data.pending) {
        setUser(data.user);
        setCurrentScreen('PendingApproval');
      } else {
        Alert.alert('Access Denied', data.error || 'Invalid OTP');
      }
    } catch(e) { Alert.alert('Error', 'Network connection failed.'); }
  };

  return (
    <KeyboardAvoidingView style={styles.loginContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.loginHero}>
          <View style={styles.logoContainer}>
            <Image source={require('./assets/pharma_logo.jpeg')} style={styles.loginLogo} resizeMode="contain" />
          </View>
          <Text style={styles.companyName}>UPKEM LABS</Text>
          <Text style={styles.tagline}>B2B Command Network</Text>
        </View>

        <View style={styles.loginCard}>
          <View style={styles.dragHandle} />
          <Text style={styles.loginTitle}>Secure Access</Text>
          <Text style={styles.loginSubtitle}>{otpSent ? 'Enter the 4-digit OTP sent to your phone.' : 'Enter your registered mobile number.'}</Text>

          {!otpSent ? (
            <>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputPrefix}>+91</Text>
                <View style={styles.inputDivider} />
                <TextInput style={styles.inputField} placeholder="00000 00000" placeholderTextColor="#94a3b8" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={10} returnKeyType="done" />
              </View>
              <AnimatedPressable style={styles.buttonPrimary} onPress={requestOtp}>
                <Text style={styles.buttonPrimaryText}>Send OTP</Text>
              </AnimatedPressable>
            </>
          ) : (
            <>
              <TextInput style={[styles.inputFieldConfig, {marginBottom: 24, textAlign: 'center', fontSize: 24, letterSpacing: 8}]} placeholder="1234" keyboardType="number-pad" value={otp} onChangeText={setOtp} maxLength={4} />
              <AnimatedPressable style={styles.buttonPrimary} onPress={verifyOtp}>
                <Text style={styles.buttonPrimaryText}>Authenticate</Text>
              </AnimatedPressable>
              <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setOtpSent(false)}>
                <Text style={styles.configText}>CHANGE NUMBER</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={{ marginTop: 32 }} onPress={() => setCurrentScreen('Signup')}>
            <Text style={[styles.configText, {color: '#4f46e5'}]}>NEW USER? REGISTER HERE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setShowConfig(true)}>
            <Text style={styles.configText}>NETWORK CONFIGURATION</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showConfig} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Network Setup</Text>
              <Text style={{ marginBottom: 20, color: '#64748b', fontSize: 14 }}>Enter the Next.js API IPv4 address.</Text>
              <TextInput style={styles.inputFieldConfig} value={tempIp} onChangeText={setTempIp} placeholder="192.168.x.x" keyboardType="numbers-and-punctuation"/>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity onPress={() => setShowConfig(false)} style={styles.btnCancel}><Text style={{ fontWeight: '700', color: '#475569' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setServerIp(tempIp); setShowConfig(false); }} style={styles.btnSave}><Text style={{ color: '#fff', fontWeight: '800' }}>Save IP</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
// --- Pending Approval ---
function PendingApprovalScreen({ setCurrentScreen }) {
  const setUser = useStore((state) => state.setUser);
  
  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('Login');
  };

  return (
    <View style={styles.centeredContainer}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.pendingCard}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 32 }}>🔒</Text>
        </View>
        <Text style={styles.pendingTitle}>Under Review</Text>
        <Text style={styles.pendingDesc}>Your UPKEM LABS wholesale profile is currently being verified. This process ensures network security.</Text>
        <AnimatedPressable style={[styles.buttonPrimary, { marginTop: 32, width: '100%', backgroundColor: '#0f172a' }]} onPress={handleLogout}>
          <Text style={styles.buttonPrimaryText}>Return to Login</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

// --- Home Screen (MedPlus-style) ---
const HOME_CATEGORIES = [
  { name: 'Analgesics',       icon: '💊', bg: '#fef3c7' },
  { name: 'Antibiotics',      icon: '🧬', bg: '#ede9fe' },
  { name: 'Diabetic Care',    icon: '🩺', bg: '#dcfce7' },
  { name: 'Allergy',          icon: '🤧', bg: '#e0f2fe' },
  { name: 'Gastrointestinal', icon: '🫁', bg: '#fce7f3' },
  { name: 'Vitamins',         icon: '⚡', bg: '#fef9c3' },
  { name: 'Devices',          icon: '🔬', bg: '#f0fdf4' },
  { name: 'Syrups',           icon: '🧪', bg: '#fff7ed' },
  { name: 'First Aid',        icon: '🩹', bg: '#fef2f2' },
  { name: 'Ointments',        icon: '🧴', bg: '#f8f0ff' },
];

function HomeScreen({ setCurrentScreen, onCategorySelect }) {
  const products = useStore((s) => s.products);
  const user = useStore((s) => s.user);
  const featured = products.slice(0, 8);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.homeGreeting}>Good {getTimeOfDay()},</Text>
            <Text style={styles.homeStoreName}>{user?.store_name}</Text>
          </View>
          <Image source={require('./assets/pharma_logo.jpeg')} style={styles.headerLogo} />
        </View>

        {/* Search shortcut */}
        <TouchableOpacity style={styles.homeSearchBar} onPress={() => setCurrentScreen('Catalog')} activeOpacity={0.85}>
          <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
          <Text style={styles.homeSearchPlaceholder}>Search medicines, devices…</Text>
        </TouchableOpacity>

        {/* Promo banner */}
        <View style={styles.promoBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoBannerTitle}>60-Day Credit Line</Text>
            <Text style={styles.promoBannerSub}>Place orders above ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')} and enjoy B2B credit terms.</Text>
            <TouchableOpacity style={styles.promoBannerBtn} onPress={() => setCurrentScreen('Catalog')}>
              <Text style={styles.promoBannerBtnText}>Shop Now →</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 48, marginLeft: 12 }}>💳</Text>
        </View>

        {/* Shop by Category */}
        <View style={styles.homeSectionRow}>
          <Text style={styles.homeSectionTitle}>Shop by Category</Text>
          <TouchableOpacity onPress={() => { onCategorySelect('All'); setCurrentScreen('Catalog'); }}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.homeCategoryGrid}>
          {HOME_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={[styles.homeCategoryItem, { backgroundColor: cat.bg }]}
              onPress={() => { Haptics.selectionAsync(); onCategorySelect(cat.name); setCurrentScreen('Catalog'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.homeCategoryIcon}>{cat.icon}</Text>
              <Text style={styles.homeCategoryText} numberOfLines={2}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured Products */}
        <View style={styles.homeSectionRow}>
          <Text style={styles.homeSectionTitle}>Featured Products</Text>
          <TouchableOpacity onPress={() => { onCategorySelect('All'); setCurrentScreen('Catalog'); }}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {featured.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.featuredCard}
              onPress={() => { onCategorySelect('All'); setCurrentScreen('Catalog'); }}
              activeOpacity={0.8}
            >
              <Image source={{ uri: getProductImage(p) }} style={styles.featuredCardImage} />
              <Text style={styles.featuredCardName} numberOfLines={2}>{p.name}</Text>
              <Text style={styles.featuredCardCompany} numberOfLines={1}>{p.company}</Text>
              <Text style={styles.featuredCardPrice}>₹{p.price_ptr || p.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

// --- Catalog Screen ---
function CatalogScreen({ setCurrentScreen, initialCategory }) {
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const setCartQuantity = useStore((state) => state.setCartQuantity);
  const cart = useStore((state) => state.cart);
  const productsList = useStore((state) => state.products);
  const user = useStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');

  // Flipkart-style multi-select filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory && initialCategory !== 'All' ? [initialCategory] : []
  );
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [sortOption, setSortOption] = useState('name_asc');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const categories = [...new Set(productsList.map(p => p.category).filter(Boolean))].sort() as string[];
  const systems = [...new Set(productsList.map(p => p.body_system).filter(Boolean))].sort() as string[];
  const companies = ['All', ...new Set(productsList.map(p => p.company).filter(Boolean))];

  const toggleCategory = (cat: string) => {
    Haptics.selectionAsync();
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };
  const toggleSystem = (sys: string) => {
    Haptics.selectionAsync();
    setSelectedSystems(prev => prev.includes(sys) ? prev.filter(s => s !== sys) : [...prev, sys]);
  };
  const clearAllFilters = () => { setSelectedCategories([]); setSelectedSystems([]); setSelectedCompany('All'); setSortOption('name_asc'); };
  const activeFilterCount = selectedCategories.length + selectedSystems.length + (selectedCompany !== 'All' ? 1 : 0);

  let filteredProducts = productsList.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.composition || '').toLowerCase().includes(q);
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category);
    const matchesSystem = selectedSystems.length === 0 || selectedSystems.includes(p.body_system);
    const matchesCompany = selectedCompany === 'All' || p.company === selectedCompany;
    return matchesSearch && matchesCategory && matchesSystem && matchesCompany;
  });

  if (sortOption === 'price_asc') filteredProducts.sort((a,b) => (a.price_ptr || a.price) - (b.price_ptr || b.price));
  if (sortOption === 'price_desc') filteredProducts.sort((a,b) => (b.price_ptr || b.price) - (a.price_ptr || a.price));
  if (sortOption === 'name_asc') filteredProducts.sort((a,b) => a.name.localeCompare(b.name));


  const totalValue = Object.keys(cart).reduce((acc, id) => {
    const product = productsList.find(p => p.id === parseInt(id));
    return acc + (product?.price || 0) * cart[id];
  }, 0);
  const isMinMet = totalValue >= MIN_ORDER_VALUE;
  const progressPercent = Math.min((totalValue / MIN_ORDER_VALUE) * 100, 100);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{user?.store_name}</Text>
          <Text style={styles.headerCredit}>Avail. Credit: <Text style={{color: '#0f172a'}}>₹{(user?.credit_limit - user?.credit_balance).toLocaleString('en-IN')}</Text></Text>
        </View>
        <Image source={require('./assets/pharma_logo.jpeg')} style={styles.headerLogo} />
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            {/* Search + Filter button row */}
            <View style={styles.searchRow}>
              <View style={[styles.searchContainer, { flex: 1 }]}>
                <Text style={{ position: 'absolute', left: 16, zIndex: 2, fontSize: 16 }}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search SKUs, brands, composition..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity
                style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                onPress={() => setShowFilterPanel(true)}
              >
                <Text style={{ fontSize: 14 }}>⚡</Text>
                <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: '#fff' }]}>Filter</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 4 }}>
                {selectedCategories.map(cat => (
                  <TouchableOpacity key={cat} style={styles.activeChip} onPress={() => toggleCategory(cat)}>
                    <Text style={styles.activeChipText}>{cat} ✕</Text>
                  </TouchableOpacity>
                ))}
                {selectedSystems.map(sys => (
                  <TouchableOpacity key={sys} style={styles.activeChip} onPress={() => toggleSystem(sys)}>
                    <Text style={styles.activeChipText}>{sys} ✕</Text>
                  </TouchableOpacity>
                ))}
                {selectedCompany !== 'All' && (
                  <TouchableOpacity style={styles.activeChip} onPress={() => setSelectedCompany('All')}>
                    <Text style={styles.activeChipText}>{selectedCompany} ✕</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.clearChip} onPress={clearAllFilters}>
                  <Text style={styles.clearChipText}>Clear All</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        }
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => setSelectedProduct(item)} activeOpacity={0.8}>
            <Image source={{ uri: getProductImage(item) }} style={styles.productThumb} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productDesc}>{item.company} • {item.category}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>₹{item.price_ptr || item.price}</Text>
                <View style={[styles.stockBadge, item.stock < 10 ? { backgroundColor: '#fee2e2' } : {}]}>
                  <Text style={[styles.stockText, item.stock < 10 ? { color: '#dc2626' } : {}]}>
                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of Stock'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.cartAction}>
              {(!cart[item.id] || cart[item.id] === 0) ? (
                <AnimatedPressable style={styles.addBtn} onPress={() => addToCart(item.id)}>
                  <Text style={styles.addBtnText}>ADD</Text>
                </AnimatedPressable>
              ) : (
                <View style={styles.qtyControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    selectTextOnFocus
                    value={cart[item.id].toString()}
                    onChangeText={(val) => {
                      if (val === '') setCartQuantity(item.id, 0);
                      else setCartQuantity(item.id, parseInt(val) || 1);
                    }}
                  />
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
            <Text style={styles.emptyText}>No products found.</Text>
          </View>
        }
      />

      {/* Product Details Modal */}
      <Modal visible={!!selectedProduct} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.bottomSheet, { maxHeight: '88%' }]}>
            <View style={styles.dragHandle} />
            {selectedProduct && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={{ uri: getProductImage(selectedProduct) }} style={styles.detailImage} />
                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                <Text style={{ color: '#64748b', fontSize: 16, marginBottom: 12 }}>{selectedProduct.company}</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <View style={styles.systemPillActive}><Text style={styles.systemTextActive}>{selectedProduct.category}</Text></View>
                  {selectedProduct.body_system ? <View style={styles.systemPill}><Text style={styles.systemText}>{selectedProduct.body_system}</Text></View> : null}
                </View>
                <View style={styles.detailInfoBox}>
                  <Text style={styles.detailInfoLabel}>Composition</Text>
                  <Text style={styles.detailInfoValue}>{selectedProduct.composition || 'Standard Formulation'}</Text>
                </View>
                <View style={styles.detailInfoBox}>
                  <Text style={styles.detailInfoLabel}>Description & Usage</Text>
                  <Text style={[styles.detailInfoValue, { color: '#475569', lineHeight: 22 }]}>
                    {selectedProduct.description || 'No description available for this SKU.'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8, backgroundColor: '#f8fafc', padding: 16, borderRadius: 16 }}>
                  <View>
                    <Text style={styles.detailInfoLabel}>PTR Price</Text>
                    <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a' }}>₹{selectedProduct.price_ptr || selectedProduct.price}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.detailInfoLabel}>MRP</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#94a3b8', textDecorationLine: 'line-through' }}>
                      ₹{selectedProduct.mrp || Math.round((selectedProduct.price_ptr || selectedProduct.price) * 1.2)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.detailInfoLabel}>Packing</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>{selectedProduct.packing || '1×10'}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
            <AnimatedPressable style={[styles.buttonPrimary, { marginTop: 20 }]} onPress={() => setSelectedProduct(null)}>
              <Text style={styles.buttonPrimaryText}>Close</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Flipkart-style Filter Panel */}
      <Modal visible={showFilterPanel} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.bottomSheet, { maxHeight: '88%' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.filterPanelHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={clearAllFilters}><Text style={styles.clearAllText}>Clear All</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sort */}
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              {([
                { key: 'name_asc',   label: 'Name (A → Z)' },
                { key: 'price_asc',  label: 'Price: Low to High' },
                { key: 'price_desc', label: 'Price: High to Low' },
              ] as const).map(opt => (
                <TouchableOpacity key={opt.key} style={styles.filterRadioRow} onPress={() => { Haptics.selectionAsync(); setSortOption(opt.key); }}>
                  <View style={[styles.radioOuter, sortOption === opt.key && styles.radioOuterActive]}>
                    {sortOption === opt.key && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.filterOptionText, sortOption === opt.key && styles.filterOptionTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}

              {/* Category */}
              <Text style={styles.filterSectionTitle}>Medical Category</Text>
              <View style={styles.filterChipsWrap}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, selectedCategories.includes(cat) && styles.filterChipActive]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Text style={[styles.filterChipText, selectedCategories.includes(cat) && styles.filterChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Body System */}
              {systems.length > 0 && (
                <>
                  <Text style={styles.filterSectionTitle}>Body System / Target</Text>
                  <View style={styles.filterChipsWrap}>
                    {systems.map(sys => (
                      <TouchableOpacity
                        key={sys}
                        style={[styles.filterChip, selectedSystems.includes(sys) && styles.filterChipActive]}
                        onPress={() => toggleSystem(sys)}
                      >
                        <Text style={[styles.filterChipText, selectedSystems.includes(sys) && styles.filterChipTextActive]}>{sys}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Manufacturer */}
              <Text style={styles.filterSectionTitle}>Manufacturer</Text>
              <View style={styles.filterChipsWrap}>
                {companies.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.filterChip, selectedCompany === c && styles.filterChipActive]}
                    onPress={() => { Haptics.selectionAsync(); setSelectedCompany(c); }}
                  >
                    <Text style={[styles.filterChipText, selectedCompany === c && styles.filterChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <AnimatedPressable style={[styles.buttonPrimary, { marginTop: 16 }]} onPress={() => setShowFilterPanel(false)}>
              <Text style={styles.buttonPrimaryText}>
                {activeFilterCount > 0 ? `Apply Filters (${activeFilterCount} active)` : 'Apply'}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {Object.keys(cart).length > 0 && (
        <AnimatedPressable 
          style={[styles.smartCartTracker, isMinMet ? SHADOWS.glowEmerald : SHADOWS.glowIndigo]}
          onPress={() => { Haptics.selectionAsync(); setCurrentScreen('Cart'); }}
        >
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={styles.smartCartTitle}>
              {isMinMet ? `₹${totalValue.toLocaleString('en-IN')} Ready to Checkout` : `₹${totalValue.toLocaleString('en-IN')} / ₹${MIN_ORDER_VALUE.toLocaleString('en-IN')} Min`}
            </Text>
            <View style={styles.smartCartProgressBg}>
              <View style={[styles.smartCartProgressFill, { width: `${progressPercent}%`, backgroundColor: isMinMet ? '#34d399' : '#818cf8' }]} />
            </View>
          </View>
          <View style={[styles.smartCartBtn, isMinMet ? { backgroundColor: '#10b981' } : {}]}>
            <Text style={styles.smartCartBtnText}>➔</Text>
          </View>
        </AnimatedPressable>
      )}
    </View>
  );
}

// --- Cart Screen ---
function CartScreen({ setCurrentScreen }) {
  const cart = useStore((state) => state.cart);
  const products = useStore((state) => state.products);
  const placeOrder = useStore((state) => state.placeOrder);
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const setCartQuantity = useStore((state) => state.setCartQuantity);
  const user = useStore((state) => state.user);
  const [showQR, setShowQR] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  const cartItems = Object.keys(cart).map(id => {
    const product = products.find(p => p.id === parseInt(id));
    return { ...product, quantity: cart[id] };
  });

  const totalValue = cartItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
  const isMinMet = totalValue >= MIN_ORDER_VALUE;

  const handlePlaceOrder = async () => {
    Haptics.selectionAsync();
    if (user.credit_balance + totalValue > user.credit_limit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Credit Limit Exceeded", "Please settle previous invoices or contact admin.");
      return;
    }
    
    setIsPlacing(true);
    const newOrder = {
      id: 'UPK' + Math.floor(Math.random() * 1000000),
      date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
      store: user.store_name,
      phone: user.phone,
      items: cartItems,
      total: totalValue,
      status: 'Placed'
    };

    const success = await placeOrder(newOrder);
    setIsPlacing(false);
    
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Order Processed", "Your wholesale order has been successfully placed. Standard 60-Day Credit Period applies.", [
        { text: "View Orders", onPress: () => setCurrentScreen('Profile') },
        { text: "Pay Now (QR)", onPress: () => setShowQR(true) }
      ]);
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.iconCircleLg}><Text style={{ fontSize: 40 }}>🛒</Text></View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 }}>Cart is Empty</Text>
        <Text style={{ color: '#64748b', marginTop: 8, fontSize: 16 }}>Return to the catalog to add SKUs.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>Order Review</Text>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 220 }}
        keyboardShouldPersistTaps="handled"
        data={cartItems}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.cartItemCard}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>₹{item.price} <Text style={{color:'#94a3b8', fontSize: 13, fontWeight: '600'}}>x {item.quantity}</Text></Text>
            </View>
            <View style={styles.cartItemQtyControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                selectTextOnFocus
                value={item.quantity.toString()}
                onChangeText={(val) => {
                  if (val === '') setCartQuantity(item.id, 0);
                  else setCartQuantity(item.id, parseInt(val) || 1);
                }}
              />
              <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.checkoutFooter}>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Total Payable</Text>
          <Text style={styles.billTotal}>₹{totalValue.toLocaleString('en-IN')}</Text>
        </View>
        {!isMinMet && (
          <View style={styles.minOrderAlert}>
            <Text style={{fontSize: 14, marginRight: 6}}>⚠️</Text>
            <Text style={styles.minOrderAlertText}>Minimum threshold not met: ₹{MIN_ORDER_VALUE.toLocaleString('en-IN')}</Text>
          </View>
        )}
        <AnimatedPressable
          style={[styles.checkoutBtn, !isMinMet && styles.checkoutBtnDisabled, isMinMet && SHADOWS.glowIndigo]}
          disabled={!isMinMet || isPlacing} 
          onPress={handlePlaceOrder}
        >
          <Text style={styles.checkoutBtnText}>{isPlacing ? 'Processing...' : 'Place Wholesale Order'}</Text>
        </AnimatedPressable>
      </View>

      <Modal visible={showQR} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual Settlement</Text>
            <Image source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=UPKEM-LABS-PAYMENT' }} style={{ width: 200, height: 200, marginVertical: 32, alignSelf: 'center', borderRadius: 16 }} />
            <Text style={{ textAlign: 'center', color: '#64748b', marginBottom: 32, lineHeight: 22, fontSize: 15 }}>Scan using any UPI application to settle your invoice immediately.</Text>
            <AnimatedPressable onPress={() => setShowQR(false)} style={styles.btnSave}>
              <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 16 }}>Complete</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Profile Screen ---
function ProfileScreen({ setCurrentScreen }) {
  const user = useStore((state) => state.user);
  const orders = useStore((state) => state.orders);
  const setUser = useStore((state) => state.setUser);
  const clearCart = useStore((state) => state.clearCart);

  const handleLogout = () => {
    Haptics.selectionAsync();
    Alert.alert("Confirm Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => {
        setUser(null);
        clearCart();
        setCurrentScreen('Login');
      }}
    ]);
  };

  const generateInvoice = async (order) => {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; }
            h1 { color: #1e293b; margin-bottom: 0; font-size: 32px; letter-spacing: -1px; }
            .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 32px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { border-bottom: 1px solid #f1f5f9; padding: 16px 20px; text-align: left; }
            th { background: #f8fafc; font-weight: 700; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
            .total { text-align: right; font-size: 28px; font-weight: 900; margin-top: 32px; color: #0f172a; letter-spacing: -0.5px; }
            .tagline { color: #4f46e5; font-weight: 700; margin-top: 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
            .meta { color: #64748b; font-size: 14px; margin-top: 12px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>UPKEM LABS</h1>
            <p class="tagline">Commercial Tax Invoice</p>
            <div class="meta" style="margin-top: 32px;">
              <p><strong>Order Ref:</strong> ${order.id}</p>
              <p><strong>Generated On:</strong> ${order.date}</p>
              <p><strong>Billed To:</strong> ${user.store_name} (+91 ${user.phone})</p>
            </div>
          </div>
          <table>
            <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
            ${order.items.map(i => `<tr><td><strong style="color: #0f172a;">${i.name}</strong><br/><span style="font-size: 12px; color: #64748b;">${i.company} | ${i.category}</span></td><td>${i.quantity}</td><td>₹${i.price}</td><td><strong style="color: #0f172a;">₹${i.price * i.quantity}</strong></td></tr>`).join('')}
          </table>
          <div class="total">Net Payable: ₹${order.total.toLocaleString('en-IN')}</div>
          <p style="margin-top: 60px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Terms: Payment due strictly within 60 days of dispatch. Late payments may incur penalties. Digital copy.
          </p>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Error', 'Could not generate invoice.');
    }
  };

  const utilization = user.credit_limit > 0 ? (user.credit_balance / user.credit_limit) * 100 : 0;

  return (
    <View style={styles.screen}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 }}>
        <Text style={styles.pageTitle}>Business Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <View style={styles.profileHeader}>
              <View style={[styles.avatar, SHADOWS.glowIndigo]}>
                <Text style={{ fontSize: 36, color: '#fff', fontWeight: '900' }}>{user.store_name[0]}</Text>
              </View>
              <Text style={styles.profileName}>{user.store_name}</Text>
              <Text style={styles.profilePhone}>+91 {user.phone}</Text>
            </View>

            <View style={[styles.creditCard, SHADOWS.lg]}>
              <Text style={styles.creditTitle}>UPKEM CREDIT LINE</Text>
              <View style={styles.creditStats}>
                <View>
                  <Text style={styles.creditLabel}>Utilized</Text>
                  <Text style={styles.creditValue}>₹{user.credit_balance.toLocaleString('en-IN')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.creditLabel}>Total Limit</Text>
                  <Text style={styles.creditValue}>₹{user.credit_limit.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(utilization, 100)}%`, backgroundColor: utilization > 90 ? '#ef4444' : '#4f46e5' }]} />
              </View>
              <Text style={{color: '#94a3b8', fontSize: 13, marginTop: 16, textAlign: 'right', fontWeight: '600'}}>
                {(user.credit_limit - user.credit_balance).toLocaleString('en-IN')} Available
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Order History</Text>
          </>
        }
        data={orders}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>{item.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'Rejected' ? '#fee2e2' : item.status === 'Shipped' ? '#ecfdf5' : '#f1f5f9' }]}>
                <Text style={[styles.statusText, { color: item.status === 'Rejected' ? '#dc2626' : item.status === 'Shipped' ? '#059669' : '#0f172a' }]}>{item.status}</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={styles.orderDate}>{item.date}</Text>
              <Text style={styles.orderTotal}>₹{item.total.toLocaleString('en-IN')}</Text>
            </View>
            {item.status === 'Shipped' && item.courier_name && (
              <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Delivery Info</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>{item.courier_name}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#4f46e5', marginTop: 2 }}>{item.tracking_id}</Text>
              </View>
            )}
            {item.status !== 'Rejected' && (
              <AnimatedPressable style={styles.invoiceBtn} onPress={() => generateInvoice(item)}>
                <Text style={styles.invoiceBtnText}>📄 Download Tax Invoice</Text>
              </AnimatedPressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{alignItems: 'center', marginTop: 40}}>
            <Text style={{fontSize: 32, marginBottom: 12}}>📜</Text>
            <Text style={{color: '#64748b', fontSize: 16, fontWeight: '500'}}>No previous orders found.</Text>
          </View>
        }
      />
    </View>
  );
}

// --- App Root ---
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [catalogInitialCategory, setCatalogInitialCategory] = useState('All');
  
  const fetchAPI = async () => {
    try {
      const url = useStore.getState().getApiUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error('API Not OK');
      const db = await res.json();
      
      // Cache success to AsyncStorage
      await AsyncStorage.setItem('@upkem_cached_db', JSON.stringify(db));
      
      useStore.getState().setProducts(db.products || []);
      useStore.getState().setUsersList(db.users || []);
      setIsOfflineMode(false);
      
      const currUser = useStore.getState().user;
      if (currUser) {
        const userOrders = db.orders.filter(o => o.phone === currUser.phone || o.store === currUser.store_name);
        useStore.getState().setOrders(userOrders);
        const liveUser = db.users.find(u => u.phone === currUser.phone);
        if (liveUser && JSON.stringify(liveUser) !== JSON.stringify(currUser)) {
          useStore.getState().setUser(liveUser);
        }
      }
    } catch (e) {
      // Offline fallback
      try {
        const cachedData = await AsyncStorage.getItem('@upkem_cached_db');
        if (cachedData) {
          const db = JSON.parse(cachedData);
          useStore.getState().setProducts(db.products || []);
          useStore.getState().setUsersList(db.users || []);
          setIsOfflineMode(true);
        }
      } catch (err) {
        console.error("Cache read error", err);
      }
    }
  };

  useEffect(() => {
    fetchAPI();
    const interval = setInterval(fetchAPI, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const renderScreen = () => {
    if (currentScreen === 'Login') return <LoginScreen setCurrentScreen={setCurrentScreen} />;
    if (currentScreen === 'Signup') return <SignupScreen setCurrentScreen={setCurrentScreen} />;
    if (currentScreen === 'PendingApproval') return <PendingApprovalScreen setCurrentScreen={setCurrentScreen} />;
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, paddingTop: Constants.statusBarHeight || 48 }}>
          {isOfflineMode && (
            <View style={{ backgroundColor: '#fef3c7', padding: 8, alignItems: 'center' }}>
              <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '800' }}>⚠️ OFFLINE MODE - Showing Cached Catalog</Text>
            </View>
          )}
          {currentScreen === 'Home' && (
            <HomeScreen
              setCurrentScreen={setCurrentScreen}
              onCategorySelect={setCatalogInitialCategory}
            />
          )}
          {currentScreen === 'Catalog' && (
            <CatalogScreen
              setCurrentScreen={setCurrentScreen}
              initialCategory={catalogInitialCategory}
            />
          )}
          {currentScreen === 'Cart' && <CartScreen setCurrentScreen={setCurrentScreen} />}
          {currentScreen === 'Profile' && <ProfileScreen setCurrentScreen={setCurrentScreen} />}
        </View>
        <View style={[styles.tabBar, SHADOWS.lg]}>
          <TouchableOpacity style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); setCurrentScreen('Home'); }}>
            <Text style={{ fontSize: 22, marginBottom: 4, opacity: currentScreen === 'Home' ? 1 : 0.5 }}>🏠</Text>
            <Text style={[styles.tabText, currentScreen === 'Home' && styles.tabTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); setCatalogInitialCategory('All'); setCurrentScreen('Catalog'); }}>
            <Text style={{ fontSize: 22, marginBottom: 4, opacity: currentScreen === 'Catalog' ? 1 : 0.5 }}>📦</Text>
            <Text style={[styles.tabText, currentScreen === 'Catalog' && styles.tabTextActive]}>Catalog</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); setCurrentScreen('Cart'); }}>
            <View>
              <Text style={{ fontSize: 22, marginBottom: 4, opacity: currentScreen === 'Cart' ? 1 : 0.5 }}>🛒</Text>
              {Object.keys(useStore.getState().cart).length > 0 && <View style={styles.cartBadge} />}
            </View>
            <Text style={[styles.tabText, currentScreen === 'Cart' && styles.tabTextActive]}>Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); setCurrentScreen('Profile'); }}>
            <Text style={{ fontSize: 22, marginBottom: 4, opacity: currentScreen === 'Profile' ? 1 : 0.5 }}>👤</Text>
            <Text style={[styles.tabText, currentScreen === 'Profile' && styles.tabTextActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return <View style={{ flex: 1 }}>{renderScreen()}</View>;
}

// --- High-End Styles ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, letterSpacing: -1 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748b', fontSize: 16, fontWeight: '500' },
  
  // Login
  loginContainer: { flex: 1, backgroundColor: '#020617' }, // Very deep background
  loginHero: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingTop: 60 },
  logoContainer: { padding: 4, backgroundColor: '#fff', borderRadius: 28, marginBottom: 24, ...SHADOWS.glowIndigo },
  loginLogo: { width: 90, height: 90, borderRadius: 24 },
  companyName: { color: '#ffffff', fontSize: 36, fontWeight: '900', letterSpacing: -0.5 },
  tagline: { color: '#64748b', fontSize: 16, marginTop: 8, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' },
  loginCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 60, ...SHADOWS.lg },
  dragHandle: { width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, alignSelf: 'center', marginBottom: 32 },
  loginTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginBottom: 8, letterSpacing: -1 },
  loginSubtitle: { fontSize: 16, color: '#64748b', marginBottom: 40, fontWeight: '500' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 20, marginBottom: 24, backgroundColor: '#f8fafc' },
  inputPrefix: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  inputDivider: { width: 1.5, height: 24, backgroundColor: '#e2e8f0', marginHorizontal: 16 },
  inputField: { flex: 1, paddingVertical: 20, fontSize: 18, color: '#0f172a', fontWeight: '700', letterSpacing: 1 },
  buttonPrimary: { backgroundColor: '#4f46e5', paddingVertical: 20, borderRadius: 20, alignItems: 'center', ...SHADOWS.glowIndigo },
  buttonPrimaryText: { color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  configText: { color: '#64748b', textAlign: 'center', fontWeight: '700', fontSize: 13, letterSpacing: 1 },

  // Modals & Bottom Sheets
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.7)', justifyContent: 'center', padding: 24 },
  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 32, padding: 32, ...SHADOWS.lg },
  bottomSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '80%', ...SHADOWS.lg },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8, color: '#0f172a', letterSpacing: -0.5 },
  inputFieldConfig: { borderWidth: 1.5, borderColor: '#e2e8f0', padding: 20, borderRadius: 16, fontSize: 16, backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600' },
  btnCancel: { padding: 18, borderRadius: 16, backgroundColor: '#f1f5f9', flex: 1, alignItems: 'center' },
  btnSave: { padding: 18, borderRadius: 16, backgroundColor: '#0f172a', flex: 1, alignItems: 'center', ...SHADOWS.md },
  companyRow: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: '#f8fafc' },
  companyRowActive: { backgroundColor: '#e0e7ff', borderColor: '#4f46e5', borderWidth: 1 },
  companyRowText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  companyRowTextActive: { color: '#4f46e5', fontWeight: '800' },

  // Pending
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  iconCircleLg: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  pendingCard: { backgroundColor: '#ffffff', padding: 40, borderRadius: 32, alignItems: 'center', ...SHADOWS.md, width: '100%' },
  pendingTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 16, letterSpacing: -1 },
  pendingDesc: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, fontWeight: '500' },

  // Catalog Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  headerCredit: { fontSize: 14, color: '#059669', fontWeight: '700', marginTop: 4 },
  headerLogo: { width: 48, height: 48, borderRadius: 16, ...SHADOWS.sm },
  
  // Search & Categories (MedPlus Style)
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: '#ffffff', padding: 18, paddingLeft: 48, borderRadius: 20, fontSize: 16, borderWidth: 1, borderColor: '#f1f5f9', color: '#0f172a', fontWeight: '600', ...SHADOWS.sm },
  filterIconBtn: { width: 60, height: 60, backgroundColor: '#ffffff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 12, borderWidth: 1, borderColor: '#f1f5f9', ...SHADOWS.sm },
  filterBadge: { position: 'absolute', top: 14, right: 14, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4f46e5', borderWidth: 2, borderColor: '#ffffff' },
  filterTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  
  categoryPill: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, backgroundColor: '#ffffff', marginRight: 12, borderWidth: 1, borderColor: '#f1f5f9', ...SHADOWS.sm },
  categoryPillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  categoryText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  categoryTextActive: { color: '#ffffff' },

  systemPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8 },
  systemPillActive: { backgroundColor: '#e0e7ff' },
  systemText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  systemTextActive: { color: '#4f46e5', fontWeight: '700' },
  
  // Products
  productCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', ...SHADOWS.sm },
  productInfo: { flex: 1, paddingRight: 16 },
  productName: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6, letterSpacing: -0.3 },
  productDesc: { fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productPrice: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  stockBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stockText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  
  cartAction: { alignItems: 'center' },
  addBtn: { backgroundColor: '#f8fafc', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  addBtnText: { color: '#4f46e5', fontWeight: '900', fontSize: 14 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  qtyBtn: { padding: 12, paddingHorizontal: 16 },
  qtyBtnText: { fontSize: 18, fontWeight: '800', color: '#4f46e5' },
  qtyInput: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#0f172a' },

  // Smart Cart Tracker
  smartCartTracker: { position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: '#0f172a', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smartCartTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  smartCartProgressBg: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  smartCartProgressFill: { height: '100%', borderRadius: 3 },
  smartCartBtn: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  smartCartBtnText: { color: '#ffffff', fontSize: 20, fontWeight: '900' },

  // Cart Screen
  cartItemCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#f1f5f9', ...SHADOWS.sm },
  cartItemQtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  checkoutFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, ...SHADOWS.lg },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  billLabel: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  billTotal: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  minOrderAlert: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2' },
  minOrderAlertText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  checkoutBtn: { backgroundColor: '#0f172a', paddingVertical: 20, borderRadius: 20, alignItems: 'center' },
  checkoutBtnDisabled: { backgroundColor: '#cbd5e1', opacity: 0.7 },
  checkoutBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },

  // Profile
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  profileName: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 4, letterSpacing: -0.5 },
  profilePhone: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  logoutBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  logoutBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 13 },
  
  creditCard: { backgroundColor: '#0f172a', padding: 24, borderRadius: 32, marginBottom: 40 },
  creditTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 20 },
  creditStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  creditLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  creditValue: { color: '#ffffff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  progressBar: { height: 8, backgroundColor: '#1e293b', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 20, letterSpacing: -0.5 },
  orderCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', ...SHADOWS.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  orderId: { fontWeight: '900', color: '#0f172a', fontSize: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderDate: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  orderTotal: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  invoiceBtn: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  invoiceBtnText: { color: '#4f46e5', fontWeight: '800', fontSize: 14 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', paddingBottom: Platform.OS === 'ios' ? 32 : 20, paddingTop: 16, position: 'absolute', bottom: 0, left: 0, right: 0 },
  tabItem: { flex: 1, alignItems: 'center', position: 'relative' },
  tabText: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginTop: 4 },
  tabTextActive: { color: '#0f172a', fontWeight: '900' },
  cartBadge: { position: 'absolute', top: -4, right: -8, width: 12, height: 12, backgroundColor: '#ef4444', borderRadius: 6, borderWidth: 2, borderColor: '#fff' },

  // Home Screen
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  homeGreeting: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  homeStoreName: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  homeSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 16, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', ...SHADOWS.sm },
  homeSearchPlaceholder: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  promoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', marginHorizontal: 16, marginBottom: 24, padding: 24, borderRadius: 24, ...SHADOWS.md },
  promoBannerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginBottom: 6, letterSpacing: -0.3 },
  promoBannerSub: { color: '#94a3b8', fontSize: 13, fontWeight: '500', lineHeight: 18, marginBottom: 16 },
  promoBannerBtn: { backgroundColor: '#4f46e5', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, alignSelf: 'flex-start' },
  promoBannerBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  homeSectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  homeSectionTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  seeAllText: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  homeCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 8 },
  homeCategoryItem: { width: '18%', margin: '1%', aspectRatio: 0.85, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 8 },
  homeCategoryIcon: { fontSize: 28, marginBottom: 6 },
  homeCategoryText: { fontSize: 11, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  featuredCard: { backgroundColor: '#ffffff', width: 148, marginRight: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', ...SHADOWS.sm },
  featuredCardImage: { width: '100%', height: 110, backgroundColor: '#f1f5f9' },
  featuredCardName: { fontSize: 13, fontWeight: '800', color: '#0f172a', margin: 10, marginBottom: 2, lineHeight: 18 },
  featuredCardCompany: { fontSize: 11, color: '#64748b', fontWeight: '600', marginHorizontal: 10, marginBottom: 4 },
  featuredCardPrice: { fontSize: 15, fontWeight: '900', color: '#4f46e5', margin: 10, marginTop: 2, marginBottom: 12 },

  // Catalog search + filter
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0, gap: 10 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', ...SHADOWS.sm },
  filterBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  filterBtnText: { fontWeight: '800', fontSize: 14, color: '#475569' },
  filterCountBadge: { backgroundColor: '#ef4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: -6, right: -6 },
  filterCountText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  activeChip: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#c7d2fe' },
  activeChipText: { color: '#4f46e5', fontWeight: '700', fontSize: 12 },
  clearChip: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  clearChipText: { color: '#dc2626', fontWeight: '700', fontSize: 12 },

  // Product card with thumbnail
  productThumb: { width: 72, height: 72, borderRadius: 16, marginRight: 14, backgroundColor: '#f1f5f9' },

  // Product detail modal
  detailImage: { width: '100%', height: 200, borderRadius: 20, marginBottom: 20, backgroundColor: '#f1f5f9' },
  detailInfoBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 12 },
  detailInfoLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  detailInfoValue: { fontSize: 15, color: '#0f172a', fontWeight: '600', lineHeight: 22 },

  // Filter panel
  filterPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clearAllText: { color: '#ef4444', fontWeight: '800', fontSize: 14 },
  filterSectionTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 12 },
  filterRadioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: '#4f46e5' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4f46e5' },
  filterOptionText: { fontSize: 16, color: '#475569', fontWeight: '600' },
  filterOptionTextActive: { color: '#0f172a', fontWeight: '800' },
  filterChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#e0e7ff', borderColor: '#4f46e5' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#4f46e5', fontWeight: '800' },
});
