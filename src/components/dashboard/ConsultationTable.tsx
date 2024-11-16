import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UserPlus, Check, X, AlertCircle } from 'lucide-react';
import { formatters } from '../../utils/formatters';
import { useData } from '../../contexts/DataContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConsultationTableProps {
  visits: Array<{
    id: string;
    time: string;
    patient: string;
    patientId?: string;
    amount: string;
    paid: boolean;
    paymentMethod: string;
    isDelegue: boolean;
    isGratuite: boolean;
    isNewPatient: boolean;
    isCanceled: boolean;
  }>;
}

export default function ConsultationTable({ visits }: ConsultationTableProps) {
  const { 
    patients, 
    getLastConsultation, 
    isNewPatient, 
    getConsultationCount 
  } = useData();

  const getPatientDetails = (patientId: string | undefined, patientName: string) => {
    if (!patientId) {
      const [nom, prenom] = patientName.split(' ');
      return {
        numeroPatient: '-',
        nom: nom || '',
        prenom: prenom || '',
        isNewPatient: true,
        lastConsultAmount: '-',
        consultationCount: 0,
        mutuelle: null
      };
    }

    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      return {
        numeroPatient: '-',
        nom: '',
        prenom: '',
        isNewPatient: true,
        lastConsultAmount: '-',
        consultationCount: 0,
        mutuelle: null
      };
    }

    const lastConsultation = getLastConsultation(patientId);
    const consultationCount = getConsultationCount(patientId);
    const isNewPatientStatus = isNewPatient(patientId);

    return {
      numeroPatient: patient.numeroPatient,
      nom: patient.nom,
      prenom: patient.prenom,
      isNewPatient: isNewPatientStatus,
      lastConsultAmount: lastConsultation?.amount || '-',
      consultationCount,
      mutuelle: patient.mutuelle
    };
  };

  const getPaymentStatus = (visit: ConsultationTableProps['visits'][0], amount: string) => {
    if (visit.isCanceled) {
      return {
        status: 'Annulé',
        className: 'bg-red-100 text-red-800',
        icon: <X className="h-4 w-4 mr-1" />
      };
    }

    if (visit.isGratuite || visit.isDelegue) {
      return {
        status: 'Gratuit',
        className: 'bg-gray-100 text-gray-800',
        icon: <Check className="h-4 w-4 mr-1" />
      };
    }

    // Calcul de la réduction si le montant est inférieur à 400
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (numAmount > 0 && numAmount < 400) {
      const reductionPercent = ((400 - numAmount) / 400 * 100).toFixed(0);
      return {
        status: `Réduction ${reductionPercent}%`,
        className: 'bg-yellow-100 text-yellow-800',
        icon: null
      };
    }

    if (visit.paid) {
      return {
        status: 'Payé',
        className: 'bg-green-100 text-green-800',
        icon: <Check className="h-4 w-4 mr-1" />
      };
    }

    return {
      status: 'En attente',
      className: 'bg-yellow-100 text-yellow-800',
      icon: <AlertCircle className="h-4 w-4 mr-1" />
    };
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Consultations du {format(new Date(), 'd MMMM yyyy', { locale: fr })}
          </h3>
          <Link
            to="/appointments"
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-900"
          >
            Voir l'agenda
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                N° Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Heure
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ancien patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant dernière consultation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paiement
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visits.map((visit) => {
              const patientDetails = getPatientDetails(visit.patientId, visit.patient);
              const paymentStatus = getPaymentStatus(visit, visit.amount);

              return (
                <tr key={visit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {visit.isCanceled ? '-' : formatters.patientNumber(patientDetails.numeroPatient)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(parseISO(visit.time), 'HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {!visit.isCanceled && patientDetails.isNewPatient && (
                        <UserPlus className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium">
                        {patientDetails.nom.toUpperCase()} {patientDetails.prenom}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {visit.isCanceled ? '-' : (!patientDetails.isNewPatient ? 'Oui' : 'Non')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {visit.isCanceled ? '-' : formatters.amount(patientDetails.lastConsultAmount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatters.amount(visit.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatus.className}`}>
                      {paymentStatus.icon}
                      {paymentStatus.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {visit.isGratuite || visit.isDelegue ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Gratuit
                        </span>
                      ) : visit.paid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {visit.paymentMethod}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          En attente
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}