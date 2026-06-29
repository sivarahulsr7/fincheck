import {
  Tag, CreditCard, PieChart, Home, Car, Utensils, Heart,
  ShoppingBag, Tv, Book, MoreHorizontal, Briefcase, Code2,
  Building2, TrendingUp, Gift, Plus, Wallet, Landmark, Smartphone
} from 'lucide-react'

const ICON_MAP = {
  'tag': Tag, 'credit-card': CreditCard, 'pie-chart': PieChart,
  'home': Home, 'car': Car, 'utensils': Utensils, 'heart': Heart,
  'shopping-bag': ShoppingBag, 'tv': Tv, 'book': Book,
  'more-horizontal': MoreHorizontal, 'briefcase': Briefcase,
  'code': Code2, 'building-2': Building2, 'trending-up': TrendingUp,
  'gift': Gift, 'plus': Plus, 'wallet': Wallet, 'landmark': Landmark,
  'smartphone': Smartphone,
}

export default function CategoryIcon({ icon, size = 16 }) {
  const Comp = ICON_MAP[icon] || Tag
  return <Comp size={size} />
}
