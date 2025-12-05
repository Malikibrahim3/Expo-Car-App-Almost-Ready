/**
 * VehicleImage - Shows car images with smart fallbacks
 * Uses real car photos when available, brand logos as fallback
 */
import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Car } from 'lucide-react-native';
import { useThemeMode } from '@/src/context/ThemeContext';
import { Radius } from '@/src/constants/LinearDesign';

interface VehicleImageProps {
  make?: string;
  model?: string;
  year?: number;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  showPhoto?: boolean; // If true, try to show actual car photo instead of logo
}

// Car brand logos (free to use)
const BRAND_LOGOS: Record<string, string> = {
  tesla: 'https://www.carlogos.org/car-logos/tesla-logo.png',
  bmw: 'https://www.carlogos.org/car-logos/bmw-logo.png',
  audi: 'https://www.carlogos.org/car-logos/audi-logo.png',
  mercedes: 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png',
  toyota: 'https://www.carlogos.org/car-logos/toyota-logo.png',
  honda: 'https://www.carlogos.org/car-logos/honda-logo.png',
  ford: 'https://www.carlogos.org/car-logos/ford-logo.png',
  chevrolet: 'https://www.carlogos.org/car-logos/chevrolet-logo.png',
  nissan: 'https://www.carlogos.org/car-logos/nissan-logo.png',
  hyundai: 'https://www.carlogos.org/car-logos/hyundai-logo.png',
  kia: 'https://www.carlogos.org/car-logos/kia-logo.png',
  volkswagen: 'https://www.carlogos.org/car-logos/volkswagen-logo.png',
  porsche: 'https://www.carlogos.org/car-logos/porsche-logo.png',
  lexus: 'https://www.carlogos.org/car-logos/lexus-logo.png',
  subaru: 'https://www.carlogos.org/car-logos/subaru-logo.png',
  mazda: 'https://www.carlogos.org/car-logos/mazda-logo.png',
  jeep: 'https://www.carlogos.org/car-logos/jeep-logo.png',
  ram: 'https://www.carlogos.org/car-logos/ram-logo.png',
  gmc: 'https://www.carlogos.org/car-logos/gmc-logo.png',
  cadillac: 'https://www.carlogos.org/car-logos/cadillac-logo.png',
  acura: 'https://www.carlogos.org/car-logos/acura-logo.png',
  infiniti: 'https://www.carlogos.org/car-logos/infiniti-logo.png',
  volvo: 'https://www.carlogos.org/car-logos/volvo-logo.png',
  jaguar: 'https://www.carlogos.org/car-logos/jaguar-logo.png',
  landrover: 'https://www.carlogos.org/car-logos/land-rover-logo.png',
  mini: 'https://www.carlogos.org/car-logos/mini-logo.png',
  fiat: 'https://www.carlogos.org/car-logos/fiat-logo.png',
  alfa: 'https://www.carlogos.org/car-logos/alfa-romeo-logo.png',
  maserati: 'https://www.carlogos.org/car-logos/maserati-logo.png',
  genesis: 'https://www.carlogos.org/car-logos/genesis-logo.png',
  rivian: 'https://www.carlogos.org/car-logos/rivian-logo.png',
  lucid: 'https://www.carlogos.org/car-logos/lucid-logo.png',
};

// Real car photos - high quality images from Unsplash
const CAR_PHOTOS: Record<string, string> = {
  // BMW
  bmw_3_series: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=300&fit=crop',
  bmw_330i: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=300&fit=crop',
  bmw_5_series: 'https://images.unsplash.com/photo-1523983388277-336a66bf9bcd?w=400&h=300&fit=crop',
  bmw_m3: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=400&h=300&fit=crop',
  bmw_m5: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=300&fit=crop',
  bmw_x3: 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=400&h=300&fit=crop',
  bmw_x5: 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=400&h=300&fit=crop',
  
  // Mercedes-Benz
  mercedes_c_class: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=300&fit=crop',
  mercedesbenz_c_class: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=300&fit=crop',
  mercedes_e_class: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=400&h=300&fit=crop',
  mercedesbenz_e_class: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=400&h=300&fit=crop',
  mercedes_s_class: 'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=400&h=300&fit=crop',
  mercedes_gle: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=400&h=300&fit=crop',
  mercedes_amg_gt: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=300&fit=crop',
  
  // Tesla
  tesla_model_3: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=300&fit=crop',
  tesla_model3: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=300&fit=crop',
  tesla_model_y: 'https://images.unsplash.com/photo-1619317190536-8e8a8e0e8e8e?w=400&h=300&fit=crop',
  tesla_modely: 'https://images.unsplash.com/photo-1619317190536-8e8a8e0e8e8e?w=400&h=300&fit=crop',
  tesla_model_s: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=400&h=300&fit=crop',
  tesla_models: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=400&h=300&fit=crop',
  tesla_model_x: 'https://images.unsplash.com/photo-1566055909643-a51b4271aa47?w=400&h=300&fit=crop',
  
  // Audi
  audi_a4: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=300&fit=crop',
  audi_a4_premium_plus: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=300&fit=crop',
  audi_a6: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=400&h=300&fit=crop',
  audi_q5: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&h=300&fit=crop',
  audi_q7: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&h=300&fit=crop',
  audi_r8: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=400&h=300&fit=crop',
  audi_rs6: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&h=300&fit=crop',
  
  // Ford
  ford_f_150: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  ford_f150: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  ford_mustang: 'https://images.unsplash.com/photo-1584345604476-8ec5f82d718c?w=400&h=300&fit=crop',
  ford_bronco: 'https://images.unsplash.com/photo-1612544448445-b8232cff3b6c?w=400&h=300&fit=crop',
  ford_explorer: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  ford_escape: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  ford_mach_e: 'https://images.unsplash.com/photo-1619317190536-8e8a8e0e8e8e?w=400&h=300&fit=crop',
  
  // Toyota
  toyota_camry: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  toyota_corolla: 'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=400&h=300&fit=crop',
  toyota_rav4: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=300&fit=crop',
  toyota_highlander: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=300&fit=crop',
  toyota_tacoma: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  toyota_4runner: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=300&fit=crop',
  toyota_supra: 'https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?w=400&h=300&fit=crop',
  
  // Honda
  honda_accord: 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=400&h=300&fit=crop',
  honda_civic: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400&h=300&fit=crop',
  honda_cr_v: 'https://images.unsplash.com/photo-1568844293986-8c8e5dc7f7a6?w=400&h=300&fit=crop',
  honda_crv: 'https://images.unsplash.com/photo-1568844293986-8c8e5dc7f7a6?w=400&h=300&fit=crop',
  honda_pilot: 'https://images.unsplash.com/photo-1568844293986-8c8e5dc7f7a6?w=400&h=300&fit=crop',
  honda_odyssey: 'https://images.unsplash.com/photo-1568844293986-8c8e5dc7f7a6?w=400&h=300&fit=crop',
  
  // Porsche
  porsche_911: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
  porsche_cayenne: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&h=300&fit=crop',
  porsche_macan: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&h=300&fit=crop',
  porsche_taycan: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&h=300&fit=crop',
  porsche_panamera: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
  
  // Chevrolet
  chevrolet_silverado: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  chevrolet_camaro: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
  chevrolet_corvette: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
  chevrolet_tahoe: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  chevrolet_equinox: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Lexus
  lexus_rx: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&h=300&fit=crop',
  lexus_es: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  lexus_nx: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=400&h=300&fit=crop',
  lexus_is: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  lexus_lc: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
  
  // Jeep
  jeep_wrangler: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&h=300&fit=crop',
  jeep_grand_cherokee: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  jeep_cherokee: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  jeep_gladiator: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  
  // Subaru
  subaru_outback: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  subaru_forester: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  subaru_crosstrek: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  subaru_wrx: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400&h=300&fit=crop',
  
  // Hyundai
  hyundai_tucson: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  hyundai_santa_fe: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  hyundai_sonata: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  hyundai_elantra: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400&h=300&fit=crop',
  hyundai_palisade: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Kia
  kia_telluride: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  kia_sorento: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  kia_sportage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  kia_k5: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  kia_ev6: 'https://images.unsplash.com/photo-1619317190536-8e8a8e0e8e8e?w=400&h=300&fit=crop',
  
  // Nissan
  nissan_altima: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  nissan_rogue: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  nissan_pathfinder: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  nissan_frontier: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  nissan_gt_r: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=300&fit=crop',
  nissan_z: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=300&fit=crop',
  
  // Volkswagen
  volkswagen_golf: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400&h=300&fit=crop',
  volkswagen_jetta: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400&h=300&fit=crop',
  volkswagen_tiguan: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  volkswagen_atlas: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  volkswagen_id4: 'https://images.unsplash.com/photo-1619317190536-8e8a8e0e8e8e?w=400&h=300&fit=crop',
  
  // Mazda
  mazda_cx_5: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  mazda_cx5: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  mazda_cx_9: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  mazda_3: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400&h=300&fit=crop',
  mazda_mx_5: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=300&fit=crop',
  
  // GMC
  gmc_sierra: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  gmc_yukon: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  gmc_acadia: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  gmc_terrain: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Ram
  ram_1500: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  ram_2500: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  ram_3500: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  
  // Cadillac
  cadillac_escalade: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  cadillac_ct5: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  cadillac_xt5: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Acura
  acura_mdx: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  acura_rdx: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  acura_tlx: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  acura_integra: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400&h=300&fit=crop',
  
  // Infiniti
  infiniti_qx60: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  infiniti_qx80: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  infiniti_q50: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  
  // Volvo
  volvo_xc90: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  volvo_xc60: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  volvo_s60: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  
  // Land Rover / Range Rover
  landrover_range_rover: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=400&h=300&fit=crop',
  landrover_defender: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&h=300&fit=crop',
  landrover_discovery: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Jaguar
  jaguar_f_pace: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  jaguar_f_type: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=300&fit=crop',
  jaguar_xe: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  
  // Genesis
  genesis_gv80: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  genesis_gv70: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  genesis_g80: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  genesis_g70: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
  
  // Rivian
  rivian_r1t: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=300&fit=crop',
  rivian_r1s: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Lucid
  lucid_air: 'https://images.unsplash.com/photo-1619317190536-8e8a8e0e8e8e?w=400&h=300&fit=crop',
  
  // Dodge
  dodge_charger: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
  dodge_challenger: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
  dodge_durango: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Buick
  buick_enclave: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  buick_envision: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Lincoln
  lincoln_navigator: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  lincoln_aviator: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
  
  // Mini
  mini_cooper: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400&h=300&fit=crop',
  mini_countryman: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop',
};

const SIZES = {
  small: { width: 48, height: 48, iconSize: 20 },
  medium: { width: 72, height: 72, iconSize: 28 },
  large: { width: 120, height: 80, iconSize: 40 },
};

export function VehicleImage({ make, model, year, size = 'medium', style, showPhoto = false }: VehicleImageProps) {
  const { colors } = useThemeMode();
  const [imageError, setImageError] = useState(false);
  const dimensions = SIZES[size];

  const normalizedMake = make?.toLowerCase().replace(/[^a-z]/g, '') || '';
  const normalizedModel = model?.toLowerCase().replace(/[^a-z0-9]/g, '_') || '';
  const photoKey = `${normalizedMake}_${normalizedModel}`;
  
  const logoUrl = BRAND_LOGOS[normalizedMake];
  
  // Try to find a photo - first exact match, then partial match
  let photoUrl = CAR_PHOTOS[photoKey];
  if (!photoUrl && normalizedMake && normalizedModel) {
    // Try to find a partial match (e.g., "3_series" matches "bmw_3_series")
    const partialKey = Object.keys(CAR_PHOTOS).find(key => 
      key.startsWith(normalizedMake) && key.includes(normalizedModel.split('_')[0])
    );
    if (partialKey) {
      photoUrl = CAR_PHOTOS[partialKey];
    }
  }

  // If showPhoto is true and we have a photo, show the actual car image
  if (showPhoto && photoUrl && !imageError) {
    return (
      <View style={[styles.photoContainer, { width: dimensions.width, height: dimensions.height, backgroundColor: colors.surface, borderColor: colors.border }, style]}>
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  // If we have a logo and no error, show it
  if (logoUrl && !imageError) {
    return (
      <View style={[styles.container, { width: dimensions.width, height: dimensions.height, backgroundColor: colors.surface, borderColor: colors.border }, style]}>
        <Image
          source={{ uri: logoUrl }}
          style={[styles.image, { width: dimensions.width * 0.7, height: dimensions.height * 0.7 }]}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      </View>
    );
  }

  // Fallback: show car icon with brand initial
  return (
    <View style={[styles.container, styles.fallback, { width: dimensions.width, height: dimensions.height, backgroundColor: colors.brandSubtle, borderColor: colors.border }, style]}>
      <Car size={dimensions.iconSize} color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoContainer: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  image: {
    // Sized dynamically
  },
  fallback: {
    // Uses brandSubtle background
  },
});

export default VehicleImage;
