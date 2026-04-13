import React, { useState } from 'react';
import '../../styles/Personal.css';

function Personal() {
  const [empleados, setEmpleados] = useState([
    { 
      id: 1, 
      nombre: 'Ana García', 
      cargo: 'Cajera', 
      horario: '8:00 AM - 4:00 PM', 
      estado: 'activo',
      avatar: 'AG'
    },
    { 
      id: 2, 
      nombre: 'Carlos López', 
      cargo: 'Supervisor', 
      horario: '10:00 AM - 6:00 PM', 
      estado: 'activo',
      avatar: 'CL'
    },
    { 
      id: 3, 
      nombre: 'María Rodríguez', 
      cargo: 'Vendedora', 
      horario: '2:00 PM - 10:00 PM', 
      estado: 'ausente',
      avatar: 'MR'
    },
    { 
      id: 4, 
      nombre: 'José Martínez', 
      cargo: 'Almacenista', 
      horario: '6:00 AM - 2:00 PM', 
      estado: 'activo',
      avatar: 'JM'
    }
  ]);

  const cambiarEstado = (id: number, nuevoEstado: string) => {
    setEmpleados(empleados.map(emp => 
      emp.id === id ? { ...emp, estado: nuevoEstado } : emp
    ));
  };

  return (
    <section className="personal-section">
      <h2 className="section-title">👥 Gestión de Personal</h2>
      
      <div className="card">
        <h3>Control de Horarios y Asistencia</h3>
        <p>Gestiona los horarios del personal y controla la asistencia diaria.</p>
      </div>

      <div className="employee-grid">
        {empleados.map(empleado => (
          <div key={empleado.id} className="employee-card">
            <div className="employee-header">
              <div className="employee-avatar">
                {empleado.avatar}
              </div>
              <div className="employee-info">
                <h4>{empleado.nombre}</h4>
                <p>{empleado.cargo}</p>
                <span className={`status-badge status-${empleado.estado}`}>
                  {empleado.estado.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="schedule-info">
              <p><strong>Horario:</strong> {empleado.horario}</p>
              <div className="form-container">
                <button 
                  className="button success"
                  onClick={() => cambiarEstado(empleado.id, 'activo')}
                >
                  Marcar Presente
                </button>
                <button 
                  className="button danger"
                  onClick={() => cambiarEstado(empleado.id, 'ausente')}
                >
                  Marcar Ausente
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Resumen del Personal</h3>
        <div className="form-container">
          <div>
            <strong>✅ Presentes:</strong> {empleados.filter(e => e.estado === 'activo').length} empleados
          </div>
          <div>
            <strong>❌ Ausentes:</strong> {empleados.filter(e => e.estado === 'ausente').length} empleados
          </div>
          <div>
            <strong>👥 Total:</strong> {empleados.length} empleados
          </div>
        </div>
      </div>
    </section>
  );
}

export default Personal;