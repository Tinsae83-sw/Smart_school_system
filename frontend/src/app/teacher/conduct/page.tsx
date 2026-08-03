"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";
import { 
  User, 
  Star, 
  Award, 
  CheckCircle,
  AlertCircle,
  GraduationCap,
  FolderOpen,
  Save,
  Send
} from "lucide-react";

export default function ConductPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [conductGrades, setConductGrades] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [individualSubmitting, setIndividualSubmitting] = useState<Record<number, boolean>>({});
  const [message, setMessage] = useState({ text: "", type: "" });
  const [term, setTerm] = useState("1");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());

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
        setSelectedClass(data[0].class_id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadStudents() {
    if (!selectedClass) return;
    try {
      const data = await authFetch(`/api/teacher/classes/${selectedClass}/roster`, {}, token);
      setStudents(data || []);
      
      // Initialize conduct grades for all students
      const initialGrades: Record<number, any> = {};
      data.forEach((student: any) => {
        initialGrades[student.student_id] = {
          grade: "B",
          rating: 4,
          comments: ""
        };
      });
      setConductGrades(initialGrades);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  async function handleSubmitConduct() {
    setSubmitting(true);
    setMessage({ text: "", type: "" });
    
    try {
      const submissions = Object.entries(conductGrades).map(([studentId, gradeData]) => ({
        student_id: parseInt(studentId),
        term,
        academic_year: academicYear,
        ...gradeData
      }));

      await authFetch("/api/teacher/conduct/bulk", {
        method: "POST",
        body: JSON.stringify({ grades: submissions })
      }, token);

      setMessage({ text: "Conduct grades submitted successfully!", type: "success" });
    } catch (e) {
      setMessage({ text: "Failed to submit conduct grades", type: "error" });
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleIndividualSubmit(studentId: number) {
    setIndividualSubmitting(prev => ({ ...prev, [studentId]: true }));
    setMessage({ text: "", type: "" });
    
    try {
      const gradeData = conductGrades[studentId];
      
      await authFetch("/api/teacher/conduct", {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          term,
          academic_year: academicYear,
          ...gradeData
        })
      }, token);

      setMessage({ text: "Conduct grade submitted successfully!", type: "success" });
    } catch (e) {
      setMessage({ text: "Failed to submit conduct grade", type: "error" });
      console.error(e);
    } finally {
      setIndividualSubmitting(prev => ({ ...prev, [studentId]: false }));
    }
  }

  function handleGradeChange(studentId: number, field: string, value: any) {
    setConductGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  }

  function getGradeColor(grade: string) {
    switch (grade) {
      case "A": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "B": return "bg-blue-100 text-blue-700 border-blue-200";
      case "C": return "bg-amber-100 text-amber-700 border-amber-200";
      case "D": return "bg-orange-100 text-orange-700 border-orange-200";
      case "F": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading class data...</p>
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
            <GraduationCap className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-slate-900">Student Conduct</h1>
          </div>
          <p className="text-slate-600 ml-11">Submit conduct grades for your students</p>
        </div>
        
        {/* Class and Term Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Select Class
              </label>
              <select
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              >
                {classes.map((cls: any) => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.school_class?.class_name || cls.class_name} - {cls.subject?.subject_name || cls.subject}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              >
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Students Conduct Grid */}
        {students.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-emerald-600" />
                Grade Students ({students.length})
              </h2>
              <button
                onClick={handleSubmitConduct}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Submit All Grades
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {students.map((student: any) => (
                <div key={student.student_id} className="border border-slate-200 rounded-xl p-4 hover:border-emerald-300 transition">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{student.user?.full_name}</p>
                          <p className="text-sm text-slate-500">{student.student_number}</p>
                        </div>
                        <button
                          onClick={() => handleIndividualSubmit(student.student_id)}
                          disabled={individualSubmitting[student.student_id]}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white font-semibold hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {individualSubmitting[student.student_id] ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Submit
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Grade</label>
                          <select
                            value={conductGrades[student.student_id]?.grade || "B"}
                            onChange={(e) => handleGradeChange(student.student_id, 'grade', e.target.value)}
                            className={`w-full rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${getGradeColor(conductGrades[student.student_id]?.grade || "B")}`}
                          >
                            <option value="A">A - Excellent</option>
                            <option value="B">B - Good</option>
                            <option value="C">C - Satisfactory</option>
                            <option value="D">D - Needs Improvement</option>
                            <option value="F">F - Unsatisfactory</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Rating</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() => handleGradeChange(student.student_id, 'rating', rating)}
                                className={`p-1 transition ${
                                  (conductGrades[student.student_id]?.rating || 4) >= rating 
                                    ? 'text-amber-400' 
                                    : 'text-slate-300 hover:text-amber-200'
                                }`}
                              >
                                <Star className={`w-5 h-5 ${
                                  (conductGrades[student.student_id]?.rating || 4) >= rating 
                                    ? 'fill-current' 
                                    : ''
                                }`} />
                              </button>
                            ))}
                            <span className="text-sm text-slate-600 ml-2">
                              {conductGrades[student.student_id]?.rating || 4}/5
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Comments</label>
                          <input
                            type="text"
                            value={conductGrades[student.student_id]?.comments || ""}
                            onChange={(e) => handleGradeChange(student.student_id, 'comments', e.target.value)}
                            placeholder="Add comments..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {students.length === 0 && selectedClass && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No students in this class</h3>
            <p className="text-slate-500">Select a different class to grade conduct</p>
          </div>
        )}
      </div>
    </main>
  );
}
