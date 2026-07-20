import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import TextPage from "./pages/TextPage";
import PdfPage from "./pages/PdfPage";
import YoutubePage from "./pages/YoutubePage";
import BrainPage from "./pages/BrainPage";
import AskBrainPage from "./pages/AskBrainPage";
import ProgressPage from "./pages/ProgressPage";

import "./App.css";

function App() {
  return (
    <div>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/text" element={<TextPage />} />
        <Route path="/pdf" element={<PdfPage />} />
        <Route path="/youtube" element={<YoutubePage />} />
        <Route path="/brain" element={<BrainPage />} />
        <Route path="/brain/ask" element={<AskBrainPage />} />
        <Route path="/brain/progress" element={<ProgressPage />} />
      </Routes>
    </div>
  );
}

export default App;