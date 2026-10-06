import axios from 'axios';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api'});
export const meetingsApi={list:()=>api.get('/meetings'),get:id=>api.get(`/meetings/${id}`),create:data=>api.post('/meetings',data),update:(id,data)=>api.put(`/meetings/${id}`,data),remove:id=>api.delete(`/meetings/${id}`),generateAI:id=>api.post(`/meetings/${id}/generate-ai`)};
export const actionsApi={list:id=>api.get(`/meetings/${id}/actions`),create:(id,data)=>api.post(`/meetings/${id}/actions`,data),update:(id,data)=>api.put(`/actions/${id}`,data),remove:id=>api.delete(`/actions/${id}`)};
