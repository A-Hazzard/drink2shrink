export interface Package {
  id: string
  title: string
  price: number
  quantity: number
}

export interface Product {
  id: string
  name: string
  description: string
  thumbnailUrl: string
  packages: Package[]
  archivedAt?: { seconds: number; nanoseconds: number }
  createdAt?: { seconds: number; nanoseconds: number }
  ownerEmail: string
}

export interface UserProfile {
  id: string
  email: string
  businessName: string
  logoUrl?: string
  createdAt?: { seconds: number; nanoseconds: number }
}

export type CallGoal = 'lose_weight' | 'detox' | 'both'
export type CallOutcome = 'pending' | 'delivered' | 'rejected' | 'delivering' | 'interested_future'
export const DELIVERY_FEES = {
  // NORTH-WEST / NORTH
  chaguaramas: 60,
  carenage: 50,
  glencoe: 50,
  westmoorings: 50,
  diego_martin: 50,
  port_of_spain: 40,
  belmont: 40,
  morvant: 40,
  // NORTH-EAST / EAST
  st_joseph: 40,
  san_juan: 40,
  curepe: 40,
  tunapuna: 40,
  st_augustine: 40,
  trincity: 50,
  arouca: 50,
  piarco: 50,
  maloney: 50,
  arima: 50,
  sangre_grande: 60,
  salybia: 60,
  mayaro: 60,
  guyagayare: 60,
  // CENTRAL
  chaguanas: 50,
  couva: 50,
  claxton_bay: 60,
  // SOUTH / SOUTH-EAST
  san_raphael: 60,
  princes_town: 60,
  rio_claro: 60,
  // SOUTH / SOUTH-WEST
  marabella: 60,
  san_fernando: 60,
  fyzabad: 60,
  penal: 60,
  siparia: 60,
  la_brea: 60,
  point_fortin: 60,
  // TOBAGO & OTHER
  tobago: 0,
  pickup: 0,
} as const

export type DeliveryArea = keyof typeof DELIVERY_FEES

export const DELIVERY_AREA_LABELS: Record<DeliveryArea, string> = {
  chaguaramas: 'Chaguaramas ($60)',
  carenage: 'Carenage ($50)',
  glencoe: 'Glencoe ($50)',
  westmoorings: 'Westmoorings ($50)',
  diego_martin: 'Diego Martin ($50)',
  port_of_spain: 'Port of Spain ($40)',
  belmont: 'Belmont ($40)',
  morvant: 'Morvant ($40)',
  st_joseph: 'St. Joseph ($40)',
  san_juan: 'San Juan ($40)',
  curepe: 'Curepe ($40)',
  tunapuna: 'Tunapuna ($40)',
  st_augustine: 'St. Augustine ($40)',
  trincity: 'Trincity ($50)',
  arouca: 'Arouca ($50)',
  piarco: 'Piarco ($50)',
  maloney: 'Maloney ($50)',
  arima: 'Arima ($50)',
  sangre_grande: 'Sangre Grande ($60)',
  salybia: 'Salybia ($60)',
  mayaro: 'Mayaro ($60)',
  guyagayare: 'Guyagayare ($60)',
  chaguanas: 'Chaguanas ($50)',
  couva: 'Couva ($50)',
  claxton_bay: 'Claxton Bay ($60)',
  san_raphael: 'San Raphael ($60)',
  princes_town: 'Princes Town ($60)',
  rio_claro: 'Rio Claro ($60)',
  marabella: 'Marabella ($60)',
  san_fernando: 'San Fernando ($60)',
  fyzabad: 'Fyzabad ($60)',
  penal: 'Penal ($60)',
  siparia: 'Siparia ($60)',
  la_brea: 'La Brea ($60)',
  point_fortin: 'Point Fortin ($60)',
  tobago: 'Tobago (Inter-island)',
  pickup: 'Pickup (Free)',
}

export const DELIVERY_AREA_GROUPS: Record<string, DeliveryArea[]> = {
  'North-West / North': ['chaguaramas', 'carenage', 'glencoe', 'westmoorings', 'diego_martin', 'port_of_spain', 'belmont', 'morvant'],
  'North-East / East': ['st_joseph', 'san_juan', 'curepe', 'tunapuna', 'st_augustine', 'trincity', 'arouca', 'piarco', 'maloney', 'arima', 'sangre_grande', 'salybia', 'mayaro', 'guyagayare'],
  'Central': ['chaguanas', 'couva', 'claxton_bay'],
  'South / South-East': ['san_raphael', 'princes_town', 'rio_claro'],
  'South / South-West': ['marabella', 'san_fernando', 'fyzabad', 'penal', 'siparia', 'la_brea', 'point_fortin'],
  'Other': ['tobago', 'pickup']
}

export interface Call {
  id: string
  name: string
  phone: string
  goal?: CallGoal
  currentWeight?: string
  goalWeight?: string
  medicalConditions?: string
  previousAttempts?: string
  pregnant?: boolean
  breastfeeding?: boolean
  allergies?: string
  routineConvenience?: string
  timeline?: string
  interestedPackage?: string
  area?: DeliveryArea
  address?: string
  outcome: CallOutcome
  notes?: string
  orderId?: string
  followUpDate?: string
  archivedAt?: { seconds: number; nanoseconds: number }
  createdAt?: { seconds: number; nanoseconds: number }
  ownerEmail: string
}

export type OrderStatus = 'pending' | 'delivered' | 'delivering' | 'interested_future'

export interface Order {
  id: string
  callId: string
  clientName: string
  clientPhone: string
  productId: string
  productName: string
  packageId: string
  packageTitle: string
  packagePrice: number
  area: DeliveryArea
  deliveryFee: number
  totalPrice: number
  deliveryDate?: string
  status: OrderStatus
  followUpDate?: string
  archivedAt?: { seconds: number; nanoseconds: number }
  createdAt?: { seconds: number; nanoseconds: number }
  ownerEmail: string
}
