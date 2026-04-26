import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Basic interceptors for error handling and debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
    console.error('[API Error]:', message);
    return Promise.reject(error);
  }
);

export const fetchTasks = async () => {
  const response = await api.get('/tasks/');
  return response.data;
};

export const completeTask = async (taskId: number) => {
  const response = await api.put(`/tasks/${taskId}/complete`);
  return response.data;
};

// Assuming we'll add an endpoint for user stats later, 
// for now we'll target the logic we implemented in the complete task response 
// or a dedicated stats endpoint if created.
export const fetchUserStats = async () => {
  const response = await api.get('/tasks/stats'); 
  return response.data;
};

export default api;
