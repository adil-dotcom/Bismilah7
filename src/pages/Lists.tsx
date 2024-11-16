import React, { useState } from 'react';
import { Plus, Save, Trash2, Upload, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';
import ContentEditable from 'react-contenteditable';

interface ListItem {
  id: string;
  value: string;
}

interface ListSection {
  id: string;
  title: string;
  items: ListItem[];
}

const normalizeString = (str: string): string => {
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export default function Lists() {
  const [sections, setSections] = useState<ListSection[]>(() => {
    const saved = localStorage.getItem('listSections');
    return saved ? JSON.parse(saved) : [
      {
        id: 'types',
        title: 'Types de consultation',
        items: []
      },
      {
        id: 'sources',
        title: 'Sources du rendez-vous',
        items: []
      },
      {
        id: 'cities',
        title: 'Villes',
        items: []
      },
      {
        id: 'mutuelles',
        title: 'Mutuelles',
        items: []
      },
      {
        id: 'antecedents',
        title: 'Antécédents médicaux',
        items: []
      },
      {
        id: 'roles',
        title: 'Rôles utilisateur',
        items: []
      }
    ];
  });

  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [editingTitle, setEditingTitle] = useState<string | null>(null);

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const titles = jsonData[0] as string[];
      const values = jsonData.slice(1) as string[][];

      setSections(prevSections => {
        const updatedSections = [...prevSections];

        titles.forEach((title, columnIndex) => {
          if (!title) return;

          const normalizedTitle = normalizeString(title);
          let targetSection = updatedSections.find(
            section => normalizeString(section.title) === normalizedTitle
          );

          const columnItems = values
            .map(row => row[columnIndex])
            .filter(Boolean)
            .map(value => value.trim())
            .filter(value => value.length > 0);

          if (targetSection) {
            const existingValues = new Set(
              targetSection.items.map(item => normalizeString(item.value))
            );

            const newItems = columnItems
              .filter(value => !existingValues.has(normalizeString(value)))
              .map(value => ({
                id: `${Date.now()}-${Math.random()}`,
                value
              }));

            targetSection.items = [...targetSection.items, ...newItems];
          } else {
            const uniqueItems = Array.from(new Set(columnItems)).map(value => ({
              id: `${Date.now()}-${Math.random()}`,
              value
            }));

            updatedSections.push({
              id: `${Date.now()}-${columnIndex}`,
              title,
              items: uniqueItems
            });
          }
        });

        localStorage.setItem('listSections', JSON.stringify(updatedSections));
        return updatedSections;
      });

      event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddItem = (sectionId: string) => {
    const newValue = newItems[sectionId]?.trim();
    if (!newValue) return;

    setSections(prevSections => {
      const updatedSections = prevSections.map(section => {
        if (section.id === sectionId) {
          const normalizedNewValue = normalizeString(newValue);
          const exists = section.items.some(item => 
            normalizeString(item.value) === normalizedNewValue
          );

          if (!exists) {
            const newItem = { id: `${Date.now()}-${Math.random()}`, value: newValue };
            return { ...section, items: [...section.items, newItem] };
          }
        }
        return section;
      });

      localStorage.setItem('listSections', JSON.stringify(updatedSections));
      return updatedSections;
    });

    setNewItems(prev => ({ ...prev, [sectionId]: '' }));
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    setSections(prevSections => {
      const updatedSections = prevSections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: section.items.filter(item => item.id !== itemId)
          };
        }
        return section;
      });

      localStorage.setItem('listSections', JSON.stringify(updatedSections));
      return updatedSections;
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections(prevSections => {
      const updatedSections = prevSections.filter(section => section.id !== sectionId);
      localStorage.setItem('listSections', JSON.stringify(updatedSections));
      return updatedSections;
    });
  };

  const handleEditTitle = (sectionId: string, newTitle: string) => {
    setSections(prevSections => {
      const updatedSections = prevSections.map(section => {
        if (section.id === sectionId) {
          return { ...section, title: newTitle };
        }
        return section;
      });

      localStorage.setItem('listSections', JSON.stringify(updatedSections));
      return updatedSections;
    });
    setEditingTitle(null);
  };

  const handleEditItem = (sectionId: string, itemId: string, newValue: string) => {
    setSections(prevSections => {
      const updatedSections = prevSections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: section.items.map(item => 
              item.id === itemId ? { ...item, value: newValue } : item
            )
          };
        }
        return section;
      });

      localStorage.setItem('listSections', JSON.stringify(updatedSections));
      return updatedSections;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Listes déroulantes</h2>
        <label className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">
          <Upload className="h-5 w-5 mr-2" />
          Importer liste
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map(section => (
          <div key={section.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              {editingTitle === section.id ? (
                <ContentEditable
                  html={section.title}
                  onChange={(e) => handleEditTitle(section.id, e.target.value)}
                  onBlur={() => setEditingTitle(null)}
                  className="text-lg font-medium text-gray-900 border-b border-indigo-500 focus:outline-none"
                />
              ) : (
                <h3 
                  className="text-lg font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                  onClick={() => setEditingTitle(section.id)}
                >
                  {section.title}
                </h3>
              )}
              <button
                onClick={() => handleDeleteSection(section.id)}
                className="text-red-600 hover:text-red-800"
                title="Supprimer la liste"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={newItems[section.id] || ''}
                onChange={(e) => setNewItems(prev => ({
                  ...prev,
                  [section.id]: e.target.value
                }))}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Ajouter un élément..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem(section.id);
                  }
                }}
              />
              <button
                onClick={() => handleAddItem(section.id)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-2">
              {section.items.map(item => (
                <li 
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                >
                  <ContentEditable
                    html={item.value}
                    onChange={(e) => handleEditItem(section.id, item.id, e.target.value)}
                    className="text-sm text-gray-700 focus:outline-none"
                  />
                  <button
                    onClick={() => handleDeleteItem(section.id, item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}