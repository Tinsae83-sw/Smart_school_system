'use client';

import { useEffect, useState } from 'react';
import { authFetchFor } from '@/lib/api';

interface Student {
  student_id: number;
  student_name: string;
  student_email: string;
  student_number: string;
  grade: string;
  relationship_to_parent: string;
  linked_at: string;
}

interface Parent {
  parent_id: number;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  relationship: string;
  address: string;
  students: Student[];
}

export default function ParentStudentRelationshipsPage() {
  const [relationships, setRelationships] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000') + '/api/vp-academic';
  const api = authFetchFor("VP_ACADEMIC");

  useEffect(() => {
    fetchRelationships();
  }, []);

  async function fetchRelationships() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/parent-student-relationships`);
      if (!res.ok) throw new Error('Failed to fetch relationships');
      const data = await res.json();
      setRelationships(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredRelationships = relationships.filter(parent =>
    parent.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.parent_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.students.some(student =>
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Parent-Student Relationships</h1>
          <p className="mt-2 text-slate-600">View and manage parent-student connections</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by parent name, email, or student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">Loading relationships...</div>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="text-2xl font-bold text-emerald-600">{relationships.length}</div>
                <div className="text-sm text-slate-600">Total Parents</div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="text-2xl font-bold text-blue-600">
                  {relationships.reduce((acc, parent) => acc + parent.students.length, 0)}
                </div>
                <div className="text-sm text-slate-600">Total Students</div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="text-2xl font-bold text-purple-600">
                  {relationships.filter(p => p.students.length > 1).length}
                </div>
                <div className="text-sm text-slate-600">Parents with Multiple Students</div>
              </div>
            </div>

            {/* Relationships List */}
            <div className="space-y-6">
              {filteredRelationships.length === 0 ? (
                <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-slate-200">
                  <div className="text-slate-400">No relationships found</div>
                </div>
              ) : (
                filteredRelationships.map((parent) => (
                  <div
                    key={parent.parent_id}
                    className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden"
                  >
                    {/* Parent Information */}
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{parent.parent_name}</h3>
                          <div className="mt-1 space-y-1 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Email:</span>
                              <span>{parent.parent_email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Phone:</span>
                              <span>{parent.parent_phone || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Relationship:</span>
                              <span className="capitalize">{parent.relationship.toLowerCase()}</span>
                            </div>
                            {parent.address && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Address:</span>
                                <span>{parent.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                          {parent.students.length} {parent.students.length === 1 ? 'Student' : 'Students'}
                        </div>
                      </div>
                    </div>

                    {/* Students List */}
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-slate-700 mb-4">Linked Students</h4>
                      {parent.students.length === 0 ? (
                        <div className="text-slate-400 text-sm">No students linked to this parent</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Student Name
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Student Number
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Grade
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Relationship
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Linked Date
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {parent.students.map((student) => (
                                <tr key={student.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-slate-900">{student.student_name}</div>
                                    <div className="text-xs text-slate-500">{student.student_email}</div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600">{student.student_number}</td>
                                  <td className="py-3 px-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {student.grade}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 capitalize">
                                    {student.relationship_to_parent.toLowerCase()}
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 text-sm">
                                    {new Date(student.linked_at).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
