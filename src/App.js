import { useState, useEffect } from "react";
import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
import Header from "./components/Header";
import DicomViewer from './components/DicomViewer';

function App() {
  const [imageId, setImageId] = useState("");

  useEffect(() => {
    setTimeout(function() {
      let dcmUrl = "https://raw.githubusercontent.com/cornerstonejs/cornerstoneWADOImageLoader/master/testImages/CT2_J2KR"
      setImageId(dcmUrl)
    }, 1000);
  }, [])

  return (
    <>
    <div className="container-lg">
      <Header />
      <DicomViewer imageId={imageId} />
    </div>
    </>
  );
}

export default App;
