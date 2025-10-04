import { useEffect, useRef } from 'react';
import './App.css';
import GeoWorld from './GeoWorld/GeoWorld';

function App() {
  const containerRef = useRef<any>(null);

  useEffect(() => {
    if(containerRef.current){
      new GeoWorld({
        dom: containerRef.current
      });
    }
  }, [])

  return (
    <div id="earth-canvas" ref={containerRef}></div>
  );
}

export default App;
