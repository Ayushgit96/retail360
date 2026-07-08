import React from 'react';
import MasterModule from '../master/MasterModule';
import './InventoryModule.css';

function InventoryModule({ subTab = 'stock' }) {
  return (
    <div className="inventory-module">
      <MasterModule subTab={subTab} />
    </div>
  );
}

export default InventoryModule;
