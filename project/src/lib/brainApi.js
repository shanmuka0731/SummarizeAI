// src/lib/brainApi.js
//
// Thin wrapper around the new /brain/* backend endpoints.
// Kept entirely separate from the existing pages/api calls so nothing
// about TextPage.jsx, PdfPage.jsx, or YoutubePage.jsx needs to change.

import axios from "axios";

const BASE_URL = "http://localhost:5000";

export async function uploadText(title, text) {
  const res = await axios.post(`${BASE_URL}/brain/upload/text`, {
    title,
    text,
  });
  return res.data;
}

export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${BASE_URL}/brain/upload/pdf`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadYoutube(url, language = "en") {
  const res = await axios.post(`${BASE_URL}/brain/upload/youtube`, {
    url,
    language,
  });
  return res.data;
}

export async function fetchDocuments() {
  const res = await axios.get(`${BASE_URL}/brain/documents`);
  return res.data.documents;
}

export async function deleteDocument(id) {
  const res = await axios.delete(`${BASE_URL}/brain/documents/${id}`);
  return res.data;
}

export async function askBrain(question, mode = "ask") {
  const res = await axios.post(`${BASE_URL}/brain/ask`, { question, mode });
  return res.data;
}

export async function fetchProgress() {
  const res = await axios.get(`${BASE_URL}/brain/progress`);
  return res.data;
}
