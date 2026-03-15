const API_BASE = __DEV__ ? 'http://192.168.1.100:8000' : 'https://api.stemify.app';

export interface Stem {
  name: string;
  audio_url: string;
  midi_url: string;
}

export interface ProcessResponse {
  job_id: string;
  stems: Stem[];
}

export async function uploadAudio(fileUri: string, fileName: string): Promise<ProcessResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'audio/mpeg',
  } as any);

  const response = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}
