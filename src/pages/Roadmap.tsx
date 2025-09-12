const Roadmap = () => {
  return (
    <div className="flex-1 flex items-center justify-center my-40">
      <div className="w-1/2 max-w-4xl text-white font-mono leading-relaxed px-8">
        <h1 className="text-2xl font-bold mb-6">PrivFi Roadmap</h1>
        
        <div className="space-y-4">
          <div className="text-gray-200">+ ADD Allow delayed receive swapped amount</div>
          <div className="text-gray-200">+ ADD Compliance tool proof</div>
          <div className="text-gray-200">- BUILD Privacy Atomiq Bridge</div>
          <div className="text-gray-200">- BUILD Privacy Vesu Lending</div>
        </div>
      </div>
    </div>
  );
};

export default Roadmap;