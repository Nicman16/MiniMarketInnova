import React from 'react';

function Inventario() {
  console.log('🔴 INVENTARIO CARGADO:', Date.now());
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(45deg, red, blue)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '3rem',
      textAlign: 'center',
      zIndex: 99999
    }}>
      <div>
        <h1>🔴 INVENTARIO MODIFICADO</h1>
        <p>Si NO ves esto, hay problema serio</p>
        <p>Timestamp: {Date.now()}</p>
        <button onClick={() => alert('¡Funciona!')}>
          Test Click
        </button>
      </div>
    </div>
  );
}

export default Inventario;