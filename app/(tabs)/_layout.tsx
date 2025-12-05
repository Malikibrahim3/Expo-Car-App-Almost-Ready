/**
 * Tab Layout - 5 tabs: Home, Garage, Deals, Notifications, Profile
 */

import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { View, Platform, StyleSheet } from 'react-native';
import { Home, Car, User, Tag, Bell } from 'lucide-react-native';
import { Colors, Radius, IconSizes } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

export default function TabLayout() {
  const { isDark, colors } = useThemeMode();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <View style={[styles.tabBarBackground, { backgroundColor: isDark ? 'rgba(8, 9, 10, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
            <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={[styles.tabBarBorder, { backgroundColor: colors.border }]} />
          </View>
        ),
      }}
    >
      <Tabs.Screen 
        name="dashboard" 
        options={{ 
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab - see your car summary',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: colors.brandSubtle }]}>
              <Home size={IconSizes.md} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="garage" 
        options={{ 
          title: 'My Cars',
          tabBarAccessibilityLabel: 'My Cars tab - view and manage your vehicles',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: colors.brandSubtle }]}>
              <Car size={IconSizes.md} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="deals" 
        options={{ 
          title: 'Deals',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: colors.brandSubtle }]}>
              <Tag size={IconSizes.md} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="notifications" 
        options={{ 
          title: 'Updates',
          tabBarAccessibilityLabel: 'Updates tab - notifications about your cars',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: colors.brandSubtle }]}>
              <Bell size={IconSizes.md} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: colors.brandSubtle }]}>
              <User size={IconSizes.md} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          )
        }} 
      />
      {/* Hidden tabs */}
      <Tabs.Screen name="tools" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="market" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  tabBarBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
});
