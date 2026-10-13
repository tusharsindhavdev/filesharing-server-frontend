import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8008";

function UploadFiles({ onUploadSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFiles = (newFiles) => {
    setSelectedFiles((prev) => [...prev, ...Array.from(newFiles)]);
    setMessage("");
  };

  async function uploadFiles() {
    if (selectedFiles.length === 0) {
      setMessage("Please select some files first.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      setMessage("Files uploaded successfully!");
      setSelectedFiles([]);
      await onUploadSuccess();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container">
      <h1>Upload Files</h1>
      <p className="subtitle">Drag and drop files or browse your device</p>

      <div
        className={`drop-area ${isDragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p>📁</p>
        <p>Drag files here</p>
        <p className="file-size">or click below to browse</p>

        <label className="browse-button">
          Choose Files
          <input
            type="file"
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {selectedFiles.map((file, index) => (
        <div className="file-card" key={`${file.name}-${index}`}>
          <span className="file-name">{file.name}</span>
          <span className="file-size">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
      ))}

      {selectedFiles.length > 0 && (
        <button
          className="browse-button"
          onClick={uploadFiles}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Files"}
        </button>
      )}

      {message && <p style={{ marginTop: "16px" }}>{message}</p>}
    </div>
  );
}

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchFiles() {
    try {
      const response = await fetch(`${API_URL}/files`);

      if (!response.ok) {
        throw new Error("Failed to fetch files.");
      }

      const data = await response.json();
      setFiles(data.files);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <>
      <UploadFiles onUploadSuccess={fetchFiles} />

      <div className="container">
        <h1>All Files</h1>

        {loading ? (
          <p>Loading files...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          files.map((file, index) => (
            <div className="file-card" key={file.id ?? index}>
              <span className="file-name">{file.filename}</span>
              <span className="file-size">
                {(file.size_bytes / 1024).toFixed(1)} KB
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default App;