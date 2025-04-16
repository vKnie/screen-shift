'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Picture {
  id: string;
  imagePath: string;
  status?: string;
  delay: number;
  startDate: string;
  endDate: string;
  backgroundColor: string;
}

interface Group {
  id: string;
  name: string;
  pictures: string[];
}

interface FormData {
  image: File | null;
  delay: number;
  startDate: string;
  endDate: string;
  backgroundColor: string;
  groupIds: string[]; // IDs des groupes auxquels cette image appartient
}

const API_URL = process.env.NEXT_PUBLIC_EXPRESS_API_URL;

export default function Pictures() {
  const [formData, setFormData] = useState<FormData>({
    image: null,
    delay: 0,
    startDate: '',
    endDate: '',
    backgroundColor: '',
    groupIds: [],
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPictureId, setEditingPictureId] = useState<string | null>(null);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [picturesByGroup, setPicturesByGroup] = useState<{[key: string]: Picture[]}>({});

  // Récupérer les images
  const fetchPictures = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/pictures`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON, but received something else");
      }

      const data = await response.json();
      setPictures(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching pictures:", error.message);
        setError("Failed to load pictures. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  }, []);

  // Récupérer les groupes
  const fetchGroups = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/groups`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setGroups(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching groups:", error.message);
        setError("Failed to load groups. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  }, []);

  // Récupérer les images groupées par groupe
  const fetchPicturesByGroups = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/groups/pictures/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setPicturesByGroup(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching pictures by groups:", error.message);
        setError("Failed to load pictures by groups. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  }, []);

  useEffect(() => {
    fetchPictures();
    fetchGroups();
    fetchPicturesByGroups();
  }, [fetchPictures, fetchGroups, fetchPicturesByGroups]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, files } = e.target as HTMLInputElement;
    
    if (name === 'groupIds' && type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      const groupId = checkbox.value;
      
      setFormData((prevData) => {
        const groupIds = [...prevData.groupIds];
        if (checkbox.checked) {
          groupIds.push(groupId);
        } else {
          const index = groupIds.indexOf(groupId);
          if (index !== -1) {
            groupIds.splice(index, 1);
          }
        }
        return { ...prevData, groupIds };
      });
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: type === 'file' && files ? files[0] : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode && (!formData.image || !formData.backgroundColor)) {
      alert('Please select an image and a background color');
      return;
    }

    const formDataToSend = new FormData();
    if (formData.image) formDataToSend.append('image', formData.image as Blob);
    formDataToSend.append('delay', String(formData.delay || ''));
    formDataToSend.append('startDate', formData.startDate || '');
    formDataToSend.append('endDate', formData.endDate || '');
    formDataToSend.append('backgroundColor', formData.backgroundColor || '');
    formDataToSend.append('groups', JSON.stringify(formData.groupIds));

    try {
      if (isEditMode && editingPictureId) {
        // Update existing picture
        const response = await fetch(`${API_URL}/pictures/${editingPictureId}`, {
          method: 'PUT',
          body: formDataToSend,
        });
        const data = await response.json();
        console.log('Server Response (Edit):', data);
      } else {
        // Create new picture
        const response = await fetch(`${API_URL}/pictures/upload`, {
          method: 'POST',
          body: formDataToSend,
        });
        const data = await response.json();
        console.log('Server Response (Add):', data);
      }
      
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingPictureId(null);
      resetForm();
      fetchPictures();
      fetchPicturesByGroups();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error with picture:', error.message);
        setError(`Failed to ${isEditMode ? 'update' : 'upload'} image. Please try again later.`);
      } else {
        console.error('An unknown error occurred', error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      image: null,
      delay: 0,
      startDate: '',
      endDate: '',
      backgroundColor: '',
      groupIds: [],
    });
  };

  const toggleModal = (edit = false, picture?: Picture) => {
    if (edit && picture) {
      // Trouver les groupes associés avec cette image
      const associatedGroupIds = groups
        .filter(group => group.pictures && group.pictures.includes(picture.id))
        .map(group => group.id);
      
      setIsEditMode(true);
      setEditingPictureId(picture.id);
      setFormData({
        image: null,
        delay: picture.delay,
        startDate: picture.startDate,
        endDate: picture.endDate,
        backgroundColor: picture.backgroundColor,
        groupIds: associatedGroupIds,
      });
    } else {
      setIsEditMode(false);
      setEditingPictureId(null);
      resetForm();
    }
    setIsModalOpen(!isModalOpen);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/pictures/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      fetchPictures();
      fetchPicturesByGroups();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error deleting picture:', error.message);
        setError("Failed to delete picture. Please try again later.");
      } else {
        console.error('An unknown error occurred', error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  // Obtenir les images à afficher selon le groupe sélectionné
  const getFilteredPictures = () => {
    if (selectedGroup === 'all') {
      return pictures;
    }
    
    const group = groups.find(g => g.id === selectedGroup);
    if (!group) return [];
    
    // Retourner les images de ce groupe depuis le picturesByGroup
    return picturesByGroup[group.name] || [];
  };

  // Obtenir les groupes associés à une image
  const getAssociatedGroups = (pictureId: string) => {
    return groups
      .filter(group => group.pictures && group.pictures.includes(pictureId))
      .map(group => group.name)
      .join(', ');
  };

  const formFields = [
    ...(isEditMode ? [] : [{ label: 'Choose Image', type: 'file', name: 'image', accept: 'image/*' }]),
    { label: 'Delay (seconds)', type: 'number', name: 'delay' },
    { label: 'Start Date', type: 'date', name: 'startDate' },
    { label: 'End Date', type: 'date', name: 'endDate' },
    { label: 'Background Color', type: 'color', name: 'backgroundColor' },
  ];

  const filteredPictures = getFilteredPictures();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Pictures</h2>
      </div>
      <hr className="w-full border-t border-gray-300 mt-2" />

      <div className="flex justify-center mt-10">
        <div className="w-full max-w-8xl px-4">
          <div className="mb-4 flex justify-between items-center">
            <button
              className="bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600 cursor-pointer"
              onClick={() => toggleModal()}
            >
              Add Picture
            </button>

            <div className="flex items-center space-x-2">
              <label htmlFor="groupFilter" className="text-gray-700">Filter by Group:</label>
              <select
                id="groupFilter"
                className="p-2 border border-gray-300 rounded-md"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="all">All Groups</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 flex justify-center items-center z-50">
              <div className="absolute inset-0 backdrop-blur-md z-10"></div>
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg z-20">
                <h3 className="text-xl font-semibold mb-4">
                  {isEditMode ? 'Edit Picture' : 'Add a New Picture'}
                </h3>
                <form onSubmit={handleSubmit}>
                  {formFields.map(({ label, type, name, accept }) => (
                    <div key={name} className="mb-4">
                      <label className="block text-gray-700">{label}:</label>
                      <input
                        type={type}
                        name={name}
                        accept={accept}
                        value={type !== 'file' ? formData[name as keyof FormData] as string : undefined}
                        onChange={handleChange}
                        className="mt-1 p-2 border border-gray-300 rounded-md w-full"
                      />
                    </div>
                  ))}
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Assign to Groups:</label>
                    <div className="max-h-40 overflow-y-auto p-2 border border-gray-300 rounded-md">
                      {groups.map(group => (
                        <div key={group.id} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`group-${group.id}`}
                            name="groupIds"
                            value={group.id}
                            checked={formData.groupIds.includes(group.id)}
                            onChange={handleChange}
                            className="mr-2"
                          />
                          <label htmlFor={`group-${group.id}`}>{group.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between space-x-2">
                    <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 cursor-pointer">
                      {isEditMode ? 'Update' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleModal()}
                      className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {error && <p className="text-red-500">{error}</p>}

          <div className="flex justify-center">
            <table className="w-full shadow-md border-separate border-spacing-0 rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <thead className="bg-gray-100 text-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Image</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-left font-semibold">Delay</th>
                  <th className="px-6 py-4 text-left font-semibold">Start Date</th>
                  <th className="px-6 py-4 text-left font-semibold">End Date</th>
                  <th className="px-6 py-4 text-left font-semibold">Background Color</th>
                  <th className="px-6 py-4 text-left font-semibold">Groups</th>
                  <th className="px-6 py-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {filteredPictures.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">No pictures available</td>
                  </tr>
                ) : (
                  filteredPictures.map((picture) => (
                    <tr key={picture.id} className="hover:bg-gray-50 transition-all duration-100">
                      <td className="px-6 py-4">{picture.imagePath.split('/').pop()}</td>
                      <td className="px-6 py-4">
                        <div className="relative group">
                          <Image
                            src={`${API_URL}${picture.imagePath}`}
                            alt="Uploaded"
                            width={100}
                            height={100}
                            className="rounded-md object-cover w-20 h-16 hover:scale-110 transition hover:rotate-3 duration-300"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">{picture.status || 'Active'}</td>
                      <td className="px-6 py-4">{picture.delay}</td>
                      <td className="px-6 py-4">{picture.startDate}</td>
                      <td className="px-6 py-4">{picture.endDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div
                            style={{ width: 20, height: 20, backgroundColor: picture.backgroundColor }}
                            className="inline-block rounded-full"
                          ></div>
                          <div className="ml-1">{picture.backgroundColor}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getAssociatedGroups(picture.id) || 'None'}
                      </td>
                      <td className="px-6 py-4 flex justify-center">
                        <button
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 cursor-pointer mt-3"
                          onClick={() => handleDelete(picture.id)}
                        >
                          Delete
                        </button>
                        <button
                          className="bg-orange-400 text-white px-4 py-2 rounded-md hover:bg-orange-500 cursor-pointer ml-2 mt-3"
                          onClick={() => toggleModal(true, picture)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}