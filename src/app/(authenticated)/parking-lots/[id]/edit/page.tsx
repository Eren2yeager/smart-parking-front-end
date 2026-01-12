'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ParkingLotForm from '@/components/ParkingLotForm';

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
  contractorId: string;
}

export default function EditParkingLotPage() {
  const params = useParams();
  const router = useRouter();
  const parkingLotId = params.id as string;

  const [parkingLot, setParkingLot] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchParkingLot();
  }, [parkingLotId]);

  const fetchParkingLot = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/parking-lots/${parkingLotId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Parking lot not found');
        }
        throw new Error('Failed to fetch parking lot details');
      }

      const result = await response.json();
      
      // Extract only the fields needed for the form
      const lotData = result.data;
      setParkingLot({
        _id: lotData._id,
        name: lotData.name,
        location: lotData.location,
        totalSlots: lotData.totalSlots,
        contractorId: typeof lotData.contractorId === 'object' ? lotData.contractorId._id : lotData.contractorId,
      });
    } catch (err: any) {
      console.error('Error fetching parking lot:', err);
      setError(err.message || 'Failed to load parking lot details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading parking lot details...</p>
        </div>
      </div>
    );
  }

  if (error || !parkingLot) {
    return (
      <div className="space-y-6">
        <Link
          href="/parking-lots"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Parking Lots
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-12 text-center">
          <p className="text-red-800 mb-4">{error || 'Parking lot not found'}</p>
          <button
            onClick={() => router.push('/parking-lots')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/parking-lots/${parkingLotId}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Parking Lot Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Parking Lot</h1>
        <p className="text-gray-600">Update parking lot information and settings</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <ParkingLotForm
          mode="edit"
          initialData={parkingLot}
          onSuccess={() => router.push(`/parking-lots/${parkingLotId}`)}
          onCancel={() => router.push(`/parking-lots/${parkingLotId}`)}
        />
      </div>
    </div>
  );
}
