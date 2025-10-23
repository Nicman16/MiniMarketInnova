// src/componentes/Reportes.tsx
import React, { useState, useEffect } from 'react';
import '../styles/Reportes.css';
import { ventasService } from '../services/ventasService';

function Reportes() {
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [reporteVentas, setReporteVentas] = useState<any>(null);
  const [reporteProductos, setReporteProductos] = useState<any[]>([]);
  const [reporteEmpleados, setReporteEmpleados] = useState<any[]>([]);
  const [stockBajo, setStockBajo] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    generarReportes();
  }, [fechaInicio, fechaFin]);

  const generarReportes = async () => {
    setCargando(true);
    try {
      const [ventas, productos, empleados, stock] = await Promise.all([
        ventasService.obtenerReporteVentas(fechaInicio, fechaFin),
        ventasService.obtenerReporteProductos(fechaInicio, fechaFin),
        ventasService.obtenerReporteEmpleados(fechaInicio, fechaFin),
        ventasService.obtenerStockBajo()
      ]);

      setReporteVentas(ventas);
      setReporteProductos(productos);
      setReporteEmpleados(empleados);
      setStockBajo(stock);
    } catch (error) {
      console.error('Error generando reportes:', error);
    } finally {
      setCargando(false);
    }
  };

  const exportarReporte = (tipo: string) => {
    // Implementar exportación a PDF/Excel
    alert(`Exportando reporte de ${tipo}...`);
  };

  return (
    <div className="reportes-container">
      <header className="reportes-header">
        <h1>📊 Reportes y Analytics</h1>
        <div className="filtros-fecha">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="input"
          />
          <span>a</span>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="input"
          />
          <button className="button" onClick={generarReportes}>
            🔄 Actualizar
          </button>
        </div>
      </header>

      {cargando ? (
        <div className="loading">🔄 Generando reportes...</div>
      ) : (
        <div className="reportes-layout">
          {/* Resumen de ventas */}
          {reporteVentas && (
            <div className="card">
              <div className="card-header">
                <h3>💰 Resumen de Ventas</h3>
                <button onClick={() => exportarReporte('ventas')}>📄 Exportar</button>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>💵 Total Vendido</h4>
                  <p className="stat-value">${reporteVentas.totalVendido?.toLocaleString()}</p>
                  <p className="stat-change">
                    {reporteVentas.cambioAnterior > 0 ? '📈' : '📉'} 
                    {Math.abs(reporteVentas.cambioAnterior)}% vs período anterior
                  </p>
                </div>

                <div className="stat-card">
                  <h4>🛒 Transacciones</h4>
                  <p className="stat-value">{reporteVentas.cantidadVentas}</p>
                  <p className="stat-detail">Ticket promedio: ${Math.round(reporteVentas.totalVendido / reporteVentas.cantidadVentas).toLocaleString()}</p>
                </div>

                <div className="stat-card">
                  <h4>💳 Métodos de Pago</h4>
                  <div className="metodos-pago">
                    <p>💵 Efectivo: ${reporteVentas.efectivo?.toLocaleString()}</p>
                    <p>💳 Tarjeta: ${reporteVentas.tarjeta?.toLocaleString()}</p>
                    <p>📱 Transferencia: ${reporteVentas.transferencia?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="stat-card">
                  <h4>📈 Tendencia</h4>
                  <div className="grafico-simple">
                    {reporteVentas.ventasPorDia?.map((dia: any, index: number) => (
                      <div key={index} className="barra-dia">
                        <div 
                          className="barra" 
                          style={{height: `${(dia.total / reporteVentas.maxDia) * 100}%`}}
                        />
                        <span>{dia.fecha.split('-')[2]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Productos más vendidos */}
          <div className="card">
            <div className="card-header">
              <h3>🏆 Productos Más Vendidos</h3>
              <button onClick={() => exportarReporte('productos')}>📄 Exportar</button>
            </div>
            <div className="tabla-responsive">
              <table>
                <thead>
                  <tr>
                    <th>🏆</th>
                    <th>Producto</th>
                    <th>Vendidos</th>
                    <th>Ingresos</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {reporteProductos.map((producto, index) => (
                    <tr key={producto.id}>
                      <td>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                      </td>
                      <td>{producto.nombre}</td>
                      <td>{producto.cantidadVendida}</td>
                      <td>${producto.ingresos.toLocaleString()}</td>
                      <td>{producto.porcentaje}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rendimiento por empleado */}
          <div className="card">
            <div className="card-header">
              <h3>👨‍💼 Rendimiento por Empleado</h3>
              <button onClick={() => exportarReporte('empleados')}>📄 Exportar</button>
            </div>
            <div className="empleados-stats">
              {reporteEmpleados.map(empleado => (
                <div key={empleado.id} className="empleado-card">
                  <h4>{empleado.nombre}</h4>
                  <div className="empleado-metrics">
                    <p><strong>💰 Ventas:</strong> ${empleado.totalVentas.toLocaleString()}</p>
                    <p><strong>🛒 Transacciones:</strong> {empleado.cantidadVentas}</p>
                    <p><strong>🎯 Promedio:</strong> ${Math.round(empleado.totalVentas / empleado.cantidadVentas).toLocaleString()}</p>
                    <p><strong>🕐 Horas:</strong> {empleado.horasTrabajadas}h</p>
                  </div>
                  <div className="empleado-ranking">
                    <div className="barra-rendimiento">
                      <div 
                        className="progreso" 
                        style={{width: `${empleado.rendimiento}%`}}
                      />
                    </div>
                    <span>{empleado.rendimiento}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock bajo */}
          <div className="card">
            <div className="card-header">
              <h3>⚠️ Productos con Stock Bajo</h3>
              <button onClick={() => exportarReporte('stock')}>📄 Exportar</button>
            </div>
            {stockBajo.length > 0 ? (
              <div className="stock-alerts">
                {stockBajo.map(producto => (
                  <div key={producto.id} className="stock-alert">
                    <div className="producto-info">
                      <h4>{producto.nombre}</h4>
                      <p>Código: {producto.codigoBarras}</p>
                    </div>
                    <div className="stock-info">
                      <span className={`stock ${producto.cantidad === 0 ? 'agotado' : 'bajo'}`}>
                        {producto.cantidad === 0 ? '❌ Agotado' : `⚠️ ${producto.cantidad} unidades`}
                      </span>
                      <button className="button small">
                        📦 Reabastecer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-alerts">✅ Todos los productos tienen stock suficiente</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reportes;