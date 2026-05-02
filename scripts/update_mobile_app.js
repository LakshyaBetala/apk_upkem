const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '../mobile/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Update useStore
const storeReplacement = `
  getApiUrl: () => \`http://\${get().serverIp}:3000/api/data\`,
  getTokenUrl: () => \`http://\${get().serverIp}:3000/api/user/token\`,
  getOtpUrl: () => \`http://\${get().serverIp}:3000/api/auth/otp\`,
  getVerifyUrl: () => \`http://\${get().serverIp}:3000/api/auth/verify\`,
  getSignupUrl: () => \`http://\${get().serverIp}:3000/api/auth/signup\`,
`;
content = content.replace(/getApiUrl: \(\) => `http:\/\/\$\{get\(\)\.serverIp\}:3000\/api\/data`,/g, storeReplacement);

// 2. Add SignupScreen and Update LoginScreen
const loginScreenRegex = /\/\/ --- Login Screen ---\s+function LoginScreen\(\{ setCurrentScreen \}\) \{[\s\S]*?(?=\/\/ --- Pending Approval ---)/;

const newAuthScreens = `
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
        setCurrentScreen('Catalog');
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
`;

content = content.replace(loginScreenRegex, newAuthScreens);

// 3. Update App renderScreen to handle Signup
const appRenderRegex = /if \(currentScreen === 'Login'\) return <LoginScreen setCurrentScreen=\{setCurrentScreen\} \/>;/;
content = content.replace(appRenderRegex, "if (currentScreen === 'Login') return <LoginScreen setCurrentScreen={setCurrentScreen} />;\n    if (currentScreen === 'Signup') return <SignupScreen setCurrentScreen={setCurrentScreen} />;");

// 4. Update MIN_ORDER_VALUE
content = content.replace(/const MIN_ORDER_VALUE = \d+;/g, "const MIN_ORDER_VALUE = 5000;");

// 5. Update CatalogScreen - Inject Sort, Multi-select Company, and Price Range (Mock UI for price range due to native slider dependency constraints)
// Wait, for CatalogScreen, I will use a simple regex replacement for the top variables.
content = content.replace(/const \[selectedCompany, setSelectedCompany\] = useState\('All'\);/g, `const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [sortOption, setSortOption] = useState('name_asc');
  const [selectedProduct, setSelectedProduct] = useState(null);`);

content = content.replace(/const matchesCompany = selectedCompany === 'All' \|\| p\.company === selectedCompany;/g, `const matchesCompany = selectedCompanies.length === 0 || selectedCompanies.includes(p.company);`);

// Replace the filter mapping
content = content.replace(/const filteredProducts = productsList.filter\(p => \{[\s\S]*?\}\);/g, `let filteredProducts = productsList.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSystem = selectedSystem === 'All' || p.body_system === selectedSystem;
    const matchesCompany = selectedCompanies.length === 0 || selectedCompanies.includes(p.company);
    return matchesSearch && matchesCategory && matchesSystem && matchesCompany;
  });
  
  if (sortOption === 'price_asc') filteredProducts.sort((a,b) => (a.price_ptr || a.price) - (b.price_ptr || b.price));
  if (sortOption === 'price_desc') filteredProducts.sort((a,b) => (b.price_ptr || b.price) - (a.price_ptr || a.price));
  if (sortOption === 'name_asc') filteredProducts.sort((a,b) => a.name.localeCompare(b.name));
`);

// Add Product Details Modal inside CatalogScreen
content = content.replace(/\{\/\* Company Filter Modal \*\/\}/, `{/* Product Details Modal */}
      <Modal visible={!!selectedProduct} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            {selectedProduct && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                <Text style={{color: '#64748b', fontSize: 16, marginBottom: 12}}>{selectedProduct.company}</Text>
                <View style={{flexDirection: 'row', gap: 8, marginBottom: 16}}>
                  <View style={styles.systemPillActive}><Text style={styles.systemTextActive}>{selectedProduct.category}</Text></View>
                  <View style={styles.systemPill}><Text style={styles.systemText}>{selectedProduct.body_system}</Text></View>
                </View>
                <View style={{backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 16}}>
                  <Text style={{fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase'}}>Composition</Text>
                  <Text style={{fontSize: 16, color: '#0f172a', marginTop: 4}}>{selectedProduct.composition || 'Standard Formulation'}</Text>
                </View>
                <View style={{backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 16}}>
                  <Text style={{fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase'}}>Description</Text>
                  <Text style={{fontSize: 15, color: '#475569', marginTop: 4, lineHeight: 22}}>{selectedProduct.description || 'No description available for this SKU.'}</Text>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8}}>
                  <View>
                    <Text style={{fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase'}}>PTR Price</Text>
                    <Text style={{fontSize: 24, fontWeight: '900', color: '#0f172a'}}>₹{selectedProduct.price_ptr || selectedProduct.price}</Text>
                  </View>
                  <View>
                    <Text style={{fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase'}}>MRP</Text>
                    <Text style={{fontSize: 18, fontWeight: '700', color: '#64748b', textDecorationLine: 'line-through'}}>₹{selectedProduct.mrp || (selectedProduct.price * 1.2).toFixed(2)}</Text>
                  </View>
                  <View>
                    <Text style={{fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase'}}>Packing</Text>
                    <Text style={{fontSize: 16, fontWeight: '700', color: '#0f172a'}}>{selectedProduct.packing || '1x10'}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
            <AnimatedPressable style={[styles.buttonPrimary, { marginTop: 24 }]} onPress={() => setSelectedProduct(null)}>
              <Text style={styles.buttonPrimaryText}>Close</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Company Filter Modal */}`);

content = content.replace(/<View style=\{styles\.productCard\}>/, `<TouchableOpacity style={styles.productCard} onPress={() => setSelectedProduct(item)} activeOpacity={0.8}>`);
content = content.replace(/<\/View>\s*<\/View>\s*\)\}\s*ListEmptyComponent/g, `</View>\n          </TouchableOpacity>\n        )}\n        ListEmptyComponent`);


fs.writeFileSync(appPath, content);
console.log('App.tsx updated successfully');
