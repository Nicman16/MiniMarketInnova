// src/componentes/EstadisticasAvanzadas.tsx
import React, { useState, useEffect } from 'react';
import '../styles/EstadisticasAvanzadas.css';

interface VentaData {
  fecha: string;
  ventas: number;
  productos: number;
  ingresos: number;
}

interface ProductoVendido {
  nombre: string;
  cantidad: number;
  ingresos: number;
  categoria: string;
}

interface EstadisticasAvanzadasProps {
  productos: any[];
  proveedores: any[];
}

function EstadisticasAvanzadas({ productos, proveedores }: EstadisticasAvanzadasProps) {
  const [ventasData, setVentasData] = useState<VentaData[]>([]);
  const [productosVendidos, setProductosVendidos] = useState<ProductoVendido[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<'7d' | '30d' | '90d'>('30d');
  const [tipoGrafico, setTipoGrafico] = useState<'ventas' | 'ingresos' | 'productos'>('ventas');

  useEffect(() => {
    // Simular datos de ventas (en una app real, esto vendría de la API)
    const generarDatosVentas = () => {
      const datos: VentaData[] = [];
      const dias = periodoSeleccionado === '7d' ? 7 : periodoSeleccionado === '30d' ? 30 : 90;
      
      for (let i = dias - 1; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        
        // Simular variación en ventas (más altas en fines de semana)
        const esFindeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
        const factorFindeSemana = esFindeSemana ? 1.3 : 1;
        const factorAleatorio = 0.7 + Math.random() * 0.6; // 70% - 130%
        
        const ventasBase = 15;
        const ventas = Math.round(ventasBase * factorFindeSemana * factorAleatorio);
        const productos = Math.round(ventas * (2 + Math.random()));
        const ingresos = productos * (8000 + Math.random() * 12000);
        
        datos.push({
          fecha: fecha.toISOString().split('T')[0],
          ventas,
          productos,
          ingresos: Math.round(ingresos)
        });
      }
      
      return datos;
    };

    // Generar productos más vendidos
    const generarProductosVendidos = () => {
      return [
        { nombre: 'Arroz Diana Premium 500g', cantidad: 45, ingresos: 112500, categoria: 'Granos' },
        { nombre: 'Aceite Gourmet 1L', cantidad: 32, ingresos: 144000, categoria: 'Aceites' },
        { nombre: 'Azúcar Incauca 1kg', cantidad: 28, ingresos: 89600, categoria: 'Endulzantes' },
        { nombre: 'Leche Alpina 1L', cantidad: 52, ingresos: 156000, categoria: 'Lácteos' },
        { nombre: 'Pan Bimbo Integral', cantidad: 38, ingresos: 76000, categoria: 'Panadería' },
        { nombre: 'Huevos AA x30', cantidad: 25, ingresos: 87500, categoria: 'Proteínas' },
        { nombre: 'Pollo Pechuga kg', cantidad: 18, ingresos: 270000, categoria: 'Carnes' },
        { nombre: 'Coca Cola 2L', cantidad: 41, ingresos: 164000, categoria: 'Bebidas' }
      ].sort((a, b) => b.ingresos - a.ingresos);
    };

    setVentasData(generarDatosVentas());
    setProductosVendidos(generarProductosVendidos());
  }, [periodoSeleccionado]);

  // Calcular estadísticas
  const calcularEstadisticas = () => {
    const totalVentas = ventasData.reduce((sum, day) => sum + day.ventas, 0);
    const totalIngresos = ventasData.reduce((sum, day) => sum + day.ingresos, 0);
    const totalProductos = ventasData.reduce((sum, day) => sum + day.productos, 0);
    const promedioVentasDiarias = totalVentas / ventasData.length;
    const mejorDia = ventasData.reduce((max, day) => day.ventas > max.ventas ? day : max, ventasData[0]);
    
    // Calcular tendencia (comparar primera y segunda mitad del período)
    const mitad = Math.floor(ventasData.length / 2);
    const primeraMitad = ventasData.slice(0, mitad);
    const segundaMitad = ventasData.slice(mitad);
    
    const promedioPrimera = primeraMitad.reduce((sum, day) => sum + day.ventas, 0) / primeraMitad.length;
    const promedioSegunda = segundaMitad.reduce((sum, day) => sum + day.ventas, 0) / segundaMitad.length;
    const tendencia = ((promedioSegunda - promedioPrimera) / promedioPrimera) * 100;

    return {
      totalVentas,
      totalIngresos,
      totalProductos,
      promedioVentasDiarias: Math.round(promedioVentasDiarias * 10) / 10,
      mejorDia: mejorDia ? new Date(mejorDia.fecha).toLocaleDateString() : 'N/A',
      mejorDiaVentas: mejorDia ? mejorDia.ventas : 0,
      tendencia: Math.round(tendencia * 10) / 10
    };
  };

  const stats = calcularEstadisticas();

  // Obtener valor máximo para normalizar el gráfico
  const getMaxValue = () => {
    switch (tipoGrafico) {
      case 'ventas': return Math.max(...ventasData.map(d => d.ventas));
      case 'ingresos': return Math.max(...ventasData.map(d => d.ingresos));
      case 'productos': return Math.max(...ventasData.map(d => d.productos));
      default: return 100;
    }
  };

  const maxValue = getMaxValue();

  return (
    <div className="estadisticas-avanzadas">
      <div className="estadisticas-header">
        <h2>📊 Análisis de Ventas y Rendimiento</h2>
        <div className="controles">
          <select 
            value={periodoSeleccionado} 
            onChange={(e) => setPeriodoSeleccionado(e.target.value as any)}
            className="control-select"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
          
          <select 
            value={tipoGrafico} 
            onChange={(e) => setTipoGrafico(e.target.value as any)}
            className="control-select"
          >
            <option value="ventas">Número de Ventas</option>
            <option value="ingresos">Ingresos ($)</option>
            <option value="productos">Productos Vendidos</option>
          </select>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="kpis-grid">
        <div className="kpi-card primary">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-content">
            <div className="kpi-number">{stats.totalVentas}</div>
            <div className="kpi-label">Total Ventas</div>
            <div className="kpi-sublabel">Promedio: {stats.promedioVentasDiarias}/día</div>
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <div className="kpi-number">${stats.totalIngresos.toLocaleString()}</div>
            <div className="kpi-label">Ingresos Totales</div>
            <div className="kpi-sublabel">Promedio: ${Math.round(stats.totalIngresos / ventasData.length).toLocaleString()}/día</div>
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon">📦</div>
          <div className="kpi-content">
            <div className="kpi-number">{stats.totalProductos}</div>
            <div className="kpi-label">Productos Vendidos</div>
            <div className="kpi-sublabel">Promedio: {Math.round(stats.totalProductos / ventasData.length)}/día</div>
          </div>
        </div>

        <div className={`kpi-card ${stats.tendencia >= 0 ? 'success' : 'danger'}`}>
          <div className="kpi-icon">{stats.tendencia >= 0 ? '📈' : '📉'}</div>
          <div className="kpi-content">
            <div className="kpi-number">{stats.tendencia >= 0 ? '+' : ''}{stats.tendencia}%</div>
            <div className="kpi-label">Tendencia</div>
            <div className="kpi-sublabel">
              {stats.tendencia >= 0 ? 'Crecimiento' : 'Decrecimiento'} vs período anterior
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Líneas */}
      <div className="grafico-container">
        <div className="grafico-header">
          <h3>
            {tipoGrafico === 'ventas' ? '🛒 Evolución de Ventas' :
             tipoGrafico === 'ingresos' ? '💰 Evolución de Ingresos' :
             '📦 Productos Vendidos por Día'}
          </h3>
          <div className="grafico-stats">
            <span className="mejor-dia">
              🏆 Mejor día: {stats.mejorDia} ({stats.mejorDiaVentas} ventas)
            </span>
          </div>
        </div>
        
        <div className="grafico-chart">
          <div className="chart-y-axis">
            <div className="y-label">{maxValue}</div>
            <div className="y-label">{Math.round(maxValue * 0.75)}</div>
            <div className="y-label">{Math.round(maxValue * 0.5)}</div>
            <div className="y-label">{Math.round(maxValue * 0.25)}</div>
            <div className="y-label">0</div>
          </div>
          
          <div className="chart-content">
            <svg viewBox="0 0 800 300" className="chart-svg">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 60" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Data line */}
              <polyline
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={
                  ventasData.map((data, index) => {
                    const x = (index / (ventasData.length - 1)) * 780 + 10;
                    const value = tipoGrafico === 'ventas' ? data.ventas :
                                 tipoGrafico === 'ingresos' ? data.ingresos :
                                 data.productos;
                    const y = 280 - (value / maxValue) * 260;
                    return `${x},${y}`;
                  }).join(' ')
                }
              />
              
              {/* Data points */}
              {ventasData.map((data, index) => {
                const x = (index / (ventasData.length - 1)) * 780 + 10;
                const value = tipoGrafico === 'ventas' ? data.ventas :
                             tipoGrafico === 'ingresos' ? data.ingresos :
                             data.productos;
                const y = 280 - (value / maxValue) * 260;
                
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#667eea"
                    stroke="white"
                    strokeWidth="2"
                    className="data-point"
                  >
                    <title>
                      {new Date(data.fecha).toLocaleDateString()}: {value}
                      {tipoGrafico === 'ingresos' ? ' pesos' : tipoGrafico === 'ventas' ? ' ventas' : ' productos'}
                    </title>
                  </circle>
                );
              })}
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* X-axis labels */}
            <div className="chart-x-axis">
              {ventasData.filter((_, index) => index % Math.ceil(ventasData.length / 8) === 0).map((data, index) => (
                <div key={index} className="x-label">
                  {new Date(data.fecha).toLocaleDateString('es-ES', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Productos Más Vendidos */}
      <div className="productos-top">
        <h3>🏆 Productos Más Vendidos</h3>
        <div className="top-productos-grid">
          {productosVendidos.slice(0, 6).map((producto, index) => (
            <div key={index} className="top-producto-card">
              <div className="producto-ranking">#{index + 1}</div>
              <div className="producto-info">
                <h4>{producto.nombre}</h4>
                <div className="producto-categoria">{producto.categoria}</div>
                <div className="producto-stats">
                  <div className="stat">
                    <span className="stat-icon">📦</span>
                    <span>{producto.cantidad} vendidos</span>
                  </div>
                  <div className="stat success">
                    <span className="stat-icon">💰</span>
                    <span>${producto.ingresos.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="producto-progress">
                <div 
                  className="progress-bar"
                  style={{ 
                    width: `${(producto.ingresos / productosVendidos[0].ingresos) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Análisis por Categorías */}
      <div className="categorias-analisis">
        <h3>📊 Rendimiento por Categorías</h3>
        <div className="categorias-grid">
          {Object.entries(
            productosVendidos.reduce((acc, producto) => {
              if (!acc[producto.categoria]) {
                acc[producto.categoria] = { cantidad: 0, ingresos: 0, productos: 0 };
              }
              acc[producto.categoria].cantidad += producto.cantidad;
              acc[producto.categoria].ingresos += producto.ingresos;
              acc[producto.categoria].productos += 1;
              return acc;
            }, {} as Record<string, {cantidad: number, ingresos: number, productos: number}>)
          ).map(([categoria, datos]) => (
            <div key={categoria} className="categoria-card">
              <h4>{categoria}</h4>
              <div className="categoria-stats">
                <div className="categoria-stat">
                  <span>🛍️ {datos.cantidad} vendidos</span>
                </div>
                <div className="categoria-stat">
                  <span>💰 ${datos.ingresos.toLocaleString()}</span>
                </div>
                <div className="categoria-stat">
                  <span>📦 {datos.productos} productos</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EstadisticasAvanzadas;