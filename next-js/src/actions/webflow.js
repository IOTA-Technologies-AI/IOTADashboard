import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function publishToWebflow() {
  try {
    const response = await axios.post(`${API_BASE_URL}/webflow/publish`);

    if (!response.data?.success) {
      const errorMessage = response.data?.message || 'Failed to publish to Webflow';
      console.error('Webflow publish failed:', errorMessage);
      throw new Error(errorMessage);
    }

    return response.data;
  } catch (error) {
    console.error('Error publishing to Webflow:', error);
    throw error;
  }
}
