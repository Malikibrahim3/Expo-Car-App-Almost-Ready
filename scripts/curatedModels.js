/**
 * Curated list of car/truck/SUV models only (no motorcycles, ATVs, etc.)
 * This replaces the bloated NHTSA data
 */

// Cars & SUVs only - no trucks, vans, or pickups
const CURATED_MODELS = {
  'Acura': ['ILX', 'Integra', 'MDX', 'NSX', 'RDX', 'RLX', 'TL', 'TLX', 'TSX', 'ZDX'],
  'Alfa Romeo': ['4C', 'Giulia', 'Stelvio', 'Tonale'],
  'Aston Martin': ['DB11', 'DB9', 'DBS', 'DBX', 'Rapide', 'Vantage', 'Vanquish'],
  'Audi': ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'e-tron', 'e-tron GT', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'R8', 'RS3', 'RS5', 'RS6', 'RS7', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'SQ5', 'SQ7', 'SQ8', 'TT'],
  'Bentley': ['Bentayga', 'Continental GT', 'Flying Spur', 'Mulsanne'],
  'BMW': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'i3', 'i4', 'i5', 'i7', 'i8', 'iX', 'M2', 'M3', 'M4', 'M5', 'M8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4'],
  'Buick': ['Cascada', 'Enclave', 'Encore', 'Encore GX', 'Envision', 'LaCrosse', 'Regal', 'Verano'],
  'Cadillac': ['ATS', 'CT4', 'CT5', 'CT6', 'CTS', 'Escalade', 'Escalade ESV', 'Lyriq', 'SRX', 'XT4', 'XT5', 'XT6', 'XTS'],
  'Chevrolet': ['Blazer', 'Bolt EUV', 'Bolt EV', 'Camaro', 'Corvette', 'Cruze', 'Equinox', 'Impala', 'Malibu', 'Sonic', 'Spark', 'Suburban', 'Tahoe', 'Trailblazer', 'Traverse', 'Trax', 'Volt'],
  'Chrysler': ['200', '300'],
  'Dodge': ['Challenger', 'Charger', 'Dart', 'Durango', 'Hornet', 'Journey', 'Nitro'],
  'Ferrari': ['296 GTB', '458', '488', '812', 'California', 'F8', 'GTC4Lusso', 'Portofino', 'Purosangue', 'Roma', 'SF90'],
  'Fiat': ['124 Spider', '500', '500L', '500X'],
  'Ford': ['Bronco', 'Bronco Sport', 'EcoSport', 'Edge', 'Escape', 'Expedition', 'Explorer', 'Fiesta', 'Flex', 'Focus', 'Fusion', 'Mustang', 'Mustang Mach-E', 'Taurus'],
  'Genesis': ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  'GMC': ['Acadia', 'Terrain', 'Yukon', 'Yukon XL'],
  'Honda': ['Accord', 'Civic', 'Clarity', 'CR-V', 'CR-Z', 'Crosstour', 'Element', 'Fit', 'HR-V', 'Insight', 'Passport', 'Pilot', 'Prologue'],
  'Hyundai': ['Accent', 'Azera', 'Elantra', 'Equus', 'Genesis', 'Genesis Coupe', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Kona', 'Nexo', 'Palisade', 'Santa Fe', 'Sonata', 'Tucson', 'Veloster', 'Venue'],
  'Infiniti': ['EX', 'FX', 'G', 'JX', 'M', 'Q50', 'Q60', 'Q70', 'QX30', 'QX50', 'QX55', 'QX60', 'QX70', 'QX80'],
  'Jaguar': ['E-PACE', 'F-PACE', 'F-TYPE', 'I-PACE', 'XE', 'XF', 'XJ', 'XK'],
  'Jeep': ['Cherokee', 'Compass', 'Grand Cherokee', 'Grand Cherokee L', 'Grand Wagoneer', 'Liberty', 'Patriot', 'Renegade', 'Wagoneer', 'Wrangler'],
  'Kia': ['Cadenza', 'EV6', 'EV9', 'Forte', 'K5', 'K900', 'Niro', 'Optima', 'Rio', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Telluride'],
  'Lamborghini': ['Aventador', 'Huracan', 'Urus'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'LR2', 'LR4', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  'Lexus': ['CT', 'ES', 'GS', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'RZ', 'TX', 'UX'],
  'Lincoln': ['Aviator', 'Continental', 'Corsair', 'MKC', 'MKS', 'MKT', 'MKX', 'MKZ', 'Nautilus', 'Navigator'],
  'Lotus': ['Eletre', 'Emira', 'Evora'],
  'Maserati': ['Ghibli', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte'],
  'Mazda': ['CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-9', 'CX-90', 'Mazda2', 'Mazda3', 'Mazda5', 'Mazda6', 'MX-30', 'MX-5 Miata'],
  'McLaren': ['540C', '570S', '600LT', '620R', '650S', '675LT', '720S', '765LT', 'Artura', 'GT', 'P1', 'Senna'],
  'Mercedes-Benz': ['A-Class', 'AMG GT', 'B-Class', 'C-Class', 'CLA', 'CLS', 'E-Class', 'EQB', 'EQE', 'EQS', 'G-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'Maybach', 'S-Class', 'SL', 'SLC'],
  'Mini': ['Clubman', 'Convertible', 'Countryman', 'Hardtop'],
  'Mitsubishi': ['Eclipse', 'Eclipse Cross', 'Lancer', 'Mirage', 'Outlander', 'Outlander PHEV', 'Outlander Sport'],
  'Nissan': ['370Z', 'Altima', 'Armada', 'GT-R', 'Juke', 'Kicks', 'Leaf', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Rogue Sport', 'Sentra', 'Versa', 'Z'],
  'Polestar': ['Polestar 1', 'Polestar 2', 'Polestar 3'],
  'Porsche': ['718 Boxster', '718 Cayman', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Rivian': ['R1S'],
  'Rolls-Royce': ['Cullinan', 'Dawn', 'Ghost', 'Phantom', 'Spectre', 'Wraith'],
  'Subaru': ['Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX'],
  'Tesla': ['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y'],
  'Toyota': ['4Runner', '86', 'Avalon', 'bZ4X', 'C-HR', 'Camry', 'Corolla', 'Corolla Cross', 'Crown', 'GR Supra', 'GR86', 'Grand Highlander', 'Highlander', 'Land Cruiser', 'Mirai', 'Prius', 'RAV4', 'Sequoia', 'Venza', 'Yaris'],
  'Volkswagen': ['Arteon', 'Atlas', 'Atlas Cross Sport', 'Beetle', 'CC', 'e-Golf', 'Eos', 'Golf', 'Golf GTI', 'Golf R', 'ID.4', 'Jetta', 'Passat', 'Taos', 'Tiguan', 'Touareg'],
  'Volvo': ['C30', 'C40', 'C70', 'S60', 'S80', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90']
};

// Count totals
let totalModels = 0;
Object.values(CURATED_MODELS).forEach(models => totalModels += models.length);

console.log(`Total makes: ${Object.keys(CURATED_MODELS).length}`);
console.log(`Total models: ${totalModels}`);
console.log(`\nModels per make:`);
Object.entries(CURATED_MODELS)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([make, models]) => console.log(`  ${make}: ${models.length}`));

module.exports = { CURATED_MODELS };
