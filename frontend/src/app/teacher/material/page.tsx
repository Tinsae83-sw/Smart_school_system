"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

import { 
  Upload, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Trash2, 
  X, 
  File, 
  FolderOpen,
  Calendar,
  Download,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function MaterialPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "NOTES",
    file_type: "PDF"
  });
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadClasses(savedToken);
  }, [router]);

  async function loadClasses(token: string) {
    try {
      const data = await authFetch("/api/teacher/classes", {}, token);
      setClasses(data);
      if (data.length > 0) {
        setSelectedClasses([data[0].class_id]);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadMaterials() {
    if (selectedClasses.length === 0) return;
    try {
      const materialsPromises = selectedClasses.map(classId =>
        authFetch(`/api/teacher/materials?classId=${classId}`, {}, token)
      );
      const results = await Promise.all(materialsPromises);
      const allMaterials = results.flat();
      setMaterials(allMaterials || []);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (selectedClasses.length > 0) {
      loadMaterials();
    }
  }, [selectedClasses]);

  function getFileIcon(fileType: string) {
    switch (fileType) {
      case "PDF":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "VIDEO":
        return <Video className="w-5 h-5 text-purple-500" />;
      case "IMAGE":
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case "DOCX":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "PPTX":
        return <FileText className="w-5 h-5 text-orange-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  function handleFileSelect(file: File) {
    setSelectedFile(file);
    const extension = file.name.split(".").pop()?.toUpperCase() || "PDF";
    setFormData({ ...formData, file_type: extension, title: formData.title || file.name.split(".")[0] });
  }

  function handleRemoveFile() {
    setSelectedFile(null);
  }

  async function handleUploadMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ text: "Please select a file to upload", type: "error" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setMessage({ text: "", type: "" });

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", selectedFile);
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("file_type", formData.file_type);
      formDataToSend.append("class_id", selectedClasses[0]?.toString() || "");

      const response = await fetch(`${BACKEND_URL}/api/teacher/materials`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) throw new Error("Upload failed");

      setMessage({ text: "Material uploaded successfully!", type: "success" });
      setShowUploadForm(false);
      setSelectedFile(null);
      setFormData({ title: "", description: "", category: "NOTES", file_type: "PDF" });
      loadMaterials();
    } catch (e) {
      setMessage({ text: "Failed to upload material", type: "error" });
      console.error(e);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDeleteMaterial(materialId: number) {
    if (!confirm("Are you sure you want to delete this material?")) return;
    try {
      await authFetch(`/api/teacher/materials/${materialId}`, {
        method: "DELETE"
      }, token);
      setMessage({ text: "Material deleted successfully!", type: "success" });
      loadMaterials();
    } catch (e) {
      setMessage({ text: "Failed to delete material", type: "error" });
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-slate-900">Study Materials</h1>
          </div>
          <p className="text-slate-600 ml-11">Manage and share learning resources with your students</p>
        </div>
        
        {/* Class Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Select Classes
          </label>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls: any) => (
              <label
                key={cls.class_id}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedClasses.includes(cls.class_id)
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-slate-50 hover:border-emerald-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(cls.class_id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClasses([...selectedClasses, cls.class_id]);
                    } else {
                      setSelectedClasses(selectedClasses.filter(id => id !== cls.class_id));
                    }
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="font-medium text-slate-900">
                    {cls.school_class?.class_name || cls.class_name} - {cls.subject?.subject_name || cls.subject}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Upload Material Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30"
          >
            {showUploadForm ? (
              <>
                <X className="w-5 h-5" />
                Cancel
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload New Material
              </>
            )}
          </button>
        </div>

        {/* Upload Material Form */}
        {showUploadForm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <Upload className="w-6 h-6 text-emerald-600" />
              Upload Material
            </h2>
            <form onSubmit={handleUploadMaterial} className="space-y-5">
              {/* File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging 
                    ? "border-emerald-500 bg-emerald-50" 
                    : "border-slate-300 hover:border-emerald-400 bg-slate-50"
                }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                {!selectedFile ? (
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-600 font-medium mb-2">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-slate-400 text-sm">
                      Supports PDF, DOCX, PPTX, Images, and Videos
                    </p>
                  </label>
                ) : (
                  <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                      {getFileIcon(formData.file_type)}
                      <div className="text-left">
                        <p className="font-medium text-slate-900">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Enter material title"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  >
                    <option value="NOTES">Notes</option>
                    <option value="TEXTBOOK">Textbook</option>
                    <option value="REFERENCE">Reference</option>
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="EXAM">Exam Paper</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Add a description for this material"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                />
              </div>

              {isUploading && (
                <div className="bg-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Uploading...</span>
                    <span className="text-sm text-slate-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload Material
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {message.text && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Materials List */}
        <div className="space-y-4">
          {materials.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No materials yet</h3>
              <p className="text-slate-500">Upload your first study material to get started</p>
            </div>
          ) : (
            materials.map((material: any) => (
              <div 
                key={material.material_id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    {getFileIcon(material.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{material.title}</h3>
                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">{material.description || "No description"}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 font-medium">
                            {material.category}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-3 py-1 font-medium">
                            {material.file_type}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(material.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteMaterial(material.material_id)}
                          className="flex items-center gap-2 rounded-xl bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
