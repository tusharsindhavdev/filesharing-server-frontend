import { useEffect, useState } from "react";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://192.168.1.81:8008"
).replace(/\/+$/, "");

async function getErrorMessage(response, fallback) {
  const body = await response.text();
  const status = `HTTP ${response.status}${
    response.statusText ? ` ${response.statusText}` : ""
  }`;

  if (body) {
    try {
      const data = JSON.parse(body);
      const detail = Array.isArray(data.detail)
        ? data.detail.map((item) => item.msg).join(", ")
        : data.detail;
      const message = detail || data.message;

      if (typeof message === "string") {
        return `${message} (${status})`;
      }
    } catch {
      return `${body} (${status})`;
    }

    return `${body} (${status})`;
  }

  return `${fallback} (${status})`;
}

async function requestApi(path, options) {
  try {
    return await fetch(`${API_URL}${path}`, options);
  } catch (err) {
    throw new Error(
      `Could not reach the file API at ${API_URL}. Check that the API is running and reachable, and that its CORS policy allows this frontend origin. ${err.message}`,
    );
  }
}

function formatFileSize(size) {
  const bytes = Number(size);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Size unavailable";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

        const response = await requestApi("/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, `Failed to upload ${file.name}`),
          );
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
    <section className="container upload-section">
      <h1>Share your files</h1>
      <p className="subtitle">Drag and drop files or browse your device</p>

      <div
        className={`drop-area ${isDragging ? "dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <p className="drop-icon" aria-hidden="true">📁</p>
        <p>Drag files here</p>
        <p className="file-size">or click below to browse</p>

        <label className="browse-button">
          Choose Files
          <input
            type="file"
            multiple
            hidden
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {selectedFiles.map((file, index) => (
        <div className="file-card" key={`${file.name}-${index}`}>
          <span className="file-name">{file.name}</span>
          <span className="file-size">{formatFileSize(file.size)}</span>
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

      {message && (
        <p className="action-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function App() {
  const [files, setFiles] = useState([]);
  const [serverInfo, setServerInfo] = useState(null);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [downloadingFile, setDownloadingFile] = useState("");
  const [deletingFile, setDeletingFile] = useState("");

  async function fetchHome() {
    try {
      const response = await requestApi("/");

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Unable to reach the server."));
      }

      setServerInfo(await response.json());
      setServerError("");
    } catch (err) {
      setServerError(err.message);
    }
  }

  async function fetchFiles(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      const response = await requestApi("/files");

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to fetch files."));
      }

      const data = await response.json();
      if (!Array.isArray(data.files)) {
        throw new Error("The server returned an invalid file list.");
      }

      setFiles(data.files);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshFiles() {
    setActionMessage("");
    await fetchFiles(true);
  }

  async function downloadFile(file) {
    setDownloadingFile(file.filename);
    setActionMessage("");

    try {
      const response = await requestApi(
        `/download/${encodeURIComponent(file.filename)}`,
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, `Failed to download ${file.filename}.`),
        );
      }

      const downloadUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      setActionMessage(err.message);
    } finally {
      setDownloadingFile("");
    }
  }

  async function deleteFile(file) {
    if (!window.confirm(`Delete "${file.filename}"? This cannot be undone.`)) {
      return;
    }

    setDeletingFile(file.filename);
    setActionMessage("");

    try {
      const response = await requestApi(
        `/files/${encodeURIComponent(file.filename)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, `Failed to delete ${file.filename}.`),
        );
      }

      setActionMessage(`${file.filename} deleted.`);
      await fetchFiles();
    } catch (err) {
      setActionMessage(err.message);
    } finally {
      setDeletingFile("");
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([fetchHome(), fetchFiles()]);
    };

    void initialize();
  }, []);

  return (
    <main>
      <header className="page-header">
        <div className="header-content">
          <p className="eyebrow">FILE SHARING</p>
          <p className="server-status" aria-live="polite">
            <span className={`status-dot ${serverError ? "offline" : ""}`} />
            {serverError
              ? "Server unavailable"
              : serverInfo
                ? serverInfo.message || "Server connected"
                : "Connecting to server..."}
          </p>
        </div>
      </header>

      {serverError && (
        <p className="container server-error" role="alert">
          {serverError}
        </p>
      )}

      <UploadFiles onUploadSuccess={fetchFiles} />

      <section className="container files-section">
        <div className="section-heading">
          <div>
            <h2>All files</h2>
            <p className="subtitle">
              {files.length} {files.length === 1 ? "file" : "files"} available
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={refreshFiles}
            disabled={refreshing || loading}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="empty-state">Loading files...</p>
        ) : error ? (
          <p className="error-state" role="alert">
            {error}
          </p>
        ) : files.length === 0 ? (
          <p className="empty-state">No files uploaded yet.</p>
        ) : (
          <div className="file-list">
            {files.map((file, index) => (
              <div className="file-card" key={file.id ?? file.filename ?? index}>
                <div className="file-details">
                  <span className="file-name">{file.filename}</span>
                  <span className="file-size">
                    {formatFileSize(file.size_bytes)}
                  </span>
                </div>
                <div className="file-actions">
                  <button
                    className="secondary-button"
                    onClick={() => downloadFile(file)}
                    disabled={
                      downloadingFile === file.filename ||
                      deletingFile === file.filename
                    }
                  >
                    {downloadingFile === file.filename
                      ? "Downloading..."
                      : "Download"}
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => deleteFile(file)}
                    disabled={
                      deletingFile === file.filename ||
                      downloadingFile === file.filename
                    }
                  >
                    {deletingFile === file.filename ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {actionMessage && (
          <p className="action-message" role="status">
            {actionMessage}
          </p>
        )}
      </section>
    </main>
  );
}

export default App;
