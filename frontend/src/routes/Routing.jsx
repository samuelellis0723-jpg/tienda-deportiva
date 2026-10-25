import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import StoreLayout from '../components/layout/StoreLayout.jsx';
import { Loading } from '../components/ui/AsyncState.jsx';
import PrivateRoutes from './PrivateRoutes.jsx';
const HomePage = lazy(() => import('../pages/HomePage.jsx'));
const CatalogPage = lazy(() => import('../pages/CatalogPage.jsx'));
const ProductPage = lazy(() => import('../pages/ProductPage.jsx'));
const CartPage = lazy(() => import('../pages/CartPage.jsx'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage.jsx'));
const HelpPage = lazy(() => import('../pages/HelpPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));
const AdminLayout = lazy(() => import('../components/layout/AdminLayout.jsx'));
const AdminLoginPage = lazy(() => import('../pages/auth/AdminLoginPage.jsx'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage.jsx'));
const AdminProductsPage = lazy(() => import('../pages/productos/AdminProductsPage.jsx'));
const AdminOrdersPage = lazy(() => import('../pages/ordenes/AdminOrdersPage.jsx'));
const AdminCouponsPage = lazy(() => import('../pages/cupones/AdminCouponsPage.jsx'));
function PublicLayout() { return <StoreLayout><Outlet/></StoreLayout>; }
export default function Routing() {
  return <Suspense fallback={<Loading label="Preparando tu visita…"/>}><Routes><Route element={<PublicLayout/>}><Route path="/" element={<HomePage/>}/><Route path="/catalogo" element={<CatalogPage/>}/><Route path="/productos/:id" element={<ProductPage/>}/><Route path="/carrito" element={<CartPage/>}/><Route path="/checkout" element={<CheckoutPage/>}/><Route path="/ayuda/:topic" element={<HelpPage/>}/><Route path="*" element={<NotFoundPage/>}/></Route><Route path="/admin/login" element={<AdminLoginPage/>}/><Route path="/admin" element={<PrivateRoutes/>}><Route element={<AdminLayout/>}><Route index element={<DashboardPage/>}/><Route path="productos" element={<AdminProductsPage/>}/><Route path="ordenes" element={<AdminOrdersPage/>}/><Route path="cupones" element={<AdminCouponsPage/>}/><Route path="*" element={<NotFoundPage/>}/></Route></Route></Routes></Suspense>;
}
