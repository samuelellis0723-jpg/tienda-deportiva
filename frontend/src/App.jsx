import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import Routing from './routes/Routing.jsx';
import { OrderProvider } from './context/OrderContext.jsx';
export default function App() { return <AuthProvider><CartProvider><OrderProvider><Routing /></OrderProvider></CartProvider></AuthProvider>; }
