"use client";

import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-administration";
const api = authFetchFor("VP_ADMINISTRATION");

type SecurityPersonnel = {
  security_id: number;
  user_id: number;
  employee_id: string;
  shift: string;
  patrol_route?: string;
  assigned_area?: string;
  is_active: boolean;
};

type VisitorLog = {
  visitor_id: number;
  visitor_name: string;
  visitor_type: string;
  purpose: string;
  person_to_visit: string;
  id_type?: string;
  id_number?: string;
  check_in_time: string;
  check_out_time?: string;
  phone_number?: string;
  vehicle_plate?: string;
  notes?: string;
};

type SafetyEquipment = {
  equipment_id: number;
  equipment_type: string;
  equipment_name: string;
  location: string;
  facility_id?: number;
  installation_date?: string;
  last_inspection?: string;
  next_inspection?: string;
  expiry_date?: string;
  status: string;
  notes?: string;
};

type CCTVCamera = {
  camera_id: number;
  camera_name: string;
  location: string;
  facility_id?: number;
  camera_type: string;
  ip_address?: string;
  status: string;
  last_checked?: string;
  notes?: string;
};

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<"personnel" | "visitors" | "equipment" | "cctv">("personnel");
  const [personnel, setPersonnel] = useState<SecurityPersonnel[]>([]);
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [equipment, setEquipment] = useState<SafetyEquipment[]>([]);
  const [cctv, setCCTV] = useState<CCTVCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"visitor" | "equipment" | "cctv">("visitor");
  const [formData, setFormData] = useState({
    visitor_name: "",
    visitor_type: "PARENT",
    purpose: "",
    person_to_visit: "",
    id_type: "",
    id_number: "",
    phone_number: "",
    vehicle_plate: "",
    notes: "",
    equipment_type: "FIRE_EXTINGUISHER",
    equipment_name: "",
    location: "",
    status: "OPERATIONAL",
    camera_name: "",
    camera_type: "DOME",
    ip_address: "",
  });

  const visitorTypes = ["PARENT", "CONTRACTOR", "OFFICIAL", "DELIVERY", "OTHER"];
  const idTypes = ["NATIONAL_ID", "PASSPORT", "DRIVING_LICENSE"];
  const equipmentTypes = ["FIRE_EXTINGUISHER", "SMOKE_DETECTOR", "FIRST_AID_KIT", "EMERGENCY_LIGHT"];
  const equipmentStatuses = ["OPERATIONAL", "EXPIRED", "DAMAGED", "NEEDS_INSPECTION"];
  const cameraTypes = ["DOME", "BULLET", "PTZ"];
  const cameraStatuses = ["OPERATIONAL", "OFFLINE", "MAINTENANCE"];
  const shifts = ["MORNING", "AFTERNOON", "NIGHT", "ROTATING"];

  async function fetchData() {
    setLoading(true);
    try {
      const [persRes, visRes, eqRes, cctvRes] = await Promise.all([
        api(`${API_BASE}/security-personnel`),
        api(`${API_BASE}/visitor-logs`),
        api(`${API_BASE}/safety-equipment`),
        api(`${API_BASE}/cctv-cameras`),
      ]);

      if (persRes.ok) setPersonnel(await persRes.json());
      if (visRes.ok) setVisitors(await visRes.json());
      if (eqRes.ok) setEquipment(await eqRes.json());
      if (cctvRes.ok) setCCTV(await cctvRes.json());
    } catch (error) {
      console.error("Failed to fetch security data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function openModal(type: "visitor" | "equipment" | "cctv") {
    setModalType(type);
    setFormData({
      visitor_name: "",
      visitor_type: "PARENT",
      purpose: "",
      person_to_visit: "",
      id_type: "",
      id_number: "",
      phone_number: "",
      vehicle_plate: "",
      notes: "",
      equipment_type: "FIRE_EXTINGUISHER",
      equipment_name: "",
      location: "",
      status: "OPERATIONAL",
      camera_name: "",
      camera_type: "DOME",
      ip_address: "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let url = "";
      let payload = {};

      if (modalType === "visitor") {
        url = `${API_BASE}/visitor-logs`;
        payload = {
          visitor_name: formData.visitor_name,
          visitor_type: formData.visitor_type,
          purpose: formData.purpose,
          person_to_visit: formData.person_to_visit,
          id_type: formData.id_type || null,
          id_number: formData.id_number || null,
          phone_number: formData.phone_number || null,
          vehicle_plate: formData.vehicle_plate || null,
          notes: formData.notes || null,
        };
      } else if (modalType === "equipment") {
        url = `${API_BASE}/safety-equipment`;
        payload = {
          equipment_type: formData.equipment_type,
          equipment_name: formData.equipment_name,
          location: formData.location,
          status: formData.status,
          notes: formData.notes || null,
        };
      } else if (modalType === "cctv") {
        url = `${API_BASE}/cctv-cameras`;
        payload = {
          camera_name: formData.camera_name,
          location: formData.location,
          camera_type: formData.camera_type,
          ip_address: formData.ip_address || null,
          status: formData.status,
          notes: formData.notes || null,
        };
      }

      const res = await api(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    }
  }

  async function handleVisitorCheckout(visitorId: number) {
    try {
      const res = await api(`${API_BASE}/visitor-logs/${visitorId}/checkout`, { method: "POST" });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to checkout visitor:", error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "OPERATIONAL": return "bg-emerald-50 text-emerald-700";
      case "OFFLINE": return "bg-rose-50 text-rose-700";
      case "MAINTENANCE": return "bg-amber-50 text-amber-700";
      case "EXPIRED": return "bg-rose-50 text-rose-700";
      case "DAMAGED": return "bg-rose-50 text-rose-700";
      case "NEEDS_INSPECTION": return "bg-amber-50 text-amber-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Security & Safety Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage security personnel, visitors, safety equipment, and surveillance</p>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("personnel")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "personnel"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Security Personnel ({personnel.length})
          </button>
          <button
            onClick={() => setActiveTab("visitors")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "visitors"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Visitor Log ({visitors.length})
          </button>
          <button
            onClick={() => setActiveTab("equipment")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "equipment"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Safety Equipment ({equipment.length})
          </button>
          <button
            onClick={() => setActiveTab("cctv")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "cctv"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            CCTV Cameras ({cctv.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "personnel" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Employee ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Shift</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Patrol Route</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Area</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {personnel.map((person) => (
                      <tr key={person.security_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{person.employee_id}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{person.shift}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{person.patrol_route || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{person.assigned_area || "-"}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${person.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {person.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {personnel.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          No security personnel found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "visitors" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Visitor Log</h3>
                <button
                  onClick={() => openModal("visitor")}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Register Visitor
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Purpose</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Visiting</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Check Out</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visitors.map((visitor) => (
                      <tr key={visitor.visitor_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{visitor.visitor_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{visitor.visitor_type}</td>
                        <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">{visitor.purpose}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{visitor.person_to_visit}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{new Date(visitor.check_in_time).toLocaleString()}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{visitor.check_out_time ? new Date(visitor.check_out_time).toLocaleString() : "-"}</td>
                        <td className="px-6 py-3 text-right">
                          {!visitor.check_out_time && (
                            <button
                              onClick={() => handleVisitorCheckout(visitor.visitor_id)}
                              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                            >
                              Check Out
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visitors.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                          No visitors logged. Click "Register Visitor" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "equipment" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Safety Equipment</h3>
                <button
                  onClick={() => openModal("equipment")}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Add Equipment
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Next Inspection</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipment.map((eq) => (
                      <tr key={eq.equipment_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{eq.equipment_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{eq.equipment_type.replace(/_/g, " ")}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{eq.location}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{eq.next_inspection || "-"}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(eq.status)}`}>
                            {eq.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {equipment.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          No safety equipment found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "cctv" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">CCTV Cameras</h3>
                <button
                  onClick={() => openModal("cctv")}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Add Camera
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Camera Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cctv.map((camera) => (
                      <tr key={camera.camera_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{camera.camera_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{camera.location}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{camera.camera_type}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{camera.ip_address || "-"}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(camera.status)}`}>
                            {camera.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {cctv.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          No CCTV cameras found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {modalType === "visitor" && "Register Visitor"}
                {modalType === "equipment" && "Add Safety Equipment"}
                {modalType === "cctv" && "Add CCTV Camera"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === "visitor" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Visitor Name *</label>
                    <input
                      type="text"
                      name="visitor_name"
                      value={formData.visitor_name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Visitor Type *</label>
                      <select
                        name="visitor_type"
                        value={formData.visitor_type}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {visitorTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Person to Visit *</label>
                      <input
                        type="text"
                        name="person_to_visit"
                        value={formData.person_to_visit}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Purpose *</label>
                    <textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ID Type</label>
                      <select
                        name="id_type"
                        value={formData.id_type}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Select ID type</option>
                        {idTypes.map(type => (
                          <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ID Number</label>
                      <input
                        type="text"
                        name="id_number"
                        value={formData.id_number}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Plate</label>
                      <input
                        type="text"
                        name="vehicle_plate"
                        value={formData.vehicle_plate}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === "equipment" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Type *</label>
                      <select
                        name="equipment_type"
                        value={formData.equipment_type}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {equipmentTypes.map(type => (
                          <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Name *</label>
                      <input
                        type="text"
                        name="equipment_name"
                        value={formData.equipment_name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {equipmentStatuses.map(status => (
                        <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {modalType === "cctv" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Camera Name *</label>
                    <input
                      type="text"
                      name="camera_name"
                      value={formData.camera_name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Camera Type *</label>
                      <select
                        name="camera_type"
                        value={formData.camera_type}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {cameraTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">IP Address</label>
                      <input
                        type="text"
                        name="ip_address"
                        value={formData.ip_address}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {cameraStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
