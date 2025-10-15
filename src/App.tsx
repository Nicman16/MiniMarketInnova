import React from 'react';
import Inventario from './componentes/Inventario';
import Precios from './componentes/Precios';
import Personal from './componentes/Personal';
import Proveedores from './componentes/Proveedores';

function App() {
  return (
    <div>
      <h1>MiniMarket Innova</h1>
      <Inventario />
      <Precios />
      <Personal />
      <Proveedores />
    </div>
  );
}

export default App;