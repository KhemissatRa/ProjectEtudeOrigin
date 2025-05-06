import Map from '../components/Map';

const MapExample = () => {
  const markers = [
    {
      position: [48.8566, 2.3522] as [number, number],
      popup: 'Paris, France'
    },
    {
      position: [48.8606, 2.3376] as [number, number],
      popup: 'Louvre Museum'
    }
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Map Example</h1>
      <div className="rounded-lg overflow-hidden shadow-lg">
        <Map 
          center={[48.8566, 2.3522]}
          zoom={13}
          markers={markers}
          className="h-[500px] w-full"
        />
      </div>
    </div>
  );
};

export default MapExample; 