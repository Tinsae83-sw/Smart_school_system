"use client";

import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/vp-administration";
const api = authFetchFor("VP_ADMINISTRATION");

type Vehicle = {
  vehicle_id: number;
  vehicle_name: string;
  vehicle_type: string;
  license_plate: string;
  capacity: number;
  model?: string;
  year?: number;
  fuel_type?: string;
  status: string;
  current_location?: string;
  notes?: string;
};

type VehicleMaintenance = {
  maintenance_id: number;
  vehicle_id: number;
  vehicle_name: string;
  maintenance_type: string;
  description: string;
  scheduled_date: string;
  completed_date?: string;
  cost?: number;
  status: string;
  performed_by?: string;
};

type DriverAssignment = {
  assignment_id: number;
  vehicle_id: number;
  vehicle_name: string;
  driver_id: number;
  driver_name: string;
  assigned_date: string;
  shift: string;
  route?: string;
  status: string;
};

type TransportSchedule = {
  schedule_id: number;
  vehicle_id: number;
  vehicle_name: string;
  route: string;
  departure_time: string;
  arrival_time: string;
  days_of_week: string[];
  purpose: string;
  status: string;
};

export default function TransportPage() {
  const [activeTab, setActiveTab] = useState<"vehicles" | "maintenance" | "assignments" | "schedules">("vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<VehicleMaintenance[]>([]);
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [schedules, setSchedules] = useState<TransportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"vehicle" | "maintenance" | "assignment" | "schedule">("vehicle");
  const [formData, setFormData] = useState({
    vehicle_id: "",
    vehicle_name: "",
    vehicle_type: "BUS",
    license_plate: "",
    capacity: "",
    model: "",
    year: "",
    fuel_type: "DIESEL",
    status: "AVAILABLE",
    current_location: "",
    notes: "",
    maintenance_type: "ROUTINE",
    description: "",
    scheduled_date: "",
    cost: "",
    driver_id: "",
    shift: "MORNING",
    route: "",
    departure_time: "",
    arrival_time: "",
    days_of_week: "",
    purpose: "",
  });

  const vehicleTypes = ["BUS", "VAN", "CAR", "TRUCK", "MINIBUS"];
  const fuelTypes = ["DIESEL", "PETROL", "ELECTRIC", "HYBRID"];
  const vehicleStatuses = ["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"];
  const maintenanceTypes = ["ROUTINE", "REPAIR", "INSPECTION", "EMERGENCY"];
  const maintenanceStatuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const shifts = ["MORNING", "AFTERNOON", "NIGHT", "FULL_DAY"];
  const scheduleStatuses = ["ACTIVE", "SUSPENDED", "CANCELLED"];

  async function fetchData() {
    setLoading(true);
    try {
      const [vehRes, maintRes, assignRes, schedRes] = await Promise.all([
        api(`${API_BASE}/vehicles`),
        api(`${API_BASE}/vehicle-maintenance`),
        api(`${API_BASE}/driver-assignments`),
        api(`${API_BASE}/transport-schedules`),
      ]);

      if (vehRes.ok) setVehicles(await vehRes.json());
      if (maintRes.ok) setMaintenance(await maintRes.json());
      if (assignRes.ok) setAssignments(await assignRes.json());
      if (schedRes.ok) setSchedules(await schedRes.json());
    } catch (error) {
      console.error("Failed to fetch transport data:", error);
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

  function openModal(type: "vehicle" | "maintenance" | "assignment" | "schedule") {
    setModalType(type);
    setFormData({
      vehicle_id: "",
      vehicle_name: "",
      vehicle_type: "BUS",
      license_plate: "",
      capacity: "",
      model: "",
      year: "",
      fuel_type: "DIESEL",
      status: "AVAILABLE",
      current_location: "",
      notes: "",
      maintenance_type: "ROUTINE",
      description: "",
      scheduled_date: "",
      cost: "",
      driver_id: "",
      shift: "MORNING",
      route: "",
      departure_time: "",
      arrival_time: "",
      days_of_week: "",
      purpose: "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let url = "";
      let payload = {};

      if (modalType === "vehicle") {
        url = `${API_BASE}/vehicles`;
        payload = {
          vehicle_name: formData.vehicle_name,
          vehicle_type: formData.vehicle_type,
          license_plate: formData.license_plate,
          capacity: parseInt(formData.capacity),
          model: formData.model || null,
          year: formData.year ? parseInt(formData.year) : null,
          fuel_type: formData.fuel_type,
          status: formData.status,
          current_location: formData.current_location || null,
          notes: formData.notes || null,
        };
      } else if (modalType === "maintenance") {
        url = `${API_BASE}/vehicle-maintenance`;
        payload = {
          vehicle_id: parseInt(formData.vehicle_id),
          maintenance_type: formData.maintenance_type,
          description: formData.description,
          scheduled_date: formData.scheduled_date,
          cost: formData.cost ? parseFloat(formData.cost) : null,
        };
      } else if (modalType === "assignment") {
        url = `${API_BASE}/driver-assignments`;
        payload = {
          vehicle_id: parseInt(formData.vehicle_id),
          driver_id: parseInt(formData.driver_id),
          shift: formData.shift,
          route: formData.route || null,
        };
      } else if (modalType === "schedule") {
        url = `${API_BASE}/transport-schedules`;
        payload = {
          vehicle_id: parseInt(formData.vehicle_id),
          route: formData.route,
          departure_time: formData.departure_time,
          arrival_time: formData.arrival_time,
          days_of_week: formData.days_of_week.split(",").map(d => d.trim()),
          purpose: formData.purpose,
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

  function getStatusColor(status: string) {
    switch (status) {
      case "AVAILABLE": return "bg-emerald-50 text-emerald-700";
      case "IN_USE": return "bg-blue-50 text-blue-700";
      case "MAINTENANCE": return "bg-amber-50 text-amber-700";
      case "OUT_OF_SERVICE": return "bg-rose-50 text-rose-700";
      case "SCHEDULED": return "bg-blue-50 text-blue-700";
      case "IN_PROGRESS": return "bg-amber-50 text-amber-700";
      case "COMPLETED": return "bg-emerald-50 text-emerald-700";
      case "CANCELLED": return "bg-rose-50 text-rose-700";
      case "ACTIVE": return "bg-emerald-50 text-emerald-700";
      case "SUSPENDED": return "bg-amber-50 text-amber-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transport Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage school vehicles, maintenance, drivers, and schedules</p>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "vehicles"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Vehicles ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "maintenance"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Maintenance ({maintenance.length})
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "assignments"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Driver Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab("schedules")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "schedules"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Schedules ({schedules.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "vehicles" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Vehicle Fleet</h3>
                <button
                  onClick={() => openModal("vehicle")}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                >
                  Add Vehicle
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">License Plate</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Capacity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.vehicle_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{vehicle.vehicle_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{vehicle.vehicle_type}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{vehicle.license_plate}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{vehicle.capacity} seats</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{vehicle.current_location || "-"}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                            {vehicle.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {vehicles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          No vehicles found. Click "Add Vehicle" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "maintenance" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Maintenance Records</h3>
                <button
                  onClick={() => openModal("maintenance")}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                >
                  Schedule Maintenance
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Scheduled</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maintenance.map((maint) => (
                      <tr key={maint.maintenance_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{maint.vehicle_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{maint.maintenance_type}</td>
                        <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">{maint.description}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{maint.scheduled_date}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{maint.cost ? `ETB ${maint.cost}` : "-"}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(maint.status)}`}>
                            {maint.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {maintenance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          No maintenance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Driver Assignments</h3>
                <button
                  onClick={() => openModal("assignment")}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                >
                  Assign Driver
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Shift</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Route</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((assignment) => (
                      <tr key={assignment.assignment_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{assignment.driver_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{assignment.vehicle_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{assignment.shift}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{assignment.route || "-"}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{assignment.assigned_date}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(assignment.status)}`}>
                            {assignment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          No driver assignments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "schedules" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Transport Schedules</h3>
                <button
                  onClick={() => openModal("schedule")}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                >
                  Add Schedule
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Route</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Departure</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Arrival</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Purpose</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedules.map((schedule) => (
                      <tr key={schedule.schedule_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{schedule.vehicle_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{schedule.route}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{schedule.departure_time}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{schedule.arrival_time}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{schedule.days_of_week.join(", ")}</td>
                        <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">{schedule.purpose}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {schedules.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                          No schedules found.
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
                {modalType === "vehicle" && "Add Vehicle"}
                {modalType === "maintenance" && "Schedule Maintenance"}
                {modalType === "assignment" && "Assign Driver"}
                {modalType === "schedule" && "Add Schedule"}
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
              {modalType === "vehicle" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Name *</label>
                      <input
                        type="text"
                        name="vehicle_name"
                        value={formData.vehicle_name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type *</label>
                      <select
                        name="vehicle_type"
                        value={formData.vehicle_type}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {vehicleTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">License Plate *</label>
                      <input
                        type="text"
                        name="license_plate"
                        value={formData.license_plate}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Capacity *</label>
                      <input
                        type="number"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleInputChange}
                        required
                        min="1"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                      <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                      <input
                        type="number"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        min="1900"
                        max="2100"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type *</label>
                      <select
                        name="fuel_type"
                        value={formData.fuel_type}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {fuelTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {vehicleStatuses.map(status => (
                          <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Location</label>
                    <input
                      type="text"
                      name="current_location"
                      value={formData.current_location}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </>
              )}

              {modalType === "maintenance" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle *</label>
                    <select
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Maintenance Type *</label>
                    <select
                      name="maintenance_type"
                      value={formData.maintenance_type}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      {maintenanceTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date *</label>
                      <input
                        type="date"
                        name="scheduled_date"
                        value={formData.scheduled_date}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost (ETB)</label>
                      <input
                        type="number"
                        name="cost"
                        value={formData.cost}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === "assignment" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle *</label>
                    <select
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Driver ID *</label>
                    <input
                      type="number"
                      name="driver_id"
                      value={formData.driver_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Shift *</label>
                      <select
                        name="shift"
                        value={formData.shift}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {shifts.map(shift => (
                          <option key={shift} value={shift}>{shift}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Route</label>
                      <input
                        type="text"
                        name="route"
                        value={formData.route}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === "schedule" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle *</label>
                    <select
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Route *</label>
                    <input
                      type="text"
                      name="route"
                      value={formData.route}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Departure Time *</label>
                      <input
                        type="time"
                        name="departure_time"
                        value={formData.departure_time}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Arrival Time *</label>
                      <input
                        type="time"
                        name="arrival_time"
                        value={formData.arrival_time}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Days of Week (comma-separated) *</label>
                    <input
                      type="text"
                      name="days_of_week"
                      value={formData.days_of_week}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Monday, Wednesday, Friday"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Purpose *</label>
                    <textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
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
