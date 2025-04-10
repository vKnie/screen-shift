'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Picture {
  id: string;
  imagePath: string;
  status: string;
  delay: number;
  startDate: string;
  endDate: string;
  backgroundColor: string;
}

interface FormData {
  image: File | null;
  delay: number;
  startDate: string;
  endDate: string;
  backgroundColor: string;
}

const API_URL = 'http://localhost:9999';

export default function Pictures() {
  const [formData, setFormData] = useState<FormData>({
    image: null,
    delay: 0,
    startDate: '',
    endDate: '',
    backgroundColor: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchPictures();
  }, [fetchPictures]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'file' && files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image || !formData.backgroundColor) {
      alert('Please select an image and a background color');
      return;
    }

    const formDataToSend = new FormData();
    if (formData.image) formDataToSend.append('image', formData.image as Blob);
    formDataToSend.append('delay', String(formData.delay || ''));
    formDataToSend.append('startDate', formData.startDate || '');
    formDataToSend.append('endDate', formData.endDate || '');
    formDataToSend.append('backgroundColor', formData.backgroundColor || '');

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formDataToSend,
      });
      const data = await response.json();
      console.log('Server Response:', data);
      setIsModalOpen(false);
      fetchPictures();
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

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/pictures/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      fetchPictures();
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

  const formFields = [
    { label: 'Choose Image', type: 'file', name: 'image', accept: 'image/*' },
    { label: 'Delay (seconds)', type: 'number', name: 'delay' },
    { label: 'Start Date', type: 'date', name: 'startDate' },
    { label: 'End Date', type: 'date', name: 'endDate' },
    { label: 'Background Color', type: 'color', name: 'backgroundColor' },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Pictures</h2>
      </div>
      <hr className="w-full border-t border-gray-300 mt-2" />

      <div className="flex justify-center mt-10">
        <div className="w-full max-w-7xl px-4">
          <div className="mb-4">
            <button
              className="bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600 cursor-pointer"
              onClick={toggleModal}
            >
              Add Picture
            </button>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 flex justify-center items-center z-50">
              <div className="absolute inset-0 backdrop-blur-md z-10"></div>
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg z-20">
                <h3 className="text-xl font-semibold mb-4">Add a New Picture</h3>
                <form onSubmit={handleSubmit}>
                  {formFields.map(({ label, type, name, accept }) => (
                    <div key={name} className="mb-4">
                      <label className="block text-gray-700">{label}:</label>
                      <input
                        type={type}
                        name={name}
                        accept={accept}
                        onChange={handleChange}
                        className="mt-1 p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between space-x-2">
                    <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 cursor-pointer">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={toggleModal}
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
            <table className="w-full bg-white rounded-lg shadow-md overflow-hidden border-separate border-spacing-0">
              <thead className="bg-gray-100 text-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Image</th>
                  <th className="px-6 py-4 text-left font-semibold">Status</th>
                  <th className="px-6 py-4 text-left font-semibold">Delay</th>
                  <th className="px-6 py-4 text-left font-semibold">Start Date</th>
                  <th className="px-6 py-4 text-left font-semibold">End Date</th>
                  <th className="px-6 py-4 text-left font-semibold">Background Color</th>
                  <th className="px-6 py-4 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {pictures.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">No pictures available</td>
                  </tr>
                ) : (
                  pictures.map((picture) => (
                    <tr key={picture.id} className="hover:bg-gray-50 transition-all duration-100">
                      <td className="px-6 py-4">{picture.imagePath}</td>
                      <td className="px-6 py-4">
                        <div className="relative group">
                          <Image
                            src={`${API_URL}${picture.imagePath}`}
                            alt="Uploaded"
                            width={100}
                            height={100}
                            className="w-16 rounded-md h-16 object-cover transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">{picture.status}</td>
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
                        <button
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 cursor-pointer"
                          onClick={() => handleDelete(picture.id)}
                        >
                          Delete
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
