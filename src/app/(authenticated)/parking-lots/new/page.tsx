'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ParkingLotForm from '@/components/ParkingLotForm';

export default function NewParkingLotPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/parking-lots');
  };

  const handleCancel = () => {
    router.push('/parking-lots');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/parking-lots"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Parking Lots
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Parking Lot</h1>
        <p className="text-gray-600">Add a new parking facility to the system</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <ParkingLotForm mode="create" onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
