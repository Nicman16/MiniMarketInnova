import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  BadgeDollarSign,
  ReceiptText,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const sidebarItems = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'punto-venta', label: 'Punto de Venta', icon: <ShoppingCart size={18} /> },
  { key: 'inventario', label: 'Inventario', icon: <Package size={18} /> },
  { key: 'fiado', label: 'Sistema Fiado', icon: <Wallet size={18} /> },
  { key: 'caja', label: 'Caja', icon: <BadgeDollarSign size={18} /> },
  { key: 'reportes', label: 'Reportes', icon: <ReceiptText size={18} /> },
  { key: 'empleados', label: 'Empleados', icon: <Users size={18} /> },
];

export default function Sidebar({ paginaActual, cambiarPagina, isJefe }) {
  const { usuario } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-user">
        <div className="sidebar-avatar">{usuario?.nombre?.charAt(0).toUpperCase()}</div>
        <div className="sidebar-user-details">
          <div className="sidebar-user-name">{usuario?.nombre}</div>
          <div className="sidebar-user-role">{isJefe ? 'Administrador' : 'Empleado'}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {sidebarItems.filter(item => isJefe || ['dashboard','punto-venta'].includes(item.key)).map(item => (
          <button
            key={item.key}
            className={`sidebar-btn${paginaActual === item.key ? ' active' : ''}`}
            onClick={() => cambiarPagina(item.key)}
            aria-label={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
