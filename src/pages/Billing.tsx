import React, { useState, useMemo } from 'react';
import { Search, Download, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppointments } from '../contexts/AppointmentContext';
import { useData } from '../contexts/DataContext';
import { formatters } from '../utils/formatters';
import { parseISO, differenceInDays, differenceInMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ExportOptionsModal from '../components/ExportOptionsModal';

export default function Billing() {
  const { hasPermission } = useAuth();
  const { appointments, updateAppointment } = useAppointments();
  const { patients } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    [key: string]: {
      amount: string;
      status: string;
      paymentMethod: string;
      mutuelle: { active: boolean; nom: string };
    };
  }>({});

  const getPaymentStatus = (amount: string | undefined): string => {
    if (!amount || amount === '0' || amount === '0,00') {
      return 'Contrôle';
    }
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (numAmount === 0) {
      return 'Contrôle';
    }
    if (numAmount < 400) {
      const reductionPercent = ((400 - numAmount) / 400 * 100).toFixed(0);
      return `Réduction ${reductionPercent}%`;
    }
    return 'Payé';
  };

  const getStatusOptions = (amount: string | undefined): string[] => {
    if (!amount || amount === '0' || amount === '0,00') {
      return ['Contrôle', 'Non payé', 'Gratuit'];
    }
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (numAmount === 0) {
      return ['Contrôle', 'Non payé', 'Gratuit'];
    }
    return [getPaymentStatus(amount)];
  };

  const getStatusColor = (status: string): string => {
    if (status === 'Contrôle' || status === 'Non payé' || status === 'Gratuit') {
      return 'bg-gray-100 text-gray-800';
    }
    if (status.includes('Réduction')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const paidAppointments = useMemo(() => {
    return appointments
      .filter(apt => {
        const patient = patients.find(p => p.id === apt.patientId);
        return patient !== undefined;
      })
      .map(apt => {
        const patient = patients.find(p => p.id === apt.patientId);
        return {
          ...apt,
          patientDetails: patient,
          status: getPaymentStatus(apt.amount)
        };
      })
      .sort((a, b) => parseISO(b.time).getTime() - parseISO(a.time).getTime());
  }, [appointments, patients]);

  const filteredAppointments = useMemo(() => {
    return paidAppointments.filter(apt => {
      const searchTerms = searchTerm.toLowerCase().split(' ');
      
      const searchableContent = [
        apt.patientDetails?.numeroPatient,
        apt.patientDetails?.nom,
        apt.patientDetails?.prenom,
        apt.amount,
        apt.status,
        apt.paymentMethod,
        apt.mutuelle?.nom
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = searchTerms.every(term => {
        if (term.startsWith('*') && term.endsWith('*')) {
          const searchPattern = term.slice(1, -1).toLowerCase();
          return searchPattern ? searchableContent.includes(searchPattern) : true;
        }
        return searchableContent.includes(term);
      });
      
      if (!dateRange.startDate || !dateRange.endDate) return matchesSearch;

      const aptDate = parseISO(apt.time);
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const matchesDate = aptDate >= start && aptDate <= end;
      
      return matchesSearch && matchesDate;
    });
  }, [paidAppointments, searchTerm, dateRange]);

  const patientsWithMutuelle = useMemo(() => {
    return filteredAppointments.filter(apt => apt.patientDetails?.mutuelle?.active).length;
  }, [filteredAppointments]);

  const formatLastConsultation = (lastConsultAmount: string, consultationDate: string) => {
    if (!lastConsultAmount || lastConsultAmount === '0' || lastConsultAmount === '0,00') {
      return '-';
    }

    const date = parseISO(consultationDate);
    const now = new Date();
    const monthsDiff = differenceInMonths(now, date);
    const daysDiff = differenceInDays(now, date);

    let timeText;
    if (monthsDiff < 1) {
      timeText = daysDiff <= 1 ? '1 jour' : `${daysDiff} jours`;
    } else {
      timeText = monthsDiff === 1 ? '1 mois' : `${monthsDiff} mois`;
    }

    return `${formatters.amount(lastConsultAmount)} - depuis ${timeText}`;
  };

  const handleEdit = (appointmentId: string) => {
    const appointment = paidAppointments.find(apt => apt.id === appointmentId);
    if (appointment) {
      setEditingAppointment(appointmentId);
      setEditValues({
        [appointmentId]: {
          amount: appointment.amount || '0,00',
          status: appointment.status || getPaymentStatus(appointment.amount),
          paymentMethod: appointment.paymentMethod || '-',
          mutuelle: appointment.mutuelle || { active: false, nom: '' }
        }
      });
    }
  };

  const handleSave = (appointmentId: string) => {
    const editValue = editValues[appointmentId];
    if (editValue) {
      const numAmount = parseFloat(editValue.amount.replace(',', '.'));
      const status = numAmount === 0 ? editValue.status : getPaymentStatus(editValue.amount);
      
      updateAppointment(appointmentId, {
        amount: editValue.amount || '0,00',
        status,
        paymentMethod: editValue.paymentMethod,
        mutuelle: editValue.mutuelle
      });
      setEditingAppointment(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Paiement</h2>
        {hasPermission('export_data') && (
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="h-5 w-5 mr-2" />
            Exporter
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Rechercher (utilisez * pour une recherche partielle)..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                />
                <span className="text-gray-500">à</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                />
              </div>
            </div>
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
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type de paiement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mutuelle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière consultation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => {
                const isEditing = editingAppointment === appointment.id;
                const editValue = editValues[appointment.id] || {
                  amount: appointment.amount || '0,00',
                  status: appointment.status || getPaymentStatus(appointment.amount),
                  paymentMethod: appointment.paymentMethod || '-',
                  mutuelle: appointment.mutuelle || { active: false, nom: '' }
                };

                return (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatters.patientNumber(appointment.patientDetails?.numeroPatient)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {`${appointment.patientDetails?.nom.toUpperCase()} ${appointment.patientDetails?.prenom}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(appointment.time), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue.amount}
                          onChange={(e) => {
                            const newAmount = e.target.value;
                            setEditValues({
                              ...editValues,
                              [appointment.id]: { 
                                ...editValue, 
                                amount: newAmount,
                                status: getPaymentStatus(newAmount)
                              }
                            });
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="0,00"
                        />
                      ) : (
                        formatters.amount(appointment.amount || '0,00')
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing && parseFloat(editValue.amount.replace(',', '.')) === 0 ? (
                        <select
                          value={editValue.status}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            [appointment.id]: { ...editValue, status: e.target.value }
                          })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          {getStatusOptions(editValue.amount).map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(editValue.status)}`}>
                          {editValue.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <select
                          value={editValue.paymentMethod}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            [appointment.id]: { ...editValue, paymentMethod: e.target.value }
                          })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="Carte Bancaire">Carte Bancaire</option>
                          <option value="Espèces">Espèces</option>
                          <option value="Virement">Virement</option>
                          <option value="Chèque">Chèque</option>
                          <option value="-">-</option>
                        </select>
                      ) : (
                        appointment.paymentMethod || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.patientDetails?.mutuelle?.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {appointment.patientDetails?.mutuelle?.active 
                          ? `Oui - ${appointment.patientDetails.mutuelle.nom}`
                          : 'Non'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatLastConsultation(appointment.lastConsultAmount, appointment.time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <button
                          onClick={() => handleSave(appointment.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Enregistrer
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEdit(appointment.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={() => setShowExportModal(false)}
        totalPatients={filteredAppointments.length}
        patientsWithMutuelle={patientsWithMutuelle}
        filteredData={filteredAppointments}
        dateRange={dateRange}
      />
    </div>
  );
}