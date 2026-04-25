// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { enableScreens } from 'react-native-screens';
enableScreens(false);
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, 
  BackHandler, FlatList, Image, Modal, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, LayoutAnimation, UIManager
} from 'react-native';
import { create } from 'zustand';
import Constants from 'expo-constants';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// We allow the user to change this at runtime for the prototype APK demo
const DEFAULT_IP = '192.168.1.100';

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
  clearCart: () => set({ cart: {} }),
  orders: [],
  setOrders: (orders) => set({ orders }),
  getApiUrl: () => `http://${get().serverIp}:3000/api/data`,
  placeOrder: async (order) => {
    try {
      await fetch(get().getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'orders', item: order, action: 'create' })
      });
    } catch(e) {
      console.error(e);
      Alert.alert('Error', 'Failed to connect to server. Check IP.');
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

// --- Login Screen ---
function LoginScreen({ setCurrentScreen }) {
  const [phone, setPhone] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [tempIp, setTempIp] = useState('');
  
  const setUser = useStore((state) => state.setUser);
  const usersList = useStore((state) => state.usersList);
  const serverIp = useStore((state) => state.serverIp);
  const setServerIp = useStore((state) => state.setServerIp);

  useEffect(() => {
    setTempIp(serverIp);
  }, [serverIp]);

  const handleLogin = () => {
    Haptics.selectionAsync();
    if (usersList.length === 0) {
       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
       Alert.alert('Connection Error', 'No data loaded from server. Please configure the Server IP to point to the Next.js API.');
       return;
    }
    const foundUser = usersList.find(u => u.phone === phone);
    if (!foundUser) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Unregistered User');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUser(foundUser);
    if (foundUser.phone === '8888888888' || foundUser.is_approved === false) {
      setCurrentScreen('PendingApproval');
    } else {
      setCurrentScreen('Catalog');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.loginContainer} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{flexGrow: 1}} keyboardShouldPersistTaps="handled">
        <View style={styles.loginHero}>
           <Image source={require('./assets/pharma_logo.jpeg')} style={styles.loginLogo} resizeMode="contain" />
           <Text style={styles.companyName}>UPKEM LABS</Text>
           <Text style={styles.tagline}>We build trust not medicine</Text>
        </View>
        
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>B2B Partner Portal</Text>
          <Text style={styles.loginSubtitle}>Access wholesale catalog and manage your credit line securely.</Text>
          
          <View style={styles.inputWrapper}>
            <Text style={styles.inputPrefix}>+91</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Enter 10-digit phone"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
          </View>
          
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin}>
            <Text style={styles.buttonPrimaryText}>Secure Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setShowConfig(true)}>
            <Text style={{ color: '#64748b', textAlign: 'center', fontWeight: 'bold' }}>⚙️ Configure Server IP</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showConfig} transparent animationType="slide">
           <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
             <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Demo Configuration</Text>
               <Text style={{marginBottom: 10, color: '#64748b'}}>Set the local IP of the machine running Next.js</Text>
               <TextInput style={styles.inputFieldConfig} value={tempIp} onChangeText={setTempIp} placeholder="192.168.x.x" />
               <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 20}}>
                 <TouchableOpacity onPress={() => setShowConfig(false)} style={styles.btnCancel}>
                   <Text style={{fontWeight: 'bold'}}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => { setServerIp(tempIp); setShowConfig(false); }} style={styles.btnSave}>
                   <Text style={{color: '#fff', fontWeight: 'bold'}}>Save IP</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Pending Approval ---
function PendingApprovalScreen() {
  return (
    <View style={styles.centeredContainer}>
      <View style={styles.pendingCard}>
         <Text style={{fontSize: 50, marginBottom: 10, textAlign: 'center'}}>⏳</Text>
         <Text style={styles.pendingTitle}>Under Review</Text>
         <Text style={styles.pendingDesc}>Your UPKEM LABS wholesale profile is currently being verified by our compliance team.</Text>
      </View>
    </View>
  );
}

// --- Catalog Screen ---
function CatalogScreen() {
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const cart = useStore((state) => state.cart);
  const productsList = useStore((state) => state.products);
  const user = useStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(productsList.map(p => p.category))];

  const filteredProducts = productsList.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👋 Hello, {user?.store_name}</Text>
          <Text style={styles.headerCredit}>Avail. Credit: ₹{(user?.credit_limit - user?.credit_balance).toLocaleString('en-IN')}</Text>
        </View>
        <Image source={require('./assets/pharma_logo.jpeg')} style={styles.headerLogo} />
      </View>

      <FlatList 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search UPKEM products..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={item => item}
              style={{ marginBottom: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.categoryPill, selectedCategory === item && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </>
        }
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productDesc}>{item.company} • {item.category}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>₹{item.price}</Text>
                <Text style={[styles.stockBadge, item.stock < 10 ? {color: '#ef4444'} : {}]}>
                  {item.stock > 0 ? `Stock: ${item.stock}` : 'Out of Stock'}
                </Text>
              </View>
            </View>
            <View style={styles.cartAction}>
              {(!cart[item.id] || cart[item.id] === 0) ? (
                 <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item.id)}>
                   <Text style={styles.addBtnText}>ADD</Text>
                 </TouchableOpacity>
              ) : (
                 <View style={styles.qtyControls}>
                   <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
                   <Text style={styles.qtyText}>{cart[item.id]}</Text>
                   <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                 </View>
              )}
            </View>
          </View>
        )}
      />
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
  const user = useStore((state) => state.user);
  const [showQR, setShowQR] = useState(false);

  const cartItems = Object.keys(cart).map(id => {
    const product = products.find(p => p.id === parseInt(id));
    return { ...product, quantity: cart[id] };
  });

  const totalValue = cartItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
  const isMinMet = totalValue >= 2000;

  const handlePlaceOrder = async () => {
    Haptics.selectionAsync();
    if (user.credit_balance + totalValue > user.credit_limit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Credit Limit Exceeded", "Please settle previous invoices or contact admin.");
      return;
    }
    const newOrder = {
      id: 'UPK' + Math.floor(Math.random() * 1000000),
      date: new Date().toLocaleDateString(),
      store: user.store_name,
      phone: user.phone,
      items: cartItems,
      total: totalValue,
      status: 'Placed'
    };

    const success = await placeOrder(newOrder);
    if(success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Order Placed! 60-Day Credit Period Started.", [
        { text: "View Orders", onPress: () => setCurrentScreen('Profile') },
        { text: "Pay Now (QR)", onPress: () => setShowQR(true) }
      ]);
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={{fontSize: 40, marginBottom: 10}}>🛒</Text>
        <Text style={{fontSize: 20, fontWeight: 'bold', color: '#0f172a'}}>Cart is Empty</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList 
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        data={cartItems}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
             <View style={{ flex: 1 }}>
               <Text style={styles.productName}>{item.name}</Text>
               <Text style={styles.productPrice}>₹{item.price}</Text>
             </View>
             <View style={styles.qtyControls}>
               <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
               <Text style={styles.qtyText}>{item.quantity}</Text>
               <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
             </View>
          </View>
        )}
      />
      <View style={styles.checkoutFooter}>
         <View style={styles.billRow}>
           <Text style={styles.billLabel}>Total Payable</Text>
           <Text style={styles.billTotal}>₹{totalValue}</Text>
         </View>
         {!isMinMet && <Text style={styles.minOrderAlert}>⚠️ Minimum order value is ₹2000</Text>}
         <TouchableOpacity 
           style={[styles.checkoutBtn, !isMinMet && styles.checkoutBtnDisabled]} 
           disabled={!isMinMet} onPress={handlePlaceOrder}
         >
           <Text style={styles.checkoutBtnText}>Checkout Order</Text>
         </TouchableOpacity>
      </View>

      <Modal visible={showQR} transparent animationType="slide">
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Manual Payment</Text>
             <Image source={{uri: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=UPKEM-LABS-PAYMENT'}} style={{width: 200, height: 200, marginVertical: 20, alignSelf: 'center'}} />
             <Text style={{textAlign: 'center', color: '#64748b', marginBottom: 20}}>Scan to pay UPKEM LABS</Text>
             <TouchableOpacity onPress={() => setShowQR(false)} style={styles.btnSave}>
               <Text style={{color: '#fff', fontWeight: 'bold', textAlign: 'center'}}>Done</Text>
             </TouchableOpacity>
           </View>
         </View>
      </Modal>
    </View>
  );
}

// --- Profile Screen ---
function ProfileScreen() {
  const user = useStore((state) => state.user);
  const orders = useStore((state) => state.orders);

  const generateInvoice = async (order) => {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #0f172a; }
            h1 { color: #059669; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background: #f8fafc; }
            .total { text-align: right; font-size: 24px; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>UPKEM LABS</h1>
            <p><strong>Tagline:</strong> We build trust not medicine</p>
            <h2>TAX INVOICE</h2>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Date:</strong> ${order.date}</p>
            <p><strong>Billed To:</strong> ${user.store_name} (+91 ${user.phone})</p>
          </div>
          <table>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
            ${order.items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>₹${i.price}</td><td>₹${i.price * i.quantity}</td></tr>`).join('')}
          </table>
          <div class="total">Total Payable: ₹${order.total}</div>
          <p style="margin-top: 50px; font-size: 12px; color: #64748b;">Terms: Payment due strictly within 60 days of dispatch. Late payments may incur penalties.</p>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch(err) {
      console.log(err);
      Alert.alert('Error', 'Could not generate invoice.');
    }
  };

  const utilization = (user.credit_balance / user.credit_limit) * 100;

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}><Text style={{fontSize: 30, color: '#fff'}}>{user.store_name[0]}</Text></View>
              <Text style={styles.profileName}>{user.store_name}</Text>
              <Text style={styles.profilePhone}>+91 {user.phone}</Text>
            </View>

            <View style={styles.creditCard}>
              <Text style={styles.creditTitle}>UPKEM CREDIT LINE</Text>
              <View style={styles.creditStats}>
                <View>
                  <Text style={styles.creditLabel}>Utilized</Text>
                  <Text style={styles.creditValue}>₹{user.credit_balance.toLocaleString('en-IN')}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={styles.creditLabel}>Total Limit</Text>
                  <Text style={styles.creditValue}>₹{user.credit_limit.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <View style={styles.progressBar}><View style={[styles.progressFill, {width: `${Math.min(utilization, 100)}%`}]} /></View>
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
              <Text style={styles.orderStatus}>{item.status}</Text>
            </View>
            <Text style={styles.orderDate}>{item.date} • ₹{item.total}</Text>
            {item.status !== 'Rejected' && (
               <TouchableOpacity style={styles.invoiceBtn} onPress={() => generateInvoice(item)}>
                 <Text style={styles.invoiceBtnText}>📄 PDF Invoice</Text>
               </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

// --- App Root ---
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const fetchAPI = async () => {
    try {
      const url = useStore.getState().getApiUrl();
      const res = await fetch(url);
      if (!res.ok) return;
      const db = await res.json();
      useStore.getState().setProducts(db.products || []);
      useStore.getState().setUsersList(db.users || []);
      // Filter orders relevant to current logged in user
      const currUser = useStore.getState().user;
      if (currUser) {
         const userOrders = db.orders.filter(o => o.phone === currUser.phone || o.store === currUser.store_name);
         useStore.getState().setOrders(userOrders);
         const liveUser = db.users.find(u => u.phone === currUser.phone);
         if (liveUser && JSON.stringify(liveUser) !== JSON.stringify(currUser)) {
           useStore.getState().setUser(liveUser);
         }
      }
    } catch(e) {
      // Quiet fail for polling
    }
  };

  useEffect(() => {
    fetchAPI();
    const interval = setInterval(fetchAPI, 3000);
    return () => clearInterval(interval);
  }, []);

  const renderScreen = () => {
    if (currentScreen === 'Login') return <LoginScreen setCurrentScreen={setCurrentScreen} />;
    if (currentScreen === 'PendingApproval') return <PendingApprovalScreen />;
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, paddingTop: 40 }}>
          {currentScreen === 'Catalog' && <CatalogScreen />}
          {currentScreen === 'Cart' && <CartScreen setCurrentScreen={setCurrentScreen} />}
          {currentScreen === 'Profile' && <ProfileScreen />}
        </View>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCurrentScreen('Catalog'); }}>
            <Text style={[styles.tabText, currentScreen === 'Catalog' && styles.tabTextActive]}>📦 Catalog</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCurrentScreen('Cart'); }}>
            <Text style={[styles.tabText, currentScreen === 'Cart' && styles.tabTextActive]}>🛒 Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => { Haptics.selectionAsync(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCurrentScreen('Profile'); }}>
            <Text style={[styles.tabText, currentScreen === 'Profile' && styles.tabTextActive]}>👤 Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return <View style={{ flex: 1 }}>{renderScreen()}</View>;
}

// --- Styles ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  
  // Login
  loginContainer: { flex: 1, backgroundColor: '#0f172a' },
  loginHero: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginLogo: { width: 120, height: 120, borderRadius: 20, marginBottom: 20 },
  companyName: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: '#10b981', fontSize: 16, marginTop: 8, fontStyle: 'italic' },
  loginCard: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  loginTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  loginSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24, backgroundColor: '#f8fafc' },
  inputPrefix: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginRight: 10 },
  inputField: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0f172a' },
  buttonPrimary: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonPrimaryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#0f172a' },
  inputFieldConfig: { borderWidth: 1, borderColor: '#cbd5e1', padding: 12, borderRadius: 8, fontSize: 16 },
  btnCancel: { padding: 12, borderRadius: 8, backgroundColor: '#e2e8f0', flex: 1, marginRight: 10, alignItems: 'center' },
  btnSave: { padding: 12, borderRadius: 8, backgroundColor: '#059669', flex: 1, alignItems: 'center' },

  // Pending
  pendingCard: { backgroundColor: '#fff', padding: 30, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginHorizontal: 20 },
  pendingTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 10 },
  pendingDesc: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },

  // Catalog
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  headerCredit: { fontSize: 14, color: '#059669', fontWeight: 'bold', marginTop: 4 },
  headerLogo: { width: 45, height: 45, borderRadius: 10 },
  searchInput: { backgroundColor: '#fff', padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 8 },
  categoryPillActive: { backgroundColor: '#0f172a' },
  categoryText: { color: '#64748b', fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  productCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  productDesc: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  stockBadge: { fontSize: 12, color: '#10b981', fontWeight: 'bold' },
  cartAction: { marginLeft: 16 },
  addBtn: { backgroundColor: '#ecfdf5', borderColor: '#059669', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  addBtnText: { color: '#059669', fontWeight: 'bold' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 8 },
  qtyBtn: { padding: 10, width: 36, alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  qtyText: { color: '#fff', fontWeight: 'bold', minWidth: 20, textAlign: 'center' },

  // Cart
  cartItem: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  checkoutFooter: { position: 'absolute', bottom: 80, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billLabel: { fontSize: 16, color: '#64748b' },
  billTotal: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  minOrderAlert: { color: '#ef4444', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  checkoutBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 12, alignItems: 'center' },
  checkoutBtnDisabled: { backgroundColor: '#94a3b8' },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Profile
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  profilePhone: { fontSize: 16, color: '#64748b' },
  creditCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 16, marginBottom: 24 },
  creditTitle: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 16 },
  creditStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  creditLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  creditValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  progressBar: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontWeight: 'bold', color: '#0f172a' },
  orderStatus: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
  orderDate: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  invoiceBtn: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  invoiceBtnText: { color: '#0f172a', fontWeight: '600' },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: 20, paddingTop: 10, position: 'absolute', bottom: 0, left: 0, right: 0 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabText: { color: '#94a3b8', fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#059669', fontWeight: 'bold' }
});
