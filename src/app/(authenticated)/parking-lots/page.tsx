"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/shadcnComponents/button";
import { Input } from "@/components/shadcnComponents/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcnComponents/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/shadcnComponents/sheet";
import ParkingLotCard from "@/components/cards/ParkingLotCard";
import ParkingLotForm from "@/components/forms/ParkingLotForm";

interface ParkingLot {
  _id: string;
  name: string;
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  totalSlots: number;
  status: "active" | "inactive";
  contractorId?: {
    _id: string;
    name: string;
    status: string;
  };
  currentOccupancy?: {
    occupied: number;
    empty: number;
    occupancyRate: number;
    lastUpdated: string;
  } | null;
}

export default function ParkingLotsPage() {
  const { data: session } = useSession();
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [contractorFilter, setContractorFilter] = useState<string>("all");
  const [contractors, setContractors] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchParkingLots = async () => {
    try {
      setError(null);
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (contractorFilter !== "all") {
        params.append("contractorId", contractorFilter);
      }
      params.append("limit", "100");

      const response = await fetch(`/api/parking-lots?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch parking lots");
      }

      const result = await response.json();
      setParkingLots(result.data || []);
    } catch (err) {
      console.error("Error fetching parking lots:", err);
      setError("Failed to load parking lots");
    } finally {
      setLoading(false);
    }
  };

  const fetchContractors = async () => {
    try {
      const response = await fetch("/api/contractors?status=active&limit=100");
      if (response.ok) {
        const result = await response.json();
        setContractors(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching contractors:", err);
    }
  };

  useEffect(() => {
    fetchParkingLots();
    fetchContractors();

    // Real-time: patch occupancy in-state whenever the AI backend sends capacity_update
    // Close any existing connection first (filters may have changed)
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const es = new EventSource("/api/sse/dashboard");
    eventSourceRef.current = es;

    es.addEventListener("capacity_update", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setParkingLots((prev) =>
          prev.map((lot) =>
            lot._id === payload.parkingLotId
              ? {
                  ...lot,
                  currentOccupancy: {
                    occupied: payload.occupied,
                    empty: payload.empty,
                    occupancyRate: payload.occupancyRate,
                    lastUpdated: payload.timestamp,
                  },
                }
              : lot,
          ),
        );
      } catch (_) {}
    });
    es.onerror = () => es.close();

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [statusFilter, contractorFilter]);

  // Filter parking lots by search query
  const filteredParkingLots = parkingLots.filter((lot) => {
    const matchesSearch =
      searchQuery === "" ||
      lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.contractorId?.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[#e5e7eb] mb-2">
            Parking Lots
          </h1>
          <p className="text-gray-600 dark:text-[#9ca3af]">
            Manage and monitor all parking facilities
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsCreateSheetOpen(true)}
            // className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-[#4f46e5] dark:hover:bg-[#4338ca]"
          >
            <Plus className="w-5 h-5" />
            Create New
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#111316] rounded-lg shadow dark:shadow-none border border-gray-200 dark:border-[#2a2e37] p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-[#71717a] w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name, location, or contractor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-[#71717a] w-5 h-5" />
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
            >
              <SelectTrigger className="w-full pl-10 pr-4 py-2">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__placeholder__" disabled>All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contractor Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-[#71717a] w-5 h-5" />
            <Select
              value={contractorFilter}
              onValueChange={setContractorFilter}
            >
              <SelectTrigger className="w-full pl-10 pr-4 py-2">
                <SelectValue placeholder="All Contractors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__placeholder__" disabled>All Contractors</SelectItem>
                {contractors.map((contractor) => (
                  <SelectItem key={contractor._id} value={contractor._id}>
                    {contractor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mt-4 text-sm text-gray-600 dark:text-[#9ca3af]">
            Showing {filteredParkingLots.length} of {parkingLots.length} parking
            lot
            {parkingLots.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Parking Lots Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#111316] rounded-lg shadow dark:shadow-none border border-gray-200 dark:border-[#2a2e37] p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 dark:bg-[#2a2e37] rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-[#2a2e37] rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 dark:bg-[#2a2e37] rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-[#2a2e37] rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-[#7f1d1d]/20 border border-red-200 dark:border-[#f87171]/30 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-[#fca5a5]">{error}</p>
          <Button
            onClick={fetchParkingLots}
            className="mt-4 bg-red-600 hover:bg-red-700 dark:bg-[#dc2626] dark:hover:bg-[#b91c1c]"
          >
            Retry
          </Button>
        </div>
      ) : filteredParkingLots.length === 0 ? (
        <div className="bg-gray-50 dark:bg-[#181a1f] border border-gray-200 dark:border-[#2a2e37] rounded-lg p-12 text-center">
          <p className="text-gray-600 dark:text-[#9ca3af] mb-2">
            {searchQuery || statusFilter !== "all" || contractorFilter !== "all"
              ? "No parking lots match your filters"
              : "No parking lots found"}
          </p>
          <p className="text-sm text-gray-500 dark:text-[#71717a]">
            {isAdmin &&
            !searchQuery &&
            statusFilter === "all" &&
            contractorFilter === "all"
              ? "Create a parking lot to get started"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParkingLots.map((lot) => (
            <ParkingLotCard key={lot._id} lot={lot} />
          ))}
        </div>
      )}

      {/* Create Parking Lot Sheet */}
      <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-2xl overflow-y-auto bg-white dark:bg-[#111316] border-gray-200 dark:border-[#2a2e37]"
        >
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold text-gray-900 dark:text-[#e5e7eb]">
              Create New Parking Lot
            </SheetTitle>
            <SheetDescription className="text-gray-600 dark:text-[#9ca3af]">
              Add a new parking facility to the system
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 py-6">
            <ParkingLotForm
              mode="create"
              onSuccess={() => {
                setIsCreateSheetOpen(false);
                fetchParkingLots();
              }}
              onCancel={() => setIsCreateSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
