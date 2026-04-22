import React, { useState, useEffect } from 'react';
import { enableScreens } from 'react-native-screens';
enableScreens(false);
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, BackHandler, FlatList, Image } from 'react-native';
import { create } from 'zustand';
import Constants from 'expo-constants';

// Connect to the local Next.js server where Expo is currently bridged
const getApiUrl = () => {
  try {
    const host = Constants.expoConfig?.hostUri?.split(':')[0] || '10.0.2.2';
    return `http://${host}:3000/api/data`;
  } catch(e) {
    return 'http://10.0.2.2:3000/api/data';
  }
};

const API_URL = getApiUrl();

// --- Zustand Store ---
const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  cart: {},
  products: [],
  setProducts: (products) => set({ products }),
  usersList: [],
  setUsersList: (usersList) => set({ usersList }),
  addToCart: (productId) => set((state) => ({ cart: { ...state.cart, [productId]: (state.cart[productId] || 0) + 1 } })),
  removeFromCart: (productId) => set((state) => {
    const newCart = { ...state.cart };
    if (newCart[productId] > 1) {
      newCart[productId] -= 1;
    } else {
      delete newCart[productId];
    }
    return { cart: newCart };
  }),
  orders: [],
  setOrders: (orders) => set({ orders }),
  placeOrder: async (order) => {
    // Fire remote update
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'orders', item: order, action: 'create' })
      });
    } catch(e) {
      console.error(e);
    }
    
    // Optimistic local update
    set((state) => ({
      orders: [order, ...state.orders],
      cart: {},
      user: state.user ? { ...state.user, credit_balance: state.user.credit_balance + order.total } : null
    }))
  },
}));

// --- Nav ---
// Removed to use Custom State Router

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
    <View style={styles.container}>
      {/* 1mg Style Context Header */}
      <View style={styles.headerContext}>
        <View>
          <Text style={styles.headerGreeting}>👋 Hello, {user?.store_name || 'Guest'}</Text>
          <Text style={styles.headerCredit}>Credit Available: ₹{user ? (user.credit_limit - user.credit_balance).toLocaleString('en-IN') : 0}</Text>
        </View>
        <Image source={{ uri: 'https://via.placeholder.com/40/059669/FFF?text=🔔'}} style={styles.bellIcon} />
      </View>

      <FlatList 
        ListHeaderComponent={
          <>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1584308666744-24d5e4785ca8?auto=format&fit=crop&q=80&w=800&h=300' }} 
              style={styles.promoBanner} 
            />
            <TextInput
              style={styles.searchInputPremium}
              placeholder="🔍 Search medicines, health products..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.categoryContainer}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={categories}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.categoryPill, selectedCategory === item && styles.categoryPillActive]}
                    onPress={() => setSelectedCategory(item)}
                  >
                    <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            <Text style={styles.sectionHeading}>Featured Products</Text>
          </>
        }
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <Image source={{ uri: `https://via.placeholder.com/150/f8fafc/059669?text=${encodeURIComponent(item.category.slice(0,4))}` }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productDesc}>{item.company}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>₹{item.price}</Text>
                <Text style={[styles.stockText, item.stock < 10 ? styles.stockLow : styles.stockNormal]}>
                  {item.stock > 0 ? `In Stock` : 'Out of Stock'}
                </Text>
              </View>
            </View>
            <View style={styles.cartActionContainer}>
              {(!cart[item.id] || cart[item.id] === 0) ? (
                 <TouchableOpacity style={styles.addButtonPrimary} onPress={() => addToCart(item.id)}>
                   <Text style={styles.addButtonPrimaryText}>ADD</Text>
                 </TouchableOpacity>
              ) : (
                 <View style={styles.cartControlsPremium}>
                   <TouchableOpacity style={styles.qtyBtnPremium} onPress={() => removeFromCart(item.id)}>
                     <Text style={styles.qtyBtnTextPremium}>-</Text>
                   </TouchableOpacity>
                   <Text style={styles.qtyTextPremium}>{cart[item.id]}</Text>
                   <TouchableOpacity style={styles.qtyBtnPremium} onPress={() => addToCart(item.id)}>
                     <Text style={styles.qtyBtnTextPremium}>+</Text>
                   </TouchableOpacity>
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
  const clearCart = useStore((state) => state.clearCart);
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
  const isDisabled = totalValue < 2000;

  const handlePlaceOrder = () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to place an order.");
      return;
    }
    
    if (user.credit_balance + totalValue > user.credit_limit) {
      Alert.alert("Credit Denied", "This order exceeds your total credit limit.");
      return;
    }

    const newOrder = {
      id: 'ORD' + Math.floor(Math.random() * 1000000),
      date: new Date().toLocaleDateString(),
      items: cartItems,
      total: totalValue,
      status: 'Placed'
    };

    placeOrder(newOrder);
    Alert.alert("Success", "Order Placed! 60-Day Credit Period Started.", [
      { text: "View Orders", onPress: () => setCurrentScreen('Profile') },
      { text: "Pay Now (QR)", onPress: () => setShowQR(true) }
    ]);
  };

  return (
    <View style={styles.container}>
      {cartItems.length === 0 && (
        <View style={styles.emptyCartContainer}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=300&h=300' }} style={styles.emptyCartImage} />
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartDesc}>Explore our catalog and add medicines to proceed.</Text>
        </View>
      )}
      
      {cartItems.length > 0 && (
         <FlatList 
           contentContainerStyle={{ paddingBottom: 60 }}
           ListHeaderComponent={<Text style={styles.sectionHeading}>Items in Cart</Text>}
           data={cartItems}
           keyExtractor={item => item.id.toString()}
           renderItem={({ item }) => (
             <View style={styles.cartCardPremium}>
               <View style={{ flex: 1 }}>
                 <Text style={styles.productName}>{item.name}</Text>
                 <Text style={styles.cartCardPrice}>₹{item.price}</Text>
               </View>
               <View style={styles.cartControlsPremium}>
                 <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.qtyBtn}>
                   <Text style={styles.qtyBtnText}>-</Text>
                 </TouchableOpacity>
                 <Text style={styles.qtyText}>{item.quantity}</Text>
                 <TouchableOpacity onPress={() => addToCart(item.id)} style={styles.qtyBtn}>
                   <Text style={styles.qtyBtnText}>+</Text>
                 </TouchableOpacity>
               </View>
             </View>
           )}
           ListFooterComponent={
             <View style={styles.billSummaryBox}>
               <Text style={styles.billSummaryTitle}>Bill Details</Text>
               <View style={styles.billSummaryRow}>
                 <Text style={styles.billSummaryText}>Item Total</Text>
                 <Text style={styles.billSummaryText}>₹{totalValue}</Text>
               </View>
               <View style={styles.billSummaryRow}>
                 <Text style={styles.billSummaryText}>Delivery Fee</Text>
                 <Text style={styles.billSummaryTextFree}>FREE</Text>
               </View>
               <View style={styles.divider} />
               <View style={styles.billSummaryRow}>
                 <Text style={styles.billSummaryTotalText}>To Pay</Text>
                 <Text style={styles.billSummaryTotalText}>₹{totalValue}</Text>
               </View>
             </View>
           }
         />
      )}
      
      <View style={styles.checkoutFooter}>
        <View style={{ flex: 1 }}>
           <Text style={styles.checkoutTotalDesc}>Total Payable</Text>
           <Text style={styles.checkoutTotalPrice}>₹{totalValue}</Text>
        </View>
        
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {isDisabled && totalValue > 0 ? (
            <Text style={styles.minOrderAlert}>Min. Order: ₹2000</Text>
          ) : null}
          <TouchableOpacity 
            style={[styles.placeOrderBtnPremium, (isDisabled || cartItems.length === 0) && styles.placeOrderBtnDisabled]} 
            disabled={isDisabled || cartItems.length === 0} 
            onPress={handlePlaceOrder}
          >
            <Text style={styles.buttonText}>Checkout ➔</Text>
          </TouchableOpacity>
        </View>

        {showQR && (
          <View style={styles.qrContainer}>
            <Image 
              source={{uri: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PharmaDummyPayment'}} 
              style={{width: 150, height: 150, marginTop: 20}} 
            />
            <Text style={styles.qrText}>Scan for Manual Payment</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// --- MainTabs Screen ---
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Catalog" component={CatalogScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
    </Tab.Navigator>
  );
}

// --- Pending Approval Screen ---
function PendingApprovalScreen() {
  useEffect(() => {
    const onBackPress = () => true; 
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Image source={{ uri: 'https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&q=80&w=400&h=400' }} style={styles.pendingImage} />
      <Text style={styles.pendingTitle}>Under Review</Text>
      <Text style={styles.pendingDesc}>Your wholesale profile is currently being verified by our compliance team. You will be granted access shortly.</Text>
    </View>
  );
}

// --- Login Screen ---
function LoginScreen({ setCurrentScreen }) {
  const [phone, setPhone] = useState('');
  const setUser = useStore((state) => state.setUser);
  const usersList = useStore((state) => state.usersList);

  const handleLogin = () => {
    const foundUser = usersList.find(u => u.phone === phone);

    if (!foundUser) {
      Alert.alert('Error', 'Unregistered User');
      return;
    }

    setUser(foundUser);

    if (foundUser.phone === '8888888888' || foundUser.is_approved === false) {
      setCurrentScreen('PendingApproval');
    } else if (foundUser.phone === '9999999999' || foundUser.is_approved === true) {
      setCurrentScreen('Catalog');
    }
  };

  return (
    <View style={styles.loginContainerPremium}>
      <Image source={{ uri: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=800&h=800' }} style={styles.loginHeroImage} />
      <View style={styles.loginBottomSheet}>
        <Text style={styles.loginTitlePremium}>Welcome to PharmaB2B</Text>
        <Text style={styles.loginSubtitlePremium}>Enter your registered phone number to access wholesale catalog and credit lines.</Text>
        
        <View style={styles.inputWrapperPremium}>
          <Text style={styles.inputPrefix}>+91</Text>
          <TextInput
            style={styles.inputPremium}
            placeholder="10-digit phone number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
          />
        </View>
        
        <TouchableOpacity style={styles.buttonPremium} onPress={handleLogin}>
          <Text style={styles.buttonTextPremium}>Login Securely</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Profile Screen ---
function ProfileScreen() {
  const user = useStore((state) => state.user);
  const orders = useStore((state) => state.orders);

  if (!user) return null;

  const creditUtilization = user.credit_limit > 0 ? (user.credit_balance / user.credit_limit) * 100 : 0;
  
  const invoicedTotal = orders
    .filter((o) => o.status === 'Shipped')
    .reduce((sub, order) => sub + order.total, 0);

  const handleDownloadInvoice = (orderId) => {
    Alert.alert("Invoice Generated", `PDF Invoice for ${orderId} has been successfully saved to your downloads.`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={() => (
          <>
            <View style={styles.profileHeaderPremium}>
              <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.store_name)}&background=059669&color=fff&size=120` }} style={styles.profileAvatar} />
              <Text style={styles.profileNamePremium}>{user.store_name}</Text>
              <Text style={styles.profilePhonePremium}>+91 {user.phone}</Text>
              <View style={styles.badgePremium}>
                <Text style={styles.badgeTextPremium}>{user.is_approved ? 'Verified Partner' : 'Verification Pending'}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Credit & Settlement</Text>
            <View style={styles.creditCardDark}>
              <View style={styles.creditCardHeader}>
                 <Text style={styles.creditCardTitle}>B2B CREDIT LINE</Text>
                 <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg' }} style={{ width: 40, height: 24 }} />
              </View>
              <View style={styles.creditCardBody}>
                <View>
                  <Text style={styles.creditCardLabel}>Utilized</Text>
                  <Text style={styles.creditCardValue}>₹{user.credit_balance.toLocaleString('en-IN')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.creditCardLabel}>Total Limit</Text>
                  <Text style={styles.creditCardValue}>₹{user.credit_limit.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              <View style={{ marginBottom: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#334155' }}>
                  <Text style={styles.creditCardLabel}>Shipped Orders (Invoiced Due)</Text>
                  <Text style={[styles.creditCardValue, { color: '#ef4444' }]}>₹{invoicedTotal.toLocaleString('en-IN')}</Text>
              </View>
              
              <View style={styles.progressNavDark}>
                <View style={[styles.progressFillDark, { width: `${Math.min(creditUtilization, 100)}%`, backgroundColor: creditUtilization > 90 ? '#ef4444' : '#10b981' }]} />
              </View>
              <Text style={styles.creditHintDark}>Settle balance within 60 days of invoice.</Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Order History</Text>
            {orders.length === 0 && <Text style={styles.subtitle}>No orders placed yet.</Text>}
          </>
        )}
        data={orders}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>{item.id}</Text>
              <Text style={styles.orderDate}>{item.date}</Text>
            </View>
            <View style={styles.orderBody}>
              <Text style={styles.orderStatus}>Status: <Text style={styles.statusHighlight}>{item.status}</Text></Text>
              <Text style={styles.orderTotal}>Total: ₹{item.total}</Text>
            </View>
            <TouchableOpacity style={styles.invoiceBtn} onPress={() => handleDownloadInvoice(item.id)}>
              <Text style={styles.invoiceBtnText}>📄 Download Invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// --- App Root ---
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const setProducts = useStore(state => state.setProducts);
  const setUsersList = useStore(state => state.setUsersList);
  const setOrders = useStore(state => state.setOrders);
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);

  const fetchDatabase = async () => {
    try {
      const res = await fetch(API_URL);
      const db = await res.json();
      setProducts(db.products || []);
      setUsersList(db.users || []);
      setOrders(db.orders || []);
      
      // Update local active user logic using pure getState to avoid infinite loops
      const currentUser = useStore.getState().user;
      if (currentUser) {
        const liveUser = db.users.find((u: any) => u.phone === currentUser.phone);
        if (liveUser && JSON.stringify(liveUser) !== JSON.stringify(currentUser)) {
          useStore.getState().setUser(liveUser);
        }
      }
    } catch(e) {
      console.log('API Fetch Error:', e);
    }
  };

  useEffect(() => {
    fetchDatabase();
    const intv = setInterval(fetchDatabase, 3000);
    return () => clearInterval(intv);
  }, []);

  const renderScreen = () => {
    if (currentScreen === 'Login') return <LoginScreen setCurrentScreen={setCurrentScreen} />;
    if (currentScreen === 'PendingApproval') return <PendingApprovalScreen />;
    
    // Main Tabs replacement
    if (['Catalog', 'Cart', 'Profile'].includes(currentScreen)) {
      return (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 40, paddingBottom: 10 }}>
            {currentScreen === 'Catalog' ? <CatalogScreen /> : 
             currentScreen === 'Cart' ? <CartScreen setCurrentScreen={setCurrentScreen} /> : 
             <ProfileScreen />}
          </View>
          <View style={styles.tabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentScreen('Catalog')}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>📦</Text>
              <Text style={[styles.tabText, currentScreen === 'Catalog' && styles.tabTextActive]}>Catalog</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentScreen('Cart')}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>🛒</Text>
              <Text style={[styles.tabText, currentScreen === 'Cart' && styles.tabTextActive]}>Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentScreen('Profile')}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>👤</Text>
              <Text style={[styles.tabText, currentScreen === 'Profile' && styles.tabTextActive]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#059669', // Premium Emerald Green
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800', // Bolder typography
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockNormal: {
    color: '#10b981',
  },
  stockLow: {
    color: '#f59e0b',
  },
  cartControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    backgroundColor: '#e2e8f0',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  checkoutFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'right',
  },
  minOrderAlert: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 12,
  },
  placeOrderBtn: {
    backgroundColor: '#10b981', // green default
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderBtnDisabled: {
    backgroundColor: '#cbd5e1', // gray disabled
    shadowOpacity: 0,
    elevation: 0,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  qrText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    padding: 8,
  },
  tabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#059669', // Emerald
    fontWeight: 'bold',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#0f172a',
  },
  categoryText: {
    color: '#64748b',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    alignItems: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#16a34a',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  creditCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  creditLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  creditValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  progressNav: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 16,
  },
  progressFill: {
    height: '100%',
  },
  creditHint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  orderId: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  orderDate: {
    color: '#64748b',
    fontSize: 12,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderStatus: {
    color: '#64748b',
  },
  statusHighlight: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  orderTotal: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  invoiceBtn: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  invoiceBtnText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 14,
  },
  headerContext: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  headerGreeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerCredit: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  bellIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  promoBanner: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 20,
  },
  searchInputPremium: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    marginTop: 8,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cartActionContainer: {
    justifyContent: 'center',
    minWidth: 80,
    alignItems: 'flex-end',
  },
  addButtonPrimary: {
    borderColor: '#059669',
    borderWidth: 1.5,
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonPrimaryText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 14,
  },
  cartControlsPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    overflow: 'hidden',
  },
  qtyBtnPremium: {
    width: 32,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#059669',
  },
  qtyBtnTextPremium: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  qtyTextPremium: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    minWidth: 20,
    textAlign: 'center',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyCartImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 20,
  },
  emptyCartTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyCartDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  cartCardPremium: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cartCardPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  billSummaryBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  billSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  billSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billSummaryText: {
    fontSize: 14,
    color: '#64748b',
  },
  billSummaryTextFree: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  billSummaryTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  checkoutTotalDesc: {
    fontSize: 14,
    color: '#64748b',
  },
  checkoutTotalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  placeOrderBtnPremium: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  pendingImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 30,
  },
  pendingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  pendingDesc: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  loginContainerPremium: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loginHeroImage: {
    width: '100%',
    height: '55%',
  },
  loginBottomSheet: {
    flex: 1,
    marginTop: -40,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  loginTitlePremium: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  loginSubtitlePremium: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputWrapperPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#f8fafc',
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 10,
  },
  inputPremium: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  buttonPremium: {
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonTextPremium: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileHeaderPremium: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 16,
  },
  profileNamePremium: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  profilePhonePremium: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  badgePremium: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  badgeTextPremium: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 13,
  },
  creditCardDark: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  creditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  creditCardTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  creditCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  creditCardLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 4,
  },
  creditCardValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  progressNavDark: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFillDark: {
    height: '100%',
  },
  creditHintDark: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  }
});
