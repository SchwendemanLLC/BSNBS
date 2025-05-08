import React, { useRef, useState } from "react";
import "./App.css";

const MODEL_URL = process.env.PUBLIC_URL + "/models";
const ANALYSIS_TIMEOUT = 15000; // 15 seconds

function App() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef();

  // Load face-api.js models on demand
  const loadModels = async (faceapi) => {
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
    } catch (err) {
      throw new Error("Model files not found or failed to load. Check /public/models/ directory and browser console for 404 errors.");
    }
  };

  const handleImageUpload = async (event) => {
    setResult("");
    setError("");
    setLoading(true);
    const file = event.target.files[0];
    if (!file) {
      setLoading(false);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    let timeoutId;
    try {
      const faceapi = window.faceapi;
      if (!faceapi) {
        setLoading(false);
        setError("face-api.js failed to load. Please check your internet connection and reload the page.");
        return;
      }
      await loadModels(faceapi);
      const img = new window.Image();
      img.src = url;
      img.onload = async () => {
        let finished = false;
        timeoutId = setTimeout(() => {
          if (!finished) {
            setLoading(false);
            setError("Analysis timed out. Please try a smaller image or check your model files.");
          }
        }, ANALYSIS_TIMEOUT);
        try {
          const detections = await faceapi.detectSingleFace(img).withAgeAndGender();
          finished = true;
          clearTimeout(timeoutId);
          if (!detections) {
            setResult("young"); // Not a human
          } else {
            setResult(detections.age >= 4 ? "old" : "young");
          }
        } catch (err) {
          finished = true;
          clearTimeout(timeoutId);
          setError("Face detection failed: " + err.message);
        }
        setLoading(false);
      };
      img.onerror = () => {
        setLoading(false);
        setError("Failed to load image. Try a different file.");
      };
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="container">
      <h1>Beef Stick No Beef Stick (Image)</h1>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        ref={inputRef}
        className="file-input"
      />
      {loading && <div className="loading">Analyzing...</div>}
      {error && <div className="error">{error}</div>}
      {result && !error && (
        <div className="result">
          <img
            src={result === "old" ? "/oldImage.PNG" : "/youngImage.PNG"}
            alt={result}
            style={{ maxWidth: "220px", width: "100%", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          />
        </div>
      )}
      {imageUrl && (
        <div className="preview">
          <img src={imageUrl} alt="Uploaded preview" style={{ maxWidth: "180px", marginTop: 16, borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

export default App;
