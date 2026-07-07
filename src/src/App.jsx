import React, { useState } from "react";

function App() {
  const [price, setPrice] = useState(null);

  async function getPrice() {
    try {
      const response = await fetch("/api/prices");
      const data = await response.json();
      setPrice(data.price);
    } catch (error) {
      console.error(error);
      setPrice("Fehler beim Laden");
    }
  }

  return (
    <div>
      <h1>Preis App</h1>

      <button onClick={getPrice}>
        Preis anzeigen
      </button>

      {price && (
        <p>
          Aktueller Preis: {price} €
        </p>
      )}
    </div>
  );
}

export default App;
