'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Screen {
  id: string;
  name: string;
  group: string;
  imagePath?: string;
}

interface Picture {
  id: string;
  imagePath: string;
}

interface FormData {
  screenId: string;
  pictureId: string; // ID de l'image sélectionnée
}

const API_URL = 'http://localhost:9999';

export default function ScreenImages() {
  const [formData, setFormData] = useState<FormData>({
    screenId: '',
    pictureId: '', // Au départ, aucun ID d'image sélectionné
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [pictures, setPictures] = useState<Picture[]>([]); // Liste des images disponibles
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Pour l'aperçu de l'image
  const [error, setError] = useState<string | null>(null);

  const fetchScreens = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/screens`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setScreens(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching screens:", error.message);
        setError("Failed to load screens. Please try again later.");
      } else {
        console.error("An unknown error occurred", error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  }, []);

  const fetchPictures = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/pictures`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
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

  useEffect(() => {
    fetchScreens();
    fetchPictures();
  }, [fetchScreens, fetchPictures]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (name === "pictureId") {
      // Mettre à jour l'aperçu de l'image sélectionnée
      const selectedPicture = pictures.find((picture) => picture.id === value);
      setSelectedImage(selectedPicture ? `${API_URL}${selectedPicture.imagePath}` : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.screenId || !formData.pictureId) {
      alert('Please select a screen and an image');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('screenId', formData.screenId);
    formDataToSend.append('pictureId', formData.pictureId);

    try {
      const response = await fetch(`${API_URL}/screens/upload`, {
        method: 'POST',
        body: formDataToSend,
      });
      const data = await response.json();
      console.log('Server Response:', data);
      setIsModalOpen(false);
      fetchScreens();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error uploading image:', error.message);
        setError("Failed to upload image. Please try again later.");
      } else {
        console.error('An unknown error occurred', error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleDeleteImage = async (screenId: string) => {
    try {
      const response = await fetch(`${API_URL}/screens/${screenId}/image`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      fetchScreens(); // Recharger les écrans après la suppression
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error deleting image:', error.message);
        setError("Failed to delete image. Please try again later.");
      } else {
        console.error('An unknown error occurred', error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Configuration</h2>
      </div>
      <hr className="w-full border-t border-gray-300 mt-2" />

      <div className="flex justify-center mt-10">
        <div className="w-full max-w-7xl px-4">
          <div className="mb-4">
            <button
              className="bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600 cursor-pointer"
              onClick={toggleModal}
            >
              Add Image to Screen
            </button>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 flex justify-center items-center z-50">
              <div className="absolute inset-0 backdrop-blur-md z-10"></div>
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg z-20">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Add Image to Screen</h3>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium">Select Screen:</label>
                    <select
                      name="screenId"
                      onChange={handleChange}
                      className="mt-2 p-2 border border-gray-300 rounded-md w-full"
                    >
                      <option value="">Select a screen</option>
                      {screens.map((screen) => (
                        <option key={screen.id} value={screen.id}>
                          {screen.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium">Choose Image:</label>
                    <select
                      name="pictureId"
                      onChange={handleChange}
                      className="mt-2 p-2 border border-gray-300 rounded-md w-full"
                    >
                      <option value="">Select an image</option>
                      {pictures.map((picture) => (
                        <option key={picture.id} value={picture.id}>
                          {picture.id} - {picture.imagePath}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedImage && (
                    <div className="mb-4">
                      <h4 className="text-gray-700 font-medium">Selected Image:</h4>
                      <Image
                        src={selectedImage}
                        alt="Selected"
                        width={200}
                        height={200}
                        className="mt-2 max-w-full h-auto rounded-md border-2 border-gray-200 shadow-sm"
                      />
                    </div>
                  )}
                  <div className="flex justify-between space-x-2">
                    <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={toggleModal}
                      className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 transition"
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
            <table className="w-full bg-white rounded-lg shadow-md overflow-hidden border-separate border-spacing-0">
              <thead className="bg-gray-100 text-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">ID</th>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Group</th>
                  <th className="px-6 py-4 text-left font-semibold">Image</th>
                  <th className="px-6 py-4 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {screens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">No screens available</td>
                  </tr>
                ) : (
                  screens.map((screen) => (
                    <tr key={screen.id} className="hover:bg-gray-50 transition-all duration-100">
                      <td className="px-6 py-4">{screen.id}</td>
                      <td className="px-6 py-4">{screen.name}</td>
                      <td className="px-6 py-4">{screen.group}</td>
                      <td className="px-6 py-4">
                        {screen.imagePath ? (
                          <Image
                            src={`${API_URL}${screen.imagePath}`}
                            alt={`Image for ${screen.name}`}
                            width={100}
                            height={100}
                            className="w-16 h-16 object-cover"
                          />
                        ) : (
                          'No Image'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {screen.imagePath && (
                          <button
                            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 cursor-pointer"
                            onClick={() => handleDeleteImage(screen.id)}
                          >
                            Delete Image
                          </button>
                        )}
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
