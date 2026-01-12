'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ContractorForm from '@/components/ContractorForm';

interface Contractor {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  contractDetails: {
    startDate: string;
    endDate: string;
    allocatedCapacity: number;
    penaltyPerViolation: number;
  };
  status: 'active' | 'suspended' | 'terminated';
}

export default function EditContractorPage() {
  const params = useParams();
  const router = useRouter();
  const contractorId = params.id as string;

  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContractor();
  }, [contractorId]);

  const fetchContractor = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/contractors/${contractorId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contractor not found');
        }
        throw new Error('Failed to fetch contractor details');
      }

      const result = await response.json();
      setContractor(result.data);
    } catch (err: any) {
      console.error('Error fetching contractor:', err);
      setError(err.message || 'Failed to load contractor details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading contractor details...</p>
        </div>
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="space-y-6">
        <Link
          href="/contractors"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contractors
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-12 text-center">
          <p className="text-red-800 mb-4">{error || 'Contractor not found'}</p>
          <button
            onClick={() => router.push('/contractors')}
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
          href={`/contractors/${contractorId}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contractor Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Contractor</h1>
        <p className="text-gray-600">Update contractor information and contract details</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <ContractorForm
          mode="edit"
          initialData={contractor}
          onSuccess={() => router.push(`/contractors/${contractorId}`)}
          onCancel={() => router.push(`/contractors/${contractorId}`)}
        />
      </div>
    </div>
  );
}
