'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ContractorForm from '@/components/ContractorForm';

export default function NewContractorPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/contractors"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contractors
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Contractor</h1>
        <p className="text-gray-600">Add a new contractor to manage parking lots</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <ContractorForm
          mode="create"
          onSuccess={() => router.push('/contractors')}
          onCancel={() => router.push('/contractors')}
        />
      </div>
    </div>
  );
}
