import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import Routing from './routes/Routing.jsx';
export default function App() { return <AuthProvider><CartProvider><Routing /></CartProvider></AuthProvider>; }
