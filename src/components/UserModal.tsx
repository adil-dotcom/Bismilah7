import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DraggableModal from './DraggableModal';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => void;
  initialData?: any;
}

export default function UserModal({ isOpen, onClose, onSubmit, initialData }: UserModalProps) {
  const { hasPermission } = useAuth();
  const [userData, setUserData] = useState({
    username: initialData?.username || '',
    password: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    name: initialData?.name || '',
    role: initialData?.role || 'secretaire',
    customRole: '',
    specialite: initialData?.specialite || ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [savedRoles, setSavedRoles] = useState<string[]>(() => {
    const saved = localStorage.getItem('savedRoles');
    return saved ? JSON.parse(saved) : ['admin', 'docteur', 'secretaire'];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingPassword) {
      if (userData.newPassword !== userData.confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        return;
      }
      onSubmit({
        ...userData,
        password: userData.newPassword
      });
    } else {
      if (userData.customRole && !savedRoles.includes(userData.customRole)) {
        const newRoles = [...savedRoles, userData.customRole];
        setSavedRoles(newRoles);
        localStorage.setItem('savedRoles', JSON.stringify(newRoles));
      }

      onSubmit({
        ...userData,
        role: userData.customRole || userData.role
      });
    }

    setUserData({
      username: '',
      password: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      name: '',
      role: 'secretaire',
      customRole: '',
      specialite: ''
    });
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
      className="w-full max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rest of the form content remains the same */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Nom complet
            </div>
          </label>
          <input
            type="text"
            value={userData.name}
            onChange={(e) => setUserData({...userData, name: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        {/* Add the rest of your form fields here */}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {initialData ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
}