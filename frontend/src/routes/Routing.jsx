import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import StoreLayout from '../components/layout/StoreLayout.jsx';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import CatalogPage from '../pages/CatalogPage.jsx';
import ProductPage from '../pages/ProductPage.jsx';
import CartPage from '../pages/CartPage.jsx';
import CheckoutPage from '../pages/CheckoutPage.jsx';
import AdminLoginPage from '../pages/auth/AdminLoginPage.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import AdminProductsPage from '../pages/productos/AdminProductsPage.jsx';
import AdminOrdersPage from '../pages/ordenes/AdminOrdersPage.jsx';
import AdminCouponsPage from '../pages/cupones/AdminCouponsPage.jsx';
import PrivateRoutes from './PrivateRoutes.jsx';
function PublicLayout() { return <StoreLayout><Outlet /></StoreLayout>; }
export default function Routing() {
 return <Routes><Route element={<PublicLayout />}><Route path="/" element={<HomePage />} /><Route path="/catalogo" element={<CatalogPage />} /><Route path="/productos/:id" element={<ProductPage />} /><Route path="/carrito" element={<CartPage />} /><Route path="/checkout" element={<CheckoutPage />} /></Route><Route path="/admin/login" element={<AdminLoginPage />} /><Route path="/admin" element={<PrivateRoutes />}><Route element={<AdminLayout />}><Route index element={<DashboardPage />} /><Route path="productos" element={<AdminProductsPage />} /><Route path="ordenes" element={<AdminOrdersPage />} /><Route path="cupones" element={<AdminCouponsPage />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
