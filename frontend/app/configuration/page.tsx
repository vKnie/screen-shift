'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Import Link pour la navigation
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'; // Import de l'icône external link

interface Screen {
  id: string;
  name: string;
  group: string;
  lsimg: string[];
}

interface Group {
  id: string;
  name: string;
  pictures: string[];
}

interface Picture {
  id: string;
  imagePath: string;
}

interface FormData {
  screenId: string;
  pictureId: string;
}

const API_URL = process.env.NEXT_PUBLIC_EXPRESS_API_URL;

export default function ScreenImages() {
  const [formData, setFormData] = useState<FormData>({
    screenId: '',
    pictureId: '',
  });
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // État pour le filtrage des images par groupe
  const [selectedFilterGroup, setSelectedFilterGroup] = useState<string>("all");

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
    fetchGroups();
    fetchPictures();
  }, [fetchScreens, fetchGroups, fetchPictures]);

  const handleOpenModal = (screenId: string) => {
    setSelectedScreenId(screenId);
    setFormData({
      screenId: screenId,
      pictureId: '',
    });
    setSelectedImage(null);
    setSelectedFilterGroup("all");
    setIsModalOpen(true);
  };

  const handleImageClick = (pictureId: string) => {
    setFormData(prevData => ({
      ...prevData,
      pictureId: pictureId
    }));
    
    const selectedPicture = pictures.find((picture) => picture.id === pictureId);
    setSelectedImage(selectedPicture ? `${API_URL}${selectedPicture.imagePath}` : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.screenId || !formData.pictureId) {
      alert('Please select an image');
      return;
    }

    const currentScreen = screens.find(screen => screen.id === formData.screenId);
    if (!currentScreen) {
      setError("Screen not found");
      return;
    }

    if (currentScreen.lsimg.includes(formData.pictureId)) {
      alert('This image is already associated with this screen');
      return;
    }

    const updatedLsimg = [...currentScreen.lsimg, formData.pictureId];

    try {
      const response = await fetch(`${API_URL}/screens/${formData.screenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lsimg: updatedLsimg }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server Response:', data);
      setIsModalOpen(false);
      fetchScreens();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error adding image to screen:', error.message);
        setError("Failed to add image. Please try again later.");
      } else {
        console.error('An unknown error occurred', error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleDeleteImage = async (screenId: string, imageId: string) => {
    const currentScreen = screens.find(screen => screen.id === screenId);
    if (!currentScreen) {
      setError("Screen not found");
      return;
    }

    const updatedLsimg = currentScreen.lsimg.filter(id => id !== imageId);

    try {
      const response = await fetch(`${API_URL}/screens/${screenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lsimg: updatedLsimg }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      fetchScreens();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error removing image from screen:', error.message);
        setError("Failed to remove image. Please try again later.");
      } else {
        console.error('An unknown error occurred', error);
        setError("An unknown error occurred. Please try again later.");
      }
    }
  };

  const getGroupName = (groupId: string): string => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'No Group';
  };

  const groupedScreens = screens.reduce((acc, screen) => {
    const groupName = getGroupName(screen.group) || 'No Group';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(screen);
    return acc;
  }, {} as Record<string, Screen[]>);

  const getPictureDetails = (pictureId: string) => {
    return pictures.find(picture => picture.id === pictureId);
  };

  const getPicturesByGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.pictures : [];
  };

  const getAvailablePictures = () => {
    if (!selectedScreenId) return pictures;
    
    const currentScreen = screens.find(screen => screen.id === selectedScreenId);
    if (!currentScreen) return pictures;
    
    let availablePictures = pictures.filter(picture => !currentScreen.lsimg.includes(picture.id));
    
    if (selectedFilterGroup !== "all") {
      const groupPictureIds = getPicturesByGroup(selectedFilterGroup);
      availablePictures = availablePictures.filter(picture => groupPictureIds.includes(picture.id));
    }
    
    return availablePictures;
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFilterGroup(e.target.value);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">Configuration</h2>
      </div>
      <hr className="w-full border-t border-gray-300 mt-2" />

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-8 mt-10">
        {Object.entries(groupedScreens).map(([groupName, groupScreens]) => (
          <div key={groupName} className="bg-white rounded-lg shadow-custom p-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">{groupName}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {groupScreens.map((screen) => (
                <div key={screen.id} className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
                  <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-800">{screen.name}</h4>
                      <p className="text-xs text-gray-500">ID: {screen.id}</p>
                    </div>
                    <Link 
                      href={`/screens/${screen.id}`}
                      className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md transition-colors duration-200"
                    >
                      <span className="mr-1">View</span>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-sm font-medium text-gray-600">Images ({screen.lsimg.length})</h5>
                      <button
                        onClick={() => handleOpenModal(screen.id)}
                        className="bg-blue-500 text-white px-3 py-1 text-sm rounded-md hover:bg-blue-600 transition cursor-pointer"
                      >
                        Add an image
                      </button>
                    </div>

                    {screen.lsimg.length === 0 ? (
                      <div className="bg-gray-200 w-full h-32 flex items-center justify-center rounded-md">
                        <p className="text-gray-500">No images</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {screen.lsimg.map((imageId) => {
                          const picture = getPictureDetails(imageId);
                          return picture ? (
                            <div key={imageId} className="relative border border-gray-200 rounded-md p-2 hover:bg-gray-100 transition-all duration-100">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 mr-3">
                                  <Image
                                    src={`${API_URL}${picture.imagePath}`}
                                    alt={`Image for ${screen.name}`}
                                    width={100}
                                    height={70}
                                    className="rounded-md object-cover w-20 h-16 hover:scale-110 transition hover:rotate-3 duration-300"
                                  />
                                </div>
                                <div className="flex-grow">
                                  <p className="text-sm text-gray-600 truncate">
                                    {picture.imagePath.split('/').pop()}
                                  </p>
                                </div>
                                <div className="flex-shrink-0">
                                  <button
                                    className="bg-red-500 text-white px-3 py-1 text-sm rounded-md hover:bg-red-600 transition cursor-pointer"
                                    onClick={() => handleDeleteImage(screen.id, imageId)}
                                    title="Delete image"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center z-50">
          <div className="absolute inset-0 backdrop-blur-md bg-black/30 z-10" onClick={toggleModal}></div>
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-3xl z-20 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              {selectedScreenId ?
                `Add an image to the screen: ${screens.find(s => s.id === selectedScreenId)?.name}` :
                'Add an image to the screen'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="group-filter" className="block text-gray-700 font-medium mb-2">
                  Filter by group:
                </label>
                <select
                  id="group-filter"
                  value={selectedFilterGroup}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="all">All Groups</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <h4 className="text-gray-700 font-medium mb-2">Available images:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-md">
                  {getAvailablePictures().length === 0 ? (
                    <div className="col-span-full text-center py-6 text-gray-500">
                      {selectedFilterGroup === "all" 
                        ? "No available images found for this screen" 
                        : "No available images found in this group for this screen"}
                    </div>
                  ) : (
                    getAvailablePictures().map((picture) => (
                      <div 
                        key={picture.id} 
                        className={`cursor-pointer p-2 rounded-md transition-all duration-200 ${formData.pictureId === picture.id ? 'bg-blue-100 ring-2 ring-blue-500 shadow-md' : 'hover:bg-gray-100'}`}
                        onClick={() => handleImageClick(picture.id)}
                      >
                        <div className="relative aspect-video w-full">
                          <Image
                            src={`${API_URL}${picture.imagePath}`}
                            alt={picture.imagePath.split('/').pop() || ''}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover rounded-md"
                          />
                        </div>
                        <p className="text-xs mt-1 truncate text-center">
                          {picture.imagePath.split('/').pop()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedImage && (
                <div className="mb-4">
                  <h4 className="text-gray-700 font-medium">Selected image:</h4>
                  <div className="flex justify-center">
                    <Image
                      src={selectedImage}
                      alt="Selected"
                      width={200}
                      height={150}
                      className="mt-2 max-h-40 object-contain rounded-md border-2 border-gray-200 shadow-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between space-x-2">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition"
                  disabled={!formData.pictureId}
                >
                  Add
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
    </div>
  );
}