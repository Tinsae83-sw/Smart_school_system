"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { vpAdminApi } from "@/lib/api";

type Facility = {
  facility_id: number;
  facility_name: string;
  facility_type: string;
  capacity: number;
  location?: string;
  building?: string;
  floor?: number;
  amenities: string[];
  status: string;
  description?: string;
  contact_person?: string;
  contact_phone?: string;
  operating_hours?: string;
  area_sqft?: number;
  responsible_department?: string;
  notes?: string;
};

type Booking = {
  booking_id: number;
  facility_id: number;
  facility_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  booked_by: string;
  approved_by?: string;
  status: string;
};

type Maintenance = {
  maintenance_id: number;
  facility_id: number;
  facility_name: string;
  issue_type: string;
  description: string;
  priority: string;
  status: string;
  scheduled_date?: string;
  completed_date?: string;
  reported_by?: string;
  assigned_to?: string;
  cost?: number;
  notes?: string;
};

export default function FacilitiesPage() {
  const [activeTab, setActiveTab] = useState<"facilities" | "bookings" | "maintenance">("facilities");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [formData, setFormData] = useState({
    facility_name: "",
    facility_type: "",
    capacity: "",
    location: "",
    building: "",
    floor: "",
    amenities: "",
    status: "AVAILABLE",
    description: "",
    contact_person: "",
    contact_phone: "",
    operating_hours: "",
    area_sqft: "",
    responsible_department: "",
    notes: "",
  });

  const facilityTypes = ["CLASSROOM", "LAB", "LIBRARY", "HALL", "PLAYGROUND", "TOILET", "OFFICE", "CAFETERIA"];
  const statuses = ["AVAILABLE", "UNDER_MAINTENANCE", "CLOSED"];
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const maintenanceStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const bookingStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

  async function fetchData() {
    setLoading(true);
    try {
      const [facRes, bookRes, maintRes] = await Promise.all([
        vpAdminApi.get('/facilities'),
        vpAdminApi.get('/facility-bookings'),
        vpAdminApi.get('/facility-maintenance'),
      ]);

      if (facRes.ok) setFacilities(await facRes.json());
      if (bookRes.ok) setBookings(await bookRes.json());
      if (maintRes.ok) setMaintenance(await maintRes.json());
    } catch (error) {
      console.error("Failed to fetch facilities data:", error);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingFacility 
        ? `/facilities/${editingFacility.facility_id}`
        : '/facilities';
      const method = editingFacility ? "put" : "post";
      
      const payload = {
        ...formData,
        capacity: parseInt(formData.capacity),
        floor: formData.floor ? parseInt(formData.floor) : null,
        area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
        amenities: formData.amenities ? formData.amenities.split(",").map(a => a.trim()) : [],
      };

      const res = await vpAdminApi[method](url, payload);

      if (res.ok) {
        closeModal();
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save facility:", error);
    }
  }

  async function handleDelete(facilityId: number) {
    if (!confirm("Are you sure you want to delete this facility?")) return;
    try {
      const res = await vpAdminApi.delete(`/facilities/${facilityId}`);
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete facility:", error);
    }
  }

  async function handleBookingAction(bookingId: number, action: "approve" | "reject") {
    try {
      const res = await vpAdminApi.post(`/facility-bookings/${bookingId}/${action}`, {});
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error(`Failed to ${action} booking:`, error);
    }
  }

  function openEditModal(facility: Facility) {
    setEditingFacility(facility);
    setFormData({
      facility_name: facility.facility_name,
      facility_type: facility.facility_type,
      capacity: facility.capacity.toString(),
      location: facility.location || "",
      building: facility.building || "",
      floor: facility.floor?.toString() || "",
      amenities: facility.amenities.join(", "),
      status: facility.status,
      description: facility.description || "",
      contact_person: facility.contact_person || "",
      contact_phone: facility.contact_phone || "",
      operating_hours: facility.operating_hours || "",
      area_sqft: facility.area_sqft?.toString() || "",
      responsible_department: facility.responsible_department || "",
      notes: facility.notes || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingFacility(null);
    setFormData({
      facility_name: "",
      facility_type: "",
      capacity: "",
      location: "",
      building: "",
      floor: "",
      amenities: "",
      status: "AVAILABLE",
      description: "",
      contact_person: "",
      contact_phone: "",
      operating_hours: "",
      area_sqft: "",
      responsible_department: "",
      notes: "",
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "AVAILABLE": return "bg-emerald-50 text-emerald-700";
      case "UNDER_MAINTENANCE": return "bg-amber-50 text-amber-700";
      case "CLOSED": return "bg-rose-50 text-rose-700";
      case "APPROVED": return "bg-emerald-50 text-emerald-700";
      case "PENDING": return "bg-amber-50 text-amber-700";
      case "REJECTED": return "bg-rose-50 text-rose-700";
      case "CANCELLED": return "bg-gray-50 text-gray-700";
      case "IN_PROGRESS": return "bg-blue-50 text-blue-700";
      case "COMPLETED": return "bg-emerald-50 text-emerald-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "LOW": return "bg-blue-50 text-blue-700";
      case "MEDIUM": return "bg-amber-50 text-amber-700";
      case "HIGH": return "bg-orange-50 text-orange-700";
      case "URGENT": return "bg-rose-50 text-rose-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facility Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage school facilities, bookings, and maintenance</p>
        </div>
        {activeTab === "facilities" && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition w-full sm:w-auto"
          >
            Add Facility
          </button>
        )}
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("facilities")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "facilities"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Facilities ({facilities.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "bookings"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Bookings ({bookings.length})
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
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "facilities" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Name</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Capacity</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Building</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Floor</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Location</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Area</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Contact</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Phone</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Hours</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Dept</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Amenities</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facilities.map((facility) => (
                      <tr key={facility.facility_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">{facility.facility_name}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.facility_type}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.capacity}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.building || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.floor ? `Floor ${facility.floor}` : "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.location || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.area_sqft ? `${facility.area_sqft} sqft` : "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.contact_person || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.contact_phone || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[80px] truncate">{facility.operating_hours || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{facility.responsible_department || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[100px] truncate">{facility.amenities?.join(", ") || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(facility.status)}`}>
                            {facility.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(facility)}
                              className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(facility.facility_id)}
                              className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {facilities.length === 0 && (
                      <tr>
                        <td colSpan={14} className="px-3 py-12 text-center text-xs text-slate-400">
                          No facilities found. Click "Add Facility" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "bookings" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Facility</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Start</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">End</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Purpose</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Booked By</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Approved By</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((booking) => (
                      <tr key={booking.booking_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">{booking.facility_name}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{booking.booking_date}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{booking.start_time}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{booking.end_time}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[150px] truncate">{booking.purpose}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{booking.booked_by}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{booking.approved_by || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {booking.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleBookingAction(booking.booking_id, "approve")}
                                className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleBookingAction(booking.booking_id, "reject")}
                                className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-12 text-center text-xs text-slate-400">
                          No bookings found.
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
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Facility</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Description</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Priority</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Reported By</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Assigned To</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Scheduled</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Completed</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Cost</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Notes</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maintenance.map((maint) => (
                      <tr key={maint.maintenance_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">{maint.facility_name}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{maint.issue_type}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[150px] truncate">{maint.description}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getPriorityColor(maint.priority)}`}>
                            {maint.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{maint.reported_by || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{maint.assigned_to || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{maint.scheduled_date || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{maint.completed_date || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{maint.cost ? `ETB ${maint.cost}` : "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[100px] truncate">{maint.notes || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(maint.status)}`}>
                            {maint.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {maintenance.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-3 py-12 text-center text-xs text-slate-400">
                          No maintenance requests found.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingFacility ? "Edit Facility" : "Add New Facility"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Basic Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Facility Name *</label>
                    <input
                      type="text"
                      name="facility_name"
                      value={formData.facility_name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Main Conference Hall"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Facility Type *</label>
                    <select
                      name="facility_type"
                      value={formData.facility_type}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select type</option>
                      {facilityTypes.map(type => (
                        <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Capacity & Location Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Capacity & Location
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Capacity *</label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      required
                      min="1"
                      placeholder="50"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Area (sq ft)</label>
                    <input
                      type="number"
                      name="area_sqft"
                      value={formData.area_sqft}
                      onChange={handleInputChange}
                      step="0.01"
                      placeholder="500"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Building Details Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Building Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Building</label>
                    <input
                      type="text"
                      name="building"
                      value={formData.building}
                      onChange={handleInputChange}
                      placeholder="e.g., Building A"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Floor</label>
                    <input
                      type="number"
                      name="floor"
                      value={formData.floor}
                      onChange={handleInputChange}
                      placeholder="1"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="e.g., North Wing"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Contact Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      placeholder="e.g., John Smith"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      placeholder="e.g., +251 911 123 456"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Details Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Operating Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Operating Hours</label>
                    <input
                      type="text"
                      name="operating_hours"
                      value={formData.operating_hours}
                      onChange={handleInputChange}
                      placeholder="e.g., 8:00 AM - 6:00 PM"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Responsible Department</label>
                    <input
                      type="text"
                      name="responsible_department"
                      value={formData.responsible_department}
                      onChange={handleInputChange}
                      placeholder="e.g., Administration"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2M5 9v10a2 2 0 002 2h10a2 2 0 002-2V9M5 9h14" />
                  </svg>
                  Amenities
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amenities (comma-separated)</label>
                  <textarea
                    name="amenities"
                    value={formData.amenities}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="e.g., Projector, Whiteboard, AC, WiFi"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Description Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Description & Notes
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Provide a detailed description of the facility..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Any additional information or special instructions..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  {editingFacility ? "Update Facility" : "Add Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
